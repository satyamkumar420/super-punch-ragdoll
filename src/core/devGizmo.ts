import {
  Scene,
  GizmoManager,
} from '@babylonjs/core';

export function setupDevGizmo(scene: Scene): { dispose: () => void } {
  let gizmoManager: GizmoManager | null = null;
  let isEnabled = false;

  const toggleGizmo = () => {
    isEnabled = !isEnabled;
    if (isEnabled) {
      if (!gizmoManager) {
        gizmoManager = new GizmoManager(scene);
        gizmoManager.positionGizmoEnabled = true;
        gizmoManager.rotationGizmoEnabled = true;
        gizmoManager.scaleGizmoEnabled = true;

        gizmoManager.gizmos.positionGizmo?.onDragEndObservable.add(() => {
          const mesh = gizmoManager?.attachedMesh;
          if (mesh) {
            console.log(
              `[DevGizmo] ${mesh.name} -> pos: [${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)}], rotY: ${(mesh.rotation.y).toFixed(2)}`
            );
          }
        });
      }
      console.log('[DevGizmo] Enabled! Click any mesh to move/rotate it. Press E to disable.');
    } else {
      if (gizmoManager) {
        gizmoManager.attachToMesh(null);
      }
      console.log('[DevGizmo] Disabled.');
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'e' || e.key === 'E') {
      toggleGizmo();
    }
  };

  window.addEventListener('keydown', onKeyDown);

  return {
    dispose: () => {
      window.removeEventListener('keydown', onKeyDown);
      if (gizmoManager) {
        gizmoManager.dispose();
        gizmoManager = null;
      }
    },
  };
}
