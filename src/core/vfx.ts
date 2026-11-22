import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  type AbstractMesh,
} from '@babylonjs/core';

/**
 * Comic high-impact sparks ("chingari"), shockwave ring, and flash burst.
 */
export function spawnComicHitEffect(scene: Scene, position: Vector3): void {
  if (!scene || typeof (scene as any).getUniqueId !== 'function') return;

  const flashMat = new StandardMaterial(`hitFlashMat_${Date.now()}`, scene);
  flashMat.diffuseColor = new Color3(1.0, 1.0, 0.9);
  flashMat.emissiveColor = new Color3(1.0, 1.0, 0.85);
  flashMat.specularColor = new Color3(0, 0, 0);

  const flash = MeshBuilder.CreateSphere('hitFlashCore', { diameter: 0.28, segments: 10 }, scene);
  flash.position.copyFrom(position);
  flash.material = flashMat;

  const ringMat = new StandardMaterial(`hitRingMat_${Date.now()}`, scene);
  ringMat.diffuseColor = new Color3(1.0, 0.75, 0.15);
  ringMat.emissiveColor = new Color3(1.0, 0.6, 0.05);
  ringMat.specularColor = new Color3(0, 0, 0);

  const ring = MeshBuilder.CreateTorus('hitRing', { diameter: 0.22, thickness: 0.032, tessellation: 20 }, scene);
  ring.position.copyFrom(position);
  ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
  ring.rotation.y = (Math.random() - 0.5) * 0.4;
  ring.material = ringMat;

  let flashLife = 0;
  const flashObs = scene.onBeforeRenderObservable.add(() => {
    flashLife += 0.16;
    flash.scaling.scaleInPlace(1.15);
    flashMat.alpha = Math.max(0, 1.0 - flashLife * 1.4);
    ring.scaling.scaleInPlace(1.22);
    ringMat.alpha = Math.max(0, 1.0 - flashLife);

    if (flashLife >= 1.0) {
      scene.onBeforeRenderObservable.remove(flashObs);
      flash.geometry?.dispose();
      ring.geometry?.dispose();
      flash.dispose(false, true);
      ring.dispose(false, true);
      flashMat.dispose();
      ringMat.dispose();
    }
  });

  const sparkGradients = [
    { diff: new Color3(1.0, 0.98, 0.75), emiss: new Color3(1.0, 0.95, 0.6) },
    { diff: new Color3(1.0, 0.80, 0.15), emiss: new Color3(1.0, 0.70, 0.1) },
    { diff: new Color3(1.0, 0.45, 0.05), emiss: new Color3(0.95, 0.35, 0.02) },
    { diff: new Color3(1.0, 0.25, 0.05), emiss: new Color3(0.9, 0.18, 0.02) },
  ];

  const sparkCount = 14;
  const sparkMeshes: { mesh: AbstractMesh; vel: Vector3; mat: StandardMaterial }[] = [];

  for (let i = 0; i < sparkCount; i++) {
    const col = sparkGradients[i % sparkGradients.length];
    const sMat = new StandardMaterial(`sparkMat_${i}_${Date.now()}`, scene);
    sMat.diffuseColor = col.diff;
    sMat.emissiveColor = col.emiss;
    sMat.specularColor = new Color3(0, 0, 0);

    const size = 0.045 + Math.random() * 0.04;
    const spark = MeshBuilder.CreateSphere(`hitSpark_${i}`, { diameter: size, segments: 6 }, scene);
    spark.position.copyFrom(position);
    spark.material = sMat;

    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.8;
    const speed = 4.2 + Math.random() * 4.6;
    const velocity = new Vector3(
      Math.cos(theta) * Math.cos(phi) * speed,
      Math.sin(phi) * speed + 2.2,
      Math.sin(theta) * Math.cos(phi) * speed
    );

    sparkMeshes.push({ mesh: spark, vel: velocity, mat: sMat });
  }

  let sparkLife = 0;
  const sparkObs = scene.onBeforeRenderObservable.add(() => {
    sparkLife += 0.048;
    const delta = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.033);

    sparkMeshes.forEach((s) => {
      s.mesh.position.addInPlace(s.vel.scale(delta));
      s.vel.y -= 11.0 * delta;
      s.vel.x *= 0.96;
      s.vel.z *= 0.96;
      s.mesh.scaling.scaleInPlace(0.94);
      s.mat.alpha = Math.max(0, 1.0 - sparkLife * 1.1);
    });

    if (sparkLife >= 1.0) {
      scene.onBeforeRenderObservable.remove(sparkObs);
      sparkMeshes.forEach((s) => {
        s.mesh.geometry?.dispose();
        s.mesh.dispose(false, true);
        s.mat.dispose();
      });
    }
  });

  const smokeMat = new StandardMaterial(`smokeMat_${Date.now()}`, scene);
  smokeMat.diffuseColor = new Color3(0.92, 0.90, 0.88);
  smokeMat.emissiveColor = new Color3(0.18, 0.16, 0.14);
  smokeMat.alpha = 0.45;

  const smokePuff = MeshBuilder.CreateSphere('smokePuff', { diameter: 0.22, segments: 8 }, scene);
  smokePuff.position.copyFrom(position);
  smokePuff.material = smokeMat;

  let smokeLife = 0;
  const smokeObs = scene.onBeforeRenderObservable.add(() => {
    smokeLife += 0.04;
    smokePuff.position.y += 0.01;
    smokePuff.scaling.scaleInPlace(1.05);
    smokeMat.alpha = Math.max(0, 0.45 - smokeLife * 0.45);

    if (smokeLife >= 1.0) {
      scene.onBeforeRenderObservable.remove(smokeObs);
      smokePuff.geometry?.dispose();
      smokePuff.dispose(false, true);
      smokeMat.dispose();
    }
  });
}
