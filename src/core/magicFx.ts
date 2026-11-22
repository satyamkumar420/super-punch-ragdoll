import {
  Scene,
  Color3,
  StandardMaterial,
  MeshBuilder,
  TransformNode,
  type AbstractMesh,
  type Observer,
} from '@babylonjs/core';
import type { CharacterInstance } from '../character';

export interface MagicFxConfig {
  enabled?: boolean;
  color?: Color3 | [number, number, number];
  hands?: 'right' | 'left' | 'both';
  orbSize?: number;
  hasGroundCircle?: boolean;
  groundRadius?: number;
  hasOrbitRings?: boolean;
  hasSparks?: boolean;
}

export interface MagicController {
  update: (delta: number) => void;
  setColor: (color: Color3) => void;
  triggerBurst: () => void;
  dissipate: () => void;
  dispose: () => void;
  readonly isDissipated: boolean;
}

// Preset color palettes for rich fantasy styles
export const MAGIC_PALETTES = {
  VOID_PURPLE: new Color3(0.78, 0.25, 1.0),
  ARCANE_CYAN: new Color3(0.18, 0.85, 1.0),
  INFERNO_ORANGE: new Color3(1.0, 0.45, 0.08),
  EMERALD_GREEN: new Color3(0.22, 1.0, 0.45),
  GOLDEN_DIVINE: new Color3(1.0, 0.82, 0.2),
};

function parseColor(raw?: Color3 | [number, number, number]): Color3 {
  if (!raw) return MAGIC_PALETTES.VOID_PURPLE.clone();
  if (raw instanceof Color3) return raw.clone();
  return new Color3(raw[0], raw[1], raw[2]);
}

/**
 * Creates an attachable, dynamic, and fully reusable Magic VFX system for any character.
 */
export function createCharacterMagicFx(
  character: CharacterInstance,
  scene: Scene,
  config: MagicFxConfig = {}
): MagicController {
  const primaryColor = parseColor(config.color);
  const handsMode = config.hands ?? 'both';
  const orbSize = config.orbSize ?? 0.16;
  const hasGroundCircle = config.hasGroundCircle ?? true;
  const groundRadius = config.groundRadius ?? 0.65;
  const hasOrbitRings = config.hasOrbitRings ?? true;
  const hasSparks = config.hasSparks ?? true;

  const disposables: { dispose: () => void }[] = [];
  const meshesToFade: { mesh: AbstractMesh; mat: StandardMaterial; baseAlpha: number }[] = [];
  const renderObservers: Observer<Scene>[] = [];

  let isDissipated = false;
  let timeElapsed = Math.random() * 10;

  // Root anchor for character
  const rootNode = character.rootNode;

  // Find hand nodes
  const findBoneNode = (nameSubstring: string): TransformNode | null => {
    // 1. Check skeletons first
    if (character.skeleton) {
      const bone = character.skeleton.bones.find((b) => b.name.toLowerCase().includes(nameSubstring.toLowerCase()));
      if (bone) {
        const tn = bone.getTransformNode();
        if (tn) return tn as TransformNode;
      }
    }
    // 2. Search scene transform nodes
    const found = scene.transformNodes.find(
      (tn) =>
        tn.name.toLowerCase().includes(nameSubstring.toLowerCase()) &&
        (tn.parent === rootNode || tn.parent?.parent === rootNode || tn.parent?.parent?.parent === rootNode)
    );
    return found || null;
  };

  const rightHand = findBoneNode('hand.R') || findBoneNode('hand_r');
  const leftHand = findBoneNode('hand.L') || findBoneNode('hand_l');

  const targetHands: TransformNode[] = [];
  if (handsMode === 'right' && rightHand) targetHands.push(rightHand);
  else if (handsMode === 'left' && leftHand) targetHands.push(leftHand);
  else {
    if (rightHand) targetHands.push(rightHand);
    if (leftHand) targetHands.push(leftHand);
  }

  // Create Hand Orbs & Orbiting Rune Rings
  const handRings: TransformNode[] = [];
  const handOrbs: AbstractMesh[] = [];

  targetHands.forEach((hand, idx) => {
    const orbContainer = new TransformNode(`magicOrbRoot_${idx}_${Date.now()}`, scene);
    orbContainer.parent = hand;
    // Offset slightly forward into the palm of the hand
    orbContainer.position.set(0.015, 0.05, 0.02);
    disposables.push({ dispose: () => orbContainer.dispose() });

    // 1. Glowing Orb Mesh
    const orbMat = new StandardMaterial(`magicOrbMat_${idx}_${Date.now()}`, scene);
    orbMat.diffuseColor = primaryColor.scale(0.85);
    orbMat.emissiveColor = primaryColor;
    orbMat.specularColor = new Color3(0, 0, 0);
    orbMat.alpha = 0.88;
    disposables.push({ dispose: () => orbMat.dispose() });

    const orb = MeshBuilder.CreateSphere(
      `magicOrb_${idx}`,
      { diameter: orbSize, segments: 10 },
      scene
    );
    orb.material = orbMat;
    orb.parent = orbContainer;
    handOrbs.push(orb);
    meshesToFade.push({ mesh: orb, mat: orbMat, baseAlpha: 0.88 });
    disposables.push({ dispose: () => orb.dispose() });

    // Inner bright core
    const coreMat = new StandardMaterial(`magicCoreMat_${idx}_${Date.now()}`, scene);
    coreMat.diffuseColor = new Color3(1, 1, 1);
    coreMat.emissiveColor = new Color3(1, 1, 1);
    coreMat.alpha = 0.95;
    disposables.push({ dispose: () => coreMat.dispose() });

    const core = MeshBuilder.CreateSphere(
      `magicCore_${idx}`,
      { diameter: orbSize * 0.48, segments: 8 },
      scene
    );
    core.material = coreMat;
    core.parent = orbContainer;
    meshesToFade.push({ mesh: core, mat: coreMat, baseAlpha: 0.95 });
    disposables.push({ dispose: () => core.dispose() });

    // 2. Orbiting Arcane Rune Ring
    if (hasOrbitRings) {
      const ringMat = new StandardMaterial(`magicRingMat_${idx}_${Date.now()}`, scene);
      ringMat.diffuseColor = primaryColor;
      ringMat.emissiveColor = primaryColor.scale(1.2);
      ringMat.specularColor = new Color3(0, 0, 0);
      ringMat.alpha = 0.82;
      disposables.push({ dispose: () => ringMat.dispose() });

      const ring = MeshBuilder.CreateTorus(
        `magicRuneRing_${idx}`,
        { diameter: orbSize * 1.65, thickness: orbSize * 0.16, tessellation: 20 },
        scene
      );
      ring.material = ringMat;
      ring.parent = orbContainer;
      handRings.push(ring);
      meshesToFade.push({ mesh: ring, mat: ringMat, baseAlpha: 0.82 });
      disposables.push({ dispose: () => ring.dispose() });
    }
  });

  // 3. Ground Arcane Circle
  let groundCircleRoot: TransformNode | null = null;
  let groundRingOuter: AbstractMesh | null = null;
  let groundRingInner: AbstractMesh | null = null;

  if (hasGroundCircle) {
    groundCircleRoot = new TransformNode(`magicGroundCircleRoot_${Date.now()}`, scene);
    groundCircleRoot.parent = rootNode;
    groundCircleRoot.position.set(0, 0.035, 0);
    disposables.push({ dispose: () => groundCircleRoot?.dispose() });

    const groundMat = new StandardMaterial(`magicGroundMat_${Date.now()}`, scene);
    groundMat.diffuseColor = primaryColor;
    groundMat.emissiveColor = primaryColor;
    groundMat.specularColor = new Color3(0, 0, 0);
    groundMat.alpha = 0.65;
    disposables.push({ dispose: () => groundMat.dispose() });

    // Outer Circle Ring
    groundRingOuter = MeshBuilder.CreateTorus(
      'magicGroundOuter',
      { diameter: groundRadius * 2, thickness: 0.038, tessellation: 32 },
      scene
    );
    groundRingOuter.material = groundMat;
    groundRingOuter.parent = groundCircleRoot;
    meshesToFade.push({ mesh: groundRingOuter, mat: groundMat, baseAlpha: 0.65 });
    disposables.push({ dispose: () => groundRingOuter?.dispose() });

    // Inner Concentric Ring
    const innerMat = new StandardMaterial(`magicGroundInnerMat_${Date.now()}`, scene);
    innerMat.diffuseColor = primaryColor.scale(1.1);
    innerMat.emissiveColor = primaryColor.scale(1.2);
    innerMat.specularColor = new Color3(0, 0, 0);
    innerMat.alpha = 0.45;
    disposables.push({ dispose: () => innerMat.dispose() });

    groundRingInner = MeshBuilder.CreateTorus(
      'magicGroundInner',
      { diameter: groundRadius * 1.3, thickness: 0.024, tessellation: 24 },
      scene
    );
    groundRingInner.material = innerMat;
    groundRingInner.parent = groundCircleRoot;
    meshesToFade.push({ mesh: groundRingInner, mat: innerMat, baseAlpha: 0.45 });
    disposables.push({ dispose: () => groundRingInner?.dispose() });
  }

  // 4. Subtle Floating Arcane Motes / Sparks
  const sparks: { mesh: AbstractMesh; mat: StandardMaterial; angle: number; speed: number; yOffset: number; baseAlpha: number }[] = [];
  if (hasSparks && targetHands.length > 0) {
    const sparkCount = 6;
    for (let i = 0; i < sparkCount; i++) {
      const sMat = new StandardMaterial(`magicSparkMat_${i}_${Date.now()}`, scene);
      sMat.diffuseColor = new Color3(1, 1, 1);
      sMat.emissiveColor = primaryColor.scale(1.4);
      sMat.specularColor = new Color3(0, 0, 0);
      sMat.alpha = 0.8;
      disposables.push({ dispose: () => sMat.dispose() });

      const spark = MeshBuilder.CreateSphere(
        `magicSpark_${i}`,
        { diameter: 0.045, segments: 6 },
        scene
      );
      spark.material = sMat;
      spark.parent = targetHands[i % targetHands.length];
      disposables.push({ dispose: () => spark.dispose() });

      sparks.push({
        mesh: spark,
        mat: sMat,
        angle: (i / sparkCount) * Math.PI * 2,
        speed: 2.2 + Math.random() * 1.8,
        yOffset: (Math.random() - 0.5) * 0.15,
        baseAlpha: 0.8,
      });
      meshesToFade.push({ mesh: spark, mat: sMat, baseAlpha: 0.8 });
    }
  }

  // Main Animation Loop
  const animObserver = scene.onBeforeRenderObservable.add(() => {
    if (isDissipated) return;
    const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.05);
    timeElapsed += dt;

    // Pulsing orbs
    const pulse = 1.0 + Math.sin(timeElapsed * 5.0) * 0.12;
    handOrbs.forEach((orb) => {
      orb.scaling.set(pulse, pulse, pulse);
    });

    // Orbiting rings
    handRings.forEach((ring, idx) => {
      const dir = idx % 2 === 0 ? 1 : -1;
      ring.rotation.x += 2.8 * dt * dir;
      ring.rotation.y += 3.5 * dt * dir;
    });

    // Rotating ground circles
    if (groundRingOuter) {
      groundRingOuter.rotation.y += 0.45 * dt;
    }
    if (groundRingInner) {
      groundRingInner.rotation.y -= 0.75 * dt;
    }

    // Sparkle orbit around hands
    sparks.forEach((sp) => {
      sp.angle += sp.speed * dt;
      const r = orbSize * 1.35;
      sp.mesh.position.set(
        Math.cos(sp.angle) * r,
        sp.yOffset + Math.sin(sp.angle * 2.0) * 0.05 + 0.05,
        Math.sin(sp.angle) * r
      );
      sp.mat.alpha = 0.4 + Math.sin(timeElapsed * 6.0 + sp.angle) * 0.4;
    });
  });
  if (animObserver) renderObservers.push(animObserver);

  // Dissipate cleanly when wizard is knocked down or defeated
  const dissipate = (): void => {
    if (isDissipated) return;
    isDissipated = true;

    // Burst expansion then rapid fade out
    let fadeProgress = 0;
    const fadeObs = scene.onBeforeRenderObservable.add(() => {
      fadeProgress += 0.08;
      meshesToFade.forEach(({ mesh, mat, baseAlpha }) => {
        mesh.scaling.scaleInPlace(1.05);
        mat.alpha = Math.max(0, baseAlpha * (1.0 - fadeProgress));
      });

      if (fadeProgress >= 1.0) {
        scene.onBeforeRenderObservable.remove(fadeObs);
        dispose();
      }
    });
  };

  const setColor = (newColor: Color3): void => {
    meshesToFade.forEach(({ mat }) => {
      mat.diffuseColor = newColor;
      mat.emissiveColor = newColor.scale(1.2);
    });
  };

  const triggerBurst = (): void => {
    // Quick burst flash
    handOrbs.forEach((orb) => {
      orb.scaling.scaleInPlace(1.8);
    });
  };

  const dispose = (): void => {
    renderObservers.forEach((obs) => scene.onBeforeRenderObservable.remove(obs));
    disposables.forEach((d) => {
      try {
        d.dispose();
      } catch {
        // Safe disposal
      }
    });
  };

  return {
    update: () => {},
    setColor,
    triggerBurst,
    dissipate,
    dispose,
    get isDissipated() {
      return isDissipated;
    },
  };
}
