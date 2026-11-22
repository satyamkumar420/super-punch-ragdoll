import {
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
  type Scene,
} from '@babylonjs/core';
import {
  type ObstacleState,
  type ObstacleMaterialType,
  OBSTACLE_MATERIALS,
} from './obstacleTypes';
import { isPermanentObstacle } from './obstacleDefaults';

/**
 * Triggers a comic impact vibration / shudder on the obstacle root node.
 * Immovable and permanent heavy structures (houses, buildings, walls) NEVER shudder.
 */
export function triggerMeshShudder(scene: Scene | null, state: ObstacleState): void {
  if (!scene) return;
  if (!state.isMovable || isPermanentObstacle(state.name, state.modelPath, state.id)) return;
  const root = state.rootNode;
  const origRotX = root.rotation?.x ?? 0;
  const origRotZ = root.rotation?.z ?? 0;
  let shudderTime = 0;

  const shudderObs = scene.onBeforeRenderObservable.add(() => {
    shudderTime += 0.22;
    const decay = Math.max(0, 1.0 - shudderTime);
    if (root.rotation) {
      root.rotation.x = origRotX + Math.sin(shudderTime * 24) * 0.08 * decay;
      root.rotation.z = origRotZ + Math.cos(shudderTime * 24) * 0.08 * decay;
    }

    if (shudderTime >= 1.0) {
      scene.onBeforeRenderObservable.remove(shudderObs);
      if (root.rotation) {
        root.rotation.x = origRotX;
        root.rotation.z = origRotZ;
      }
    }
  });
}

/**
 * Spawns material-colored sparks and debris particles at the impact site.
 */
export function spawnImpactFX(
  scene: Scene | null,
  pos: Vector3,
  dir: Vector3,
  material: ObstacleMaterialType
): void {
  if (!scene) return;
  const matConfig = OBSTACLE_MATERIALS[material] || OBSTACLE_MATERIALS.wood;
  const col = matConfig.debrisColor;

  const sparkMat = new StandardMaterial(`matImpact_${Date.now()}_${Math.random()}`, scene);
  sparkMat.diffuseColor = new Color3(col[0], col[1], col[2]);
  sparkMat.emissiveColor = new Color3(col[0] * 0.8, col[1] * 0.8, col[2] * 0.8);
  sparkMat.specularColor = new Color3(0.1, 0.1, 0.1);

  const count = material === 'metal' ? 8 : 5;
  let remaining = count;
  for (let i = 0; i < count; i++) {
    const spark = MeshBuilder.CreateSphere(`obsDebris_${i}`, { diameter: 0.045 }, scene);
    spark.position.copyFrom(pos);
    spark.material = sparkMat;

    const spreadX = -dir.x * (1.2 + Math.random() * 2.5) + (Math.random() - 0.5) * 1.8;
    const spreadY = 1.0 + Math.random() * 2.2;
    const spreadZ = (Math.random() - 0.5) * 1.5;
    const vel = new Vector3(spreadX, spreadY, spreadZ);

    let life = 0;
    const obs = scene.onBeforeRenderObservable.add(() => {
      life += 0.06;
      const delta = scene.getEngine().getDeltaTime() / 1000;
      spark.position.addInPlace(vel.scale(delta));
      vel.y -= 9.8 * delta;
      spark.scaling.scaleInPlace(0.94);

      if (life >= 1.0) {
        scene.onBeforeRenderObservable.remove(obs);
        spark.geometry?.dispose();
        spark.dispose(false, true);
        remaining--;
        if (remaining <= 0) {
          sparkMat.dispose();
        }
      }
    });
  }
}

/**
 * Spawns geometric break shards when a destructible obstacle is shattered.
 */
export function spawnDestructionShatter(
  scene: Scene | null,
  state: ObstacleState,
  hitPoint: Vector3,
  impactDir: Vector3
): void {
  if (!scene) return;
  const matConfig = OBSTACLE_MATERIALS[state.material] || OBSTACLE_MATERIALS.wood;
  const col = matConfig.debrisColor;

  const shardMat = new StandardMaterial(`shatterMat_${Date.now()}`, scene);
  shardMat.diffuseColor = new Color3(col[0], col[1], col[2]);
  shardMat.emissiveColor = new Color3(col[0] * 0.35, col[1] * 0.35, col[2] * 0.35);

  const shardCount = 10;
  let remainingShards = shardCount;
  for (let i = 0; i < shardCount; i++) {
    const w = 0.08 + Math.random() * 0.14;
    const h = 0.08 + Math.random() * 0.14;
    const d = 0.08 + Math.random() * 0.14;
    const shard = MeshBuilder.CreateBox(`shard_${i}`, { width: w, height: h, depth: d }, scene);
    shard.position.copyFrom(
      hitPoint.add(
        new Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.2
        )
      )
    );
    shard.material = shardMat;

    const vel = new Vector3(
      impactDir.x * (1.8 + Math.random() * 2.8) + (Math.random() - 0.5) * 2.2,
      2.5 + Math.random() * 3.2,
      impactDir.z * 1.5 + (Math.random() - 0.5) * 2.0
    );
    const rotSpeed = (Math.random() - 0.5) * 12.0;

    let life = 0;
    const obs = scene.onBeforeRenderObservable.add(() => {
      life += 0.035;
      const delta = scene.getEngine().getDeltaTime() / 1000;
      shard.position.addInPlace(vel.scale(delta));
      shard.rotation.x += rotSpeed * delta;
      shard.rotation.y += rotSpeed * delta;
      vel.y -= 13.0 * delta;

      if (shard.position.y <= 0.02) {
        shard.position.y = 0.02;
        vel.y = 0;
        vel.x *= 0.85;
        vel.z *= 0.85;
      }

      if (life >= 0.7) {
        shard.scaling.scaleInPlace(0.92);
      }

      if (life >= 1.0) {
        scene.onBeforeRenderObservable.remove(obs);
        shard.geometry?.dispose();
        shard.dispose(false, true);
        remainingShards--;
        if (remainingShards <= 0) {
          shardMat.dispose();
        }
      }
    });
  }
}
