import {
  Scene,
  Vector3,
  Color4,
  Color3,
  AbstractMesh,
  type ShadowGenerator,
} from '@babylonjs/core';
import type { JsonLevelConfig, JsonPropItem, JsonTargetItem } from '../config/levelTypes';
import type { AssetDef, SelectedObjectRef } from './types';
import { EditorStateManager } from './editorState';
import { EditorCameraController } from './editorCamera';
import { GizmoController } from './gizmoController';
import { EditorToolbar } from './ui/editorToolbar';
import { LevelManagerPanel } from './ui/levelManagerPanel';
import { PropertyPanel } from './ui/propertyPanel';
import { JsonModal } from './ui/jsonModal';
import { EditorSceneRenderer, type SceneEntities } from './editorSceneRenderer';
import { calculateResponsiveCameraRadius } from '../core/cameraResponsive';
import './editorStyles.css';

export interface LevelEditorOptions {
  scene: Scene;
  canvas: HTMLCanvasElement;
  shadowGenerator: ShadowGenerator;
  setStudioColor: (skyColor: Color4, grassColor?: Color3) => void;
  onTestLevel: (level: JsonLevelConfig) => void;
  onExitEditor: () => void;
}

export class LevelEditor {
  private scene: Scene;
  private canvas: HTMLCanvasElement;
  private setStudioColor: (skyColor: Color4, grassColor?: Color3) => void;
  private onTestLevelCallback: (level: JsonLevelConfig) => void;
  private onExitEditorCallback: () => void;

  private state: EditorStateManager;
  private cameraCtrl: EditorCameraController;
  private gizmoCtrl: GizmoController;
  private sceneRenderer: EditorSceneRenderer;
  private toolbar: EditorToolbar;
  private levelManager: LevelManagerPanel;
  private propertyPanel: PropertyPanel;
  private jsonModal: JsonModal;

  private rootContainer: HTMLElement;
  private isActive = false;
  private activeRenderToken = 0;
  private entities: SceneEntities = { props: [], characters: [], gun: null, meshMap: new Map(), environment: null };

  constructor(options: LevelEditorOptions) {
    this.scene = options.scene;
    this.canvas = options.canvas;
    this.setStudioColor = options.setStudioColor;
    this.onTestLevelCallback = options.onTestLevel;
    this.onExitEditorCallback = options.onExitEditor;

    this.state = new EditorStateManager();
    this.cameraCtrl = new EditorCameraController(this.scene, options.canvas);
    this.sceneRenderer = new EditorSceneRenderer(this.scene, options.shadowGenerator);

    this.gizmoCtrl = new GizmoController(this.scene, {
      onTransformChange: (pos, rot, scale, isIntermediate) => this.handleGizmoTransform(pos, rot, scale, isIntermediate),
      onMeshPicked: (mesh) => this.handleMeshPicked(mesh),
    });

    this.jsonModal = new JsonModal((imported) => {
      this.state.setLevel(imported);
      void this.renderEditorScene();
    });

    this.toolbar = new EditorToolbar(this.state, {
      onBackToGame: () => this.exit(),
      onPlayTest: () => this.playLevel(this.state.getLevel()),
      onSave: () => this.saveLevel(),
      onToggleLeftPanel: () => this.levelManager.toggle(),
      onToggleRightPanel: () => this.propertyPanel.toggle(),
      onDuplicate: () => this.duplicateSelected(),
      onDelete: () => this.deleteSelected(),
      onToggleGroundLock: () => {
        const next = !this.gizmoCtrl.isGroundYLocked();
        this.gizmoCtrl.setLockGroundY(next);
        return next;
      },
    });

    this.levelManager = new LevelManagerPanel(this.state, {
      onSelectLevel: (lvl) => {
        this.saveLevel();
        this.state.setLevel(lvl);
        this.cameraCtrl.applyLevelCamera(lvl);
        void this.renderEditorScene();
        this.levelManager.scrollToActive(true);
      },
      onPlayLevel: (lvl) => this.playLevel(lvl),
    });

    this.propertyPanel = new PropertyPanel(this.state, {
      onSpawnAsset: (asset) => void this.spawnAssetInScene(asset),
      onExportJson: () => {
        this.syncActiveMeshTransformToState();
        this.jsonModal.showExport(this.state.getLevel());
      },
      onImportJson: () => this.jsonModal.showImport(),
      onDuplicate: () => this.duplicateSelected(),
      onDelete: () => this.deleteSelected(),
      onSyncCamera: () => { this.syncCameraToState(); this.propertyPanel.update(); },
      onCameraZoomChange: (r) => {
        const width = this.canvas.clientWidth || window.innerWidth || 800;
        const height = this.canvas.clientHeight || window.innerHeight || 600;
        this.cameraCtrl.getCamera().radius = calculateResponsiveCameraRadius(r, width, height, 1.48);
      },
    });

    this.rootContainer = this.createDomRoot();
    this.setupStateSubscriptions();

    window.addEventListener('resize', () => {
      if (this.isActive) {
        const lvl = this.state.getLevel();
        if (lvl.cameraRadius) {
          const width = this.canvas.clientWidth || window.innerWidth || 800;
          const height = this.canvas.clientHeight || window.innerHeight || 600;
          this.cameraCtrl.getCamera().radius = calculateResponsiveCameraRadius(lvl.cameraRadius, width, height, 1.48);
        }
      }
    });
  }

  private createDomRoot(): HTMLElement {
    const root = document.createElement('div');
    root.id = 'editor-root-ui';
    root.className = 'editor-root hidden';
    root.appendChild(this.toolbar.getElement());
    const ws = document.createElement('div');
    ws.className = 'editor-workspace';
    ws.append(this.levelManager.getElement(), this.propertyPanel.getElement());
    root.appendChild(ws);
    document.getElementById('game-container')?.appendChild(root);
    return root;
  }

  private setupStateSubscriptions(): void {
    this.state.subscribe((event) => {
      if (event.type === 'selection_changed') this.updateGizmoAttachment(event.selection);
      else if (event.type === 'gizmo_mode_changed') this.gizmoCtrl.setMode(event.mode);
      else if (event.type === 'item_modified') this.applyItemModificationToScene(event.selection, event.data);
      else if (event.type === 'level_updated') {
        const lvl = event.level;
        this.setStudioColor(
          new Color4(lvl.skyColor[0], lvl.skyColor[1], lvl.skyColor[2], lvl.skyColor[3]),
          lvl.grassColor ? new Color3(lvl.grassColor[0], lvl.grassColor[1], lvl.grassColor[2]) : undefined
        );
        if (!this.gizmoCtrl.isCurrentlyDragging()) this.updateGizmoAttachment(this.state.getSelection());
      }
    });
  }

  public open(levelConfig?: JsonLevelConfig): void {
    if (this.isActive) return;
    this.isActive = true;
    (window as any).__levelEditor = this;
    if (levelConfig) this.state.setLevel(levelConfig, false);
    this.rootContainer.classList.remove('hidden');
    this.cameraCtrl.enableEditorCamera();
    this.cameraCtrl.applyLevelCamera(this.state.getLevel());
    this.gizmoCtrl.enable();
    this.levelManager.update();
    this.levelManager.scrollToActive(false);
    void this.renderEditorScene();
  }

  public closeEditor(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.syncActiveMeshTransformToState();
    this.clearEditorEntities();
    this.gizmoCtrl.disable();
    this.cameraCtrl.disableEditorCamera();
    this.rootContainer.classList.add('hidden');
  }

  private syncCameraToState(): void {
    const cam = this.cameraCtrl.getCamera();
    const width = this.canvas.clientWidth || window.innerWidth || 800;
    const height = this.canvas.clientHeight || window.innerHeight || 600;
    const aspect = width > 0 && height > 0 ? width / height : 1.48;
    const scale = aspect < 1.48 ? 1.48 / aspect : 1.0;
    const unscaledBaseRadius = +(cam.radius / scale).toFixed(2);
    this.state.updateCamera({
      radius: unscaledBaseRadius,
      target: [+cam.target.x.toFixed(2), +cam.target.y.toFixed(2), +cam.target.z.toFixed(2)],
      alpha: +cam.alpha.toFixed(3),
      beta: +cam.beta.toFixed(3),
    });
  }

  public saveLevel(): void {
    this.syncActiveMeshTransformToState();
    this.state.saveCurrentLevelToStorage();
  }

  public exit(): void {
    this.saveLevel();
    this.closeEditor();
    this.onExitEditorCallback();
  }

  public playLevel(lvl: JsonLevelConfig): void {
    this.saveLevel();
    const active = this.state.getLevel();
    const targetLvl = lvl.id === active.id ? active : lvl;
    this.closeEditor();
    this.onTestLevelCallback(targetLvl);
  }

  public isEditorOpen(): boolean { return this.isActive; }
  public getState(): EditorStateManager { return this.state; }

  private disposeEntities(entities: SceneEntities): void {
    entities.props.forEach((p) => p.dispose());
    entities.characters.forEach((c) => c.dispose());
    entities.gun?.dispose();
    entities.environment?.dispose();
  }

  private clearEditorEntities(): void {
    this.disposeEntities(this.entities);
    this.entities = { props: [], characters: [], gun: null, meshMap: new Map(), environment: null };
    this.gizmoCtrl.attachToMesh(null);
  }

  public async renderEditorScene(): Promise<void> {
    if (!this.isActive) return;
    const token = ++this.activeRenderToken;
    this.clearEditorEntities();

    const lvl = this.state.getLevel();
    this.setStudioColor(
      new Color4(lvl.skyColor[0], lvl.skyColor[1], lvl.skyColor[2], lvl.skyColor[3]),
      lvl.grassColor ? new Color3(lvl.grassColor[0], lvl.grassColor[1], lvl.grassColor[2]) : undefined
    );

    const loaded = await this.sceneRenderer.render(lvl);
    if (token !== this.activeRenderToken || !this.isActive) {
      this.disposeEntities(loaded);
      return;
    }

    this.entities = loaded;

    const sel = this.state.getSelection();
    if (sel) this.updateGizmoAttachment(sel);
  }

  private handleMeshPicked(mesh: AbstractMesh): void {
    let ref = this.entities.meshMap.get(mesh);

    // 1. Ancestor lookup: traverse up parent hierarchy if child submesh was clicked
    if (!ref) {
      let curr = mesh.parent;
      while (curr && !ref) {
        if (this.entities.meshMap.has(curr as AbstractMesh)) {
          ref = this.entities.meshMap.get(curr as AbstractMesh);
          break;
        }
        curr = curr.parent;
      }
    }

    // 2. Direct target character check
    if (!ref) {
      for (let i = 0; i < this.entities.characters.length; i++) {
        const char = this.entities.characters[i];
        if (!char) continue;
        if (
          char.mainMesh === mesh ||
          char.rootNode?.getChildMeshes?.().includes(mesh) ||
          char.attachedSword?.root?.getChildMeshes?.().includes(mesh)
        ) {
          ref = { type: 'target', index: i };
          break;
        }
      }
    }

    // 4. Direct prop check
    if (!ref) {
      for (let i = 0; i < this.entities.props.length; i++) {
        const prop = this.entities.props[i];
        if (!prop) continue;
        if (
          prop.rootNode === (mesh as unknown) ||
          prop.rootNode?.getChildMeshes?.().includes(mesh)
        ) {
          const propName = this.state.getLevel().props?.[i]?.name || `prop_${i}`;
          ref = { type: 'prop', index: i, id: propName };
          break;
        }
      }
    }

    // 5. Direct gun check
    if (!ref && this.entities.gun) {
      if (
        this.entities.gun.mesh === mesh ||
        this.entities.gun.allMeshes?.includes(mesh)
      ) {
        ref = { type: 'gun', index: 0 };
      }
    }

    this.state.setSelection(ref || null);
  }

  private updateGizmoAttachment(sel: SelectedObjectRef | null): void {
    if (!sel) {
      this.gizmoCtrl.attachToMesh(null);
      return;
    }

    const isLocked = this.state.isSelectionLocked();

    let targetMesh: AbstractMesh | null = null;
    if (sel.type === 'prop') targetMesh = this.entities.props[sel.index]?.rootNode as unknown as AbstractMesh;
    else if (sel.type === 'target') targetMesh = this.entities.characters[sel.index]?.rootNode as unknown as AbstractMesh;
    else if (sel.type === 'gun') targetMesh = this.entities.gun?.mesh || null;

    this.gizmoCtrl.attachToMesh(targetMesh, isLocked);
  }

  private syncActiveMeshTransformToState(): void {
    const mesh = this.gizmoCtrl.getAttachedMesh();
    if (!mesh) return;
    const rot = mesh.rotationQuaternion ? mesh.rotationQuaternion.toEulerAngles() : mesh.rotation;
    this.handleGizmoTransform(mesh.position.clone(), rot.clone(), mesh.scaling.clone(), false);
  }

  private applyItemModificationToScene(sel: SelectedObjectRef, data: unknown): void {
    if (sel.type === 'prop' && this.entities.props[sel.index]) {
      const p = data as JsonPropItem;
      const node = this.entities.props[sel.index].rootNode;
      if (node) {
        node.position.set(p.position[0], p.position[1], p.position[2]);
        if ('rotationQuaternion' in node) (node as AbstractMesh).rotationQuaternion = null;
        node.rotation.set(p.rotationX ?? 0, p.rotationY ?? 0, p.rotationZ ?? 0);
        if (p.scale !== undefined) node.scaling.setAll(p.scale);
      }
    } else if (sel.type === 'target' && this.entities.characters[sel.index]) {
      const t = data as JsonTargetItem;
      const char = this.entities.characters[sel.index];
      if (char) {
        char.rootNode.position.set(t.position[0], t.position[1], t.position[2]);
        if ('rotationQuaternion' in char.rootNode) (char.rootNode as AbstractMesh).rotationQuaternion = null;
        char.rootNode.rotation.y = t.rotationY ?? 0;
        if (t.scale !== undefined) char.rootNode.scaling.setAll(t.scale);

        // Animation update: only restart animation if animation name(s) or speed actually changed
        const animList = t.animationNames && t.animationNames.length > 0 ? t.animationNames : (t.animationName ? [t.animationName] : []);
        const animKey = `${animList.join(',')}_${t.animationSpeed ?? 1.0}`;
        const charAny = char as { _lastAnimKey?: string };
        if (charAny._lastAnimKey !== animKey) {
          charAny._lastAnimKey = animKey;
          if (animList.length > 1 && char.playAnimationSequence) {
            char.playAnimationSequence(animList, t.animationSpeed ?? 1.0);
          } else if (animList.length > 0) {
            char.playAnimation(animList[0], true, t.animationSpeed ?? 1.0);
          }
        }

        // Weapon update: live real-time transform or dynamic model switch
        const rawWeaponPath = t.weaponModelPath || t.swordModelPath;
        const wPos = t.swordPosition ? new Vector3(t.swordPosition[0], t.swordPosition[1], t.swordPosition[2]) : undefined;
        const wRot = t.swordRotation ? new Vector3(t.swordRotation[0], t.swordRotation[1], t.swordRotation[2]) : undefined;
        const wScale = t.swordScale;

        const isPistol = animList.some((a) => a.toLowerCase().includes('pistol') || a.toLowerCase().includes('gun'));
        const isSword = animList.some((a) => a.toLowerCase().includes('sword'));
        const targetPath = (!rawWeaponPath || rawWeaponPath === 'auto')
          ? (isPistol ? 'Pistol.glb' : (isSword ? 'swords/sword.glb' : undefined))
          : (rawWeaponPath === 'none' ? undefined : rawWeaponPath);

        if (char.currentWeaponPath !== targetPath) {
          void char.setWeapon?.(rawWeaponPath, {
            position: wPos,
            rotation: wRot,
            scale: wScale,
          });
        } else {
          char.updateWeaponTransform?.(wPos, wRot, wScale);
        }

        // Magic FX update
        char.setMagicFx?.(t.magicFx);
      }
    } else if (sel.type === 'gun' && this.entities.gun) {
      const lvl = this.state.getLevel();
      const cur = lvl.gunSpawnPos || [-2.2, 0.085, 0];
      const curRot = lvl.gunRotation || [0, 0, 0];
      this.entities.gun.mesh.position.set(cur[0], cur[1], 0);
      if (this.entities.gun.mesh.rotationQuaternion) this.entities.gun.mesh.rotationQuaternion = null;
      this.entities.gun.mesh.rotation.set(0, 0, curRot[2] || 0);
      this.entities.gun.mesh.scaling.setAll(lvl.gunScale ?? 0.52);
    }
  }

  private handleGizmoTransform(pos: Vector3, rot: Vector3, scale: Vector3, isIntermediate = false): void {
    const sel = this.state.getSelection();
    if (!sel || this.state.isSelectionLocked()) return;
    const push = !isIntermediate;
    const p3: [number, number, number] = [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2)];
    const mode = this.state.getGizmoMode();

    if (sel.type === 'prop') {
      if (mode === 'translate') {
        this.state.updateProp(sel.index, { position: p3 }, push);
      } else if (mode === 'rotate') {
        this.state.updateProp(sel.index, {
          rotationX: +rot.x.toFixed(2),
          rotationY: +rot.y.toFixed(2),
          rotationZ: +rot.z.toFixed(2),
        }, push);
      } else if (mode === 'scale') {
        this.state.updateProp(sel.index, { scale: +scale.x.toFixed(2) }, push);
      } else {
        this.state.updateProp(sel.index, {
          position: p3,
          rotationX: +rot.x.toFixed(2),
          rotationY: +rot.y.toFixed(2),
          rotationZ: +rot.z.toFixed(2),
          scale: +scale.x.toFixed(2),
        }, push);
      }
    } else if (sel.type === 'target') {
      if (mode === 'translate') {
        this.state.updateTarget(sel.index, { position: p3 }, push);
      } else if (mode === 'rotate') {
        this.state.updateTarget(sel.index, { rotationY: +rot.y.toFixed(2) }, push);
      } else if (mode === 'scale') {
        this.state.updateTarget(sel.index, { scale: +scale.x.toFixed(2) }, push);
      } else {
        this.state.updateTarget(sel.index, { position: p3, rotationY: +rot.y.toFixed(2), scale: +scale.x.toFixed(2) }, push);
      }
    } else if (sel.type === 'gun') {
      const lvl = this.state.getLevel();
      const gunP3: [number, number, number] = [p3[0], p3[1], 0];
      const gunRotZ: [number, number, number] = [0, 0, +rot.z.toFixed(2)];
      if (mode === 'translate') {
        this.state.updateGun(gunP3, [0, 0, lvl.gunRotation?.[2] ?? 0], undefined, push, lvl.gunScale);
      } else if (mode === 'rotate') {
        const basePos = lvl.gunSpawnPos ? [lvl.gunSpawnPos[0], lvl.gunSpawnPos[1], 0] as [number, number, number] : gunP3;
        this.state.updateGun(basePos, gunRotZ, undefined, push, lvl.gunScale);
      } else if (mode === 'scale') {
        const basePos = lvl.gunSpawnPos ? [lvl.gunSpawnPos[0], lvl.gunSpawnPos[1], 0] as [number, number, number] : gunP3;
        this.state.updateGun(basePos, [0, 0, lvl.gunRotation?.[2] ?? 0], undefined, push, +scale.x.toFixed(2));
      } else {
        this.state.updateGun(gunP3, gunRotZ, undefined, push, +scale.x.toFixed(2));
      }
    }

    this.propertyPanel.updateTransformInputs(pos, rot, scale);
  }

  private async spawnAssetInScene(asset: AssetDef): Promise<void> {
    this.syncActiveMeshTransformToState();
    const cam = this.cameraCtrl.getCamera();
    const spawnPos: [number, number, number] = [
      Number(cam.target.x.toFixed(2)),
      Math.max(0, Number(cam.target.y.toFixed(2))),
      Number(cam.target.z.toFixed(2)),
    ];

    if (asset.isEntity) {
      if (asset.entityType === 'target') {
        this.state.addTarget({
          position: spawnPos,
          rotationY: -Math.PI / 2,
          animationName: 'Dance_Loop',
          animationNames: ['Dance_Loop'],
        });
      } else if (asset.entityType === 'gun') {
        const lvl = this.state.getLevel();
        const gunSpawnPos: [number, number, number] = [spawnPos[0], spawnPos[1], 0];
        this.state.updateGun(gunSpawnPos, [0, 0, lvl.gunRotation?.[2] ?? 0], lvl.ammo, true);
        this.state.setSelection({ type: 'gun', index: 0 });
      }
    } else if (asset.modelPath) {
      this.state.addProp({
        name: `${asset.id}_${Date.now().toString(36).slice(-4)}`,
        modelPath: asset.modelPath,
        position: spawnPos,
        scale: asset.defaultScale ?? 1.0,
        hasCollision: asset.hasCollision ?? false,
        castShadow: asset.castShadow ?? true,
      });
    }

    await this.renderEditorScene();
  }

  private duplicateSelected(): void {
    this.syncActiveMeshTransformToState();
    const sel = this.state.getSelection();
    if (!sel) return;
    const lvl = this.state.getLevel();

    if (sel.type === 'prop' && lvl.props?.[sel.index]) {
      const orig = lvl.props[sel.index];
      this.state.addProp({ ...orig, name: `${orig.name}_copy`, position: [orig.position[0] + 0.4, orig.position[1], orig.position[2] + 0.4] });
      void this.renderEditorScene();
    } else if (sel.type === 'target' && lvl.targets[sel.index]) {
      const orig = lvl.targets[sel.index];
      const dup = { ...orig, position: [orig.position[0] + 0.5, orig.position[1], orig.position[2]] } as JsonTargetItem;
      if (dup.patrolRange) {
        dup.patrolRange = [
          Math.round((dup.patrolRange[0] + 0.5) * 100) / 100,
          Math.round((dup.patrolRange[1] + 0.5) * 100) / 100,
        ];
      }
      this.state.addTarget(dup);
      void this.renderEditorScene();
    }
  }

  private deleteSelected(): void {
    const sel = this.state.getSelection();
    if (!sel || sel.type === 'gun') return;
    if (sel.type === 'prop') this.state.deleteProp(sel.index);
    else if (sel.type === 'target') this.state.deleteTarget(sel.index);
    void this.renderEditorScene();
  }

  public dispose(): void {
    this.exit();
    this.cameraCtrl.dispose();
    this.gizmoCtrl.dispose();
    this.jsonModal.dispose();
    this.rootContainer.remove();
  }
}
