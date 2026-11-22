import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, Scene, Vector3 } from '@babylonjs/core';

let havokPluginInstance: HavokPlugin | null = null;

export async function initPhysics(scene: Scene): Promise<HavokPlugin> {
  if (havokPluginInstance) {
    scene.enablePhysics(new Vector3(0, -9.81, 0), havokPluginInstance);
    return havokPluginInstance;
  }

  const havokInstance = await HavokPhysics({
    locateFile: () => {
      if (typeof window !== 'undefined' && window.location) {
        return new URL('HavokPhysics.wasm', window.location.href).href;
      }
      return './HavokPhysics.wasm';
    },
  });

  havokPluginInstance = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, -9.81, 0), havokPluginInstance);
  return havokPluginInstance;
}

export function getPhysicsPlugin(): HavokPlugin | null {
  return havokPluginInstance;
}
