import {
  Scene,
  Color3,
  StandardMaterial,
  MultiMaterial,
  MeshBuilder,
  TransformNode,
  AbstractMesh,
  Skeleton,
} from '@babylonjs/core';

export interface RagdollMaterials {
  multiMat: MultiMaterial;
  mainMat: StandardMaterial;
  jointsMat: StandardMaterial;
  dispose: () => void;
}

export function createCartoonRagdollMaterials(
  scene: Scene,
  prefix: string,
  options: {
    bodyColor?: Color3;
    jointsColor?: Color3;
  } = {}
): RagdollMaterials {
  // Vibrant modern arcade cyan/teal primary skin tone
  // Deep graphite slate contrasting ball joints
  const bodyColor = options.bodyColor ?? new Color3(0.08, 0.68, 0.94);
  const jointsColor = options.jointsColor ?? new Color3(0.14, 0.17, 0.24);

  const mainMat = new StandardMaterial(`${prefix}_mainMat`, scene);
  mainMat.diffuseColor = bodyColor;
  mainMat.emissiveColor = new Color3(bodyColor.r * 0.14, bodyColor.g * 0.14, bodyColor.b * 0.14);
  mainMat.specularColor = new Color3(0.24, 0.24, 0.24);
  mainMat.specularPower = 32;

  const jointsMat = new StandardMaterial(`${prefix}_jointsMat`, scene);
  jointsMat.diffuseColor = jointsColor;
  jointsMat.emissiveColor = new Color3(0.02, 0.03, 0.04);
  jointsMat.specularColor = new Color3(0.42, 0.46, 0.54);
  jointsMat.specularPower = 48; // Sleek metallic / satin luster on articulating joints

  const multiMat = new MultiMaterial(`${prefix}_multiMat`, scene);
  multiMat.subMaterials.push(mainMat);   // Submaterial 0: M_Main (body, limbs, head)
  multiMat.subMaterials.push(jointsMat); // Submaterial 1: M_Joints (ball joints)

  const dispose = (): void => {
    mainMat.dispose(true, true);
    jointsMat.dispose(true, true);
    multiMat.dispose(true, true);
  };

  return { multiMat, mainMat, jointsMat, dispose };
}

// Backward compatibility helper
export function createCartoonYellowMaterial(
  scene: Scene,
  name = 'cartoonYellowMat'
): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = new Color3(0.08, 0.68, 0.94); // Upgraded default vibrant cyan
  mat.specularColor = new Color3(0.24, 0.24, 0.24);
  mat.emissiveColor = new Color3(0.02, 0.12, 0.18);
  return mat;
}

export interface BodyAccessoriesInstance {
  root: TransformNode;
  dispose: () => void;
}

export function attachBodyAccessories(
  rootMesh: AbstractMesh,
  childTransformNodes: TransformNode[],
  skeleton: Skeleton | null,
  scene: Scene,
  prefix = 'acc'
): BodyAccessoriesInstance {
  const accRoot = new TransformNode(`${prefix}_accRoot`, scene);
  accRoot.parent = rootMesh;

  const disposables: Array<{ dispose: () => void }> = [];
  const meshesToClean: AbstractMesh[] = [];

  const findBoneNode = (nameQuery: string): TransformNode | null => {
    const q = nameQuery.toLowerCase();
    const direct = childTransformNodes.find((t) => t.name.toLowerCase().includes(q));
    if (direct) return direct;
    if (skeleton && skeleton.bones) {
      const bone = skeleton.bones.find((b) => b.name.toLowerCase().includes(q));
      if (bone && bone.getTransformNode) {
        return (bone.getTransformNode() as TransformNode) || null;
      }
    }
    return null;
  };

  // Materials for accessories
  const goldMat = new StandardMaterial(`${prefix}_goldMat`, scene);
  goldMat.diffuseColor = new Color3(0.98, 0.78, 0.20); // Vibrant arcade gold
  goldMat.emissiveColor = new Color3(0.22, 0.16, 0.04);
  goldMat.specularColor = new Color3(0.85, 0.85, 0.85);
  goldMat.specularPower = 64;
  disposables.push(goldMat);

  const beltMat = new StandardMaterial(`${prefix}_beltMat`, scene);
  beltMat.diffuseColor = new Color3(0.12, 0.14, 0.18); // Deep graphite utility belt
  beltMat.emissiveColor = new Color3(0.02, 0.02, 0.03);
  beltMat.specularColor = new Color3(0.3, 0.3, 0.3);
  disposables.push(beltMat);

  // 1. Waist Utility Belt & Golden Buckle (Attached to DEF-spine.001 or DEF-hips)
  const waistNode = findBoneNode('def-spine.001') || findBoneNode('def-hips');
  if (waistNode) {
    const belt = MeshBuilder.CreateTorus(
      `${prefix}_belt`,
      { diameter: 0.28, thickness: 0.038, tessellation: 24 },
      scene
    );
    belt.position.set(0, 0.02, 0);
    belt.scaling.set(1.18, 1.0, 0.98);
    belt.material = beltMat;
    belt.parent = waistNode;
    meshesToClean.push(belt);

    // Front Golden Buckle
    const buckle = MeshBuilder.CreateBox(
      `${prefix}_buckle`,
      { width: 0.065, height: 0.045, depth: 0.022 },
      scene
    );
    buckle.position.set(0, 0.02, 0.145);
    buckle.material = goldMat;
    buckle.parent = waistNode;
    meshesToClean.push(buckle);

    // Buckle Inner Accent
    const buckleSlot = MeshBuilder.CreateBox(
      `${prefix}_buckleSlot`,
      { width: 0.042, height: 0.024, depth: 0.026 },
      scene
    );
    buckleSlot.position.set(0, 0.02, 0.146);
    buckleSlot.material = beltMat;
    buckleSlot.parent = waistNode;
    meshesToClean.push(buckleSlot);
  }

  // 2. Chest Champion Crest / Star (Attached to DEF-spine.002 or DEF-spine.003)
  const chestNode = findBoneNode('def-spine.002') || findBoneNode('def-spine.003');
  if (chestNode) {
    // Stylized Golden Champion Diamond Crest
    const crest = MeshBuilder.CreateCylinder(
      `${prefix}_crest`,
      { diameter: 0.075, height: 0.016, tessellation: 4 },
      scene
    );
    crest.position.set(0, 0.05, 0.128);
    crest.rotation.y = Math.PI / 4;
    crest.rotation.x = Math.PI / 2;
    crest.material = goldMat;
    crest.parent = chestNode;
    meshesToClean.push(crest);

    const crestCenter = MeshBuilder.CreateSphere(
      `${prefix}_crestCenter`,
      { diameter: 0.036, segments: 10 },
      scene
    );
    crestCenter.position.set(0, 0.05, 0.134);
    crestCenter.scaling.set(1.0, 1.0, 0.4);
    crestCenter.material = beltMat;
    crestCenter.parent = chestNode;
    meshesToClean.push(crestCenter);
  }

  // 3. Wrist Cuffs (Attached to DEF-forearm.L & DEF-forearm.R)
  ['def-forearm.l', 'def-forearm.r'].forEach((boneName, i) => {
    const armNode = findBoneNode(boneName);
    if (!armNode) return;

    const cuff = MeshBuilder.CreateTorus(
      `${prefix}_cuff_${i}`,
      { diameter: 0.088, thickness: 0.018, tessellation: 18 },
      scene
    );
    cuff.position.set(0, 0.22, 0);
    cuff.scaling.set(1.0, 1.0, 1.0);
    cuff.material = beltMat;
    cuff.parent = armNode;
    meshesToClean.push(cuff);

    const goldRing = MeshBuilder.CreateTorus(
      `${prefix}_goldRing_${i}`,
      { diameter: 0.090, thickness: 0.007, tessellation: 18 },
      scene
    );
    goldRing.position.set(0, 0.22, 0);
    goldRing.material = goldMat;
    goldRing.parent = armNode;
    meshesToClean.push(goldRing);
  });

  const dispose = (): void => {
    meshesToClean.forEach((m) => m.dispose(false, true));
    disposables.forEach((d) => d.dispose());
    accRoot.dispose(false, true);
  };

  return { root: accRoot, dispose };
}
