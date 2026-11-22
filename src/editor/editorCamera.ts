import {
  Scene,
  ArcRotateCamera,
  Vector3,
  Camera,
} from '@babylonjs/core';
import { calculateResponsiveCameraRadius } from '../core/cameraResponsive';

export class EditorCameraController {
  private scene: Scene;
  private canvas: HTMLCanvasElement;
  private editorCamera: ArcRotateCamera;
  private gameCamera: Camera | null = null;
  private isEditorActive = false;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.canvas = canvas;

    this.editorCamera = new ArcRotateCamera(
      'editorOrbitCamera',
      -Math.PI / 2,
      Math.PI / 3.0,
      9.6,
      new Vector3(0.35, 1.0, 0),
      this.scene
    );

    this.editorCamera.wheelPrecision = 40;
    this.editorCamera.pinchPrecision = 60;
    this.editorCamera.lowerRadiusLimit = 1.5;
    this.editorCamera.upperRadiusLimit = 120.0;
    this.editorCamera.minZ = 0.1;
    this.editorCamera.maxZ = 200.0;
    this.editorCamera.panningSensibility = 800;
  }

  public enableEditorCamera(): void {
    if (this.isEditorActive) return;
    this.isEditorActive = true;

    if (this.scene.activeCamera && this.scene.activeCamera !== this.editorCamera) {
      this.gameCamera = this.scene.activeCamera;
      const gc = this.gameCamera as ArcRotateCamera;
      if (gc.radius !== undefined) {
        this.editorCamera.radius = gc.radius;
        this.editorCamera.alpha = gc.alpha ?? -Math.PI / 2;
        this.editorCamera.beta = gc.beta ?? Math.PI / 3.0;
        this.editorCamera.setTarget(gc.target ? gc.target.clone() : new Vector3(0.35, 1.0, 0));
      }
    }

    this.scene.activeCamera = this.editorCamera;
    this.editorCamera.attachControl(this.canvas, true);
  }

  public disableEditorCamera(): void {
    if (!this.isEditorActive) return;
    this.isEditorActive = false;

    this.editorCamera.detachControl();

    if (this.gameCamera) {
      const gc = this.gameCamera as ArcRotateCamera;
      gc.radius = this.editorCamera.radius;
      // In 2D gameplay, restore pure side-view framing centered on 2D action plane (Z = 0 target, alpha = -PI/2, beta = 1.53)
      gc.setTarget(new Vector3(this.editorCamera.target.x, this.editorCamera.target.y, 0));
      gc.alpha = -Math.PI / 2;
      gc.beta = 1.53;
      this.scene.activeCamera = this.gameCamera;
    }
  }

  public applyLevelCamera(lvl?: { cameraRadius?: number; cameraTarget?: [number, number, number]; cameraAlpha?: number; cameraBeta?: number }): void {
    if (!lvl) return;
    if (lvl.cameraRadius !== undefined && lvl.cameraRadius > 0) {
      const width = this.canvas.clientWidth || window.innerWidth || 800;
      const height = this.canvas.clientHeight || window.innerHeight || 600;
      this.editorCamera.radius = calculateResponsiveCameraRadius(lvl.cameraRadius, width, height, 1.48);
    }
    if (lvl.cameraTarget && Array.isArray(lvl.cameraTarget) && lvl.cameraTarget.length === 3) {
      this.editorCamera.setTarget(new Vector3(lvl.cameraTarget[0], lvl.cameraTarget[1], lvl.cameraTarget[2]));
    }
    if (lvl.cameraAlpha !== undefined) this.editorCamera.alpha = lvl.cameraAlpha;
    if (lvl.cameraBeta !== undefined) this.editorCamera.beta = lvl.cameraBeta;
  }

  public focusOnPoint(targetPos: Vector3, radius = 6.0): void {
    this.editorCamera.setTarget(targetPos.clone());
    this.editorCamera.radius = radius;
  }

  public resetView(): void {
    this.editorCamera.alpha = -Math.PI / 2;
    this.editorCamera.beta = Math.PI / 3.0;
    this.editorCamera.radius = (this.gameCamera as ArcRotateCamera)?.radius || 9.6;
    this.editorCamera.setTarget(new Vector3(0.35, 1.0, 0));
  }

  public getCamera(): ArcRotateCamera {
    return this.editorCamera;
  }

  public dispose(): void {
    this.disableEditorCamera();
    this.editorCamera.dispose();
  }
}
