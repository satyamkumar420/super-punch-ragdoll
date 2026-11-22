import {
  Scene,
  SceneLoader,
  Vector3,
  Color3,
  TransformNode,
  PBRMaterial,
  type ShadowGenerator,
} from '@babylonjs/core';

export interface AttachedSwordInstance {
  root: TransformNode;
  baseScale: number;
  dispose: () => void;
}

/**
 * Calculates default calibrated weapon position offset based on weapon type and animation.
 * Accurately aligns pistols for Pistol_Aim_Down (Level 18 left), Pistol_Aim_Up (Level 18 right),
 * and Pistol_Aim_Neutral (Level 17 / standard aim).
 */
export function getDefaultWeaponPosition(modelPath?: string, animNames?: string[]): Vector3 {
  const isPistol =
    (modelPath?.toLowerCase().includes('pistol') || modelPath?.toLowerCase().includes('gun')) ||
    (animNames?.some((a) => a.toLowerCase().includes('pistol') || a.toLowerCase().includes('gun')));

  if (isPistol) {
    const animStr = animNames ? animNames.join(' ').toLowerCase() : '';
    if (animStr.includes('aim_down')) {
      // Level 18 Left Target (High Sniper) calibrated position
      return new Vector3(-0.06, 0.03, -0.045);
    }
    if (animStr.includes('aim_up')) {
      // Level 18 Right Target (Ground Gunner) calibrated position
      return new Vector3(-0.04, 0.1, -0.085);
    }
    // Level 17 (Convoy Sniper) / standard neutral pistol grip
    return new Vector3(0.005, 0.05, -0.075);
  }

  // Swords, axes, and other hand attachments
  return new Vector3(0.015, 0.02, 0.02);
}

export async function attachSwordModel(
  handNode: TransformNode,
  swordModelPath: string,
  scene: Scene,
  options: {
    scale?: number;
    rotation?: Vector3;
    position?: Vector3;
    shadowGen?: ShadowGenerator;
    animationName?: string;
    animationNames?: string[];
  } = {}
): Promise<AttachedSwordInstance> {
  let rootDir = './assets/models/';
  let modelFile = swordModelPath.replace(/^\.?\/?assets\/(models\/)?/, '').replace(/^\.?\/?/, '');
  if (modelFile.toLowerCase().includes('pistol')) {
    rootDir = './assets/';
    modelFile = 'Pistol.glb';
  }

  const result = await SceneLoader.ImportMeshAsync('', rootDir, modelFile, scene);

  // Immediately stop all auto-playing animation groups so weapons remain clean, static and flicker-free
  result.animationGroups?.forEach((ag) => ag.stop());

  const swordContainer = new TransformNode(`swordContainer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, scene);
  swordContainer.parent = handNode;

  const rootMesh = result.meshes[0];
  rootMesh.parent = swordContainer;
  rootMesh.rotationQuaternion = null;

  const isPistol = modelFile.toLowerCase().includes('pistol') || modelFile.toLowerCase().includes('gun');
  const isSword2 = modelFile.toLowerCase().includes('sword_2');
  const isAxe = modelFile.toLowerCase().includes('axe');

  let baseScale = 0.85;
  if (isPistol) {
    baseScale = 1.05;
    rootMesh.rotation.set(Math.PI / 2, 0, 0);
    rootMesh.position.set(0, 0, 0);

    result.meshes.forEach((mesh) => {
      const nameLower = mesh.name.toLowerCase();
      // Eliminate duplicate overlapping meshes inside Pistol.glb causing depth Z-fighting flicker
      if (
        nameLower.includes('magazine (empty)') ||
        nameLower.includes('empty') ||
        nameLower.includes('9mm.001') ||
        nameLower.includes('plane.002')
      ) {
        mesh.setEnabled(false);
        mesh.isVisible = false;
        mesh.visibility = 0;
        return;
      }

      const mat = mesh.material as PBRMaterial;
      if (mat && mat.getClassName?.() === 'PBRMaterial') {
        mat.transparencyMode = 0; // PBRMATERIAL_OPAQUE to eliminate sorting flicker
        mat.backFaceCulling = true;
        mat.needDepthPrePass = false;
        mat.albedoColor = new Color3(0.12, 0.13, 0.15);
        mat.metallic = 0.82;
        mat.roughness = 0.38;
      }
    });
  } else if (isAxe) {
    baseScale = 0.38;
    rootMesh.position.set(0, -0.20, 0);
    rootMesh.rotation.set(Math.PI / 2, 0, 0);
  } else if (isSword2) {
    baseScale = 0.22;
    rootMesh.position.set(0, 0, 0);
    rootMesh.rotation.set(0, Math.PI, 0);
  } else {
    baseScale = 0.85;
    rootMesh.position.set(0, 0, 0);
    rootMesh.rotation.set(Math.PI / 2, 0, 0);
  }

  const userScale = options.scale ?? 1.0;
  swordContainer.scaling.setAll(baseScale * userScale);

  const animList = options.animationNames || (options.animationName ? [options.animationName] : []);
  const defPosition = getDefaultWeaponPosition(modelFile, animList);
  swordContainer.position.copyFrom(options.position ?? defPosition);
  swordContainer.rotation.copyFrom(options.rotation ?? new Vector3(0, 0, 0));

  result.meshes.forEach((m) => {
    if (options.shadowGen && m.isEnabled() && m.isVisible && m.getTotalVertices() > 0) {
      options.shadowGen.addShadowCaster(m);
    }
  });

  const dispose = () => {
    try {
      if (options.shadowGen) {
        result.meshes.forEach((m) => options.shadowGen?.removeShadowCaster(m));
      }
      swordContainer.dispose(false, true);
      result.animationGroups?.forEach((ag) => ag.dispose());
      result.meshes.forEach((m) => {
        m.material?.dispose(true, true);
        m.geometry?.dispose();
        m.dispose(false, true);
      });
      result.transformNodes?.forEach((t) => t.dispose());
    } catch (err) {
      console.warn('Error disposing sword model', err);
    }
  };

  return { root: swordContainer, baseScale, dispose };
}
