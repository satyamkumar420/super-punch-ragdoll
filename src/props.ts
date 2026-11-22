// Procedural Stylized Low-Poly Park Environment & Props (Dense Garden, Trees, Bushes, Flowers, Picket Fence)
import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Scene,
  TransformNode,
  DynamicTexture,
  PhysicsAggregate,
  PhysicsShapeType,
  type ShadowGenerator,
} from '@babylonjs/core';

// Stylized Low-Poly Cartoon Tree
export function createCartoonTree(
  scene: Scene,
  position: Vector3,
  scale = 1.0,
  leafColor = new Color3(0.24, 0.65, 0.22),
  shadowGen?: ShadowGenerator
): TransformNode {
  const root = new TransformNode(`tree_${Date.now()}_${Math.random()}`, scene);
  root.position.copyFrom(position);
  root.scaling.setAll(scale);

  // Trunk
  const trunk = MeshBuilder.CreateCylinder('trunk', {
    diameterTop: 0.28,
    diameterBottom: 0.45,
    height: 1.8,
  }, scene);
  trunk.position.y = 0.9;
  trunk.metadata = { isObstacle: true, colliderShape: 'cylinder', radius: 0.38 * scale };
  const trunkMat = new StandardMaterial('trunkMat', scene);
  trunkMat.diffuseColor = new Color3(0.42, 0.24, 0.12);
  trunkMat.specularColor = new Color3(0, 0, 0);
  trunk.material = trunkMat;
  trunk.parent = root;
  if (shadowGen) shadowGen.addShadowCaster(trunk);

  // Foliage - Multi-tier fluffy canopy
  const foliageMat = new StandardMaterial('foliageMat', scene);
  foliageMat.diffuseColor = leafColor;
  foliageMat.specularColor = new Color3(0, 0, 0);

  const tier1 = MeshBuilder.CreateSphere('foliage1', { diameter: 1.9, segments: 6 }, scene);
  tier1.position.y = 2.2;
  tier1.metadata = { isObstacle: true, colliderShape: 'sphere', radius: 0.95 * scale };
  tier1.material = foliageMat;
  tier1.parent = root;
  if (shadowGen) shadowGen.addShadowCaster(tier1);

  const tier2 = MeshBuilder.CreateSphere('foliage2', { diameter: 1.4, segments: 6 }, scene);
  tier2.position.y = 3.0;
  tier2.metadata = { isObstacle: true, colliderShape: 'sphere', radius: 0.70 * scale };
  tier2.material = foliageMat;
  tier2.parent = root;
  if (shadowGen) shadowGen.addShadowCaster(tier2);

  return root;
}

// Low-Poly Bush
export function createCartoonBush(scene: Scene, position: Vector3, scale = 1.0): TransformNode {
  const root = new TransformNode('bushRoot', scene);
  root.position.copyFrom(position);
  root.scaling.setAll(scale);

  const bushMat = new StandardMaterial('bushMat', scene);
  bushMat.diffuseColor = new Color3(0.20, 0.60, 0.22);
  bushMat.specularColor = new Color3(0, 0, 0);

  const p1 = MeshBuilder.CreateSphere('bushP1', { diameter: 0.75, segments: 5 }, scene);
  p1.position = new Vector3(-0.25, 0.35, 0);
  p1.metadata = { isObstacle: true, colliderShape: 'sphere', radius: 0.38 * scale };
  p1.material = bushMat;
  p1.parent = root;

  const p2 = MeshBuilder.CreateSphere('bushP2', { diameter: 0.9, segments: 5 }, scene);
  p2.position = new Vector3(0.1, 0.45, 0);
  p2.metadata = { isObstacle: true, colliderShape: 'sphere', radius: 0.45 * scale };
  p2.material = bushMat;
  p2.parent = root;

  const p3 = MeshBuilder.CreateSphere('bushP3', { diameter: 0.7, segments: 5 }, scene);
  p3.position = new Vector3(0.35, 0.3, 0.1);
  p3.metadata = { isObstacle: true, colliderShape: 'sphere', radius: 0.35 * scale };
  p3.material = bushMat;
  p3.parent = root;

  return root;
}

// Cute Wooden Garden Picket Fence
export function createGardenFence(scene: Scene, zPos = 3.8, width = 24): TransformNode {
  const root = new TransformNode('gardenFenceRoot', scene);

  const fenceMat = new StandardMaterial('fenceMat', scene);
  fenceMat.diffuseColor = new Color3(0.92, 0.88, 0.82); // Cream white wood
  fenceMat.specularColor = new Color3(0, 0, 0);

  // Horizontal rails
  const topRail = MeshBuilder.CreateBox('topRail', { width, height: 0.08, depth: 0.06 }, scene);
  topRail.position = new Vector3(0, 0.7, zPos);
  topRail.metadata = { isObstacle: true };
  topRail.material = fenceMat;
  topRail.parent = root;

  const btmRail = MeshBuilder.CreateBox('btmRail', { width, height: 0.08, depth: 0.06 }, scene);
  btmRail.position = new Vector3(0, 0.3, zPos);
  btmRail.metadata = { isObstacle: true };
  btmRail.material = fenceMat;
  btmRail.parent = root;

  // Vertical pickets
  const picketCount = Math.floor(width / 0.6);
  const startX = -width / 2;
  for (let i = 0; i <= picketCount; i++) {
    const x = startX + i * 0.6;
    const picket = MeshBuilder.CreateBox(`picket_${i}`, { width: 0.12, height: 0.9, depth: 0.04 }, scene);
    picket.position = new Vector3(x, 0.45, zPos);
    picket.metadata = { isObstacle: true };
    picket.material = fenceMat;
    picket.parent = root;
  }

  return root;
}

// Complete DENSE Garden Scenery (Fills whole background & sides)
export function createParkEnvironment(scene: Scene, shadowGen?: ShadowGenerator): TransformNode {
  const parkRoot = new TransformNode('parkEnvironmentRoot', scene);

  // 1. Garden Picket Fence in background
  const fence = createGardenFence(scene, 3.6, 26);
  fence.parent = parkRoot;

  // 2. Leaf color variations
  const leafColors = [
    new Color3(0.24, 0.65, 0.22), // Vibrant grass green
    new Color3(0.18, 0.56, 0.20), // Forest green
    new Color3(0.32, 0.72, 0.25), // Bright lime green
  ];

  // 3. Dense Multi-Layer Tree Line (Back row, Mid row, and Side Flanks)
  const treeConfigs = [
    // Back dense row (Z = 5.0 to 6.5)
    { pos: new Vector3(-8.5, 0, 5.5), scale: 1.5, c: 0 },
    { pos: new Vector3(-6.0, 0, 6.0), scale: 1.3, c: 1 },
    { pos: new Vector3(-3.8, 0, 5.2), scale: 1.4, c: 2 },
    { pos: new Vector3(-1.5, 0, 5.8), scale: 1.35, c: 0 },
    { pos: new Vector3(0.8, 0, 5.4), scale: 1.45, c: 1 },
    { pos: new Vector3(3.0, 0, 6.2), scale: 1.3, c: 2 },
    { pos: new Vector3(5.2, 0, 5.5), scale: 1.5, c: 0 },
    { pos: new Vector3(7.5, 0, 6.0), scale: 1.35, c: 1 },
    { pos: new Vector3(9.5, 0, 5.2), scale: 1.4, c: 2 },

    // Mid row near fence (Z = 3.8 to 4.5)
    { pos: new Vector3(-5.0, 0, 4.0), scale: 1.1, c: 2 },
    { pos: new Vector3(-2.8, 0, 4.2), scale: 1.0, c: 0 },
    { pos: new Vector3(2.0, 0, 4.3), scale: 1.15, c: 1 },
    { pos: new Vector3(4.5, 0, 4.0), scale: 1.05, c: 2 },
    { pos: new Vector3(6.8, 0, 4.4), scale: 1.1, c: 0 },
  ];

  treeConfigs.forEach((tc) => {
    const tree = createCartoonTree(scene, tc.pos, tc.scale, leafColors[tc.c], shadowGen);
    tree.parent = parkRoot;
  });

  // 4. Bushes along background fence
  const bushPositions = [
    new Vector3(-4.0, 0, 3.4),
    new Vector3(-2.2, 0, 3.5),
    new Vector3(-0.6, 0, 3.5),
    new Vector3(1.2, 0, 3.4),
    new Vector3(3.2, 0, 3.5),
    new Vector3(5.0, 0, 3.4),
  ];

  bushPositions.forEach((bp) => {
    const bush = createCartoonBush(scene, bp, 0.95);
    bush.parent = parkRoot;
  });

  const originalDispose = parkRoot.dispose.bind(parkRoot);
  parkRoot.dispose = (doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean) => {
    const childMeshes = parkRoot.getChildMeshes(false);
    childMeshes.forEach((m) => {
      if (shadowGen) shadowGen.removeShadowCaster(m);
      m.material?.dispose(true, true);
      m.dispose(false, true);
    });
    const childNodes = parkRoot.getChildTransformNodes(false);
    childNodes.forEach((n) => n.dispose());
    originalDispose(doNotRecurse, disposeMaterialAndTextures);
  };

  return parkRoot;
}

// Numbered Podium Blocks
export function createPodium(
  scene: Scene,
  position: Vector3,
  shadowGen?: ShadowGenerator
): TransformNode {
  const root = new TransformNode('podiumRoot', scene);
  root.position = position;

  const aggregates: PhysicsAggregate[] = [];
  const textures: DynamicTexture[] = [];
  const materials: StandardMaterial[] = [];

  const createNumberedBlock = (num: string, size: { w: number; h: number; d: number }, blockPos: Vector3, bgColor: Color3) => {
    const block = MeshBuilder.CreateBox(`podium_${num}`, { width: size.w, height: size.h, depth: size.d }, scene);
    block.position = blockPos;

    const texture = new DynamicTexture(`podiumTex_${num}`, { width: 256, height: 256 }, scene, false);
    textures.push(texture);
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.fillStyle = `rgb(${bgColor.r * 255}, ${bgColor.g * 255}, ${bgColor.b * 255})`;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 150px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, 128, 128);
    texture.update();

    const mat = new StandardMaterial(`podiumMat_${num}`, scene);
    materials.push(mat);
    mat.diffuseTexture = texture;
    block.material = mat;
    block.parent = root;

    if (shadowGen) shadowGen.addShadowCaster(block);
    block.metadata = { isObstacle: true };
    if (scene.isPhysicsEnabled && scene.isPhysicsEnabled()) {
      const agg = new PhysicsAggregate(block, PhysicsShapeType.BOX, { mass: 0, restitution: 0.1, friction: 0.8 }, scene);
      aggregates.push(agg);
    }
    return block;
  };

  createNumberedBlock('1', { w: 1.5, h: 1.8, d: 1.5 }, new Vector3(0, 0.9, 0), new Color3(0.95, 0.85, 0.25));
  createNumberedBlock('2', { w: 1.4, h: 1.3, d: 1.4 }, new Vector3(1.5, 0.65, 0), new Color3(0.85, 0.85, 0.90));
  createNumberedBlock('3', { w: 1.4, h: 0.9, d: 1.4 }, new Vector3(-1.5, 0.45, 0), new Color3(0.92, 0.55, 0.50));

  const originalDispose = root.dispose.bind(root);
  root.dispose = (doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean) => {
    aggregates.forEach((a) => a.dispose());
    textures.forEach((t) => t.dispose());
    materials.forEach((m) => m.dispose());
    const childMeshes = root.getChildMeshes(false);
    childMeshes.forEach((m) => {
      if (shadowGen) shadowGen.removeShadowCaster(m);
      m.dispose(false, true);
    });
    originalDispose(doNotRecurse, disposeMaterialAndTextures);
  };

  return root;
}

/**
 * Creates the procedural tropical island environment (animated turquoise ocean water + golden sand beach disc).
 */
export function createIslandEnvironment(scene: Scene, _shadowGen?: ShadowGenerator): { dispose: () => void } {
  // Hide square park lawn so vast ocean water surrounds the island
  const parkLawn = scene.getMeshByName('parkLawn');
  const wasLawnVisible = parkLawn ? parkLawn.isVisible : true;
  if (parkLawn) parkLawn.isVisible = false;

  // 1. Vast Turquoise Ocean Water covering the entire horizon
  const water = MeshBuilder.CreateGround('islandOceanWater', { width: 140, height: 140, subdivisions: 6 }, scene);
  water.position.set(0, -0.06, 0);
  water.isPickable = false;

  const waterMat = new StandardMaterial('islandOceanWaterMat', scene);
  waterMat.diffuseColor = new Color3(0.06, 0.62, 0.82);
  waterMat.specularColor = new Color3(0.65, 0.88, 0.98);
  waterMat.specularPower = 40;
  waterMat.emissiveColor = new Color3(0.02, 0.16, 0.22);
  waterMat.alpha = 0.94;
  water.material = waterMat;

  let elapsed = 0;
  const waterObs = scene.onBeforeRenderObservable.add(() => {
    elapsed += scene.getEngine().getDeltaTime() / 1000;
    water.position.y = -0.06 + Math.sin(elapsed * 1.5) * 0.015;
  });

  // 2. Rich Golden Sand Island Disc (flush with y = 0 so feet, props, and gun rest on surface)
  const SAND_HEIGHT = 0.20;
  const sandBase = MeshBuilder.CreateCylinder(
    'islandSandDisc',
    { diameter: 14.8, height: SAND_HEIGHT, tessellation: 64 },
    scene
  );
  // Center cylinder so top face is flush at ground level y = 0.001
  sandBase.position.set(0, -SAND_HEIGHT / 2 + 0.001, 0);
  sandBase.isPickable = false;

  const sandMat = new StandardMaterial('islandSandMat', scene);
  sandMat.diffuseColor = new Color3(0.92, 0.74, 0.44);
  sandMat.ambientColor = new Color3(0.58, 0.45, 0.26);
  sandMat.specularColor = new Color3(0.02, 0.02, 0.02);
  sandBase.material = sandMat;
  sandBase.receiveShadows = true;

  // 3. Wet Shoreline Perimeter Ring (hugs water edge below y = 0)
  const wetRim = MeshBuilder.CreateTorus(
    'islandWetRim',
    { diameter: 14.6, thickness: 0.18, tessellation: 64 },
    scene
  );
  wetRim.position.set(0, -0.035, 0);
  wetRim.scaling.set(1, 0.25, 1);
  wetRim.isPickable = false;

  const wetMat = new StandardMaterial('islandWetRimMat', scene);
  wetMat.diffuseColor = new Color3(0.72, 0.50, 0.28);
  wetMat.specularColor = new Color3(0.12, 0.12, 0.12);
  wetRim.material = wetMat;

  return {
    dispose: () => {
      scene.onBeforeRenderObservable.remove(waterObs);
      if (parkLawn) parkLawn.isVisible = wasLawnVisible;
      waterMat.dispose();
      sandMat.dispose();
      wetMat.dispose();
      water.dispose();
      sandBase.dispose();
      wetRim.dispose();
    },
  };
}
