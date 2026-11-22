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

// Building configurations flanking left and right sides
const BUILDING_CONFIGS = [
  // Left Flank (x = -18.5, facing avenue +X)
  { side: 'L', x: -18.5, z: 4.0,  w: 6.2, d: 7.5, h: 8.8,  color: new Color3(0.32, 0.58, 0.54) }, // Mint Teal
  { side: 'L', x: -18.5, z: 17.0, w: 6.2, d: 8.0, h: 11.2, color: new Color3(0.26, 0.36, 0.52) }, // Cobalt Blue
  { side: 'L', x: -18.5, z: 30.0, w: 6.2, d: 7.2, h: 7.8,  color: new Color3(0.78, 0.44, 0.36) }, // Terracotta
  { side: 'L', x: -18.5, z: 43.0, w: 6.2, d: 8.2, h: 9.6,  color: new Color3(0.48, 0.42, 0.62) }, // Modern Violet
  { side: 'L', x: -18.5, z: 57.0, w: 6.2, d: 8.5, h: 11.5, color: new Color3(0.82, 0.62, 0.28) }, // Goldenrod

  // Right Flank (x = +18.9, facing avenue -X)
  { side: 'R', x: 18.9,  z: 4.0,  w: 6.2, d: 7.5, h: 9.2,  color: new Color3(0.82, 0.62, 0.28) }, // Goldenrod
  { side: 'R', x: 18.9,  z: 17.0, w: 6.2, d: 8.0, h: 7.6,  color: new Color3(0.78, 0.44, 0.36) }, // Terracotta
  { side: 'R', x: 18.9,  z: 30.0, w: 6.2, d: 7.2, h: 11.0, color: new Color3(0.30, 0.54, 0.74) }, // Ocean Blue
  { side: 'R', x: 18.9,  z: 43.0, w: 6.2, d: 8.2, h: 8.4,  color: new Color3(0.38, 0.58, 0.42) }, // Emerald Green
  { side: 'R', x: 18.9,  z: 57.0, w: 6.2, d: 8.5, h: 10.2, color: new Color3(0.72, 0.50, 0.38) }, // Warm Adobe
];

function createRoadAndMarkings(scene: Scene, root: TransformNode) {
  const roadGround = MeshBuilder.CreateBox('city_roadGround', { width: 22.0, height: 1.0, depth: 140.0 }, scene);
  roadGround.position.set(0.2, -0.50, 50.0);
  const roadMat = new StandardMaterial('city_roadMat', scene);
  roadMat.diffuseColor = new Color3(0.18, 0.19, 0.22);
  roadMat.specularColor = new Color3(0.04, 0.04, 0.04);
  roadGround.material = roadMat;
  roadGround.receiveShadows = true;
  roadGround.parent = root;

  const whiteDashMat = new StandardMaterial('city_whiteDashMat', scene);
  whiteDashMat.diffuseColor = new Color3(0.98, 0.98, 0.98);
  whiteDashMat.emissiveColor = new Color3(0.20, 0.20, 0.20);

  const laneOffsetsX = [-4.5, 0.2, 4.9];
  for (let z = -10; z <= 90; z += 3.2) {
    if (z >= -1.0 && z <= 2.6) continue;
    laneOffsetsX.forEach((lx, lIdx) => {
      const dash = MeshBuilder.CreateBox(`city_dash_${lIdx}_${z}`, { width: 0.20, height: 0.015, depth: 1.6 }, scene);
      dash.position.set(lx, 0.008, z);
      dash.material = whiteDashMat;
      dash.parent = root;
    });
  }

  const yellowLineMat = new StandardMaterial('city_yellowLineMat', scene);
  yellowLineMat.diffuseColor = new Color3(0.98, 0.78, 0.14);
  yellowLineMat.emissiveColor = new Color3(0.12, 0.10, 0.02);

  const yellowLeft = MeshBuilder.CreateBox('city_yellowLeft', { width: 0.12, height: 0.015, depth: 140.0 }, scene);
  yellowLeft.position.set(-10.6, 0.008, 50.0);
  yellowLeft.material = yellowLineMat;
  yellowLeft.parent = root;

  const yellowRight = MeshBuilder.CreateBox('city_yellowRight', { width: 0.12, height: 0.015, depth: 140.0 }, scene);
  yellowRight.position.set(11.0, 0.008, 50.0);
  yellowRight.material = yellowLineMat;
  yellowRight.parent = root;

  for (let cx = -7.5; cx <= 7.9; cx += 0.85) {
    const crossBar = MeshBuilder.CreateBox(`city_crossBar_${cx}`, { width: 0.42, height: 0.015, depth: 3.2 }, scene);
    crossBar.position.set(cx, 0.008, 0.8);
    crossBar.material = whiteDashMat;
    crossBar.parent = root;
  }
}

function createSidewalks(scene: Scene, root: TransformNode) {
  const sidewalkMat = new StandardMaterial('city_sidewalkMat', scene);
  sidewalkMat.diffuseColor = new Color3(0.76, 0.75, 0.80);
  sidewalkMat.specularColor = new Color3(0.04, 0.04, 0.04);

  const leftSidewalk = MeshBuilder.CreateBox('city_leftSidewalk', { width: 14.0, height: 1.0, depth: 140.0 }, scene);
  leftSidewalk.position.set(-17.7, -0.49, 50.0);
  leftSidewalk.material = sidewalkMat;
  leftSidewalk.receiveShadows = true;
  leftSidewalk.parent = root;

  const rightSidewalk = MeshBuilder.CreateBox('city_rightSidewalk', { width: 14.0, height: 1.0, depth: 140.0 }, scene);
  rightSidewalk.position.set(18.1, -0.49, 50.0);
  rightSidewalk.material = sidewalkMat;
  rightSidewalk.receiveShadows = true;
  rightSidewalk.parent = root;
}

function createBuildings(scene: Scene, root: TransformNode): EnvironmentCollider[] {
  const colliders: EnvironmentCollider[] = [];
  const windowMat = new StandardMaterial('city_windowMat', scene);
  windowMat.diffuseColor = new Color3(0.96, 0.90, 0.72);
  windowMat.emissiveColor = new Color3(0.35, 0.32, 0.20);
  windowMat.specularColor = new Color3(0.2, 0.2, 0.2);

  const roofCapMat = new StandardMaterial('city_roofCapMat', scene);
  roofCapMat.diffuseColor = new Color3(0.22, 0.24, 0.28);

  BUILDING_CONFIGS.forEach((b, idx) => {
    const bMat = new StandardMaterial(`city_bMat_${idx}`, scene);
    bMat.diffuseColor = b.color;
    bMat.specularColor = new Color3(0.05, 0.05, 0.05);

    const building = MeshBuilder.CreateBox(`city_building_${idx}`, { width: b.w, height: b.h, depth: b.d }, scene);
    building.position.set(b.x, b.h / 2, b.z);
    building.material = bMat;
    building.parent = root;

    building.computeWorldMatrix(true);
    const bInfo = building.getBoundingInfo();
    if (bInfo) {
      colliders.push({
        min: bInfo.boundingBox.minimumWorld.clone(),
        max: bInfo.boundingBox.maximumWorld.clone(),
      });
    }

    const roof = MeshBuilder.CreateBox(`city_roofCap_${idx}`, { width: b.w + 0.3, height: 0.35, depth: b.d + 0.3 }, scene);
    roof.position.set(b.x, b.h + 0.175, b.z);
    roof.material = roofCapMat;
    roof.parent = root;

    const facadeX = b.side === 'L' ? (b.x + b.w / 2 + 0.03) : (b.x - b.w / 2 - 0.03);
    const cols = 3;
    const rows = Math.min(5, Math.floor(b.h / 1.6));
    const stepZ = (b.d - 1.4) / (cols - 1);
    const startZ = b.z - (b.d - 1.4) / 2;

    for (let r = 1; r <= rows; r++) {
      const winY = r * 1.5;
      for (let c = 0; c < cols; c++) {
        const win = MeshBuilder.CreateBox(`city_win_${idx}_${r}_${c}`, { width: 0.05, height: 0.75, depth: 0.60 }, scene);
        win.position.set(facadeX, winY, startZ + c * stepZ);
        win.material = windowMat;
        win.parent = root;
      }
    }
  });

  return colliders;
}

function createStreetProps(scene: Scene, root: TransformNode) {
  const trunkMat = new StandardMaterial('city_trunkMat', scene);
  trunkMat.diffuseColor = new Color3(0.42, 0.28, 0.18);

  const foliageMat = new StandardMaterial('city_foliageMat', scene);
  foliageMat.diffuseColor = new Color3(0.24, 0.64, 0.28);
  foliageMat.specularColor = new Color3(0.04, 0.04, 0.04);

  [0, 10, 22, 34, 46, 58].forEach((tz, idx) => {
    [-11.4, 11.8].forEach((tx, sIdx) => {
      const trunk = MeshBuilder.CreateCylinder(`city_treeTrunk_${idx}_${sIdx}`, { height: 1.6, diameter: 0.25, tessellation: 8 }, scene);
      trunk.position.set(tx, 0.8, tz);
      trunk.material = trunkMat;
      trunk.parent = root;

      const canopy = MeshBuilder.CreateSphere(`city_treeCanopy_${idx}_${sIdx}`, { diameterX: 1.6, diameterY: 2.0, diameterZ: 1.6, segments: 8 }, scene);
      canopy.position.set(tx, 2.2, tz);
      canopy.material = foliageMat;
      canopy.parent = root;
    });
  });

  const lampPoleMat = new StandardMaterial('city_lampPoleMat', scene);
  lampPoleMat.diffuseColor = new Color3(0.25, 0.27, 0.32);

  const lampBulbMat = new StandardMaterial('city_lampBulbMat', scene);
  lampBulbMat.diffuseColor = new Color3(1.0, 0.95, 0.75);
  lampBulbMat.emissiveColor = new Color3(0.70, 0.65, 0.40);

  [5, 18, 32, 48].forEach((lz, idx) => {
    [[-11.0, -10.8], [11.4, 11.2]].forEach(([px, hx], sIdx) => {
      const pole = MeshBuilder.CreateCylinder(`city_lampPole_${idx}_${sIdx}`, { height: 3.2, diameter: 0.09, tessellation: 8 }, scene);
      pole.position.set(px, 1.6, lz);
      pole.material = lampPoleMat;
      pole.parent = root;

      const head = MeshBuilder.CreateSphere(`city_lampHead_${idx}_${sIdx}`, { diameter: 0.38, segments: 8 }, scene);
      head.position.set(hx, 3.2, lz);
      head.material = lampBulbMat;
      head.parent = root;
    });
  });
}

export const cityDayTheme: BackgroundTheme = {
  id: 'city_day',
  name: 'City Street (Day)',
  skyColor: new Color4(0.46, 0.72, 0.98, 1.0),
  hemiLightDiffuse: new Color3(0.96, 0.98, 1.0),
  hemiLightGround: new Color3(0.42, 0.44, 0.50),
  dirLightDiffuse: new Color3(1.0, 0.97, 0.90),
  dirLightIntensity: 0.82,
  setup: (scene: Scene, _shadowGen?: ShadowGenerator): EnvironmentInstance => {
    const root = new TransformNode('cityDayRoot', scene);

    createRoadAndMarkings(scene, root);
    createSidewalks(scene, root);
    const colliders = createBuildings(scene, root);
    createStreetProps(scene, root);

    // Freeze all child meshes for optimal frame rates
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
