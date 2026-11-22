import {
  Scene,
  Vector3,
  Color4,
  Color3,
  type ShadowGenerator,
} from '@babylonjs/core';
import type { LevelConfig, LevelData, JsonLevelConfig } from '../config/levelTypes';
import { loadAllProps } from './propLoader';
import { loadCharacter } from '../character';
import { createCharacterRagdollController, clearActiveRagdolls, type RagdollController } from '../ragdoll';
import { createParkEnvironment, createIslandEnvironment } from '../props';

export function createLevelFromConfig(config: LevelConfig): LevelData {
  return {
    id: config.id,
    name: config.name,
    subtitle: config.subtitle,
    skyColor: config.skyColor,
    grassColor: config.grassColor,
    ammo: config.ammo,
    gunSpawnPos: config.gunSpawnPos,
    gunRotation: config.gunRotation,
    gunScale: config.gunScale,
    cameraRadius: config.cameraRadius,
    cameraTarget: config.cameraTarget,
    cameraAlpha: config.cameraAlpha,
    cameraBeta: config.cameraBeta,
    environmentType: config.environmentType,
    targets: config.targets,
    props: config.props,
    setup: async (scene: Scene, shadowGen?: ShadowGenerator) => {
      const disposables: { dispose: () => void }[] = [];

      // 1. Load static GLB props
      if (config.props && config.props.length > 0) {
        const { disposables: propDisposables } = await loadAllProps(scene, config.props, shadowGen);
        disposables.push(...propDisposables);
      }

      // 2. Custom environment setup (e.g. park trees or room walls)
      if (config.customSetup) {
        const customResult = config.customSetup(scene, shadowGen);
        if (customResult && typeof customResult.dispose === 'function') {
          disposables.push(customResult);
        }
      }

      // 3. Load Characters / Targets
      const controllers: RagdollController[] = [];
      for (let i = 0; i < config.targets.length; i++) {
        const tc = config.targets[i];
        const prefix = tc.namePrefix || `l${config.id}_t${i + 1}`;
        const animNames = tc.animationNames && tc.animationNames.length > 0
          ? tc.animationNames
          : (tc.animationName ? [tc.animationName] : ['Dance_Loop']);

        const char = await loadCharacter(scene, {
          position: tc.position || new Vector3(0, 0, 0),
          rotationY: tc.rotationY,
          scale: tc.scale ?? 1.0,
          animationName: animNames[0],
          animationNames: animNames,
          animationSpeed: tc.animationSpeed,
          namePrefix: prefix,
          shadowGen,
          swordModelPath: tc.weaponModelPath || tc.swordModelPath,
          swordScale: tc.swordScale,
          swordRotation: tc.swordRotation,
          swordPosition: tc.swordPosition,
          magicFx: tc.magicFx,
        });

        disposables.push(char);
        const ctrl = createCharacterRagdollController(char, scene);
        controllers.push(ctrl);
        if (ctrl.dispose) {
          disposables.push({ dispose: ctrl.dispose });
        }

        // Dynamic Walking Patrol Support - Only runs if target has an active locomotion/walking animation
        const animList = tc.animationNames && tc.animationNames.length > 0
          ? tc.animationNames
          : (tc.animationName ? [tc.animationName] : []);
        const hasWalkAnim = animList.some((a) => {
          const lower = (a || '').toLowerCase();
          return lower.includes('walk') || lower.includes('jog') || lower.includes('sprint') || lower.includes('run');
        });

        if (tc.isPatrolling && tc.patrolRange && hasWalkAnim) {
          const [minX, maxX] = tc.patrolRange;
          const speed = tc.patrolSpeed || 0.9;
          let dir = tc.rotationY !== undefined && Math.abs(tc.rotationY - Math.PI / 2) < 0.2 ? 1 : -1;
          const rootNode = char.rootNode;
          rootNode.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;

          const patrolObs = scene.onBeforeRenderObservable.add(() => {
            if (ctrl.isRagdoll || ctrl.isDefeated) {
              scene.onBeforeRenderObservable.remove(patrolObs);
              return;
            }
            const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
            rootNode.position.x += dir * speed * dt;
            if (dir > 0 && rootNode.position.x >= maxX) {
              dir = -1;
              rootNode.position.x = maxX;
              rootNode.rotation.y = -Math.PI / 2;
            } else if (dir < 0 && rootNode.position.x <= minX) {
              dir = 1;
              rootNode.position.x = minX;
              rootNode.rotation.y = Math.PI / 2;
            }
          });
          disposables.push({ dispose: () => scene.onBeforeRenderObservable.remove(patrolObs) });
        }
      }

      const cleanup = () => {
        disposables.forEach((d) => {
          try {
            d.dispose();
          } catch (err) {
            console.error('Error disposing object in level cleanup', err);
          }
        });
        clearActiveRagdolls();
        scene.cleanCachedTextureBuffer();
      };

      return {
        controllers,
        cleanup,
      };
    },
  };
}

export function parseJsonLevel(json: JsonLevelConfig): LevelData {
  const config: LevelConfig = {
    id: json.id,
    name: json.name,
    subtitle: json.subtitle,
    skyColor: new Color4(json.skyColor[0], json.skyColor[1], json.skyColor[2], json.skyColor[3]),
    grassColor: json.grassColor ? new Color3(json.grassColor[0], json.grassColor[1], json.grassColor[2]) : undefined,
    ammo: json.ammo,
    gunSpawnPos: json.gunSpawnPos ? new Vector3(json.gunSpawnPos[0], json.gunSpawnPos[1], json.gunSpawnPos[2]) : undefined,
    gunRotation: json.gunRotation ? new Vector3(json.gunRotation[0], json.gunRotation[1], json.gunRotation[2]) : undefined,
    gunScale: json.gunScale,
    cameraRadius: json.cameraRadius,
    cameraTarget: json.cameraTarget ? new Vector3(json.cameraTarget[0], json.cameraTarget[1], json.cameraTarget[2]) : undefined,
    cameraAlpha: json.cameraAlpha,
    cameraBeta: json.cameraBeta,
    environmentType: json.environmentType,
    props: json.props?.map((p) => ({
      name: p.name,
      modelPath: p.modelPath,
      position: new Vector3(p.position[0], p.position[1], p.position[2]),
      rotationX: p.rotationX,
      rotationY: p.rotationY,
      rotationZ: p.rotationZ,
      scale: p.scale,
      hasCollision: p.hasCollision,
      castShadow: p.castShadow,
      animationName: p.animationName,
      animationSpeed: p.animationSpeed,
      material: p.material,
      durability: p.durability,
      isDestructible: p.isDestructible,
      isMovable: p.isMovable,
      mass: p.mass,
      isPenetrable: p.isPenetrable,
      penetrationResistance: p.penetrationResistance,
    })),
    targets: json.targets.map((t) => ({
      position: new Vector3(t.position[0], t.position[1], t.position[2]),
      rotationY: t.rotationY,
      scale: t.scale,
      animationName: t.animationName,
      animationNames: t.animationNames,
      animationSpeed: t.animationSpeed,
      namePrefix: t.namePrefix,
      swordModelPath: t.weaponModelPath || t.swordModelPath,
      weaponModelPath: t.weaponModelPath || t.swordModelPath,
      swordScale: t.swordScale,
      swordRotation: t.swordRotation ? new Vector3(t.swordRotation[0], t.swordRotation[1], t.swordRotation[2]) : undefined,
      swordPosition: t.swordPosition ? new Vector3(t.swordPosition[0], t.swordPosition[1], t.swordPosition[2]) : undefined,
      isPatrolling: t.isPatrolling,
      patrolRange: t.patrolRange,
      patrolSpeed: t.patrolSpeed,
      magicFx: t.magicFx,
    })),
    customSetup: json.environmentType === 'island'
      ? (scene, shadowGen) => createIslandEnvironment(scene, shadowGen)
      : (json.environmentType === 'park' ? (scene, shadowGen) => createParkEnvironment(scene, shadowGen) : undefined),
  };

  return createLevelFromConfig(config);
}
