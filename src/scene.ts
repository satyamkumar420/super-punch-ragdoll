import {
  Engine,
  Scene,
  Vector3,
  Color4,
  Color3,
  HemisphericLight,
  DirectionalLight,
  ArcRotateCamera,
  MeshBuilder,
  ShadowGenerator,
  PhysicsAggregate,
  PhysicsShapeType,
  AnimationGroup,
  Texture,
  MeshoptCompression,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

// Configure Meshopt decoder locally for YouTube Playables CSP compliance (Zero external network calls)
MeshoptCompression.Configuration = {
  decoder: {
    url: './meshopt_decoder.js',
  },
};
import { initPhysics, getPhysicsPlugin } from './physics';
import {
  calculateResponsiveCameraRadius,
  calculateDynamicGameplayRadius,
  type GameplayBounds,
} from './core/cameraResponsive';


export interface GameSceneContext {
  engine: Engine;
  scene: Scene;
  camera: ArcRotateCamera;
  shadowGenerator: ShadowGenerator;
  hemiLight: HemisphericLight;
  dirLight: DirectionalLight;
  setStudioColor: (skyColor: Color4, grassColor?: Color3) => void;
  setCameraParams: (
    radius?: number,
    target?: Vector3,
    alpha?: number,
    beta?: number,
    bounds?: GameplayBounds
  ) => void;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
}

export async function createGameScene(canvas: HTMLCanvasElement): Promise<GameSceneContext> {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: false,
    antialias: true,
    powerPreference: 'high-performance',
    audioEngine: false,
  });

  // Enable high-DPI (Retina / OLED) rendering for crystal clear graphics on mobile
  // Clamped at 2.0 to provide ultra-sharp 1080p visuals without GPU thermal throttling or battery drain
  const getOptimalDpr = () => Math.min(window.devicePixelRatio || 1, 2.0);
  engine.setHardwareScalingLevel(1 / getOptimalDpr());

  // Enhance texture clarity for 3D props, obstacles and characters viewed at angles
  Texture.DEFAULT_ANISOTROPIC_FILTERING_LEVEL = 4;

  const scene = new Scene(engine);
  // Auto clear depth for rendering group 1 so the punch glove renders crisply in the foreground without ground clipping
  scene.setRenderingAutoClearDepthStencil(1, true);

  // Vibrant Modern Arcade Sky
  const defaultSky = new Color4(0.46, 0.72, 0.98, 1.0);
  scene.clearColor = defaultSky;

  // Action Camera — Clean arcade 2D side-view framing centered on street action plane
  const camera = new ArcRotateCamera(
    'fixedCamera',
    -Math.PI / 2,
    1.48, // ~84.8 degrees for clean arcade side-view street action
    7.6,
    new Vector3(0.2, 0.95, 0),
    scene
  );
  // (NO attachControl to keep camera completely locked)

  let baseRadius = 7.6;
  let currentBounds: GameplayBounds | undefined;
  let baseTarget = new Vector3(0.2, 0.95, 0);

  // Dynamic Responsive Camera Framing: Automatically scales camera distance so gun and all targets
  // remain 100% visible across any screen aspect ratio (mobile portrait, tablet, desktop)
  const updateCameraFraming = () => {
    const width = engine.getRenderWidth() || canvas.clientWidth || window.innerWidth || 800;
    const height = engine.getRenderHeight() || canvas.clientHeight || window.innerHeight || 600;
    const aspect = width / height;

    if (currentBounds) {
      // On mobile portrait, center target smoothly focused on gameplay action
      if (aspect < 1.0) {
        const midX = (currentBounds.minX + currentBounds.maxX) / 2;
        camera.target.x = baseTarget.x * 0.2 + midX * 0.8;
        const boundsMaxY = currentBounds.maxY ?? (baseTarget.y + 1.8);
        const boundsMinY = currentBounds.minY ?? 0;
        const midY = (boundsMinY + boundsMaxY) / 2;
        camera.target.y = baseTarget.y * 0.35 + midY * 0.65;
      } else {
        camera.target.x = baseTarget.x;
        camera.target.y = baseTarget.y;
      }

      camera.radius = calculateDynamicGameplayRadius(
        currentBounds,
        width,
        height,
        baseRadius,
        camera.fov,
        camera.target.x,
        camera.target.y
      );
    } else {
      camera.target.x = baseTarget.x;
      camera.target.y = baseTarget.y;
      camera.radius = calculateResponsiveCameraRadius(baseRadius, width, height, 1.48);
    }
    camera.computeWorldMatrix();
    camera.getViewMatrix(true);
  };

  const setCameraParams = (
    radius?: number,
    target?: Vector3,
    _alpha?: number,
    beta?: number,
    bounds?: GameplayBounds
  ) => {
    baseRadius = radius !== undefined && radius > 0 ? radius : 7.6;
    currentBounds = bounds;
    baseTarget = target ? new Vector3(target.x, target.y, 0) : new Vector3(0.2, 0.95, 0);
    camera.setTarget(baseTarget.clone());
    camera.alpha = -Math.PI / 2;
    camera.beta = beta !== undefined && beta > 0 ? beta : 1.48;
    updateCameraFraming();
  };

  // Initial calculation
  updateCameraFraming();

  // Balanced daylight ambient lighting (prevents washing out to pure white)
  const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
  hemiLight.intensity = 0.85;
  hemiLight.diffuse = new Color3(0.96, 0.98, 1.0);
  hemiLight.groundColor = new Color3(0.42, 0.44, 0.50);

  // Key directional sun light with warm cartoon arcade shadows
  const dirLight = new DirectionalLight('dirLight', new Vector3(-0.35, -1, 0.45), scene);
  dirLight.position = new Vector3(8, 18, -12);
  dirLight.intensity = 0.82;
  dirLight.diffuse = new Color3(1.0, 0.97, 0.90);

  // Fast hardware-accelerated cartoon shadows (PCF)
  const shadowGenerator = new ShadowGenerator(1024, dirLight);
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadowGenerator.setDarkness(0.22);

  // Initialize Havok Physics
  await initPhysics(scene);

  // Solid physics floor underneath scene so ragdolls and objects NEVER fall through
  const groundCollider = MeshBuilder.CreateBox('groundPhysicsBox', { width: 320, height: 4, depth: 320 }, scene);
  groundCollider.position.y = -2; // Top surface is at exactly y = 0
  groundCollider.isVisible = false;
  groundCollider.freezeWorldMatrix();
  new PhysicsAggregate(groundCollider, PhysicsShapeType.BOX, { mass: 0, restitution: 0.2, friction: 0.8 }, scene);

  const setStudioColor = (_skyColor: Color4, _grassColor?: Color3) => {
    // Maintain consistent street & mountain theme across all levels
    scene.clearColor = defaultSky;
  };

  const handleResize = () => {
    engine.setHardwareScalingLevel(1 / getOptimalDpr());
    engine.resize();
    updateCameraFraming();
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, 100);
  });
  engine.onResizeObservable.add(updateCameraFraming);

  let isScenePaused = false;
  const pausedAnimationGroups: Set<AnimationGroup> = new Set();

  const pause = () => {
    if (isScenePaused) return;
    isScenePaused = true;

    // Freeze Havok physics engine stepping
    if (scene.physicsEnabled) {
      scene.physicsEnabled = false;
    }
    const physicsPlugin = getPhysicsPlugin();
    if (physicsPlugin) {
      physicsPlugin.setTimeStep(0);
    }

    // Pause all currently playing animation groups
    pausedAnimationGroups.clear();
    scene.animationGroups?.forEach((ag) => {
      if (ag.isPlaying) {
        pausedAnimationGroups.add(ag);
        ag.pause();
      }
    });
  };

  const resume = () => {
    if (!isScenePaused) return;
    isScenePaused = false;

    // Resume Havok physics engine stepping
    scene.physicsEnabled = true;
    const physicsPlugin = getPhysicsPlugin();
    if (physicsPlugin) {
      physicsPlugin.setTimeStep(1 / 60);
    }

    // Resume previously playing animation groups
    pausedAnimationGroups.forEach((ag) => {
      try {
        ag.play();
      } catch {
        // Safe check if disposed
      }
    });
    pausedAnimationGroups.clear();
  };

  const isPaused = () => isScenePaused;

  return {
    engine,
    scene,
    camera,
    shadowGenerator,
    hemiLight,
    dirLight,
    setStudioColor,
    setCameraParams,
    pause,
    resume,
    isPaused,
  };
}
