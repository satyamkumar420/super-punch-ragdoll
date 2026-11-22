import {
  Vector3,
  type Scene,
  type AbstractMesh,
  type TransformNode,
} from '@babylonjs/core';
import {
  type ObstacleConfig,
  type ObstacleState,
  OBSTACLE_MATERIALS,
} from './obstacleTypes';
import { playMaterialImpactSound, playObstacleBreakSound } from '../audio';
import { triggerMeshShudder, spawnImpactFX, spawnDestructionShatter } from './obstacleFx';
import { isPermanentObstacle, inferPhysicalDefaults } from './obstacleDefaults';

export { isPermanentObstacle, inferPhysicalDefaults };

export class ObstacleManager {
  private obstacles: Map<string, ObstacleState> = new Map();
  private meshToObstacleId: Map<AbstractMesh, string> = new Map();
  private scene: Scene | null = null;
  private renderObserver: any = null;
  // Static environment colliders (buildings, walls) that obstacles bounce off
  private environmentColliders: { min: Vector3; max: Vector3 }[] = [];

  public init(scene: Scene): void {
    this.scene = scene;
    if (this.renderObserver) {
      scene.onBeforeRenderObservable.remove(this.renderObserver);
    }
    this.renderObserver = scene.onBeforeRenderObservable.add(() => {
      this.updatePhysics();
    });
  }

  public clear(): void {
    this.obstacles.clear();
    this.meshToObstacleId.clear();
    // NOTE: environmentColliders are NOT cleared here because buildings are part of
    // the persistent street environment (registered once in scene.ts) and do not
    // change between levels.
  }

  /** Register a static environment AABB (e.g. building) that launched obstacles bounce off */
  public registerEnvironmentCollider(min: Vector3, max: Vector3): void {
    this.environmentColliders.push({ min: min.clone(), max: max.clone() });
  }

  /** Get all static environment colliders (e.g. buildings) */
  public getEnvironmentColliders(): { min: Vector3; max: Vector3 }[] {
    return this.environmentColliders;
  }

  /** Clear all environment colliders (called between levels) */
  public clearEnvironmentColliders(): void {
    this.environmentColliders = [];
  }

  public dispose(): void {
    if (this.scene && this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }
    this.clear();
    this.scene = null;
  }

  public inferPhysicalDefaults(...identifiers: (string | undefined | null)[]): Required<ObstacleConfig> {
    return inferPhysicalDefaults(...identifiers);
  }

  public registerObstacle(
    rootNode: TransformNode,
    mainMesh: AbstractMesh,
    allMeshes: AbstractMesh[],
    config: ObstacleConfig = {}
  ): ObstacleState {
    const id = config.id || `obs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const inferred = inferPhysicalDefaults(config.modelPath, config.name, rootNode.name, mainMesh.name, id);
    const isPermanent = isPermanentObstacle(config.modelPath, config.name, rootNode.name, mainMesh.name, id);

    const material = config.material ?? inferred.material;
    const maxDurability = isPermanent ? 0 : (config.durability !== undefined ? config.durability : inferred.durability);
    const isDestructible = isPermanent ? false : (config.isDestructible !== undefined ? config.isDestructible : (maxDurability > 0));
    const isMovable = isPermanent ? false : (config.isMovable !== undefined ? config.isMovable : inferred.isMovable);
    const mass = isPermanent ? Math.max(50000, config.mass ?? inferred.mass) : Math.max(1, config.mass ?? inferred.mass);
    const penetrationResistance = isPermanent
      ? 250
      : (config.penetrationResistance ?? (
          config.material ? OBSTACLE_MATERIALS[config.material].penetrationResistance : inferred.penetrationResistance
        ));
    const isPenetrable = isPermanent ? false : (config.isPenetrable ?? false);
    const scoreReward = isPermanent ? 0 : (config.scoreReward ?? inferred.scoreReward);

    const restingY = rootNode.position.y;

    const state: ObstacleState = {
      id,
      name: config.name || rootNode.name,
      modelPath: config.modelPath,
      rootNode,
      mesh: mainMesh,
      allMeshes,
      material,
      maxDurability,
      currentDurability: maxDurability,
      isDestructible,
      isMovable,
      mass,
      isPenetrable,
      penetrationResistance,
      scoreReward,
      isDestroyed: false,
      velocity: new Vector3(0, 0, 0),
      angularVelocityY: 0,
      restingY,
    };

    this.obstacles.set(id, state);

    // Map each child mesh to this obstacle state for instant lookup
    allMeshes.forEach((m) => {
      this.meshToObstacleId.set(m, id);
      m.metadata = {
        ...(m.metadata || {}),
        isObstacle: true,
        obstacleId: id,
        obstacleMaterial: material,
      };
    });

    return state;
  }

  public unregisterObstacle(id: string): void {
    const obs = this.obstacles.get(id);
    if (!obs) return;

    obs.allMeshes.forEach((m) => {
      this.meshToObstacleId.delete(m);
      if (m.metadata) {
        m.metadata.isObstacle = false;
        delete m.metadata.obstacleId;
        delete m.metadata.obstacleMaterial;
      }
    });

    this.obstacles.delete(id);
  }

  public getObstacle(id: string): ObstacleState | undefined {
    return this.obstacles.get(id);
  }

  public getObstacleByMesh(mesh: AbstractMesh): ObstacleState | undefined {
    let curr: any = mesh;
    while (curr) {
      const id = this.meshToObstacleId.get(curr) || curr.metadata?.obstacleId;
      if (id && this.obstacles.has(id)) {
        return this.obstacles.get(id);
      }
      curr = curr.parent;
    }
    return undefined;
  }

  public getAllObstacles(): ObstacleState[] {
    return Array.from(this.obstacles.values());
  }

  public getObstacleBounds(obs: ObstacleState): { min: Vector3; max: Vector3 } {
    const currentPos = obs.rootNode?.position;
    const currentRot = obs.rootNode?.rotation;
    const isRotating = currentRot && (
      Math.abs(obs.angularVelocityY) > 0.01 ||
      Math.abs(obs.angularVelocityX || 0) > 0.01 ||
      Math.abs(obs.angularVelocityZ || 0) > 0.01
    );
    if (
      obs.cachedBounds &&
      obs.cachedPosition &&
      currentPos &&
      !isRotating &&
      obs.cachedPosition.equalsWithEpsilon(currentPos, 0.01) &&
      (!obs.isMovable || (obs.velocity.lengthSquared() < 0.0001 && Math.abs(obs.angularVelocityY) < 0.01))
    ) {
      return obs.cachedBounds;
    }

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    let hasValidMesh = false;

    const meshesToCheck = obs.allMeshes && obs.allMeshes.length > 0 ? obs.allMeshes : [obs.mesh];

    for (let i = 0; i < meshesToCheck.length; i++) {
      const m = meshesToCheck[i];
      if (!m) continue;
      m.computeWorldMatrix?.(true);
      const bInfo = m.getBoundingInfo?.();
      if (!bInfo) continue;

      const minW = bInfo.boundingBox.minimumWorld;
      const maxW = bInfo.boundingBox.maximumWorld;

      if (maxW.x !== minW.x || maxW.y !== minW.y || maxW.z !== minW.z) {
        hasValidMesh = true;
        if (minW.x < minX) minX = minW.x;
        if (minW.y < minY) minY = minW.y;
        if (minW.z < minZ) minZ = minW.z;
        if (maxW.x > maxX) maxX = maxW.x;
        if (maxW.y > maxY) maxY = maxW.y;
        if (maxW.z > maxZ) maxZ = maxW.z;
      }
    }

    if (!hasValidMesh) {
      const b = obs.mesh?.getBoundingInfo?.();
      if (b) {
        const minW = b.boundingBox.minimumWorld;
        const maxW = b.boundingBox.maximumWorld;
        if (maxW.y !== minW.y || maxW.x !== minW.x) {
          const res = {
            min: minW.clone(),
            max: maxW.clone(),
          };
          obs.cachedBounds = res;
          return res;
        }
      }
      const pos = obs.rootNode?.position || new Vector3(0, 0, 0);
      const res = {
        min: new Vector3(pos.x - 0.45, pos.y, pos.z - 0.45),
        max: new Vector3(pos.x + 0.45, pos.y + 0.65, pos.z + 0.45),
      };
      obs.cachedBounds = res;
      return res;
    }

    // For pier docks (e.g. nature/dock.glb), vertical pilings at the outer edges reach Y ~ 1.0,
    // while the actual walking deck plank surface is at local Y ~ 0.488.
    // Calibrate maxY to the deck surface so bullets fly freely across the pier walkway
    // and characters/ragdolls stand and settle cleanly on top of the planks.
    const isDock =
      (obs.name && obs.name.toLowerCase().includes('dock')) ||
      (obs.mesh?.name && obs.mesh.name.toLowerCase().includes('dock')) ||
      (obs.rootNode?.name && obs.rootNode.name.toLowerCase().includes('dock'));
    if (isDock) {
      const rootPos = obs.rootNode?.position;
      const rootScale = obs.rootNode?.scaling;
      const baseY = rootPos ? rootPos.y : minY;
      const scaleY = rootScale ? rootScale.y : 1.0;
      const deckSurfaceY = baseY + 0.488 * scaleY;
      maxY = Math.min(maxY, deckSurfaceY + 0.02);
    }

    const res = {
      min: new Vector3(minX, minY, minZ),
      max: new Vector3(maxX, maxY, maxZ),
    };
    if (currentPos) {
      obs.cachedPosition = currentPos.clone();
    }
    obs.cachedBounds = res;
    return res;
  }

  /**
   * Applies realistic physics impulse and damage to the obstacle.
   * Real-world permanent objects (cars, buildings, walls) NEVER get destroyed or hidden.
   */
  public applyImpact(
    state: ObstacleState,
    hitPoint: Vector3,
    direction: Vector3,
    damage: number,
    force: number
  ): { destroyed: boolean; damageApplied: number; pointsAwarded: number } {
    if (state.isDestroyed) {
      return { destroyed: false, damageApplied: 0, pointsAwarded: 0 };
    }

    // 1. Play realistic material collision audio
    playMaterialImpactSound(state.material);

    // 2. Spawn material-specific impact sparks & debris
    spawnImpactFX(this.scene, hitPoint, direction, state.material);

    // 3. Apply physical impulse to movable objects according to mass
    if (state.isMovable && !isPermanentObstacle(state.name, state.modelPath, state.id) && state.mass > 0) {
      const speed = Math.min(force / state.mass, 4.5);
      state.velocity.x += direction.x * speed;
      state.velocity.y += Math.max(0.4, speed * 0.25);
      state.velocity.z += direction.z * speed;
      state.angularVelocityY += (Math.random() - 0.5) * Math.min(3.0, 15.0 / state.mass);
    }

    // 4. Visual impact comic shudder/shake ONLY for small non-permanent props
    if (state.isMovable && !isPermanentObstacle(state.name, state.modelPath, state.id)) {
      triggerMeshShudder(this.scene, state);
    }

    let destroyed = false;
    let pointsAwarded = 0;

    // 5. Apply durability damage to destructible obstacles ONLY
    // Cars, houses, buildings, and permanent structures are INDESTRUCTIBLE and NEVER disappear/hide
    if (
      !isPermanentObstacle(state.name, state.modelPath, state.id) &&
      state.isDestructible &&
      state.maxDurability > 0
    ) {
      state.currentDurability -= damage;

      if (state.currentDurability <= 0) {
        destroyed = true;
        state.isDestroyed = true;
        pointsAwarded = state.scoreReward > 0 ? state.scoreReward : 20;

        // Sound & Shatter burst
        playObstacleBreakSound();
        spawnDestructionShatter(this.scene, state, hitPoint, direction);

        // Hide and disable collisions on destructible debris (e.g. chairs, crates)
        state.allMeshes.forEach((m) => {
          m.checkCollisions = false;
          m.isVisible = false;
          if (typeof m.setEnabled === 'function') {
            m.setEnabled(false);
          }
          if (m.metadata) m.metadata.isObstacle = false;
        });
      }
    }

    return { destroyed, damageApplied: damage, pointsAwarded };
  }

  /**
   * Explosively launches an obstacle away in the punch direction with high velocity & spin.
   */
  public launchObstacle(
    state: ObstacleState,
    direction: Vector3,
    force = 65.0
  ): void {
    if (state.isDestroyed || state.isLaunched) return;
    if (isPermanentObstacle(state.name, state.modelPath, state.id)) return;

    // Dispose static Havok body if any exists so mesh can move freely
    if ((state as any).physicsAgg) {
      try {
        (state as any).physicsAgg.dispose();
      } catch (_) {}
      (state as any).physicsAgg = null;
    }
    if (state.rootNode) {
      (state.rootNode as any).rotationQuaternion = null;
    }

    state.isMovable = true;
    state.isLaunched = true;

    // Normalize horizontal direction
    const horizLen = Math.hypot(direction.x, direction.z) || 1.0;
    let dirX = direction.x / horizLen;
    let dirZ = direction.z / horizLen;

    // Random horizontal spread so each obstacle flies in a slightly different direction
    // (like real thrown objects scattering, not all marching in one line)
    const spreadAngle = (Math.random() - 0.5) * 0.7; // ±0.35 rad (~±20 degrees)
    const cos = Math.cos(spreadAngle);
    const sin = Math.sin(spreadAngle);
    const spreadDirX = dirX * cos - dirZ * sin;
    const spreadDirZ = dirX * sin + dirZ * cos;
    dirX = spreadDirX;
    dirZ = spreadDirZ;

    const lower = (state.name + ' ' + (state.modelPath || '')).toLowerCase();
    const isHeavyCar = lower.includes('car') || lower.includes('sedan') || lower.includes('suv') || lower.includes('taxi');

    // High explosive throw speed matching ragdoll launch ("dur throw ho")
    const throwSpeed = isHeavyCar ? Math.max(force * 0.95, 55.0) : Math.max(force * 1.1, 65.0);
    state.velocity.x = dirX * throwSpeed;
    state.velocity.y = isHeavyCar ? 1.5 : 4.0;
    state.velocity.z = dirZ * throwSpeed;

    state.angularVelocityY = (dirX >= 0 ? 1 : -1) * (isHeavyCar ? 3.5 : 8.0);
    state.angularVelocityX = (Math.random() - 0.5) * (isHeavyCar ? 1.0 : 6.0);
    state.angularVelocityZ = (Math.random() - 0.5) * (isHeavyCar ? 1.0 : 6.0);

    // Audio & Comic FX
    playMaterialImpactSound(state.material);
    if (this.scene) {
      const effectPos = state.rootNode.position.add(new Vector3(0, isHeavyCar ? 0.8 : 0.4, 0));
      spawnImpactFX(this.scene, effectPos, direction, state.material);
    }
  }

  /**
   * Physics loop for movable obstacles (knocking tables, chairs, barrels, cars around with realistic friction)
   */
  private updatePhysics(): void {
    if (!this.scene) return;
    const rawDelta = this.scene.getEngine().getDeltaTime() / 1000;
    if (rawDelta <= 0) return;
    const delta = Math.min(rawDelta, 0.04);

    this.obstacles.forEach((state) => {
      if (state.isDestroyed || isPermanentObstacle(state.name, state.modelPath, state.id)) return;

      const isMoving = state.isLaunched || state.velocity.lengthSquared() > 0.0001;
      if (!isMoving) return;

      const root = state.rootNode;

      // Integrate motion
      root.position.x += state.velocity.x * delta;
      root.position.y += state.velocity.y * delta;
      root.position.z += state.velocity.z * delta;

      if (root.rotation) {
        root.rotation.y += state.angularVelocityY * delta;
        if (state.angularVelocityX) root.rotation.x += state.angularVelocityX * delta;
        if (state.angularVelocityZ) root.rotation.z += state.angularVelocityZ * delta;
      }

      // Gravity applies while in air
      state.velocity.y -= 18.0 * delta;

      // Dynamic 3D ground contact & floor clamp:
      // Computes lowest point of all meshes in world space to prevent ANY obstacle (barrels, cars, boxes)
      // from sinking beneath the ground when tumbling, rolling, or sliding.
      root.computeWorldMatrix(true);
      const meshesToCheck = state.allMeshes && state.allMeshes.length > 0 ? state.allMeshes : [state.mesh];
      let lowestMeshY = root.position.y;
      for (let i = 0; i < meshesToCheck.length; i++) {
        const m = meshesToCheck[i];
        if (!m || (m.getTotalVertices && m.getTotalVertices() === 0)) continue;
        m.computeWorldMatrix(true);
        const b = m.getBoundingInfo?.()?.boundingBox;
        if (b && b.minimumWorld.y < lowestMeshY) {
          lowestMeshY = b.minimumWorld.y;
        }
      }

      const groundLevel = Math.max(0, state.restingY);
      if (lowestMeshY <= groundLevel) {
        const penetration = groundLevel - lowestMeshY;
        root.position.y += penetration;
        if (state.velocity.y < 0) {
          state.velocity.y = 0;
        }

        // Settle tumbling roll back onto pavement
        if (root.rotation) {
          root.rotation.x *= 0.90;
          root.rotation.z *= 0.90;
        }
      } else if (root.position.y <= state.restingY) {
        root.position.y = state.restingY;
        if (state.velocity.y < 0) {
          state.velocity.y = 0;
        }
      }

      // --- Continuous Avenue Building Facades (Prevents ANY obstacle from ever entering left/right buildings) ---
      const leftBuildingWall = -14.8;
      const rightBuildingWall = 15.2;
      const buildingRestitution = 0.55;

      if (root.position.x <= leftBuildingWall) {
        root.position.x = leftBuildingWall;
        state.velocity.x = Math.max(12.0, Math.abs(state.velocity.x) * buildingRestitution);
        state.angularVelocityY *= 0.4;
        if (state.angularVelocityX) state.angularVelocityX *= 0.4;
        if (state.angularVelocityZ) state.angularVelocityZ *= 0.4;
        playMaterialImpactSound(state.material);
        if (this.scene) {
          spawnImpactFX(this.scene, root.position, state.velocity, state.material);
        }
      } else if (root.position.x >= rightBuildingWall) {
        root.position.x = rightBuildingWall;
        state.velocity.x = -Math.max(12.0, Math.abs(state.velocity.x) * buildingRestitution);
        state.angularVelocityY *= 0.4;
        if (state.angularVelocityX) state.angularVelocityX *= 0.4;
        if (state.angularVelocityZ) state.angularVelocityZ *= 0.4;
        playMaterialImpactSound(state.material);
        if (this.scene) {
          spawnImpactFX(this.scene, root.position, state.velocity, state.material);
        }
      }

      // Street avenue Z boundaries
      if (root.position.z <= -6.0) {
        root.position.z = -6.0;
        state.velocity.z = Math.abs(state.velocity.z) * 0.4;
      } else if (root.position.z >= 105.0) {
        root.position.z = 105.0;
        state.velocity.z = -Math.abs(state.velocity.z) * 0.3;
      }

      // --- Building / Environment Collision: bounce obstacles off static buildings ---
      // Obstacle radius (approximate, so it doesn't sink halfway into walls)
      const obsRadius = 0.5;
      for (const collider of this.environmentColliders) {
        const minX = collider.min.x - obsRadius;
        const maxX = collider.max.x + obsRadius;
        const minY = collider.min.y - obsRadius;
        const maxY = collider.max.y + obsRadius;
        const minZ = collider.min.z - obsRadius;
        const maxZ = collider.max.z + obsRadius;

        const inside =
          root.position.x >= minX && root.position.x <= maxX &&
          root.position.y >= minY && root.position.y <= maxY &&
          root.position.z >= minZ && root.position.z <= maxZ;

        if (!inside) continue;

        // If obstacle entered from street side (+X into left buildings, or -X into right buildings):
        // Always push back towards street along X axis
        if (collider.max.x <= 0) {
          // Left building flank: push back towards street (+X)
          root.position.x = maxX;
          state.velocity.x = Math.max(10.0, Math.abs(state.velocity.x) * buildingRestitution);
        } else if (collider.min.x >= 0) {
          // Right building flank: push back towards street (-X)
          root.position.x = minX;
          state.velocity.x = -Math.max(10.0, Math.abs(state.velocity.x) * buildingRestitution);
        } else {
          // Generic AABB resolution
          const penLeft = root.position.x - minX;
          const penRight = maxX - root.position.x;
          if (penLeft < penRight) {
            root.position.x = minX;
            state.velocity.x = Math.min(0, -Math.abs(state.velocity.x) * buildingRestitution);
          } else {
            root.position.x = maxX;
            state.velocity.x = Math.max(0, Math.abs(state.velocity.x) * buildingRestitution);
          }
        }

        // Dampen spin on impact
        state.angularVelocityY *= 0.4;
        if (state.angularVelocityX) state.angularVelocityX *= 0.4;
        if (state.angularVelocityZ) state.angularVelocityZ *= 0.4;

        // Play impact sound & FX for building collision
        playMaterialImpactSound(state.material);
        if (this.scene) {
          spawnImpactFX(this.scene, root.position, state.velocity, state.material);
        }

        break; // resolve one environment collision per frame
      }

      // In-flight domino impact: high-speed flying obstacles launch stationary obstacles in their path
      if (state.isLaunched && Math.hypot(state.velocity.x, state.velocity.z) > 10.0) {
        const boundsA = this.getObstacleBounds(state);
        this.obstacles.forEach((other) => {
          if (other.id === state.id || other.isDestroyed || other.isLaunched || isPermanentObstacle(other.name, other.modelPath, other.id)) return;
          const boundsB = this.getObstacleBounds(other);
          if (!boundsA || !boundsB) return;
          const overlapX = boundsA.min.x <= boundsB.max.x && boundsA.max.x >= boundsB.min.x;
          const overlapY = boundsA.min.y <= boundsB.max.y && boundsA.max.y >= boundsB.min.y;
          const overlapZ = boundsA.min.z <= boundsB.max.z && boundsA.max.z >= boundsB.min.z;
          if (overlapX && overlapY && overlapZ) {
            const hitDir = new Vector3(state.velocity.x, 0, state.velocity.z).normalize();
            this.launchObstacle(other, hitDir, 60.0);
          }
        });
      }

      // Smooth long-distance slide damping matching ragdoll slide!
      const friction = Math.pow(0.990, delta * 60);
      state.velocity.x *= friction;
      state.velocity.z *= friction;
      state.angularVelocityY *= friction;
      if (state.angularVelocityX) state.angularVelocityX *= friction;
      if (state.angularVelocityZ) state.angularVelocityZ *= friction;
    });
  }
}

export const obstacleManager = new ObstacleManager();
