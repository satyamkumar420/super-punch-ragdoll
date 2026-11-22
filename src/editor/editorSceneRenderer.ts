import {
  Scene,
  Vector3,
  Color3,
  SceneLoader,
  Mesh,
  AbstractMesh,
  type ShadowGenerator,
  type PBRMaterial,
} from '@babylonjs/core';
import type { JsonLevelConfig } from '../config/levelTypes';
import type { SelectedObjectRef } from './types';
import { loadProp, type LoadedPropInstance } from '../core/propLoader';
import { loadCharacter, type CharacterInstance } from '../character';
import { createParkEnvironment, createIslandEnvironment } from '../props';

export interface LoadedGunInstance {
  mesh: AbstractMesh;
  allMeshes: AbstractMesh[];
  dispose: () => void;
}

export interface SceneEntities {
  props: LoadedPropInstance[];
  characters: CharacterInstance[];
  gun: LoadedGunInstance | null;
  meshMap: Map<AbstractMesh, SelectedObjectRef>;
  environment?: { dispose: () => void } | null;
}

export class EditorSceneRenderer {
  private scene: Scene;
  private shadowGen: ShadowGenerator;

  constructor(scene: Scene, shadowGen: ShadowGenerator) {
    this.scene = scene;
    this.shadowGen = shadowGen;
  }

  public async render(lvl: JsonLevelConfig): Promise<SceneEntities> {
    const props: LoadedPropInstance[] = [];
    const characters: CharacterInstance[] = [];
    const meshMap: Map<AbstractMesh, SelectedObjectRef> = new Map();

    const register = (mesh: AbstractMesh | null | undefined, ref: SelectedObjectRef) => {
      if (!mesh) return;
      mesh.isPickable = true;
      meshMap.set(mesh, ref);
      mesh.getChildMeshes?.().forEach((child) => {
        child.isPickable = true;
        meshMap.set(child, ref);
      });
    };

    // 1. Props
    if (lvl.props) {
      for (let i = 0; i < lvl.props.length; i++) {
        const p = lvl.props[i];
        try {
          const inst = await loadProp(
            this.scene,
            {
              name: p.name,
              modelPath: p.modelPath,
              position: new Vector3(p.position[0], p.position[1], p.position[2]),
              rotationX: p.rotationX,
              rotationY: p.rotationY,
              rotationZ: p.rotationZ,
              scale: p.scale ?? 1.0,
              hasCollision: p.hasCollision,
              castShadow: p.castShadow,
              animationName: p.animationName,
              animationSpeed: p.animationSpeed,
            },
            this.shadowGen
          );
          props.push(inst);
          const propRef: SelectedObjectRef = { type: 'prop', index: i, id: p.name };
          register(inst.rootNode as unknown as AbstractMesh, propRef);
          inst.rootNode?.getChildMeshes?.().forEach((m) => register(m, propRef));
        } catch (err) {
          console.error(`Failed to load editor prop ${p.name}`, err);
        }
      }
    }

    // 2. Target Characters
    for (let i = 0; i < lvl.targets.length; i++) {
      const tc = lvl.targets[i];
      try {
        const animNames = tc.animationNames && tc.animationNames.length > 0
          ? tc.animationNames
          : (tc.animationName ? [tc.animationName] : ['Dance_Loop']);

        const char = await loadCharacter(this.scene, {
          position: new Vector3(tc.position[0], tc.position[1], tc.position[2]),
          rotationY: tc.rotationY,
          scale: tc.scale ?? 1.0,
          animationName: animNames[0],
          animationNames: animNames,
          animationSpeed: tc.animationSpeed,
          namePrefix: `editor_target_${i}`,
          shadowGen: this.shadowGen,
          swordModelPath: tc.weaponModelPath || tc.swordModelPath,
          weaponModelPath: tc.weaponModelPath || tc.swordModelPath,
          swordScale: tc.swordScale,
          swordRotation: tc.swordRotation ? new Vector3(tc.swordRotation[0], tc.swordRotation[1], tc.swordRotation[2]) : undefined,
          swordPosition: tc.swordPosition ? new Vector3(tc.swordPosition[0], tc.swordPosition[1], tc.swordPosition[2]) : undefined,
          magicFx: tc.magicFx,
        });
        characters.push(char);
        const charRef: SelectedObjectRef = { type: 'target', index: i };
        register(char.mainMesh, charRef);
        char.rootNode?.getChildMeshes?.().forEach((child) => register(child, charRef));
        char.attachedSword?.root?.getChildMeshes?.().forEach((m) => register(m, charRef));
      } catch (err) {
        console.error(`Failed to load editor target ${i}`, err);
      }
    }

    // 3. Scenery Environment (e.g. Park trees & fence, Island ocean & beach)
    let environment: { dispose: () => void } | null = null;
    if (lvl.environmentType === 'park') {
      try {
        environment = createParkEnvironment(this.scene, this.shadowGen);
      } catch (err) {
        console.error('Failed to create park environment in editor', err);
      }
    } else if (lvl.environmentType === 'island') {
      try {
        environment = createIslandEnvironment(this.scene, this.shadowGen);
      } catch (err) {
        console.error('Failed to create island environment in editor', err);
      }
    }

    // 5. Player Weapon (Gun Spawn Point)
    let gun: LoadedGunInstance | null = null;
    const gunPos = lvl.gunSpawnPos || [-2.2, 0.085, 0];
    const gunRot = lvl.gunRotation || [0, 0, 0];
    try {
      this.scene.meshes.filter((m) => m.name.startsWith('editor_gun_')).forEach((m) => m.dispose());
      const res = await SceneLoader.ImportMeshAsync('', './assets/', 'Pistol.glb', this.scene);
      // Immediately stop all animation groups to freeze gun in clean static resting pose
      res.animationGroups?.forEach((ag) => ag.stop());

      // Create editor gun root mesh so position, rotation and scale match gameplay 1:1
      const rootMesh = new Mesh('editor_gun_root', this.scene);
      rootMesh.position.set(gunPos[0], gunPos[1], 0);
      rootMesh.rotationQuaternion = null;
      rootMesh.rotation.set(0, 0, gunRot[2] || 0);
      const gunScale = lvl.gunScale ?? 0.52;
      rootMesh.scaling.setAll(gunScale);

      const gltfRoot = res.meshes[0];
      gltfRoot.parent = rootMesh;
      gltfRoot.rotationQuaternion = null;
      // Rotate gltfRoot Y = +90 degrees so local +Z barrel points forward along +X matching weapon.ts
      gltfRoot.rotation.set(0, Math.PI / 2, 0);
      const BASE_GUN_SCALE = 7.5;
      gltfRoot.scaling.setAll(BASE_GUN_SCALE);

      const gunMeshes = res.meshes.filter((m) => {
        if (m === gltfRoot) return false;
        const nameLower = m.name.toLowerCase();
        if (
          nameLower.includes('magazine (empty)') ||
          nameLower.includes('empty') ||
          nameLower.includes('9mm.001') ||
          nameLower.includes('plane.002')
        ) {
          m.setEnabled(false);
          m.isVisible = false;
          m.visibility = 0;
          return false;
        }
        return true;
      });

      gunMeshes.forEach((mesh, idx) => {
        mesh.name = `editor_gun_${idx}`;
        if (this.shadowGen) this.shadowGen.addShadowCaster(mesh);

        // Apply authentic black tactical & titanium PBR materials matching weapon.ts
        const mat = mesh.material as PBRMaterial;
        if (mat && mat.getClassName?.() === 'PBRMaterial') {
          mat.transparencyMode = 0; // PBRMATERIAL_OPAQUE to prevent depth flickering
          mat.backFaceCulling = true;
          mat.needDepthPrePass = false;
          if (mat.name === 'LightMetal') {
            mat.albedoColor = new Color3(0.85, 0.88, 0.92);
            mat.metallic = 0.9;
            mat.roughness = 0.22;
          } else if (mat.name === 'Metal') {
            mat.albedoColor = new Color3(0.32, 0.35, 0.40);
            mat.metallic = 0.72;
            mat.roughness = 0.32;
          } else if (mat.name === 'Black') {
            mat.albedoColor = new Color3(0.12, 0.13, 0.15);
            mat.metallic = 0.15;
            mat.roughness = 0.65;
          } else {
            mat.albedoColor = new Color3(0.15, 0.16, 0.18);
            mat.metallic = 0.82;
            mat.roughness = 0.38;
          }
        }
        register(mesh, { type: 'gun', index: 0 });
      });

      gun = {
        mesh: rootMesh,
        allMeshes: [rootMesh, ...res.meshes],
        dispose: () => {
          rootMesh.dispose();
          res.meshes.forEach((m) => m.dispose());
          res.transformNodes?.forEach((t) => t.dispose());
          res.animationGroups?.forEach((ag) => ag.dispose());
        },
      };
    } catch (err) {
      console.error('Failed to load editor gun', err);
    }

    return { props, characters, gun, meshMap, environment };
  }
}
