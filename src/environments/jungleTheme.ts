import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Scene,
  TransformNode,
  type ShadowGenerator,
} from '@babylonjs/core';
import type { BackgroundTheme, EnvironmentInstance, EnvironmentCollider } from './types';

// Ancient jungle temple ruins flanking the trail (replacing city buildings as solid bounce colliders)
const TEMPLE_CONFIGS = [
  // Left Flank (x = -18.5, facing inward +X)
  { x: -18.5, z: 4.0,  w: 6.6, d: 7.8, h: 8.5,  color: new Color3(0.40, 0.42, 0.36) },
  { x: -18.5, z: 18.0, w: 6.8, d: 8.2, h: 11.0, color: new Color3(0.36, 0.39, 0.34) },
  { x: -18.5, z: 32.0, w: 6.4, d: 7.5, h: 8.0,  color: new Color3(0.42, 0.44, 0.38) },
  { x: -18.5, z: 46.0, w: 6.8, d: 8.0, h: 10.0, color: new Color3(0.38, 0.40, 0.35) },
  { x: -18.5, z: 60.0, w: 7.2, d: 8.6, h: 11.5, color: new Color3(0.35, 0.38, 0.32) },

  // Right Flank (x = +18.9, facing inward -X)
  { x: 18.9,  z: 4.0,  w: 6.6, d: 7.8, h: 9.5,  color: new Color3(0.38, 0.40, 0.35) },
  { x: 18.9,  z: 18.0, w: 6.8, d: 8.2, h: 8.0,  color: new Color3(0.42, 0.44, 0.38) },
  { x: 18.9,  z: 32.0, w: 6.4, d: 7.5, h: 10.8, color: new Color3(0.36, 0.39, 0.34) },
  { x: 18.9,  z: 46.0, w: 6.8, d: 8.0, h: 8.5,  color: new Color3(0.40, 0.42, 0.36) },
  { x: 18.9,  z: 60.0, w: 7.2, d: 8.6, h: 10.2, color: new Color3(0.37, 0.39, 0.33) },
];

/**
 * Creates the stylized jungle wooden boardwalk & grass arena ground.
 */
function createJungleGround(scene: Scene, root: TransformNode) {
  // 1. Lush tropical grass base across the entire runway
  const grassMat = new StandardMaterial('jungle_grassMat', scene);
  grassMat.diffuseColor = new Color3(0.18, 0.48, 0.16); // Vibrant rainforest emerald grass
  grassMat.specularColor = new Color3(0.02, 0.02, 0.02);

  // Left & right grass verges
  const leftGrass = MeshBuilder.CreateBox('jungle_leftGrass', { width: 14.0, height: 1.0, depth: 140.0 }, scene);
  leftGrass.position.set(-17.7, -0.49, 50.0);
  leftGrass.material = grassMat;
  leftGrass.receiveShadows = true;
  leftGrass.parent = root;

  const rightGrass = MeshBuilder.CreateBox('jungle_rightGrass', { width: 14.0, height: 1.0, depth: 140.0 }, scene);
  rightGrass.position.set(18.1, -0.49, 50.0);
  rightGrass.material = grassMat;
  rightGrass.receiveShadows = true;
  rightGrass.parent = root;

  // 2. Beautiful wooden boardwalk highway along central action plane
  const woodDeck = MeshBuilder.CreateBox('jungle_woodDeck', { width: 22.0, height: 1.0, depth: 140.0 }, scene);
  woodDeck.position.set(0.2, -0.50, 50.0);
  const deckMat = new StandardMaterial('jungle_deckMat', scene);
  deckMat.diffuseColor = new Color3(0.46, 0.30, 0.18); // Rich warm tropical teak wood
  deckMat.specularColor = new Color3(0.04, 0.04, 0.04);
  woodDeck.material = deckMat;
  woodDeck.receiveShadows = true;
  woodDeck.parent = root;

  // 3. Lateral wooden plank divider grooves across the boardwalk
  const plankGrooveMat = new StandardMaterial('jungle_plankGrooveMat', scene);
  plankGrooveMat.diffuseColor = new Color3(0.24, 0.15, 0.08); // Dark wood seams

  for (let z = -10; z <= 90; z += 2.8) {
    const seam = MeshBuilder.CreateBox(`jungle_seam_${z}`, { width: 21.8, height: 0.012, depth: 0.15 }, scene);
    seam.position.set(0.2, 0.006, z);
    seam.material = plankGrooveMat;
    seam.parent = root;
  }

  // 4. Sturdy wooden log curb barriers along outer boardwalk edges
  const logBarrierMat = new StandardMaterial('jungle_logBarrierMat', scene);
  logBarrierMat.diffuseColor = new Color3(0.32, 0.20, 0.12); // Heavy jungle timber logs

  [-10.6, 11.0].forEach((lx, idx) => {
    const logBeam = MeshBuilder.CreateCylinder(`jungle_logBeam_${idx}`, {
      height: 140.0,
      diameter: 0.35,
      tessellation: 8,
    }, scene);
    logBeam.position.set(lx, 0.18, 50.0);
    logBeam.rotation.x = Math.PI / 2;
    logBeam.material = logBarrierMat;
    logBeam.parent = root;
  });
}

/**
 * Creates ancient Aztec / Mayan temple ruins flanking the arena.
 * Provides solid bounding boxes for obstacleManager environment bounce physics.
 */
function createAncientTemples(scene: Scene, root: TransformNode): EnvironmentCollider[] {
  const colliders: EnvironmentCollider[] = [];

  const mossTrimMat = new StandardMaterial('jungle_mossTrimMat', scene);
  mossTrimMat.diffuseColor = new Color3(0.22, 0.52, 0.18); // Hanging lush moss

  const stoneReliefMat = new StandardMaterial('jungle_stoneReliefMat', scene);
  stoneReliefMat.diffuseColor = new Color3(0.52, 0.54, 0.46); // Carved glyph stone

  TEMPLE_CONFIGS.forEach((t, idx) => {
    const stoneMat = new StandardMaterial(`jungle_templeMat_${idx}`, scene);
    stoneMat.diffuseColor = t.color;
    stoneMat.specularColor = new Color3(0.04, 0.04, 0.04);

    // Main stepped pyramid stone body
    const baseTower = MeshBuilder.CreateBox(`jungle_temple_${idx}`, {
      width: t.w,
      height: t.h,
      depth: t.d,
    }, scene);
    baseTower.position.set(t.x, t.h / 2, t.z);
    baseTower.material = stoneMat;
    baseTower.parent = root;

    // Register AABB collider for obstacle bounce physics
    baseTower.computeWorldMatrix(true);
    const bInfo = baseTower.getBoundingInfo();
    if (bInfo) {
      colliders.push({
        min: bInfo.boundingBox.minimumWorld.clone(),
        max: bInfo.boundingBox.maximumWorld.clone(),
      });
    }

    // Upper stepped shrine tier
    const topTier = MeshBuilder.CreateBox(`jungle_shrine_${idx}`, {
      width: t.w * 0.75,
      height: 1.8,
      depth: t.d * 0.75,
    }, scene);
    topTier.position.set(t.x, t.h + 0.9, t.z);
    topTier.material = stoneReliefMat;
    topTier.parent = root;

    // Moss crown on temple summit
    const mossCrown = MeshBuilder.CreateBox(`jungle_templeMoss_${idx}`, {
      width: t.w * 0.78,
      height: 0.25,
      depth: t.d * 0.78,
    }, scene);
    mossCrown.position.set(t.x, t.h + 1.9, t.z);
    mossCrown.material = mossTrimMat;
    mossCrown.parent = root;

    // Decorative carved stone horizontal bands on facade facing inward
    const facadeX = t.x < 0 ? (t.x + t.w / 2 + 0.05) : (t.x - t.w / 2 - 0.05);
    for (let h = 1.8; h < t.h; h += 2.2) {
      const band = MeshBuilder.CreateBox(`jungle_band_${idx}_${h}`, {
        width: 0.1,
        height: 0.45,
        depth: t.d - 0.8,
      }, scene);
      band.position.set(facadeX, h, t.z);
      band.material = stoneReliefMat;
      band.parent = root;
    }
  });

  return colliders;
}

/**
 * Creates majestic tropical palm trees and dense multi-tier rainforest trees.
 */
function createTropicalPalms(scene: Scene, root: TransformNode) {
  const palmTrunkMat = new StandardMaterial('jungle_palmTrunkMat', scene);
  palmTrunkMat.diffuseColor = new Color3(0.38, 0.24, 0.14); // Warm palm bark

  const palmLeafMat1 = new StandardMaterial('jungle_palmLeafMat1', scene);
  palmLeafMat1.diffuseColor = new Color3(0.18, 0.64, 0.20); // Vibrant palm green

  const palmLeafMat2 = new StandardMaterial('jungle_palmLeafMat2', scene);
  palmLeafMat2.diffuseColor = new Color3(0.26, 0.72, 0.24); // Bright tropical fronds

  const coconutMat = new StandardMaterial('jungle_coconutMat', scene);
  coconutMat.diffuseColor = new Color3(0.30, 0.18, 0.10);

  const treeZPositions = [0, 11, 23, 35, 47, 59, 71];

  treeZPositions.forEach((tz, idx) => {
    [[-11.6, 0], [12.0, 1]].forEach(([tx, sideIdx]) => {
      // Slender tall curved tropical palm trunk
      const trunk = MeshBuilder.CreateCylinder(`jungle_palmTrunk_${idx}_${sideIdx}`, {
        height: 4.6,
        diameterTop: 0.24,
        diameterBottom: 0.42,
        tessellation: 8,
      }, scene);
      trunk.position.set(tx, 2.3, tz);
      trunk.rotation.z = sideIdx === 0 ? -0.07 : 0.07;
      trunk.material = palmTrunkMat;
      trunk.parent = root;

      // Lush leafy core crown
      const crown = MeshBuilder.CreateSphere(`jungle_crown_${idx}_${sideIdx}`, {
        diameterX: 1.4,
        diameterY: 1.0,
        diameterZ: 1.4,
        segments: 6,
      }, scene);
      crown.position.set(tx, 4.4, tz);
      crown.material = palmLeafMat1;
      crown.parent = root;

      // Coconuts cluster under crown
      const coco = MeshBuilder.CreateSphere(`jungle_coco_${idx}_${sideIdx}`, {
        diameter: 0.45,
        segments: 5,
      }, scene);
      coco.position.set(tx, 4.15, tz);
      coco.material = coconutMat;
      coco.parent = root;

      // Dual-tier spreading tropical palm fronds
      const frondCount = 8;
      for (let f = 0; f < frondCount; f++) {
        const angle = (f / frondCount) * Math.PI * 2;
        const leafMat = f % 2 === 0 ? palmLeafMat1 : palmLeafMat2;

        // Upper canopy tier
        const frondUp = MeshBuilder.CreateBox(`jungle_frondUp_${idx}_${sideIdx}_${f}`, {
          width: 0.55,
          height: 0.05,
          depth: 2.5,
        }, scene);
        frondUp.position.set(
          tx + Math.sin(angle) * 1.1,
          4.4 - Math.abs(Math.sin(f)) * 0.15,
          tz + Math.cos(angle) * 1.1
        );
        frondUp.rotation.y = angle;
        frondUp.rotation.x = 0.22;
        frondUp.material = leafMat;
        frondUp.parent = root;

        // Lower drooping tier
        const frondDown = MeshBuilder.CreateBox(`jungle_frondDown_${idx}_${sideIdx}_${f}`, {
          width: 0.45,
          height: 0.04,
          depth: 2.1,
        }, scene);
        frondDown.position.set(
          tx + Math.sin(angle + 0.35) * 1.0,
          4.2 - Math.abs(Math.cos(f)) * 0.2,
          tz + Math.cos(angle + 0.35) * 1.0
        );
        frondDown.rotation.y = angle + 0.35;
        frondDown.rotation.x = 0.42;
        frondDown.material = leafMat;
        frondDown.parent = root;
      }
    });
  });
}

/**
 * Creates lush wild ferns, tropical bushes, and natural wooden logs along the perimeter.
 * STRICTLY NO ELECTRIC LIGHTS OR STREET POLES!
 */
function createJungleFoliageAndLogs(scene: Scene, root: TransformNode) {
  const bushMat = new StandardMaterial('jungle_wildBushMat', scene);
  bushMat.diffuseColor = new Color3(0.14, 0.46, 0.16);
  bushMat.specularColor = new Color3(0.02, 0.02, 0.02);

  const fallenLogMat = new StandardMaterial('jungle_fallenLogMat', scene);
  fallenLogMat.diffuseColor = new Color3(0.30, 0.18, 0.10);

  // Clustered natural ferns and low-poly bushes
  const bushZs = [5, 16, 28, 41, 54, 66];
  bushZs.forEach((bz, idx) => {
    [[-11.8, -1], [12.2, 1]].forEach(([bx, dir]) => {
      // Natural tropical shrub cluster
      const bush1 = MeshBuilder.CreateSphere(`jungle_bush1_${idx}_${dir}`, {
        diameterX: 1.4,
        diameterY: 1.1,
        diameterZ: 1.4,
        segments: 6,
      }, scene);
      bush1.position.set(bx, 0.55, bz);
      bush1.material = bushMat;
      bush1.parent = root;

      const bush2 = MeshBuilder.CreateSphere(`jungle_bush2_${idx}_${dir}`, {
        diameterX: 1.0,
        diameterY: 0.8,
        diameterZ: 1.0,
        segments: 5,
      }, scene);
      bush2.position.set(bx + dir * 0.5, 0.4, bz + 0.6);
      bush2.material = bushMat;
      bush2.parent = root;

      // Natural mossy fallen log prop
      if (idx % 2 === 0) {
        const log = MeshBuilder.CreateCylinder(`jungle_fallenLog_${idx}_${dir}`, {
          height: 2.2,
          diameter: 0.3,
          tessellation: 6,
        }, scene);
        log.position.set(bx + dir * 0.8, 0.15, bz - 0.4);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = 0.4 * dir;
        log.material = fallenLogMat;
        log.parent = root;
      }
    });
  });
}

export const jungleTheme: BackgroundTheme = {
  id: 'jungle_forest',
  name: 'Jungle & Wild Forest',
  skyColor: new Color4(0.40, 0.72, 0.88, 1.0), // Vibrant tropical safari sky
  hemiLightDiffuse: new Color3(0.96, 0.98, 0.90), // Bright tropical sun daylight
  hemiLightGround: new Color3(0.18, 0.42, 0.16),  // Lush rainforest emerald bounce
  dirLightDiffuse: new Color3(1.0, 0.96, 0.88),   // Warm golden sunlight
  dirLightIntensity: 0.90,
  setup: (scene: Scene, _shadowGen?: ShadowGenerator): EnvironmentInstance => {
    const root = new TransformNode('jungleForestRoot', scene);

    createJungleGround(scene, root);
    const colliders = createAncientTemples(scene, root);
    createTropicalPalms(scene, root);
    createJungleFoliageAndLogs(scene, root);

    // Freeze all child meshes for optimal 60fps rendering
    root.getChildMeshes(false).forEach((m) => m.freezeWorldMatrix());

    return {
      root,
      colliders,
      dispose: () => {
        root.getChildMeshes(false).forEach((m) => {
          m.material?.dispose(true, true);
          m.dispose(false, true);
        });
        root.dispose();
      },
    };
  },
};
