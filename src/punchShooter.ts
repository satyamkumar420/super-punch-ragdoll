import {
  Scene,
  Vector3,
  Color3,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  ArcRotateCamera,
  Space,
  Ray,
  type ShadowGenerator,
} from '@babylonjs/core';
import type { RagdollController } from './ragdoll';
import { spawnComicHitEffect } from './ragdoll';
import { playHeavyPunch, playHitSound, playPunchWhoosh } from './audio';
import { obstacleManager, isPermanentObstacle } from './core/obstacleManager';
import type { ObstacleState } from './core/obstacleTypes';

/**
 * Checks if a point/ragdoll and an obstacle are in close proximity ("pass me hai").
 * Uses surface distance from the obstacle's bounding box (maxSurfaceDist = 0.85m)
 * or horizontal center distance fallback (maxCenterDist = 1.2m).
 */
function isCloseProximity(
  point: Vector3,
  obs: ObstacleState,
  maxSurfaceDist = 0.35,
  maxCenterDist = 0.65
): boolean {
  const bounds = obstacleManager.getObstacleBounds(obs);
  if (bounds) {
    const dx = Math.max(bounds.min.x - point.x, 0, point.x - bounds.max.x);
    const dz = Math.max(bounds.min.z - point.z, 0, point.z - bounds.max.z);
    const surfaceDist = Math.hypot(dx, dz);
    return surfaceDist <= maxSurfaceDist;
  }
  const obsPos = obs.rootNode.position;
  const centerDist = Math.hypot(point.x - obsPos.x, point.z - obsPos.z);
  return centerDist <= maxCenterDist;
}

/**
 * Slab-method line segment [A, B] intersection test against an AABB with margin.
 * Guarantees high-speed punches never tunnel through obstacles.
 */
function segmentIntersectsAABB(
  A: Vector3,
  B: Vector3,
  min: Vector3,
  max: Vector3,
  margin = 0.35
): boolean {
  let tmin = 0.0;
  let tmax = 1.0;
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const dz = B.z - A.z;

  const minX = min.x - margin;
  const maxX = max.x + margin;
  if (Math.abs(dx) > 1e-7) {
    let t1 = (minX - A.x) / dx;
    let t2 = (maxX - A.x) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  } else if (A.x < minX || A.x > maxX) {
    return false;
  }

  const minY = min.y - margin;
  const maxY = max.y + margin;
  if (Math.abs(dy) > 1e-7) {
    let t1 = (minY - A.y) / dy;
    let t2 = (maxY - A.y) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  } else if (A.y < minY || A.y > maxY) {
    return false;
  }

  const minZ = min.z - margin;
  const maxZ = max.z + margin;
  if (Math.abs(dz) > 1e-7) {
    let t1 = (minZ - A.z) / dz;
    let t2 = (maxZ - A.z) / dz;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  } else if (A.z < minZ || A.z > maxZ) {
    return false;
  }

  return true;
}


export interface PunchShooter {
  root: TransformNode;
  shootPunch: (
    targetPoint: Vector3,
    brawlers: RagdollController[],
    onHit?: (target: RagdollController) => void,
    hitDirectionOverride?: Vector3,
    targetObstacleId?: string | null
  ) => boolean;
  isExtending: () => boolean;
  dispose: () => void;
}

/**
 * Calculates the exact 3D world anchor at the bottom edge of the camera viewport.
 * Fixed in front of the camera so the boxing glove rests directly at screen bottom.
 * If targetPoint is provided, anchors horizontally below the target line of sight
 * to completely eliminate parallax error (which would cause punches from center to slice
 * across side obstacles).
 */
export function getScreenBottomAnchor(
  camera: ArcRotateCamera,
  distanceInFront = 2.4,
  targetPoint?: Vector3
): Vector3 {
  const camPos = camera.globalPosition || camera.position;
  const fwd = camera.getDirection(Vector3.Forward());
  const down = camera.getDirection(Vector3.Down());
  const right = camera.getDirection(Vector3.Right());

  const halfH = distanceInFront * Math.tan(camera.fov / 2);
  const basePos = camPos.add(fwd.scale(distanceInFront)).add(down.scale(halfH * 0.90));

  if (targetPoint) {
    const toTarget = targetPoint.subtract(camPos);
    const forwardDist = Vector3.Dot(toTarget, fwd);
    if (forwardDist > 0.1) {
      const lateralDist = Vector3.Dot(toTarget, right);
      const lateralAtAnchor = (lateralDist / forwardDist) * distanceInFront;
      const engine = camera.getEngine();
      const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
      const halfW = halfH * aspect * 0.82;
      const clampedLateral = Math.max(-halfW, Math.min(lateralAtAnchor, halfW));
      return basePos.add(right.scale(clampedLateral));
    }
  }

  return basePos;
}

/**
 * Legacy compatibility helper.
 */
export function getScreenBottomWorldY(camera: ArcRotateCamera): number {
  const halfFov = camera.fov / 2;
  const visibleHalfHeight = Math.tan(halfFov) * camera.radius;
  return camera.target.y - visibleHalfHeight;
}

/**
 * Screen-End-Bottom Depth Punch Shooter (Ragdoll Punch Challenge Style).
 * - Fixed anchor strictly at the bottom border of the screen in front of camera.
 * - Glove faces forward (+Z into the screen) towards the street action in idle.
 * - When punching, glove shoots FORWARD INTO THE SCREEN (+Z depth towards targets),
 *   visibly traveling into the distance ("dur jate huye dikhega") with realistic 3D perspective.
 * - On knuckle impact, ragdoll is launched with explosive directional physics.
 */
export function createPunchShooter(
  scene: Scene,
  camera?: ArcRotateCamera,
  shadowGen?: ShadowGenerator
): PunchShooter {
  const activeCamera = camera || (scene.activeCamera as ArcRotateCamera);
  const root = new TransformNode('punchShooterRoot', scene);

  // Pivot container for aiming into 3D space
  const pivotNode = new TransformNode('punchPivot', scene);
  pivotNode.parent = root;

  // Visual container holding shaft and glove (aligned along local +Z axis)
  const visualsNode = new TransformNode('punchVisuals', scene);
  visualsNode.parent = pivotNode;

  // --- Materials ---
  const poleMat = new StandardMaterial('punchPoleMat', scene);
  poleMat.diffuseColor = new Color3(0.18, 0.20, 0.24); // Dark metallic shaft
  poleMat.specularColor = new Color3(0.25, 0.25, 0.3);

  const orangeCuffMat = new StandardMaterial('orangeCuffMat', scene);
  orangeCuffMat.diffuseColor = new Color3(0.96, 0.54, 0.12); // Vibrant orange collar
  orangeCuffMat.specularColor = new Color3(0.3, 0.2, 0.1);

  const gloveRedMat = new StandardMaterial('punchGloveRedMat', scene);
  gloveRedMat.diffuseColor = new Color3(0.92, 0.15, 0.15); // Vibrant red boxing glove
  gloveRedMat.specularColor = new Color3(0.35, 0.35, 0.35);

  // 1. Telescoping Cylinder Shaft (rotated along Z axis)
  const poleMesh = MeshBuilder.CreateCylinder('punchPole', {
    height: 1.0,
    diameter: 0.08,
    tessellation: 16,
  }, scene);
  poleMesh.parent = visualsNode;
  poleMesh.rotation.x = Math.PI / 2; // Lie along local Z axis
  poleMesh.material = poleMat;
  poleMesh.renderingGroupId = 1;

  // 2. Glove Head Container (moves along local +Z during punch)
  const gloveHeadNode = new TransformNode('gloveHeadNode', scene);
  gloveHeadNode.parent = visualsNode;

  // Orange Collar Cuff
  const orangeCuff = MeshBuilder.CreateCylinder('orangeCuff', {
    height: 0.08,
    diameter: 0.20,
    tessellation: 20,
  }, scene);
  orangeCuff.parent = gloveHeadNode;
  orangeCuff.rotation.x = Math.PI / 2;
  orangeCuff.position.set(0, 0, -0.01);
  orangeCuff.material = orangeCuffMat;
  orangeCuff.renderingGroupId = 1;

  // Main Red Boxing Glove Mitt (compact, clean streamlined size)
  const gloveMitt = MeshBuilder.CreateSphere('gloveMitt', {
    diameterX: 0.32,
    diameterY: 0.34,
    diameterZ: 0.40,
    segments: 16,
  }, scene);
  gloveMitt.parent = gloveHeadNode;
  gloveMitt.position.set(0, 0, 0.18);
  gloveMitt.material = gloveRedMat;
  gloveMitt.renderingGroupId = 1;

  // Knuckle Marker Tip (hit point in local space)
  const knuckleMarker = new TransformNode('knuckleMarker', scene);
  knuckleMarker.parent = gloveHeadNode;
  knuckleMarker.position.set(0, 0, 0.38);

  if (shadowGen) {
    shadowGen.addShadowCaster(poleMesh);
    shadowGen.addShadowCaster(orangeCuff);
    shadowGen.addShadowCaster(gloveMitt);
  }

  // Target Reticle Ring (flashes at clicked target point)
  const reticleMat = new StandardMaterial('punchReticleMat', scene);
  reticleMat.diffuseColor = new Color3(1.0, 0.2, 0.2);
  reticleMat.emissiveColor = new Color3(1.0, 0.15, 0.15);

  const reticleRing = MeshBuilder.CreateTorus('punchReticleRing', {
    diameter: 0.35,
    thickness: 0.028,
    tessellation: 24,
  }, scene);
  reticleRing.rotation.x = -Math.PI / 2;
  reticleRing.material = reticleMat;
  reticleRing.setEnabled(false);

  let reticleTimer: number | null = null;
  const showReticle = (pos: Vector3) => {
    reticleRing.position.set(pos.x, Math.max(0.04, pos.y), pos.z);
    reticleRing.setEnabled(true);
    reticleRing.scaling.setAll(1.25);
    if (reticleTimer !== null) clearTimeout(reticleTimer);
    reticleTimer = window.setTimeout(() => {
      reticleRing.setEnabled(false);
      reticleTimer = null;
    }, 180);
  };

  // --- Animation & Physics State ---
  let punchPhase: 'extend' | 'retract' | 'idle' = 'idle';
  let currentExtension = 0;
  let targetDistance = 5.0;
  const BASE_PUNCH_SPEED = 50.0; // Rapid spring punch velocity into screen (units/sec)
  const BASE_RETRACT_SPEED = 40.0;
  const POLE_BACK_LEN = 2.4; // Base pole length hidden behind screen bottom

  // Dynamic distance-adaptive speeds to ensure snappy, instantaneous punch response on mobile
  let currentPunchSpeed = BASE_PUNCH_SPEED;
  let currentRetractSpeed = BASE_RETRACT_SPEED;

  let activeBrawlersRef: RagdollController[] = [];
  let onHitCallback: ((t: RagdollController) => void) | undefined;
  let punchDirWorld = new Vector3(0, 0, 0.85);
  let currentTargetPoint = new Vector3(0, 0, 0);
  let currentTargetObstacleId: string | null = null;
  const currentStrikeDir = new Vector3(0, 0, 1);
  const GLOVE_KNUCKLE_OFFSET = 0.38;
  let hasHitInCurrentStrike = false;
  const prevTipPos = new Vector3();

  const getTipWorldPos = (ext: number): Vector3 => {
    return root.position.add(currentStrikeDir.scale(ext + GLOVE_KNUCKLE_OFFSET));
  };

  const setExtension = (ext: number) => {
    currentExtension = Math.max(0, ext);
    gloveHeadNode.position.set(0, 0, currentExtension);

    // Pole extends from behind anchor up to glove head
    const totalPoleLen = currentExtension + POLE_BACK_LEN;
    poleMesh.scaling.y = totalPoleLen;
    poleMesh.position.set(0, 0, (currentExtension - POLE_BACK_LEN) / 2);
  };

  const updateIdlePose = () => {
    const anchor = getScreenBottomAnchor(activeCamera, 2.4);
    root.position.copyFrom(anchor);
    root.computeWorldMatrix(true);

    // Look directly forward into the screen at center of street
    const streetCenter = new Vector3(activeCamera.target.x, activeCamera.target.y, 0);
    pivotNode.lookAt(streetCenter, 0, 0, 0, Space.WORLD);
    pivotNode.computeWorldMatrix(true);

    setExtension(0);
  };

  // Initial idle setup
  updateIdlePose();

  const animObservable = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.04);

    if (punchPhase === 'idle') {
      updateIdlePose();
      return;
    }

    if (punchPhase === 'extend') {
      const step = Math.min(currentPunchSpeed * dt, 1.2);
      currentExtension += step;
      if (currentExtension >= targetDistance) {
        currentExtension = targetDistance;
      }
      setExtension(currentExtension);

      // Realtime Knuckle Tip Continuous Collision Check (CCD) during punch flight into screen
      if (!hasHitInCurrentStrike) {
        const tipPos = getTipWorldPos(currentExtension);
        let hitOccurred = false;

        const vx = tipPos.x - prevTipPos.x;
        const vz = tipPos.z - prevTipPos.z;
        const lenSq = vx * vx + vz * vz;

        const punchDelta = tipPos.subtract(prevTipPos);
        const deltaLenSq = punchDelta.lengthSquared();

        // 1. Check direct brawler hit (CCD swept segment [prevTipPos, tipPos] against humanoid capsule & head/weapon)
        const directlyHitBrawlers: { brawler: RagdollController; targetCenter: Vector3; dist: number }[] = [];
        for (const brawler of activeBrawlersRef) {
          if (brawler.isRagdoll || brawler.isDefeated) continue;
          const brawlerPos = brawler.getPosition
            ? brawler.getPosition()
            : brawler.character.rootNode.position;

          const charScale = brawler.character.rootNode.scaling?.y || 1.0;
          let headTopY = brawlerPos.y + 1.85 * charScale;
          if (brawler.character.headNode) {
            brawler.character.headNode.computeWorldMatrix(true);
            headTopY = brawler.character.headNode.getAbsolutePosition().y + 0.12 * charScale;
          } else if (brawler.getSupportingObstacle && brawler.getSupportingObstacle()) {
            headTopY = brawlerPos.y + 1.20 * charScale;
          }

          const bodyMinY = brawlerPos.y + 0.10 * charScale;
          const bodyMaxY = headTopY;
          const capsuleRadius = 0.32 * charScale;

          // Swept segment distance to brawler vertical capsule
          let t = 0;
          if (lenSq > 1e-7) {
            const wx = brawlerPos.x - prevTipPos.x;
            const wz = brawlerPos.z - prevTipPos.z;
            t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / lenSq));
          }
          const closestX = prevTipPos.x + t * vx;
          const closestZ = prevTipPos.z + t * vz;
          const closestY = prevTipPos.y + t * (tipPos.y - prevTipPos.y);

          const clampedY = Math.max(bodyMinY, Math.min(closestY, bodyMaxY));
          const distXZ = Math.hypot(brawlerPos.x - closestX, brawlerPos.z - closestZ);
          const distY = closestY - clampedY;
          const capsuleDist = Math.hypot(distXZ, distY);

          let isHit = capsuleDist <= capsuleRadius;
          let hitCenter = new Vector3(closestX, clampedY, closestZ);

          // Direct head bone check if headNode is available
          if (!isHit && brawler.character.headNode) {
            brawler.character.headNode.computeWorldMatrix(true);
            const headPos = brawler.character.headNode.getAbsolutePosition();
            const toHead = headPos.subtract(prevTipPos);
            const tHead = deltaLenSq > 1e-7 ? Math.max(0, Math.min(1, Vector3.Dot(toHead, punchDelta) / deltaLenSq)) : 0;
            const closestPunchHead = prevTipPos.add(punchDelta.scale(tHead));
            const headDist = Vector3.Distance(closestPunchHead, headPos);
            if (headDist <= 0.28 * charScale) {
              isHit = true;
              hitCenter = headPos;
            }
          }

          // Weapon check (pistol, sword, etc. outstretched in hands)
          if (!isHit) {
            const weaponRoot = brawler.character.attachedWeapon?.root || brawler.character.attachedSword?.root;
            if (weaponRoot) {
              weaponRoot.computeWorldMatrix(true);
              const weaponPos = weaponRoot.getAbsolutePosition();
              const toW = weaponPos.subtract(prevTipPos);
              const tW = deltaLenSq > 1e-7 ? Math.max(0, Math.min(1, Vector3.Dot(toW, punchDelta) / deltaLenSq)) : 0;
              const closestPunchW = prevTipPos.add(punchDelta.scale(tW));
              if (Vector3.Distance(closestPunchW, weaponPos) <= 0.35 * charScale) {
                isHit = true;
                hitCenter = weaponPos;
              }
            }
          }

          // Target arrival check: if knuckle reaches targetPoint which lies inside the physical humanoid volume
          if (!isHit && currentExtension >= targetDistance - 0.20) {
            const dx = currentTargetPoint.x - brawlerPos.x;
            const dz = currentTargetPoint.z - brawlerPos.z;
            const horizDist = Math.hypot(dx, dz);
            if (
              horizDist <= 0.35 * charScale &&
              currentTargetPoint.y >= bodyMinY - 0.08 &&
              currentTargetPoint.y <= bodyMaxY + 0.08
            ) {
              isHit = true;
              hitCenter = new Vector3(brawlerPos.x, (bodyMinY + bodyMaxY) * 0.5, brawlerPos.z);
            }
          }

          // Hit registered if within crisp swept capsule radius, head, weapon, or target arrival
          if (isHit) {
            directlyHitBrawlers.push({ brawler, targetCenter: hitCenter, dist: capsuleDist });
          }
        }

        if (directlyHitBrawlers.length > 0) {
          hasHitInCurrentStrike = true;
          hitOccurred = true;
          playHeavyPunch();
          playHitSound();

          // All brawlers directly within punch contact range
          const brawlersToThrow = [...directlyHitBrawlers];

          // Chain any brawlers in physical body contact / walking overlap with ANY brawler being thrown:
          // In ragdoll physics, each character has body radius 0.42m (collision contact distance = 0.84m).
          // With threshold <= 1.05m, two brawlers walking into the same spot are both thrown,
          // while conversation pairs standing >= 1.30m apart are never falsely chained.
          for (const other of activeBrawlersRef) {
            if (other.isRagdoll || other.isDefeated) continue;
            if (brawlersToThrow.some((item) => item.brawler === other)) continue;
            const otherPos = other.getPosition
              ? other.getPosition()
              : other.character.rootNode.position;
            const otherCenter = new Vector3(otherPos.x, otherPos.y + 0.9, otherPos.z);

            // Check if co-located / in physical body contact, or lined up in the throw lane behind ANY hit brawler:
            // 1. Direct close contact <= 1.05m (two brawlers walking into the exact same spot)
            // 2. Lined up in the punch throw corridor behind hit brawler (forwardDist > 0 && <= 3.5m, lateralDist <= 0.60m)
            const isCoLocated = brawlersToThrow.some((hit) => {
              const otherSupp = other.getSupportingObstacle ? other.getSupportingObstacle() : null;
              const hitSupp = hit.brawler.getSupportingObstacle ? hit.brawler.getSupportingObstacle() : null;
              // Characters seated on separate props must never chain side-by-side
              if (otherSupp && hitSupp && otherSupp.id !== hitSupp.id) {
                return false;
              }
              const toOtherX = otherCenter.x - hit.targetCenter.x;
              const toOtherZ = otherCenter.z - hit.targetCenter.z;
              const forwardDist = toOtherX * punchDirWorld.x + toOtherZ * punchDirWorld.z;
              const lateralDist = Math.abs(toOtherX * -punchDirWorld.z + toOtherZ * punchDirWorld.x);
              const directDist = Math.hypot(toOtherX, toOtherZ);

              if (directDist <= 0.85) return true;
              if (forwardDist > 0.1 && forwardDist <= 3.5 && lateralDist <= 0.40) return true;

              return false;
            });

            if (isCoLocated) {
              brawlersToThrow.push({ brawler: other, targetCenter: otherCenter, dist: Vector3.Distance(tipPos, otherCenter) });
            }
          }

          // Explosive directional launch for all hit / co-located ragdolls
          for (const item of brawlersToThrow) {
            spawnComicHitEffect(scene, item.targetCenter);
            item.brawler.triggerHit(item.targetCenter, punchDirWorld, 48.0);
            if (onHitCallback) onHitCallback(item.brawler);
          }

          // Dynamically launch obstacles physically associated with the hit brawler(s):
          // 1) The supporting obstacle beneath any hit brawler (chair, bench, box, barrel, car, etc.)
          // 2) Any obstacle in direct physical contact / surface collision with the hit brawler
          // 3) Any obstacle in the punch throw corridor ("aage piche") with the hit brawler
          // BUT NEVER launch an obstacle that is actively supporting an undefeated brawler that is NOT being hit!
          const allObs = obstacleManager.getAllObstacles();
          const obstaclesToLaunch: ObstacleState[] = [];

          for (const obs of allObs) {
            if (obs.isDestroyed || isPermanentObstacle(obs.name, obs.modelPath, obs.id)) continue;

            // Never launch an obstacle that is currently actively supporting an undefeated brawler that is NOT being hit
            const isSupportingOtherAliveBrawler = activeBrawlersRef.some((b) => {
              if (b.isRagdoll || b.isDefeated) return false;
              if (brawlersToThrow.some((item) => item.brawler === b)) return false;
              const supp = b.getSupportingObstacle ? b.getSupportingObstacle() : null;
              return supp && supp.id === obs.id;
            });
            if (isSupportingOtherAliveBrawler) continue;

            // Check if this obstacle directly supported any of the hit brawlers
            const isSupportingHitBrawler = brawlersToThrow.some((item) => {
              const supp = item.brawler.getSupportingObstacle ? item.brawler.getSupportingObstacle() : null;
              return supp && supp.id === obs.id;
            });

            // Direct surface contact or in forward throw path / corridor behind hit brawler:
            const isDirectContact = brawlersToThrow.some((item) => {
              if (isCloseProximity(item.targetCenter, obs, 0.30, 0.55)) {
                return true;
              }
              const bounds = obstacleManager.getObstacleBounds(obs);
              const obsPos = obs.rootNode.position;
              const obsCenter = bounds ? bounds.min.add(bounds.max).scale(0.5) : obsPos;

              const toObsX = obsCenter.x - item.targetCenter.x;
              const toObsZ = obsCenter.z - item.targetCenter.z;
              const forwardDist = toObsX * punchDirWorld.x + toObsZ * punchDirWorld.z;
              const lateralDist = Math.abs(toObsX * -punchDirWorld.z + toObsZ * punchDirWorld.x);
              const boundDx = bounds ? Math.max(bounds.min.x - item.targetCenter.x, 0, item.targetCenter.x - bounds.max.x) : Math.abs(toObsX);

              return (forwardDist > 0.1 && forwardDist <= 3.5) && (boundDx <= 0.20 || lateralDist <= 0.40);
            });

            if (isSupportingHitBrawler || isDirectContact) {
              obstaclesToLaunch.push(obs);
            }
          }

          // Chain any obstacle "aage piche" / corridor with already matched obstacles:
          for (const other of allObs) {
            if (obstaclesToLaunch.some((o) => o.id === other.id) || other.isDestroyed || isPermanentObstacle(other.name, other.modelPath, other.id)) continue;

            // Never collateral launch an obstacle supporting an undefeated brawler that is NOT being hit
            const isSupportingOtherAliveBrawler = activeBrawlersRef.some((b) => {
              if (b.isRagdoll || b.isDefeated) return false;
              if (brawlersToThrow.some((item) => item.brawler === b)) return false;
              const supp = b.getSupportingObstacle ? b.getSupportingObstacle() : null;
              return supp && supp.id === other.id;
            });
            if (isSupportingOtherAliveBrawler) continue;

            const otherBounds = obstacleManager.getObstacleBounds(other);
            const otherCenter = otherBounds ? otherBounds.min.add(otherBounds.max).scale(0.5) : other.rootNode.position;

            const isAlignedWithAny = obstaclesToLaunch.some((hitObs) => {
              const hitBounds = obstacleManager.getObstacleBounds(hitObs);
              const hitCenter = hitBounds ? hitBounds.min.add(hitBounds.max).scale(0.5) : hitObs.rootNode.position;
              const toOtherX = otherCenter.x - hitCenter.x;
              const toOtherZ = otherCenter.z - hitCenter.z;
              const forwardDist = toOtherX * punchDirWorld.x + toOtherZ * punchDirWorld.z;
              const lateralDist = Math.abs(toOtherX * -punchDirWorld.z + toOtherZ * punchDirWorld.x);
              const directDist = Math.hypot(toOtherX, toOtherZ);
              const boundDx = (hitBounds && otherBounds)
                ? Math.max(otherBounds.min.x - hitBounds.max.x, 0, hitBounds.min.x - otherBounds.max.x)
                : Math.abs(toOtherX);
              const boundDz = (hitBounds && otherBounds)
                ? Math.max(otherBounds.min.z - hitBounds.max.z, 0, hitBounds.min.z - otherBounds.max.z)
                : Math.abs(toOtherZ);
              const surfaceGap = Math.hypot(boundDx, boundDz);

              // 1. "Aage Piche": strictly behind hit obstacle along punch line, and narrow lateral corridor
              const isAagePiche = (forwardDist > 0.1 && forwardDist <= 3.5) && (lateralDist <= 0.40 || boundDx <= 0.20);
              // 2. Stacked / direct touching (tight surface gap <= 0.20m or directDist <= 0.65m, not side-by-side)
              const isTouching = (surfaceGap <= 0.20 || directDist <= 0.65) && lateralDist <= 0.40;
              return isAagePiche || isTouching;
            });

            if (isAlignedWithAny) {
              obstaclesToLaunch.push(other);
            }
          }

          for (const o of obstaclesToLaunch) {
            obstacleManager.launchObstacle(o, punchDirWorld, 65.0);
          }

          punchPhase = 'retract';
        }

        // 2. Check direct obstacle hit (prevent punch passing through obstacles via CCD)
        if (!hitOccurred) {
          const allObs = obstacleManager.getAllObstacles();
          let hitObstacle: ObstacleState | null = null;

          for (const obs of allObs) {
            if (obs.isDestroyed || isPermanentObstacle(obs.name, obs.modelPath, obs.id)) continue;

            const bounds = obstacleManager.getObstacleBounds(obs);
            const obsPos = obs.rootNode.position;

            let isHit = false;
            if (bounds) {
              // 1. Broadphase fast AABB check with tight 0.04m margin
              const broadHit = segmentIntersectsAABB(prevTipPos, tipPos, bounds.min, bounds.max, 0.04);
              if (broadHit) {
                // 2. Narrowphase: test against the actual obstacle meshes using Babylon ray intersection
                // This eliminates phantom box corners on curved cars, benches, and props!
                const stepVec = tipPos.subtract(prevTipPos);
                const stepLen = stepVec.length();
                if (stepLen > 1e-5) {
                  const ray = new Ray(prevTipPos, stepVec.scale(1 / stepLen), stepLen);
                  const meshes = obs.allMeshes && obs.allMeshes.length > 0 ? obs.allMeshes : [obs.mesh];
                  for (const m of meshes) {
                    if (!m || !m.isVisible || m.getTotalVertices() === 0) continue;
                    const pickInfo = ray.intersectsMesh(m, false);
                    if (pickInfo && pickInfo.hit) {
                      isHit = true;
                      break;
                    }
                  }
                  // Fallback for obstacles with no pickable submeshes
                  if (!isHit && meshes.every((m) => m.getTotalVertices() === 0)) {
                    isHit = true;
                  }
                }
              }
            } else {
              const toObs = obsPos.subtract(prevTipPos);
              const tObs = deltaLenSq > 1e-7 ? Math.max(0, Math.min(1, Vector3.Dot(toObs, punchDelta) / deltaLenSq)) : 0;
              const closestPunchObs = prevTipPos.add(punchDelta.scale(tObs));
              if (Vector3.Distance(closestPunchObs, obsPos) <= 0.40) {
                isHit = true;
              }
            }

            // Target arrival check: knuckle reaches targetPoint which lies directly on THIS obstacle
            if (!isHit && currentExtension >= targetDistance - 0.15) {
              if (currentTargetObstacleId && currentTargetObstacleId === obs.id) {
                isHit = true;
              }
            }

            if (isHit) {
              hitObstacle = obs;
              break;
            }
          }

          if (hitObstacle) {
            hasHitInCurrentStrike = true;
            hitOccurred = true;
            playHeavyPunch();
            playHitSound();
            spawnComicHitEffect(scene, tipPos);

            // 1. Gather all undefeated brawlers "ek sath" with this hit obstacle:
            // - Directly supported by this hit obstacle (sitting / standing on it)
            // - Close physical surface contact with this obstacle (surfaceDist <= 0.30m or directDist <= 0.55m)
            // - In the direct forward punch corridor through this obstacle ("aage piche": forwardDist > 0.1m && <= 3.5m, lateralDist <= 0.40m)
            // - Or punch reticle targeted directly at this brawler (dist <= 0.60m)
            const brawlersToHit: { brawler: RagdollController; targetCenter: Vector3 }[] = [];
            const hitBounds = obstacleManager.getObstacleBounds(hitObstacle);
            const hitCenter = hitBounds ? hitBounds.min.add(hitBounds.max).scale(0.5) : hitObstacle.rootNode.position;

            for (const brawler of activeBrawlersRef) {
              if (brawler.isRagdoll || brawler.isDefeated) continue;
              const bPos = brawler.getPosition ? brawler.getPosition() : brawler.character.rootNode.position;
              const bCenter = new Vector3(bPos.x, bPos.y + 0.9, bPos.z);

              const supp = brawler.getSupportingObstacle ? brawler.getSupportingObstacle() : null;
              const isSupported = supp && supp.id === hitObstacle.id;

              const toBX = bCenter.x - hitCenter.x;
              const toBZ = bCenter.z - hitCenter.z;
              const forwardDist = toBX * punchDirWorld.x + toBZ * punchDirWorld.z;
              const lateralDist = Math.abs(toBX * -punchDirWorld.z + toBZ * punchDirWorld.x);
              const directDist = Math.hypot(toBX, toBZ);

              const boundDx = hitBounds ? Math.max(hitBounds.min.x - bCenter.x, 0, bCenter.x - hitBounds.max.x) : Math.abs(toBX);
              const boundDz = hitBounds ? Math.max(hitBounds.min.z - bCenter.z, 0, bCenter.z - hitBounds.max.z) : Math.abs(toBZ);
              const surfaceDist = Math.hypot(boundDx, boundDz);

              const isContact = surfaceDist <= 0.30 || directDist <= 0.55;
              const isCorridor = forwardDist > 0.1 && forwardDist <= 3.5 && (lateralDist <= 0.40 || boundDx <= 0.20);
              const isTargeted = Vector3.Distance(currentTargetPoint, bCenter) <= 0.60;

              if (isSupported || isContact || isCorridor || isTargeted) {
                brawlersToHit.push({ brawler, targetCenter: bCenter });
              }
            }

            // 2. Chain any brawlers in physical body contact or corridor behind hit brawlers
            for (const other of activeBrawlersRef) {
              if (other.isRagdoll || other.isDefeated) continue;
              if (brawlersToHit.some((item) => item.brawler === other)) continue;
              const otherPos = other.getPosition ? other.getPosition() : other.character.rootNode.position;
              const otherCenter = new Vector3(otherPos.x, otherPos.y + 0.9, otherPos.z);
              const otherSupp = other.getSupportingObstacle ? other.getSupportingObstacle() : null;

              const isCoLocated = brawlersToHit.some((hit) => {
                const hitSupp = hit.brawler.getSupportingObstacle ? hit.brawler.getSupportingObstacle() : null;
                // Characters seated on separate props must never chain side-by-side
                if (otherSupp && hitSupp && otherSupp.id !== hitSupp.id) {
                  return false;
                }
                const toOtherX = otherCenter.x - hit.targetCenter.x;
                const toOtherZ = otherCenter.z - hit.targetCenter.z;
                const forwardDist = toOtherX * punchDirWorld.x + toOtherZ * punchDirWorld.z;
                const lateralDist = Math.abs(toOtherX * -punchDirWorld.z + toOtherZ * punchDirWorld.x);
                const directDist = Math.hypot(toOtherX, toOtherZ);

                if (directDist <= 0.85) return true;
                if (forwardDist > 0.1 && forwardDist <= 3.5 && lateralDist <= 0.40) return true;
                return false;
              });

              if (isCoLocated) {
                brawlersToHit.push({ brawler: other, targetCenter: otherCenter });
              }
            }

            // 3. Collect obstacles to launch:
            // Always launch hitObstacle
            const obstaclesToLaunch: ObstacleState[] = [hitObstacle];

            // Launch supporting obstacle of any hit brawler:
            for (const item of brawlersToHit) {
              const supp = item.brawler.getSupportingObstacle ? item.brawler.getSupportingObstacle() : null;
              if (supp && !obstaclesToLaunch.some((o) => o.id === supp.id) && !supp.isDestroyed && !isPermanentObstacle(supp.name, supp.modelPath, supp.id)) {
                obstaclesToLaunch.push(supp);
              }
            }

            // Check all other obstacles:
            // NEVER collateral launch an obstacle supporting an undefeated brawler that is NOT being hit!
            for (const other of allObs) {
              if (obstaclesToLaunch.some((o) => o.id === other.id) || other.isDestroyed || isPermanentObstacle(other.name, other.modelPath, other.id)) continue;

              const isSupportingOtherAliveBrawler = activeBrawlersRef.some((b) => {
                if (b.isRagdoll || b.isDefeated) return false;
                if (brawlersToHit.some((item) => item.brawler === b)) return false;
                const supp = b.getSupportingObstacle ? b.getSupportingObstacle() : null;
                return supp && supp.id === other.id;
              });
              if (isSupportingOtherAliveBrawler) continue;

              const otherBounds = obstacleManager.getObstacleBounds(other);
              const otherCenter = otherBounds ? otherBounds.min.add(otherBounds.max).scale(0.5) : other.rootNode.position;

              const isAlignedWithAny = obstaclesToLaunch.some((launchedObs) => {
                const launchedBounds = obstacleManager.getObstacleBounds(launchedObs);
                const launchedCenter = launchedBounds ? launchedBounds.min.add(launchedBounds.max).scale(0.5) : launchedObs.rootNode.position;

                const toOtherX = otherCenter.x - launchedCenter.x;
                const toOtherZ = otherCenter.z - launchedCenter.z;
                const forwardDist = toOtherX * punchDirWorld.x + toOtherZ * punchDirWorld.z;
                const lateralDist = Math.abs(toOtherX * -punchDirWorld.z + toOtherZ * punchDirWorld.x);
                const directDist = Math.hypot(toOtherX, toOtherZ);

                const boundDx = (launchedBounds && otherBounds)
                  ? Math.max(otherBounds.min.x - launchedBounds.max.x, 0, launchedBounds.min.x - otherBounds.max.x)
                  : Math.abs(toOtherX);
                const boundDz = (launchedBounds && otherBounds)
                  ? Math.max(otherBounds.min.z - launchedBounds.max.z, 0, launchedBounds.min.z - otherBounds.max.z)
                  : Math.abs(toOtherZ);
                const surfaceGap = Math.hypot(boundDx, boundDz);

                // "Aage Piche": strictly in front along punch line, and narrow lateral corridor
                const isAagePiche = (forwardDist > 0.1 && forwardDist <= 3.5) && (lateralDist <= 0.40 || boundDx <= 0.20);
                // Stacked / direct touching (tight surface gap <= 0.20m or directDist <= 0.65m, not side-by-side)
                const isTouching = (surfaceGap <= 0.20 || directDist <= 0.65) && lateralDist <= 0.40;

                return isAagePiche || isTouching;
              });

              if (isAlignedWithAny) {
                obstaclesToLaunch.push(other);
              }
            }

            // Explosive launch for all matched "ek sath" brawlers
            for (const item of brawlersToHit) {
              spawnComicHitEffect(scene, item.targetCenter);
              item.brawler.triggerHit(item.targetCenter, punchDirWorld, 48.0);
              if (onHitCallback) onHitCallback(item.brawler);
            }

            // Explosively launch all matched obstacles!
            for (const o of obstaclesToLaunch) {
              obstacleManager.launchObstacle(o, punchDirWorld, 65.0);
            }

            punchPhase = 'retract';
          }
        }

        // 3. Ground contact hit check (punch reaches or strikes pavement)
        if (!hitOccurred) {
          const isAtGroundHeight = tipPos.y <= 0.08 || (prevTipPos.y > 0.08 && tipPos.y <= 0.08);
          const isNearGroundTarget = currentTargetPoint.y <= 0.22 && currentExtension >= targetDistance - 0.25;
          if (isAtGroundHeight || isNearGroundTarget) {
            hasHitInCurrentStrike = true;
            hitOccurred = true;
            playHeavyPunch();
            playHitSound();
            spawnComicHitEffect(scene, new Vector3(tipPos.x, Math.max(0.04, tipPos.y), tipPos.z));
            punchPhase = 'retract';
          }
        }

        if (!hitOccurred) {
          prevTipPos.copyFrom(tipPos);
        }
      }

      if (currentExtension >= targetDistance) {
        currentExtension = targetDistance;
        punchPhase = 'retract';
      }
    } else if (punchPhase === 'retract') {
      currentExtension -= currentRetractSpeed * dt;
      if (currentExtension <= 0) {
        currentExtension = 0;
        punchPhase = 'idle';
        updateIdlePose();
      }
      setExtension(currentExtension);
    }
  });

  const shootPunch = (
    targetPoint: Vector3,
    brawlers: RagdollController[],
    onHit?: (target: RagdollController) => void,
    hitDirectionOverride?: Vector3,
    targetObstacleId?: string | null
  ): boolean => {
    activeBrawlersRef = brawlers;
    onHitCallback = onHit;
    currentTargetPoint.copyFrom(targetPoint);
    currentTargetObstacleId = targetObstacleId || null;
    hasHitInCurrentStrike = false;

    // Anchor firmly at screen bottom in front of camera, laterally tracking target line of sight
    const baseAnchor = getScreenBottomAnchor(activeCamera, 2.4, targetPoint);
    root.position.copyFrom(baseAnchor);
    root.computeWorldMatrix(true);

    // Aim pivot directly at 3D target point into the screen
    pivotNode.lookAt(targetPoint, 0, 0, 0, Space.WORLD);
    pivotNode.computeWorldMatrix(true);

    const strikeVec = targetPoint.subtract(root.position);
    targetDistance = strikeVec.length();

    // Baseline desktop reference distance where punch speed of 50 feels natural (~5.2m)
    const DESKTOP_REF_DIST = 5.2;
    const engine = scene.getEngine();
    const renderW = engine.getRenderWidth();
    const renderH = Math.max(1, engine.getRenderHeight());
    const isMobilePortrait = (renderW / renderH) < 1.0;

    // Mobile distance compensation:
    // On mobile portrait, camera radius expands up to 16.5m (causing targetDistance to reach 12-15m).
    // Proportional scaling ensures time-to-target remains ~0.08-0.09s and retract takes ~0.09-0.10s,
    // exactly matching (or slightly faster than) the crisp desktop speed!
    const mobileBoost = isMobilePortrait ? 1.25 : 1.0;
    const distScale = Math.max(1.0, (targetDistance / DESKTOP_REF_DIST) * mobileBoost);

    currentPunchSpeed = BASE_PUNCH_SPEED * distScale;
    currentRetractSpeed = BASE_RETRACT_SPEED * distScale;

    // The EXACT direction along which the punch traveled into the screen:
    const horizLen = Math.hypot(strikeVec.x, strikeVec.z) || 1.0;
    const punchTravelDir = new Vector3(strikeVec.x / horizLen, 0, strikeVec.z / horizLen);

    if (hitDirectionOverride && Math.hypot(hitDirectionOverride.x, hitDirectionOverride.z) > 0.05) {
      const hLen = Math.hypot(hitDirectionOverride.x, hitDirectionOverride.z);
      punchDirWorld.set(hitDirectionOverride.x / hLen, 0, hitDirectionOverride.z / hLen);
    } else {
      // Ragdoll flies in the exact direction the punch shot! ("jis taraf abhi punch gaya hai usi taraf ragdoll hit hoke jayega")
      punchDirWorld.copyFrom(punchTravelDir);
    }

    currentExtension = 0;
    setExtension(0);
    currentStrikeDir.copyFrom(strikeVec.scale(1 / Math.max(1e-4, targetDistance)));

    // Clean analytical tip position (never matrix desynced)
    prevTipPos.copyFrom(getTipWorldPos(0));
    punchPhase = 'extend';

    showReticle(targetPoint);
    playPunchWhoosh();
    return true;
  };

  const dispose = () => {
    if (reticleTimer !== null) clearTimeout(reticleTimer);
    reticleRing.dispose();
    scene.onBeforeRenderObservable.remove(animObservable);
    root.dispose();
  };

  return {
    root,
    shootPunch,
    isExtending: () => punchPhase !== 'idle',
    dispose,
  };
}
