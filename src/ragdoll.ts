import { Scene, Vector3 } from '@babylonjs/core';
import type { CharacterInstance } from './character';
import { playHitSound, playBoingSound, playRagdollDeathSound, playMaterialImpactSound, playHeavyPunch } from './audio';
import { obstacleManager, isPermanentObstacle } from './core/obstacleManager';
import { resolveBodyVsAABB, type BoundingBox3D } from './core/collisionSystem';
import { spawnComicHitEffect } from './core/vfx';
export { spawnComicHitEffect } from './core/vfx';

export interface RagdollController {
  character: CharacterInstance;
  isRagdoll: boolean;
  isDefeated: boolean;
  triggerHit: (hitPoint: Vector3, shootDirection: Vector3, force?: number) => void;
  getPosition?: () => Vector3;
  getSupportingObstacle?: () => any;
  dispose?: () => void;
}

interface InternalRagdoll {
  id: string;
  rootMesh: { position: Vector3; rotation: Vector3 };
  isDefeated: () => boolean;
  getRadius: () => number;
  nudgePosition: (dx: number, dz: number) => void;
  triggerHit?: (hitPoint: Vector3, shootDirection: Vector3, force?: number) => void;
}

const activeRagdolls = new Set<InternalRagdoll>();

export function clearActiveRagdolls(): void {
  activeRagdolls.clear();
}

/**
 * Computes highest supporting surface underneath a point (X, Y, Z).
 */
export function getSupportingSurfaceY(x: number, y: number, z: number): number {
  let highestSupport = 0;
  const obstacles = obstacleManager.getAllObstacles();
  for (const obs of obstacles) {
    if (obs.isDestroyed) continue;
    const bounds = obstacleManager.getObstacleBounds(obs);
    const min = bounds.min;
    const max = bounds.max;

    if (
      x >= min.x &&
      x <= max.x &&
      z >= min.z &&
      z <= max.z
    ) {
      if (y >= max.y - 0.15) {
        if (max.y > highestSupport) {
          highestSupport = max.y;
        }
      }
    }
  }
  return highestSupport;
}

// Attach physics ragdoll controller to character
export function createCharacterRagdollController(
  character: CharacterInstance,
  scene: Scene
): RagdollController {
  let isRagdoll = false;
  let isDefeated = false;
  const deathSoundVariant = Math.floor(Math.random() * 8) + 1;

  const GRAVITY = 24.0;

  let velX = 0;
  let velY = 0;
  let velZ = 0;
  let rotVelX = 0;
  let rotVelY = 0;
  let rotVelZ = 0;
  let fallVelY = 0;
  let prevInAir = false;

  const rootMesh = character.rootNode as unknown as {
    position: Vector3;
    rotation: Vector3;
  };

  // Dynamically resolve ANY obstacle physically supporting this character via 3D spatial bounds
  const findSupportingObstacle = (): any => {
    // If character is resting on the ground plane (py <= 0.10), they are floor-supported, not on top of an obstacle
    if (rootMesh.position.y <= 0.10) {
      return null;
    }

    const obstacles = obstacleManager.getAllObstacles();
    let bestObs: any = null;
    let closestDistSq = Infinity;
    const px = rootMesh.position.x;
    const py = rootMesh.position.y;
    const pz = rootMesh.position.z;

    const isSittingAnim = character.animationGroups.some(
      (ag) => ag.isPlaying && ag.name.toLowerCase().includes('sit')
    );

    for (const obs of obstacles) {
      if (obs.isDestroyed || (obs as any).isLaunched) continue;

      // Vehicles never physically support characters on top
      const lower = (obs.name + ' ' + (obs.modelPath || '')).toLowerCase();
      if (lower.includes('car') || lower.includes('van') || lower.includes('taxi') || lower.includes('sedan') || lower.includes('truck')) {
        continue;
      }

      const bounds = obstacleManager.getObstacleBounds(obs);
      if (!bounds) continue;

      // Horizontal containment (within obstacle footprint with tight body tolerance)
      const inFootprint =
        px >= bounds.min.x - 0.25 &&
        px <= bounds.max.x + 0.25 &&
        pz >= bounds.min.z - 0.25 &&
        pz <= bounds.max.z + 0.25;

      if (!inFootprint) continue;

      // Vertical support: character base rests directly on obstacle top surface, or seated on chair
      const isElevatedOnTop = py >= bounds.max.y - 0.35 && py <= bounds.max.y + 0.50;
      const isSeatedOnChair = isSittingAnim && py >= bounds.min.y + 0.20 && py <= bounds.max.y + 0.50;

      if (isElevatedOnTop || isSeatedOnChair) {
        const obsPos = obs.rootNode.position;
        const distSq = (px - obsPos.x) ** 2 + (pz - obsPos.z) ** 2;
        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          bestObs = obs;
        }
      }
    }
    return bestObs;
  };

  let supportingObstacle: any = findSupportingObstacle();
  const wasInitiallySupported = supportingObstacle !== null;
  const initialSpawnY = rootMesh.position.y;

  const internalId = `ragdoll_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const internalRef: InternalRagdoll = {
    id: internalId,
    rootMesh,
    isDefeated: () => isDefeated,
    getRadius: () => (isDefeated ? 0.55 : 0.42),
    nudgePosition: (dx: number, dz: number) => {
      rootMesh.position.x += dx;
      rootMesh.position.z += dz;
    },
    triggerHit: (hitPoint: Vector3, shootDirection: Vector3, force?: number) => {
      triggerHit(hitPoint, shootDirection, force);
    },
  };
  activeRagdolls.add(internalRef);

  const floorObserver = scene.onBeforeRenderObservable.add(() => {
    const totalDelta = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.033);
    const substeps = 2;
    const delta = totalDelta / substeps;

    for (let step = 0; step < substeps; step++) {
      let supportY = 0;
      if (!isDefeated) {
        if (supportingObstacle) {
          if (supportingObstacle.isDestroyed || (supportingObstacle as any).isLaunched) {
            supportingObstacle = null;
            // Dynamically stand up if character was playing a seated animation on this lost prop
            const isSittingAnim = character.animationGroups.some(
              (ag) => ag.isPlaying && ag.name.toLowerCase().includes('sit')
            );
            if (isSittingAnim) {
              character.playAnimation('Idle_Talking_Loop', true);
            }
          } else {
            const bounds = obstacleManager.getObstacleBounds(supportingObstacle);
            const inFootprint =
              rootMesh.position.x >= bounds.min.x - 0.55 &&
              rootMesh.position.x <= bounds.max.x + 0.55 &&
              rootMesh.position.z >= bounds.min.z - 0.55 &&
              rootMesh.position.z <= bounds.max.z + 0.55;
            if (inFootprint) {
              supportY = initialSpawnY;
            } else {
              supportingObstacle = null;
            }
          }
        }

        if (!supportingObstacle) {
          supportY = getSupportingSurfaceY(rootMesh.position.x, rootMesh.position.y, rootMesh.position.z);
          // If no supporting obstacle is resolved under an alive stationary character, fall back to initialSpawnY
          // so characters placed on props or custom platforms in the editor never sink through the floor
          if (supportY === 0 && initialSpawnY > 0.05 && !wasInitiallySupported) {
            supportY = initialSpawnY;
          }
        }
      } else {
        supportY = getSupportingSurfaceY(rootMesh.position.x, rootMesh.position.y, rootMesh.position.z);
      }

      // 1. Ragdoll-to-Ragdoll Collision Check
      const myRadius = internalRef.getRadius();
      activeRagdolls.forEach((other) => {
        if (other.id === internalId) return;
        const oPos = other.rootMesh.position;
        const dx = oPos.x - rootMesh.position.x;
        const dz = oPos.z - rootMesh.position.z;
        const distSq = dx * dx + dz * dz;
        const minDist = myRadius + other.getRadius();

        if (distSq < minDist * minDist && Math.abs(oPos.y - rootMesh.position.y) < 1.7) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          const ratio = isDefeated ? 0.6 : 0.5;
          rootMesh.position.x -= nx * overlap * (1 - ratio);
          rootMesh.position.z -= nz * overlap * (1 - ratio);
          other.nudgePosition(nx * overlap * ratio, nz * overlap * ratio);

          if (isDefeated) {
            velX -= nx * Math.abs(velX) * 0.25;
            velZ -= nz * Math.abs(velZ) * 0.25;

            // In-flight domino impact: if this flying ragdoll crashes into an undefeated ragdoll
            const speedSq = velX * velX + velZ * velZ;
            if (speedSq > 16.0 && !other.isDefeated() && other.triggerHit) {
              const impactDir = new Vector3(velX, 0, velZ).normalize();
              other.triggerHit(new Vector3(oPos.x, oPos.y + 0.9, oPos.z), impactDir, 36.0);
            }
          }
        }
      });

      if (!isDefeated) {
        // Alive character gravity
        if (rootMesh.position.y > supportY + 0.005) {
          fallVelY -= 14.0 * delta;
          rootMesh.position.y += fallVelY * delta;

          if (rootMesh.position.y <= supportY) {
            rootMesh.position.y = supportY;
            fallVelY = 0;
          }
        } else {
          rootMesh.position.y = supportY;
          fallVelY = 0;
        }
        continue;
      }

      // Defeated ragdoll knockback physics
      // Resting groundY is flush with asphalt surface (supportY + 0.01) so ragdoll rests firmly on ground without floating
      const groundY = supportY + 0.01;

      const inAir = rootMesh.position.y > groundY;

      if (inAir) {
        // Airborne: real gravity arc + free tumble (body flops/flips through the air)
        velY -= GRAVITY * delta;
        rootMesh.position.y += velY * delta;

        rootMesh.rotation.x += rotVelX * delta;
        rootMesh.rotation.z += rotVelZ * delta;
        rootMesh.rotation.y += rotVelY * delta;

        // Light air resistance — carry across the street, keep tumbling
        velX *= 0.996;
        velZ *= 0.996;
        rotVelX *= 0.998;
        rotVelZ *= 0.998;
        rotVelY *= 0.996;
      } else {
        // Ground contact — clamp to asphalt
        rootMesh.position.y = groundY;

        // Landing impact: just came down from air with downward speed -> thud + small bounce
        if (prevInAir && velY < -1.0) {
          const impactSpeed = Math.abs(velY);
          if (impactSpeed > 4.5) {
            playMaterialImpactSound('concrete');
            playHeavyPunch();
            spawnComicHitEffect(scene, rootMesh.position);
          } else if (impactSpeed > 2.0) {
            playMaterialImpactSound('concrete');
          }
        }
        velY = 0;

        // High-speed pavement sliding friction
        velX *= 0.978;
        velZ *= 0.978;

        // Settle onto pavement: damp the tumble, keep yaw spin briefly then fade
        rootMesh.rotation.x *= 0.88;
        rootMesh.rotation.z *= 0.88;
        rootMesh.rotation.y += rotVelY * delta;
        rotVelX *= 0.80;
        rotVelZ *= 0.80;
        rotVelY *= 0.92;
      }

      prevInAir = inAir;

      // Integrate horizontal travel (air & ground)
      rootMesh.position.x += velX * delta;
      rootMesh.position.z += velZ * delta;

      // Obstacle & Wall collisions via 3D MTV penetration resolution (never penetrates into obstacles)
      const obstacles = obstacleManager.getAllObstacles();
      const ragdollRadius = 0.44;
      for (const obs of obstacles) {
        if (obs.isDestroyed) continue;
        const bounds = obstacleManager.getObstacleBounds(obs);

        if ((obs as any).isLaunched) {
          // In-flight impact: high-speed flying obstacle launches undefeated brawlers in its flight path
          const obsVel = obs.velocity;
          const obsSpeedSq = obsVel.x * obsVel.x + obsVel.z * obsVel.z;
          if (!isDefeated && obsSpeedSq > 36.0 && bounds) {
            const rx = rootMesh.position.x;
            const rz = rootMesh.position.z;
            const ry = rootMesh.position.y;
            if (
              rx >= bounds.min.x - 0.35 && rx <= bounds.max.x + 0.35 &&
              ry >= bounds.min.y - 0.30 && ry <= bounds.max.y + 0.50 &&
              rz >= bounds.min.z - 0.35 && rz <= bounds.max.z + 0.35
            ) {
              const hitDir = new Vector3(obsVel.x, 0, obsVel.z).normalize();
              triggerHit(new Vector3(rx, ry + 0.9, rz), hitDir, 42.0);
            }
          }
          continue;
        }

        const res = resolveBodyVsAABB(
          rootMesh.position.x,
          rootMesh.position.y,
          rootMesh.position.z,
          velX,
          velY,
          velZ,
          ragdollRadius,
          0.38,
          ragdollRadius,
          bounds,
          0.7,
          0.2,
          true
        );
        if (res.collided) {
          // If a flying defeated ragdoll crashes into an obstacle at high speed, launch that obstacle too
          if (isDefeated && Math.hypot(velX, velZ) > 6.0 && !isPermanentObstacle(obs.name, obs.modelPath, obs.id)) {
            const hitDir = new Vector3(velX, 0, velZ).normalize();
            obstacleManager.launchObstacle(obs, hitDir, 60.0);
          }
          rootMesh.position.x = res.x;
          rootMesh.position.y = res.y;
          rootMesh.position.z = res.z;
          velX = res.vx;
          velY = res.vy;
          velZ = res.vz;
        }

        // Additional head/torso containment: if headNode enters solid obstacle, push root back
        if (character.headNode) {
          const headPos = character.headNode.getAbsolutePosition();
          const headRes = resolveBodyVsAABB(
            headPos.x,
            headPos.y,
            headPos.z,
            0,
            0,
            0,
            0.28,
            0.28,
            0.28,
            bounds,
            0.8,
            0.1,
            false
          );
          if (headRes.collided && !headRes.isOnTop) {
            rootMesh.position.x += (headRes.x - headPos.x);
            rootMesh.position.z += (headRes.z - headPos.z);
          }
        }
      }
      // Building collision: prevent defeated ragdoll from entering buildings (left/right side structures)
      const buildingColliders = obstacleManager.getEnvironmentColliders();
      for (const collider of buildingColliders) {
        const buildingBounds: BoundingBox3D = {
          min: collider.min,
          max: collider.max,
        };
        const res = resolveBodyVsAABB(
          rootMesh.position.x,
          rootMesh.position.y,
          rootMesh.position.z,
          velX,
          velY,
          velZ,
          ragdollRadius,
          0.38,
          ragdollRadius,
          buildingBounds,
          0.7,
          0.2,
          true
        );
        if (res.collided) {
          rootMesh.position.x = res.x;
          rootMesh.position.y = res.y;
          rootMesh.position.z = res.z;
          velX = res.vx;
          velY = res.vy;
          velZ = res.vz;
        }
      }

      // Building corridor boundaries: bounce defeated ragdolls off left & right buildings
      const leftBuildingWall = -14.8;
      const rightBuildingWall = 15.2;
      if (rootMesh.position.x <= leftBuildingWall) {
        rootMesh.position.x = leftBuildingWall;
        velX = Math.max(8.0, Math.abs(velX) * 0.45);
      } else if (rootMesh.position.x >= rightBuildingWall) {
        rootMesh.position.x = rightBuildingWall;
        velX = -Math.max(8.0, Math.abs(velX) * 0.45);
      }

      // Generous boundaries so ragdoll can fly far away down the avenue without hitting artificial walls
      if (rootMesh.position.z > 110.0) {
        rootMesh.position.z = 110.0;
        velZ = 0;
      }
      if (rootMesh.position.z < -10.0) {
        rootMesh.position.z = -10.0;
        velZ = 0;
      }
      // Strict ground clamp & high-speed pavement sliding friction
      if (rootMesh.position.y <= groundY) {
        rootMesh.position.y = groundY;
        velY = 0;
        // Smooth high-velocity sliding friction: allows ragdoll to slide 35-50 meters across the street
        velX *= 0.978;
        velZ *= 0.978;
        rotVelY *= 0.95;
      }
    }
  });

  const dispose = (): void => {
    activeRagdolls.delete(internalRef);
    scene.onBeforeRenderObservable.remove(floorObserver);
  };
  character.mainMesh.onDisposeObservable.add(dispose);

  const triggerHit = (hitPoint: Vector3, shootDirection: Vector3, force = 28): void => {
    // Exact horizontal hit direction vector (along X and Z on the ground plane)
    const horizLen = Math.hypot(shootDirection.x, shootDirection.z) || 1.0;
    let dirX = shootDirection.x / horizLen;
    let dirZ = shootDirection.z / horizLen;

    // Random horizontal spread so each ragdoll flies in a slightly different direction
    // when punched, instead of all marching in the exact same line
    const spreadAngle = (Math.random() - 0.5) * 0.7; // ±0.35 rad (~±20 degrees)
    const cos = Math.cos(spreadAngle);
    const sin = Math.sin(spreadAngle);
    const spreadDirX = dirX * cos - dirZ * sin;
    const spreadDirZ = dirX * sin + dirZ * cos;
    dirX = spreadDirX;
    dirZ = spreadDirZ;

    if (isDefeated) {
      // Juggling combo hit: slide again far along the exact same punch direction
      const reSpeed = Math.max(force * 1.6, 65.0);
      velX = dirX * reSpeed;
      velY = Math.min(force * 0.15, 6.0); // small upward pop on juggle hit
      velZ = dirZ * reSpeed;
      const tumble = 5.0 + Math.min(force, 100) * 0.05;
      rotVelX = dirZ * tumble;
      rotVelZ = -dirX * tumble;
      rotVelY += (dirX >= 0 ? 1 : -1) * 8.0;
      playBoingSound();
      spawnComicHitEffect(scene, hitPoint);
      character.setDefeatedFace?.(true);
      return;
    }

    const activeAnims = character.animationGroups.filter((ag) => ag.isPlaying).map((ag) => ag.name);
    const wasSitting = activeAnims.some((n) => n.toLowerCase().includes('sit'));

    isRagdoll = true;
    isDefeated = true;
    character.setDefeatedFace?.(true);
    supportingObstacle = null;

    if (character.magicController) {
      character.magicController.dissipate();
    }

    character.playAnimation('Death01', false, 1.35);
    playHitSound();
    playRagdollDeathSound(deathSoundVariant);
    spawnComicHitEffect(scene, hitPoint);

    // Explosive high-velocity knockback:
    // Moves in the EXACT SAME DIRECTION that the punch went ("jis taraf abhi punch gaya hai usi taraf ragdoll hit hoke jayega")
    // Gravity arc: flies up, then gravity slams it back onto the pavement
    // High arcade throw speed & long slide into the horizon ("thoda aur dur and speed me throw karo")
    const knockbackSpeed = Math.max(force * 1.6, 78.0);

    velX = dirX * knockbackSpeed;
    velY = Math.min(force * 0.20, 12.0); // upward lift — harder hit = higher arc
    velZ = dirZ * knockbackSpeed;

    // Tumble: body flips/flops mid-air instead of sliding like a top
    const tumble = 4.0 + Math.min(force, 100) * 0.05;
    rotVelX = dirZ * tumble;
    rotVelZ = -dirX * tumble;
    rotVelY = (dirX >= 0 ? 1 : -1) * (8.0 + Math.abs(dirX) * 5.0);

    if (wasSitting) {
      // Natural tumble forward off seat away from the backrest onto open floor
      const facingAngle = rootMesh.rotation.y || 0;
      const forwardX = Math.sin(facingAngle);
      const forwardZ = Math.cos(facingAngle);
      velX += forwardX * 1.1;
      velZ += forwardZ * 1.1;
      velY = 0;
    }
  };
  return {
    character,
    get isRagdoll() { return isRagdoll; },
    get isDefeated() { return isDefeated; },
    triggerHit,
    getPosition: () => rootMesh.position,
    getSupportingObstacle: () => supportingObstacle,
    dispose,
  };
}
