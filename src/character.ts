import {
  Scene,
  SceneLoader,
  Vector3,
  Color3,
  TransformNode,
  AbstractMesh,
  AnimationGroup,
  Skeleton,
  AssetContainer,
  type ShadowGenerator,
} from '@babylonjs/core';
import {
  createCharacterMagicFx,
  type MagicController,
  type MagicFxConfig,
} from './core/magicFx';
import {
  attachCartoonFace,
  attachGooglyEyes,
  type CartoonFaceInstance,
} from './characterFace';
import {
  createCartoonRagdollMaterials,
  createCartoonYellowMaterial,
  attachBodyAccessories,
  type RagdollMaterials,
  type BodyAccessoriesInstance,
} from './characterStyling';
import {
  attachSwordModel,
  getDefaultWeaponPosition,
  type AttachedSwordInstance,
} from './characterWeapon';

export {
  attachCartoonFace,
  attachGooglyEyes,
  createCartoonRagdollMaterials,
  createCartoonYellowMaterial,
  attachBodyAccessories,
  attachSwordModel,
  getDefaultWeaponPosition,
  type CartoonFaceInstance,
  type RagdollMaterials,
  type BodyAccessoriesInstance,
  type AttachedSwordInstance,
};

export interface CharacterInstance {
  rootNode: TransformNode;
  mainMesh: AbstractMesh;
  skeleton: Skeleton | null;
  animationGroups: AnimationGroup[];
  playAnimation: (animName: string, loop?: boolean, speed?: number) => void;
  playAnimationSequence: (animNames: string[], speed?: number) => void;
  stopAllAnimations: () => void;
  headNode: TransformNode | null;
  attachedSword?: AttachedSwordInstance | null;
  attachedWeapon?: AttachedSwordInstance | null;
  magicController?: MagicController | null;
  currentWeaponPath?: string;
  setWeapon?: (modelPath?: string, options?: { scale?: number; rotation?: Vector3; position?: Vector3 }) => Promise<void>;
  updateWeaponTransform?: (pos?: Vector3, rot?: Vector3, scale?: number) => void;
  setMagicFx?: (fx?: boolean | 'arcane' | 'fire' | 'none' | MagicFxConfig) => void;
  faceInstance?: CartoonFaceInstance | null;
  setDefeatedFace?: (isDefeated: boolean) => void;
  dispose: () => void;
}

export interface CharacterOptions {
  position?: Vector3;
  rotationY?: number;
  scale?: number;
  animationName?: string;
  animationNames?: string[];
  animationSpeed?: number;
  namePrefix?: string;
  shadowGen?: ShadowGenerator;
  swordModelPath?: string;
  weaponModelPath?: string;
  swordScale?: number;
  swordRotation?: Vector3;
  swordPosition?: Vector3;
  magicFx?: boolean | 'arcane' | 'fire' | 'none' | MagicFxConfig;
  bodyColor?: Color3;
  jointsColor?: Color3;
}



let characterAssetContainer: AssetContainer | null = null;
let characterContainerLoadingPromise: Promise<AssetContainer> | null = null;

export async function getCharacterAssetContainer(scene: Scene): Promise<AssetContainer> {
  if (characterAssetContainer && characterAssetContainer.scene === scene) {
    return characterAssetContainer;
  }
  if (!characterContainerLoadingPromise || (characterAssetContainer && characterAssetContainer.scene !== scene)) {
    characterContainerLoadingPromise = SceneLoader.LoadAssetContainerAsync(
      './assets/',
      'AnimationLibrary_Godot_Standard.glb',
      scene
    ).then((container) => {
      characterAssetContainer = container;
      return container;
    });
  }
  return characterContainerLoadingPromise;
}

export async function loadCharacter(scene: Scene, options: CharacterOptions = {}): Promise<CharacterInstance> {
  const prefix = options.namePrefix || `char_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const spawnPos = options.position || new Vector3(0, 0, 0);
  const rotY = options.rotationY ?? 0;
  const userScale = options.scale ?? 1.0;

  // On mobile portrait, boost character scale by 1.22x so ragdolls and animations are big & readable
  const isMobilePortrait = (scene.getEngine().getRenderWidth() / (scene.getEngine().getRenderHeight() || 1)) < 1.0;
  const scale = userScale * (isMobilePortrait ? 1.22 : 1.0);

  const container = await getCharacterAssetContainer(scene);
  const instantiated = container.instantiateModelsToScene(
    (name) => `${prefix}_${name}`,
    false,
    { doNotInstantiate: true }
  );

  const rootMesh = (instantiated.rootNodes[0] || instantiated.rootNodes.find((r) => r.name.includes('root'))) as AbstractMesh;
  rootMesh.name = `${prefix}_root`;
  rootMesh.position.copyFrom(spawnPos);
  rootMesh.rotationQuaternion = null;
  rootMesh.rotation.y = rotY;
  rootMesh.scaling.setAll(scale);

  const childMeshes = (rootMesh.getChildMeshes ? rootMesh.getChildMeshes(false) : []) as AbstractMesh[];
  const allMeshes = [rootMesh, ...childMeshes];
  const childTransformNodes = (rootMesh.getChildTransformNodes ? rootMesh.getChildTransformNodes(false) : []) as TransformNode[];

  // Apply upgraded cartoon multi-materials to Mannequin mesh
  const ragdollMats = createCartoonRagdollMaterials(scene, `${prefix}_mats`, {
    bodyColor: options.bodyColor,
    jointsColor: options.jointsColor,
  });
  const mannequinMesh = allMeshes.find((m) => m.name.toLowerCase().includes('mannequin')) || childMeshes[0] || rootMesh;
  if (mannequinMesh) {
    if (mannequinMesh.subMeshes && mannequinMesh.subMeshes.length > 1) {
      mannequinMesh.material = ragdollMats.multiMat;
    } else {
      mannequinMesh.material = ragdollMats.mainMat;
    }
    if (options.shadowGen) {
      options.shadowGen.addShadowCaster(mannequinMesh);
    }
  }

  // Find head bone / transform node
  let headNode = childTransformNodes.find((t) => t.name.includes('DEF-head') || t.name.includes('head')) || null;
  if (!headNode && instantiated.skeletons.length > 0) {
    const headBone = instantiated.skeletons[0].bones.find((b) => b.name === 'DEF-head' || b.name.includes('head'));
    if (headBone) {
      headNode = headBone.getTransformNode() as TransformNode;
    }
  }

  let faceInstance: CartoonFaceInstance | null = null;
  if (headNode) {
    faceInstance = attachCartoonFace(headNode, scene, `${prefix}_face`);
  }

  const bodyAccessories = attachBodyAccessories(
    rootMesh,
    childTransformNodes,
    instantiated.skeletons[0] || null,
    scene,
    `${prefix}_acc`
  );

  // Find hand bone / transform node for weapon attachment
  let handNode = childTransformNodes.find((t) => t.name.includes('DEF-hand.R') || t.name.includes('hand.R') || t.name.includes('hand_r')) || null;
  if (!handNode && instantiated.skeletons.length > 0) {
    const handBone = instantiated.skeletons[0].bones.find((b) => b.name === 'DEF-hand.R' || b.name.includes('hand.R') || b.name.includes('hand_r'));
    if (handBone) {
      handNode = handBone.getTransformNode() as TransformNode;
    }
  }

  let attachedSword: AttachedSwordInstance | null = null;
  let currentWeaponPath: string | undefined = undefined;

  let currentAnimNames: string[] = options.animationNames && options.animationNames.length > 0
    ? [...options.animationNames]
    : (options.animationName ? [options.animationName] : []);

  const isPistolAnim = currentAnimNames.some(
    (a) => a.toLowerCase().includes('pistol') || a.toLowerCase().includes('gun')
  );
  const isSwordAnim = currentAnimNames.some(
    (a) => a.toLowerCase().includes('sword')
  );

  const rawModelChoice = options.weaponModelPath || options.swordModelPath;
  const initialWeaponPath = (rawModelChoice && rawModelChoice !== 'auto')
    ? (rawModelChoice === 'none' ? undefined : rawModelChoice)
    : (isPistolAnim ? 'Pistol.glb' : (isSwordAnim ? 'swords/sword.glb' : undefined));

  const attachWeaponInternal = async (
    modelPath: string,
    wOptions?: { scale?: number; rotation?: Vector3; position?: Vector3 }
  ): Promise<AttachedSwordInstance | null> => {
    if (!handNode || !modelPath || modelPath === 'none') return null;
    return await attachSwordModel(handNode, modelPath, scene, {
      scale: wOptions?.scale ?? options.swordScale,
      rotation: wOptions?.rotation ?? options.swordRotation,
      position: wOptions?.position ?? options.swordPosition,
      shadowGen: options.shadowGen,
      animationName: options.animationName,
      animationNames: currentAnimNames,
    });
  };

  if (handNode && initialWeaponPath && initialWeaponPath !== 'none') {
    try {
      attachedSword = await attachWeaponInternal(initialWeaponPath);
      currentWeaponPath = initialWeaponPath;
    } catch (err) {
      console.warn('Failed to attach weapon to character hand:', err);
    }
  }

  let sequenceTimeout: number | null = null;
  let sequenceIndex = 0;
  let activeSequence: string[] = [];

  const findAnimGroup = (animName: string): AnimationGroup | undefined => {
    const cleanQuery = animName.toLowerCase();
    return instantiated.animationGroups.find((ag) => {
      const cleanAg = ag.name.toLowerCase();
      return (
        cleanAg === cleanQuery ||
        cleanAg.endsWith(`_${cleanQuery}`) ||
        cleanAg.replace(/^[a-z0-9_-]+_/, '') === cleanQuery
      );
    });
  };

  const clearSequenceTimers = (): void => {
    if (sequenceTimeout !== null) {
      window.clearTimeout(sequenceTimeout);
      sequenceTimeout = null;
    }
    instantiated.animationGroups.forEach((ag) => {
      ag.onAnimationGroupEndObservable.clear();
    });
  };

  const stopSequence = (): void => {
    activeSequence = [];
    clearSequenceTimers();
  };

  const playAnimation = (animName: string, loop = true, speed = 1.0): void => {
    currentAnimNames = [animName];
    stopSequence();
    instantiated.animationGroups.forEach((ag) => ag.stop());
    const targetGroup = findAnimGroup(animName);
    if (targetGroup) {
      targetGroup.speedRatio = speed;
      targetGroup.start(loop, speed, targetGroup.from, targetGroup.to);
    }
  };

  const playAnimationSequence = (animNames: string[], speed = 1.0): void => {
    currentAnimNames = [...animNames];
    stopSequence();
    const validNames = animNames.filter((n) => findAnimGroup(n) !== undefined);
    if (validNames.length === 0) return;
    if (validNames.length === 1) {
      playAnimation(validNames[0], true, speed);
      return;
    }

    activeSequence = [...validNames];
    sequenceIndex = 0;

    const playNext = () => {
      clearSequenceTimers();
      if (activeSequence.length === 0) return;
      const nextName = activeSequence[sequenceIndex % activeSequence.length];
      sequenceIndex++;

      instantiated.animationGroups.forEach((ag) => ag.stop());
      const ag = findAnimGroup(nextName);
      if (!ag) {
        sequenceTimeout = window.setTimeout(playNext, 500);
        return;
      }

      ag.speedRatio = speed;
      const isLoop = nextName.toLowerCase().includes('loop') || nextName.toLowerCase().includes('idle');
      if (isLoop) {
        ag.start(true, speed, ag.from, ag.to);
        sequenceTimeout = window.setTimeout(playNext, 3800);
      } else {
        ag.start(false, speed, ag.from, ag.to);
        const obs = ag.onAnimationGroupEndObservable.addOnce(() => {
          ag.onAnimationGroupEndObservable.remove(obs);
          if (activeSequence.length > 0) {
            playNext();
          }
        });
      }
    };

    playNext();
  };

  const stopAllAnimations = (): void => {
    stopSequence();
    instantiated.animationGroups.forEach((ag) => ag.stop());
  };

  // Start initial animation(s) if specified
  if (options.animationNames && options.animationNames.length > 1) {
    playAnimationSequence(options.animationNames, options.animationSpeed ?? 1.0);
  } else if (options.animationNames && options.animationNames.length === 1) {
    playAnimation(options.animationNames[0], true, options.animationSpeed ?? 1.0);
  } else if (options.animationName) {
    playAnimation(options.animationName, true, options.animationSpeed ?? 1.0);
  }

  let magicController: MagicController | null = null;
  const isSpellAnim = (options.animationNames || [options.animationName || '']).some(
    (a) => a.toLowerCase().includes('spell') || a.toLowerCase().includes('magic')
  );

  const dispose = (): void => {
    stopAllAnimations();
    if (faceInstance) {
      faceInstance.dispose();
      faceInstance = null;
    }
    if (bodyAccessories) {
      bodyAccessories.dispose();
    }
    ragdollMats.dispose();
    if (magicController) {
      magicController.dispose();
      magicController = null;
    }
    if (attachedSword) {
      attachedSword.dispose();
      attachedSword = null;
    }
    if (options.shadowGen && mannequinMesh) {
      options.shadowGen.removeShadowCaster(mannequinMesh);
    }
    instantiated.animationGroups.forEach((ag) => ag.dispose());
    allMeshes.forEach((m) => {
      m.material?.dispose(true, true);
      m.dispose(false, true);
    });
    instantiated.skeletons.forEach((s) => s.dispose());
    childTransformNodes.forEach((t) => t.dispose());
    instantiated.rootNodes.forEach((r) => r.dispose(false, true));
  };

  const updateWeaponTransform = (pos?: Vector3, rot?: Vector3, scale?: number): void => {
    const w = instance.attachedSword || instance.attachedWeapon;
    if (!w?.root) return;
    if (pos) w.root.position.copyFrom(pos);
    if (rot) w.root.rotation.copyFrom(rot);
    if (scale !== undefined && scale > 0) {
      w.root.scaling.setAll((w.baseScale ?? 1.0) * scale);
    }
  };

  const setWeapon = async (
    modelPath?: string,
    wOptions?: { scale?: number; rotation?: Vector3; position?: Vector3 }
  ): Promise<void> => {
    const isPistol = currentAnimNames.some(
      (a) => a.toLowerCase().includes('pistol') || a.toLowerCase().includes('gun')
    );
    const isSword = currentAnimNames.some(
      (a) => a.toLowerCase().includes('sword')
    );
    const targetPath = (!modelPath || modelPath === 'auto')
      ? (isPistol ? 'Pistol.glb' : (isSword ? 'swords/sword.glb' : undefined))
      : (modelPath === 'none' ? undefined : modelPath);

    if (currentWeaponPath === targetPath && (instance.attachedSword || instance.attachedWeapon)) {
      updateWeaponTransform(wOptions?.position, wOptions?.rotation, wOptions?.scale);
      return;
    }

    if (instance.attachedSword) {
      instance.attachedSword.dispose();
      instance.attachedSword = null;
      instance.attachedWeapon = null;
    }
    currentWeaponPath = targetPath;
    instance.currentWeaponPath = targetPath;

    if (!handNode || !targetPath) {
      return;
    }

    try {
      const newAttached = await attachWeaponInternal(targetPath, wOptions);
      instance.attachedSword = newAttached;
      instance.attachedWeapon = newAttached;
    } catch (err) {
      console.warn('Failed to update character weapon:', err);
    }
  };

  let currentMagicFxSetting: unknown = options.magicFx;

  const setMagicFx = (fx?: boolean | 'arcane' | 'fire' | 'none' | MagicFxConfig): void => {
    const currentSerialized = JSON.stringify(currentMagicFxSetting ?? 'none');
    const newSerialized = JSON.stringify(fx ?? 'none');
    if (currentSerialized === newSerialized) return;

    if (magicController) {
      magicController.dispose();
      magicController = null;
      instance.magicController = null;
    }
    currentMagicFxSetting = fx;
    if (!fx || fx === 'none') return;
    const magicCfg: MagicFxConfig = typeof fx === 'object'
      ? fx
      : (fx === 'fire'
          ? { color: [1.0, 0.45, 0.08] }
          : (fx === 'arcane' ? { color: [0.18, 0.85, 1.0] } : {}));
    magicController = createCharacterMagicFx(instance, scene, magicCfg);
    instance.magicController = magicController;
  };

  const setDefeatedFace = (isDefeated: boolean): void => {
    faceInstance?.setDefeated(isDefeated);
  };

  const instance: CharacterInstance = {
    rootNode: rootMesh as unknown as TransformNode,
    mainMesh: mannequinMesh || rootMesh,
    skeleton: instantiated.skeletons[0] || null,
    animationGroups: instantiated.animationGroups,
    playAnimation,
    playAnimationSequence,
    stopAllAnimations,
    headNode,
    attachedSword,
    attachedWeapon: attachedSword,
    magicController: null,
    currentWeaponPath,
    setWeapon,
    updateWeaponTransform,
    setMagicFx,
    faceInstance,
    setDefeatedFace,
    dispose,
  };

  if (options.magicFx || isSpellAnim) {
    const magicCfg: MagicFxConfig = typeof options.magicFx === 'object'
      ? options.magicFx
      : (options.magicFx === 'fire'
          ? { color: [1.0, 0.45, 0.08] }
          : (options.magicFx === 'arcane' ? { color: [0.18, 0.85, 1.0] } : {}));
    magicController = createCharacterMagicFx(instance, scene, magicCfg);
    instance.magicController = magicController;
  }

  return instance;
}
