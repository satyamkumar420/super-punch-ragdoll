import type { JsonLevelConfig, JsonPropItem, JsonTargetItem } from '../config/levelTypes';
import type { EditorTool, GizmoMode, SelectedObjectRef, EditorEvent } from './types';
import { DEFAULT_JSON_LEVELS } from '../config/levels';

const STORAGE_KEY = 'gun_ragdoll_custom_levels';
const VERSION_KEY = 'gun_ragdoll_levels_version';
const GAME_LEVELS_VERSION = '2.2_barrel_ground_pivot_synced';

export class EditorStateManager {
  private level: JsonLevelConfig;
  private selection: SelectedObjectRef | null = null;
  private activeTool: EditorTool = 'select';
  private gizmoMode: GizmoMode = 'translate';
  private snapToGrid = false;
  private gridSize = 0.25;

  private history: JsonLevelConfig[] = [];
  private future: JsonLevelConfig[] = [];
  private listeners: Set<(event: EditorEvent) => void> = new Set();

  constructor() {
    const all = this.getAllLevels();
    this.level = EditorStateManager.ensureMandatoryEntities(
      JSON.parse(JSON.stringify(all[0] || DEFAULT_JSON_LEVELS[0])) as JsonLevelConfig
    );
  }

  public subscribe(listener: (event: EditorEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: EditorEvent): void {
    this.listeners.forEach((cb) => cb(event));
  }

  // Getters
  public getLevel(): JsonLevelConfig {
    return this.level;
  }

  public getSelection(): SelectedObjectRef | null {
    return this.selection;
  }

  public getActiveTool(): EditorTool {
    return this.activeTool;
  }

  public getGizmoMode(): GizmoMode {
    return this.gizmoMode;
  }

  public isSnapEnabled(): boolean {
    return this.snapToGrid;
  }

  public getGridSize(): number {
    return this.gridSize;
  }

  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  public pushHistorySnapshot(): void {
    this.history.push(JSON.parse(JSON.stringify(this.level)));
    if (this.history.length > 30) this.history.shift();
    this.future = [];
    this.notify({ type: 'history_changed', canUndo: this.canUndo(), canRedo: this.canRedo() });
  }

  // State Mutators
  public setLevel(newLevel: JsonLevelConfig, pushHistory = true): void {
    if (pushHistory) {
      this.pushHistorySnapshot();
    }
    const validated = EditorStateManager.ensureMandatoryEntities(newLevel);
    this.level = JSON.parse(JSON.stringify(validated));
    this.notify({ type: 'level_updated', level: this.level });
  }

  public setSelection(selection: SelectedObjectRef | null): void {
    this.selection = selection;
    this.notify({ type: 'selection_changed', selection });
  }

  public setTool(tool: EditorTool): void {
    this.activeTool = tool;
    this.notify({ type: 'tool_changed', tool });
  }

  public setGizmoMode(mode: GizmoMode): void {
    this.gizmoMode = mode;
    this.notify({ type: 'gizmo_mode_changed', mode });
  }

  public toggleSnap(): boolean {
    this.snapToGrid = !this.snapToGrid;
    return this.snapToGrid;
  }

  public setGridSize(size: number): void {
    this.gridSize = Math.max(0.1, size);
  }

  // Undo / Redo
  public undo(): void {
    if (this.history.length === 0) return;
    const prev = this.history.pop()!;
    this.future.push(JSON.parse(JSON.stringify(this.level)));
    this.level = prev;
    this.notify({ type: 'level_updated', level: this.level });
    this.notify({ type: 'history_changed', canUndo: this.canUndo(), canRedo: this.canRedo() });
  }

  public redo(): void {
    if (this.future.length === 0) return;
    const next = this.future.pop()!;
    this.history.push(JSON.parse(JSON.stringify(this.level)));
    this.level = next;
    this.notify({ type: 'level_updated', level: this.level });
    this.notify({ type: 'history_changed', canUndo: this.canUndo(), canRedo: this.canRedo() });
  }

  // Entity Operations
  public addProp(prop: JsonPropItem): number {
    const props = [...(this.level.props || []), prop];
    this.setLevel({ ...this.level, props });
    const newIdx = props.length - 1;
    this.setSelection({ type: 'prop', index: newIdx, id: prop.name });
    return newIdx;
  }

  public updateProp(index: number, updated: Partial<JsonPropItem>, pushHistory = true): void {
    if (!this.level.props || !this.level.props[index]) return;
    if (pushHistory) this.pushHistorySnapshot();
    const props = [...this.level.props];
    props[index] = { ...props[index], ...updated };
    this.level = { ...this.level, props };
    this.notify({ type: 'item_modified', selection: { type: 'prop', index, id: props[index].name }, data: props[index] });
    if (pushHistory) {
      this.notify({ type: 'level_updated', level: this.level });
    }
  }

  public deleteProp(index: number): void {
    if (!this.level.props || !this.level.props[index]) return;
    this.pushHistorySnapshot();
    const props = this.level.props.filter((_, i) => i !== index);
    this.level = { ...this.level, props };
    this.notify({ type: 'level_updated', level: this.level });
    this.setSelection(null);
  }

  public addTarget(target: JsonTargetItem): number {
    this.pushHistorySnapshot();
    const targets = [...this.level.targets, target];
    this.level = { ...this.level, targets };
    this.notify({ type: 'level_updated', level: this.level });
    const newIdx = targets.length - 1;
    this.setSelection({ type: 'target', index: newIdx });
    return newIdx;
  }

  public updateTarget(index: number, updated: Partial<JsonTargetItem>, pushHistory = true): void {
    if (!this.level.targets[index]) return;
    if (pushHistory) this.pushHistorySnapshot();
    const targets = [...this.level.targets];
    targets[index] = { ...targets[index], ...updated };
    this.level = { ...this.level, targets };
    this.notify({ type: 'item_modified', selection: { type: 'target', index }, data: targets[index] });
    if (pushHistory) {
      this.notify({ type: 'level_updated', level: this.level });
    }
  }

  public deleteTarget(index: number): void {
    this.pushHistorySnapshot();
    const targets = this.level.targets.filter((_, i) => i !== index);
    this.level = { ...this.level, targets };
    this.notify({ type: 'level_updated', level: this.level });
    this.setSelection(null);
  }

  public updateGun(pos: [number, number, number], rot?: [number, number, number], ammo?: number, pushHistory = true, scale?: number): void {
    if (pushHistory) this.pushHistorySnapshot();
    const currentAmmo = ammo !== undefined ? ammo : (this.level.ammo || 5);
    const currentRot = rot || this.level.gunRotation || [0, 0, 0];
    const currentScale = scale !== undefined ? scale : this.level.gunScale;
    this.level = { ...this.level, gunSpawnPos: pos, gunRotation: currentRot, ammo: currentAmmo, gunScale: currentScale };
    this.notify({ type: 'item_modified', selection: { type: 'gun', index: 0 }, data: { pos, rot: currentRot, ammo: currentAmmo, scale: currentScale } });
    if (pushHistory) {
      this.notify({ type: 'level_updated', level: this.level });
    }
  }

  public updateCamera(settings: {
    radius: number;
    target?: [number, number, number];
    alpha?: number;
    beta?: number;
  }): void {
    this.level = {
      ...this.level,
      cameraRadius: settings.radius,
      cameraTarget: settings.target ?? this.level.cameraTarget,
      cameraAlpha: settings.alpha ?? this.level.cameraAlpha,
      cameraBeta: settings.beta ?? this.level.cameraBeta,
    };
  }

  // Persistence
  public getAllLevels(): JsonLevelConfig[] {
    const defaults = DEFAULT_JSON_LEVELS;
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      if (storedVersion !== GAME_LEVELS_VERSION) {
        // Automatically sync and refresh default levels to match updated game configs
        this.resetDefaultLevelsToSource();
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const savedList = JSON.parse(stored) as JsonLevelConfig[];
        const result = defaults.map((def) => {
          const found = savedList.find((s) => s.id === def.id);
          if (found) {
            // If target count or structure differs from official definition, sync with def
            if (!found.targets || found.targets.length !== def.targets.length) {
              return def;
            }
            found.id = def.id;
            found.name = def.name;
            found.props = found.props ?? def.props;
            found.targets = found.targets ?? def.targets;
            found.gunSpawnPos = found.gunSpawnPos ?? def.gunSpawnPos;
            found.gunRotation = found.gunRotation ?? def.gunRotation;
            found.gunScale = found.gunScale ?? def.gunScale;
            found.cameraRadius = found.cameraRadius ?? def.cameraRadius;
            found.cameraTarget = found.cameraTarget ?? def.cameraTarget;
            found.cameraAlpha = found.cameraAlpha ?? def.cameraAlpha;
            found.cameraBeta = found.cameraBeta ?? def.cameraBeta;
            found.environmentType = def.environmentType;
            return found;
          }
          return def;
        });
        savedList
          .filter((s) => !defaults.some((def) => def.id === s.id) && s.id !== 1791548747921)
          .forEach((custom) => {
            result.push(custom);
          });
        return result;
      }
    } catch {
      // ignore JSON storage parsing errors
    }
    return defaults;
  }

  public resetDefaultLevelsToSource(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const defaults = DEFAULT_JSON_LEVELS;
      let customLevels: JsonLevelConfig[] = [];
      if (stored) {
        const savedList = JSON.parse(stored) as JsonLevelConfig[];
        customLevels = savedList.filter((s) => !defaults.some((def) => def.id === s.id) && s.id !== 1791548747921);
      }
      const freshAll = [...defaults, ...customLevels];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshAll));
      localStorage.setItem(VERSION_KEY, GAME_LEVELS_VERSION);
    } catch (err) {
      console.warn('Failed to reset default levels to source', err);
    }
  }

  public saveCurrentLevelToStorage(): void {
    try {
      const all = this.getAllLevels();
      const existingIdx = all.findIndex((l) => l.id === this.level.id);
      if (existingIdx >= 0) {
        all[existingIdx] = JSON.parse(JSON.stringify(this.level));
      } else {
        all.push(JSON.parse(JSON.stringify(this.level)));
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('Failed to save level to localStorage', err);
    }
  }

  public deleteLevelFromStorage(id: number): void {
    try {
      const remaining = this.getAllLevels().filter((l) => l.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    } catch (err) {
      console.warn('Failed to delete level from localStorage', err);
    }
  }

  public isSelectionLocked(): boolean {
    if (!this.selection) return false;
    if (this.selection.type === 'prop' && this.level.props) {
      return !!this.level.props[this.selection.index]?.isLocked;
    }
    if (this.selection.type === 'target') {
      return !!this.level.targets[this.selection.index]?.isLocked;
    }
    if (this.selection.type === 'gun') {
      return !!(this.level as unknown as { isGunLocked?: boolean }).isGunLocked;
    }
    return false;
  }

  public toggleSelectionLock(): boolean {
    if (!this.selection) return false;
    const nowLocked = !this.isSelectionLocked();
    if (this.selection.type === 'prop' && this.level.props && this.level.props[this.selection.index]) {
      this.updateProp(this.selection.index, { isLocked: nowLocked });
    } else if (this.selection.type === 'target' && this.level.targets[this.selection.index]) {
      this.updateTarget(this.selection.index, { isLocked: nowLocked });
    } else if (this.selection.type === 'gun') {
      this.level = { ...this.level, isGunLocked: nowLocked } as JsonLevelConfig;
      this.notify({ type: 'level_updated', level: this.level });
    }
    return nowLocked;
  }

  public static ensureMandatoryEntities(lvl: JsonLevelConfig): JsonLevelConfig {
    const copy = { ...lvl };
    if (!copy.gunSpawnPos || !Array.isArray(copy.gunSpawnPos) || copy.gunSpawnPos.length < 3) {
      copy.gunSpawnPos = [0, -1.35, 0.0];
    }
    if (!copy.ammo || copy.ammo <= 0) {
      copy.ammo = 999;
    }
    if (!copy.targets || copy.targets.length === 0) {
      copy.targets = [
        {
          position: [0, 0, 0],
          rotationY: 3.14,
          animationName: 'Idle_Loop',
          animationNames: ['Idle_Loop'],
          namePrefix: 'target_1',
        },
      ];
    }
    return copy;
  }

  public createNewLevelTemplate(): JsonLevelConfig {
    const nextIdx = this.getAllLevels().length + 1;
    return EditorStateManager.ensureMandatoryEntities({
      id: Date.now(),
      name: `Level ${nextIdx}`,
      subtitle: '',
      skyColor: [0.92, 0.88, 0.82, 1.0],
      grassColor: [0.48, 0.32, 0.18],
      ammo: 5,
      gunSpawnPos: [-2.2, 0.085, 0.0],
      environmentType: 'room',
      props: [],
      targets: [
        {
          position: [1.6, 0, 0],
          rotationY: -Math.PI / 2,
          animationName: 'Dance_Loop',
          animationNames: ['Dance_Loop'],
          namePrefix: 'target_1',
        },
      ],
    });
  }
}
