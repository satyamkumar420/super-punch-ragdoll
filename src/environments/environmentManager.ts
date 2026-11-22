import {
  Scene,
  type ShadowGenerator,
  type HemisphericLight,
  type DirectionalLight,
} from '@babylonjs/core';
import type { BackgroundTheme, EnvironmentInstance } from './types';
import { cityDayTheme } from './cityDayTheme';
import { jungleTheme } from './jungleTheme';
import { obstacleManager } from '../core/obstacleManager';

class EnvironmentManager {
  private themes = new Map<string, BackgroundTheme>();
  private currentThemeId: string | null = null;
  private activeInstance: EnvironmentInstance | null = null;

  constructor() {
    this.registerTheme(cityDayTheme);
    this.registerTheme(jungleTheme);

    // Aliases for compatibility
    this.themes.set('street', cityDayTheme);
    this.themes.set('jungle', jungleTheme);
  }

  /**
   * Register a new background theme dynamically for future expansions.
   */
  public registerTheme(theme: BackgroundTheme): void {
    this.themes.set(theme.id, theme);
  }

  /**
   * Dynamically resolves the appropriate background theme ID for any level.
   * Priority:
   * 1. Explicit level `environmentType` (if registered in themes)
   * 2. Range 1 - 50: 'city_day'
   * 3. Range 51 - 100: 'jungle_forest'
   * 4. Fallback: 'city_day'
   */
  public resolveThemeId(levelId: number, explicitType?: string): string {
    if (explicitType && this.themes.has(explicitType)) {
      return explicitType;
    }
    if (levelId >= 1 && levelId <= 50) {
      return 'city_day';
    }
    if (levelId >= 51 && levelId <= 100) {
      return 'jungle_forest';
    }
    return 'city_day';
  }

  /**
   * Gets the currently active theme ID.
   */
  public getCurrentThemeId(): string | null {
    return this.currentThemeId;
  }

  /**
   * Applies the background environment for a given level.
   * If the required theme is already mounted, re-use it with 0ms reload overhead.
   */
  public applyTheme(
    levelId: number,
    explicitType: string | undefined,
    scene: Scene,
    shadowGen?: ShadowGenerator,
    hemiLight?: HemisphericLight,
    dirLight?: DirectionalLight
  ): void {
    const targetThemeId = this.resolveThemeId(levelId, explicitType);
    const theme = this.themes.get(targetThemeId) || cityDayTheme;

    // Fast-path: keep existing environment if theme has not changed
    if (this.currentThemeId === theme.id && this.activeInstance) {
      return;
    }

    // 1. Dispose previous environment meshes and materials cleanly
    if (this.activeInstance) {
      this.activeInstance.dispose();
      this.activeInstance = null;
    }

    // 2. Clear old environment bounce colliders
    obstacleManager.clearEnvironmentColliders();

    // 3. Apply sky & lighting
    scene.clearColor = theme.skyColor.clone();
    if (hemiLight) {
      if (theme.hemiLightDiffuse) hemiLight.diffuse = theme.hemiLightDiffuse.clone();
      if (theme.hemiLightGround) hemiLight.groundColor = theme.hemiLightGround.clone();
    }
    if (dirLight) {
      if (theme.dirLightDiffuse) dirLight.diffuse = theme.dirLightDiffuse.clone();
      if (theme.dirLightIntensity !== undefined) dirLight.intensity = theme.dirLightIntensity;
    }

    // 4. Mount new environment
    this.activeInstance = theme.setup(scene, shadowGen);

    // 5. Register new colliders for obstacle bounce physics
    if (this.activeInstance.colliders) {
      this.activeInstance.colliders.forEach((c) => {
        obstacleManager.registerEnvironmentCollider(c.min, c.max);
      });
    }

    this.currentThemeId = theme.id;
  }

  /**
   * Dispose current environment (used on shutdown or clean resets)
   */
  public dispose(): void {
    if (this.activeInstance) {
      this.activeInstance.dispose();
      this.activeInstance = null;
    }
    this.currentThemeId = null;
  }
}

export const environmentManager = new EnvironmentManager();
