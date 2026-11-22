import {
  Scene,
  Vector3,
  Color3,
  StandardMaterial,
  MeshBuilder,
  TransformNode,
  AbstractMesh,
} from '@babylonjs/core';

export interface CartoonFaceInstance {
  root: TransformNode;
  setDefeated: (isDefeated: boolean) => void;
  dispose: () => void;
}

export function attachCartoonFace(
  headNode: TransformNode,
  scene: Scene,
  prefix = 'face'
): CartoonFaceInstance {
  const faceRoot = new TransformNode(`${prefix}_root`, scene);
  faceRoot.parent = headNode;
  // Calibrated position on front-face of DEF-head
  faceRoot.position = new Vector3(0, 0.072, 0.084);

  const disposables: Array<{ dispose: () => void }> = [];
  const meshesToClean: AbstractMesh[] = [];

  const createMat = (
    name: string,
    diffuse: Color3,
    emissive?: Color3,
    specular?: Color3,
    specularPower = 32
  ): StandardMaterial => {
    const mat = new StandardMaterial(`${prefix}_${name}`, scene);
    mat.diffuseColor = diffuse;
    if (emissive) mat.emissiveColor = emissive;
    if (specular) mat.specularColor = specular;
    mat.specularPower = specularPower;
    disposables.push(mat);
    return mat;
  };

  // Face Materials
  const scleraMat = createMat('sclera', new Color3(0.98, 0.98, 0.98), undefined, new Color3(0.3, 0.3, 0.3));
  const irisMat = createMat(
    'iris',
    new Color3(0.12, 0.48, 0.94),
    new Color3(0.02, 0.08, 0.16),
    new Color3(0.4, 0.4, 0.4)
  );
  const pupilMat = createMat(
    'pupil',
    new Color3(0.04, 0.04, 0.04),
    undefined,
    new Color3(0.9, 0.9, 0.9),
    64
  );
  const sparkleMat = createMat(
    'sparkle',
    new Color3(1, 1, 1),
    new Color3(0.92, 0.92, 0.92),
    new Color3(1, 1, 1)
  );
  const darkDetailMat = createMat(
    'darkDetail',
    new Color3(0.12, 0.13, 0.16),
    undefined,
    new Color3(0.1, 0.1, 0.1)
  );
  const blushMat = createMat(
    'blush',
    new Color3(1.0, 0.46, 0.54),
    new Color3(0.18, 0.06, 0.08),
    new Color3(0.1, 0.1, 0.1)
  );
  const mouthCavityMat = createMat(
    'mouthCavity',
    new Color3(0.26, 0.05, 0.08),
    undefined,
    new Color3(0.1, 0.1, 0.1)
  );
  const tongueMat = createMat(
    'tongue',
    new Color3(0.96, 0.42, 0.52),
    new Color3(0.12, 0.04, 0.05),
    new Color3(0.2, 0.2, 0.2)
  );
  const teethMat = createMat('teeth', new Color3(0.98, 0.98, 0.98));

  // Alive & Defeated mesh groups
  const aliveMeshes: AbstractMesh[] = [];
  const defeatedMeshes: AbstractMesh[] = [];
  const eyebrowMeshes: { mesh: AbstractMesh; defaultRotZ: number; defeatedRotZ: number }[] = [];

  const eyeOffsets = [-0.036, 0.036];

  // 1. Eyes (Sclera, Vibrant Iris, Pupil, Dual Catchlight Sparkles)
  eyeOffsets.forEach((offsetX, i) => {
    // Sclera (Eyeball)
    const eyeball = MeshBuilder.CreateSphere(`${prefix}_eyeball_${i}`, { diameter: 0.068, segments: 16 }, scene);
    eyeball.position.set(offsetX, 0, 0);
    eyeball.scaling.set(1.0, 1.0, 0.76);
    eyeball.material = scleraMat;
    eyeball.parent = faceRoot;
    meshesToClean.push(eyeball);

    // Eyelid upper shadow rim
    const rim = MeshBuilder.CreateTorus(
      `${prefix}_eyelid_${i}`,
      { diameter: 0.068, thickness: 0.007, tessellation: 18 },
      scene
    );
    rim.position.set(offsetX, 0.025, 0.012);
    rim.rotation.x = Math.PI / 2.6;
    rim.scaling.set(0.95, 0.45, 0.4);
    rim.material = darkDetailMat;
    rim.parent = faceRoot;
    meshesToClean.push(rim);

    // Iris (Vibrant Blue Ring)
    const iris = MeshBuilder.CreateSphere(`${prefix}_iris_${i}`, { diameter: 0.042, segments: 14 }, scene);
    iris.position.set(offsetX, 0, 0.020);
    iris.scaling.set(1.0, 1.0, 0.38);
    iris.material = irisMat;
    iris.parent = faceRoot;
    meshesToClean.push(iris);
    aliveMeshes.push(iris);

    // Pupil (Glossy Black)
    const pupil = MeshBuilder.CreateSphere(`${prefix}_pupil_${i}`, { diameter: 0.027, segments: 12 }, scene);
    pupil.position.set(offsetX, 0, 0.024);
    pupil.scaling.set(1.0, 1.0, 0.45);
    pupil.material = pupilMat;
    pupil.parent = faceRoot;
    meshesToClean.push(pupil);
    aliveMeshes.push(pupil);

    // Primary Catchlight Sparkle (Upper Right)
    const sparkleMain = MeshBuilder.CreateSphere(`${prefix}_sparkle1_${i}`, { diameter: 0.010, segments: 8 }, scene);
    sparkleMain.position.set(offsetX + 0.007, 0.007, 0.028);
    sparkleMain.material = sparkleMat;
    sparkleMain.parent = faceRoot;
    meshesToClean.push(sparkleMain);
    aliveMeshes.push(sparkleMain);

    // Secondary Catchlight Sparkle (Lower Left)
    const sparkleSub = MeshBuilder.CreateSphere(`${prefix}_sparkle2_${i}`, { diameter: 0.005, segments: 8 }, scene);
    sparkleSub.position.set(offsetX - 0.005, -0.005, 0.028);
    sparkleSub.material = sparkleMat;
    sparkleSub.parent = faceRoot;
    meshesToClean.push(sparkleSub);
    aliveMeshes.push(sparkleSub);

    // Knockout "X" Eyes (Two crossed bars per eye)
    const xBar1 = MeshBuilder.CreateBox(`${prefix}_ko_x1_${i}`, { width: 0.042, height: 0.008, depth: 0.008 }, scene);
    xBar1.position.set(offsetX, 0, 0.026);
    xBar1.rotation.z = Math.PI / 4;
    xBar1.material = darkDetailMat;
    xBar1.parent = faceRoot;
    xBar1.setEnabled(false);
    meshesToClean.push(xBar1);
    defeatedMeshes.push(xBar1);

    const xBar2 = MeshBuilder.CreateBox(`${prefix}_ko_x2_${i}`, { width: 0.042, height: 0.008, depth: 0.008 }, scene);
    xBar2.position.set(offsetX, 0, 0.026);
    xBar2.rotation.z = -Math.PI / 4;
    xBar2.material = darkDetailMat;
    xBar2.parent = faceRoot;
    xBar2.setEnabled(false);
    meshesToClean.push(xBar2);
    defeatedMeshes.push(xBar2);
  });

  // 2. Stylized Eyebrows (Dynamic friendly arch when alive, dazed tilt when defeated)
  eyeOffsets.forEach((offsetX, i) => {
    const isLeft = i === 0;
    const brow = MeshBuilder.CreateBox(
      `${prefix}_eyebrow_${i}`,
      { width: 0.038, height: 0.009, depth: 0.010 },
      scene
    );
    brow.position.set(offsetX, 0.038, 0.004);
    const defaultRotZ = isLeft ? 0.12 : -0.12;
    const defeatedRotZ = isLeft ? -0.28 : 0.28;
    brow.rotation.z = defaultRotZ;
    brow.material = darkDetailMat;
    brow.parent = faceRoot;
    meshesToClean.push(brow);
    eyebrowMeshes.push({ mesh: brow, defaultRotZ, defeatedRotZ });
  });

  // 3. Cute Cheeks (Blush)
  eyeOffsets.forEach((offsetX, i) => {
    const cheekX = offsetX > 0 ? offsetX + 0.018 : offsetX - 0.018;
    const cheek = MeshBuilder.CreateSphere(`${prefix}_blush_${i}`, { diameter: 0.026, segments: 10 }, scene);
    cheek.position.set(cheekX, -0.022, -0.005);
    cheek.scaling.set(1.1, 0.75, 0.25);
    cheek.material = blushMat;
    cheek.parent = faceRoot;
    meshesToClean.push(cheek);
  });

  // 4. Cheerful Cartoon Smile (Alive state)
  const smileCavity = MeshBuilder.CreateSphere(`${prefix}_smileCavity`, { diameter: 0.038, segments: 12 }, scene);
  smileCavity.position.set(0, -0.044, 0.002);
  smileCavity.scaling.set(1.0, 0.55, 0.28);
  smileCavity.material = mouthCavityMat;
  smileCavity.parent = faceRoot;
  meshesToClean.push(smileCavity);
  aliveMeshes.push(smileCavity);

  const teeth = MeshBuilder.CreateBox(`${prefix}_teeth`, { width: 0.024, height: 0.007, depth: 0.008 }, scene);
  teeth.position.set(0, -0.038, 0.007);
  teeth.material = teethMat;
  teeth.parent = faceRoot;
  meshesToClean.push(teeth);
  aliveMeshes.push(teeth);

  const tongue = MeshBuilder.CreateSphere(`${prefix}_tongue`, { diameter: 0.020, segments: 10 }, scene);
  tongue.position.set(0, -0.048, 0.006);
  tongue.scaling.set(1.0, 0.55, 0.35);
  tongue.material = tongueMat;
  tongue.parent = faceRoot;
  meshesToClean.push(tongue);
  aliveMeshes.push(tongue);

  // 5. Knockout "O" Stunned Mouth (Defeated state)
  const koMouth = MeshBuilder.CreateTorus(
    `${prefix}_ko_mouth`,
    { diameter: 0.024, thickness: 0.006, tessellation: 16 },
    scene
  );
  koMouth.position.set(0, -0.044, 0.005);
  koMouth.rotation.x = Math.PI / 2;
  koMouth.material = darkDetailMat;
  koMouth.parent = faceRoot;
  koMouth.setEnabled(false);
  meshesToClean.push(koMouth);
  defeatedMeshes.push(koMouth);

  const setDefeated = (isDefeated: boolean): void => {
    aliveMeshes.forEach((m) => m.setEnabled(!isDefeated));
    defeatedMeshes.forEach((m) => m.setEnabled(isDefeated));
    eyebrowMeshes.forEach((eb) => {
      eb.mesh.rotation.z = isDefeated ? eb.defeatedRotZ : eb.defaultRotZ;
      eb.mesh.position.y = isDefeated ? 0.034 : 0.038;
    });
  };

  const dispose = (): void => {
    meshesToClean.forEach((m) => m.dispose(false, true));
    disposables.forEach((d) => d.dispose());
    faceRoot.dispose(false, true);
  };

  return { root: faceRoot, setDefeated, dispose };
}

// Backward compatibility alias for legacy callers
export function attachGooglyEyes(
  headNode: TransformNode,
  scene: Scene
): { root: TransformNode; dispose: () => void } {
  return attachCartoonFace(headNode, scene, 'googlyEyes');
}
