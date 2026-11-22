import {
  Scene,
  GizmoManager,
  AbstractMesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  type PointerInfo,
  PointerEventTypes,
} from '@babylonjs/core';
import type { GizmoMode } from './types';

export interface GizmoCallbacks {
  onTransformChange: (pos: Vector3, rot: Vector3, scale: Vector3, isIntermediate?: boolean) => void;
  onMeshPicked: (mesh: AbstractMesh) => void;
}

export class GizmoController {
  private scene: Scene;
  private gizmoManager: GizmoManager;
  private callbacks: GizmoCallbacks;
  private currentMode: GizmoMode = 'translate';
  private snapEnabled = false;
  private currentGrid = 0.25;
  private gridMesh: AbstractMesh | null = null;
  private pointerObserver: unknown = null;
  private isEnabled = false;

  private activeTargetMesh: AbstractMesh | null = null;
  private isObjectLocked = false;
  private isDragging = false;
  private lockGroundY = false;
  private lockedYValue: number | null = null;

  constructor(scene: Scene, callbacks: GizmoCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.gizmoManager = new GizmoManager(scene);
    this.gizmoManager.usePointerToAttachGizmos = false;

    this.createGridPlane();
    this.applyMode(this.currentMode);
  }

  private createGridPlane(): void {
    const grid = MeshBuilder.CreateGround('editorGridFloor', { width: 40, height: 40, subdivisions: 40 }, this.scene);
    grid.position.y = -0.005;
    const mat = new StandardMaterial('editorGridMat', this.scene);
    mat.diffuseColor = new Color3(0.2, 0.4, 0.6);
    mat.wireframe = true;
    mat.alpha = 0.25;
    grid.material = mat;
    grid.isPickable = false;
    grid.setEnabled(false);
    this.gridMesh = grid;
  }

  private configureGizmos(): void {
    const nameLower = (this.activeTargetMesh?.name || '').toLowerCase();
    const isGun = nameLower === 'editor_gun_root' || nameLower.startsWith('editor_gun');

    const posG = this.gizmoManager.gizmos.positionGizmo;
    if (posG) {
      posG.planarGizmoEnabled = false; // Disable planar gizmo to prevent extreme overshoot on perspective camera!
      posG.updateGizmoRotationToMatchAttachedMesh = false; // World space movement
      posG.scaleRatio = 1.0;
      posG.yGizmo.isEnabled = !this.lockGroundY;
      posG.zGizmo.isEnabled = !isGun; // Only gun is locked to 2D plane; targets and props can be freely positioned in 3D!
      this.attachListenersToGizmo(posG);
    }
    const rotG = this.gizmoManager.gizmos.rotationGizmo;
    if (rotG) {
      rotG.updateGizmoRotationToMatchAttachedMesh = false;
      rotG.scaleRatio = 1.0;
      rotG.xGizmo.isEnabled = !isGun; // Gun cannot be rotated along X in 2D gameplay!
      rotG.yGizmo.isEnabled = !isGun; // Gun cannot be rotated along Y in 2D gameplay!
      rotG.zGizmo.isEnabled = true;
      this.attachListenersToGizmo(rotG);
    }
    const scaleG = this.gizmoManager.gizmos.scaleGizmo;
    if (scaleG) {
      scaleG.scaleRatio = 1.0;
      this.attachListenersToGizmo(scaleG);
    }
  }

  private attachListenersToGizmo(gizmo: {
    onDragStartObservable: { add: (cb: () => void) => void };
    onDragObservable: { add: (cb: () => void) => void };
    onDragEndObservable: { add: (cb: () => void) => void };
  }): void {
    const g = gizmo as unknown as { _editorListenersBound?: boolean };
    if (g._editorListenersBound) return;
    g._editorListenersBound = true;

    gizmo.onDragStartObservable.add(() => this.handleDragStart());
    gizmo.onDragObservable.add(() => this.handleDrag(true));
    gizmo.onDragEndObservable.add(() => this.handleDragEnd());
  }

  private handleDragStart(): void {
    this.isDragging = true;
    this.scene.activeCamera?.detachControl();
  }

  private handleDrag(isIntermediate: boolean): void {
    const mesh = this.gizmoManager.attachedMesh || this.activeTargetMesh;
    if (!mesh || this.isObjectLocked) return;
    if (this.lockGroundY && this.lockedYValue !== null) {
      mesh.position.y = this.lockedYValue;
    }
    const nameLower = (mesh.name || '').toLowerCase();
    const isGun = nameLower === 'editor_gun_root' || nameLower.startsWith('editor_gun');
    if (isGun) {
      mesh.position.z = 0;
      if (mesh.rotationQuaternion) mesh.rotationQuaternion = null;
      mesh.rotation.x = 0;
      mesh.rotation.y = 0;
    }
    const rot = mesh.rotationQuaternion ? mesh.rotationQuaternion.toEulerAngles() : mesh.rotation;
    this.callbacks.onTransformChange(mesh.position.clone(), rot.clone(), mesh.scaling.clone(), isIntermediate);
  }

  private handleDragEnd(): void {
    this.isDragging = false;
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (canvas && this.scene.activeCamera) {
      this.scene.activeCamera.attachControl(canvas, true);
    }
    this.handleDrag(false);
  }

  public enable(): void {
    if (this.isEnabled) return;
    this.isEnabled = true;
    if (this.gridMesh) this.gridMesh.setEnabled(true);

    this.applyMode(this.currentMode);
    this.updateSnapping();

    this.pointerObserver = this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 0) {
        if (this.isDragging) return;
        const evt = pointerInfo.event as PointerEvent;
        const target = evt.target as HTMLElement;
        if (target && target.tagName !== 'CANVAS') return;

        const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (m) => {
          return m.isPickable && m !== this.gridMesh && !m.name.startsWith('editorGrid');
        });

        if (pick && pick.hit && pick.pickedMesh) {
          this.callbacks.onMeshPicked(pick.pickedMesh);
        }
      }
    });
  }

  public disable(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    if (this.gridMesh) this.gridMesh.setEnabled(false);
    this.attachToMesh(null);

    this.gizmoManager.positionGizmoEnabled = false;
    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.scaleGizmoEnabled = false;

    if (this.pointerObserver) {
      this.scene.onPointerObservable.remove(this.pointerObserver as never);
      this.pointerObserver = null;
    }
  }

  public attachToMesh(mesh: AbstractMesh | null, isLocked = false): void {
    if (this.activeTargetMesh === mesh && this.isObjectLocked === isLocked && this.gizmoManager.attachedMesh === mesh) {
      return; // Prevent resetting drag delta while already attached
    }
    this.activeTargetMesh = mesh;
    this.isObjectLocked = isLocked;
    if (mesh) {
      this.lockedYValue = mesh.position.y;
    }
    if (!this.isEnabled || isLocked || !mesh) {
      this.gizmoManager.attachToMesh(null);
      return;
    }
    this.gizmoManager.attachToMesh(mesh);
    this.configureGizmos();
  }

  public getAttachedMesh(): AbstractMesh | null {
    return this.activeTargetMesh;
  }

  public isCurrentlyDragging(): boolean {
    return this.isDragging;
  }

  public setObjectLocked(locked: boolean): void {
    this.isObjectLocked = locked;
    if (locked) {
      this.gizmoManager.attachToMesh(null);
    } else if (this.activeTargetMesh) {
      this.gizmoManager.attachToMesh(this.activeTargetMesh);
      this.configureGizmos();
    }
  }

  public setLockGroundY(locked: boolean): void {
    this.lockGroundY = locked;
    if (this.activeTargetMesh) {
      this.lockedYValue = this.activeTargetMesh.position.y;
    }
    const posG = this.gizmoManager.gizmos.positionGizmo;
    if (posG) {
      posG.yGizmo.isEnabled = !locked;
    }
  }

  public isGroundYLocked(): boolean {
    return this.lockGroundY;
  }

  public setMode(mode: GizmoMode): void {
    this.currentMode = mode;
    if (this.isEnabled) {
      this.applyMode(mode);
    }
  }

  private applyMode(mode: GizmoMode): void {
    this.gizmoManager.positionGizmoEnabled = mode === 'translate';
    this.gizmoManager.rotationGizmoEnabled = mode === 'rotate';
    this.gizmoManager.scaleGizmoEnabled = mode === 'scale';
    this.configureGizmos();
    this.updateSnapping();
  }

  public setSnap(enabled: boolean, step = 0.25): void {
    this.snapEnabled = enabled;
    this.currentGrid = step;
    this.updateSnapping();
  }

  private updateSnapping(): void {
    const posG = this.gizmoManager.gizmos.positionGizmo;
    if (posG) {
      const snapDist = this.snapEnabled ? this.currentGrid : 0;
      posG.xGizmo.snapDistance = snapDist;
      posG.yGizmo.snapDistance = snapDist;
      posG.zGizmo.snapDistance = snapDist;
    }

    const rotG = this.gizmoManager.gizmos.rotationGizmo;
    if (rotG) {
      const snapAngle = this.snapEnabled ? (Math.PI / 12) : 0;
      rotG.xGizmo.snapDistance = snapAngle;
      rotG.yGizmo.snapDistance = snapAngle;
      rotG.zGizmo.snapDistance = snapAngle;
    }
  }

  public dispose(): void {
    this.disable();
    this.gizmoManager.dispose();
    if (this.gridMesh) {
      this.gridMesh.dispose();
      this.gridMesh = null;
    }
  }
}
