import {
  Vector3,
  Color4,
  Color3,
  Scene,
  TransformNode,
  type ShadowGenerator,
} from '@babylonjs/core';

export interface EnvironmentCollider {
  min: Vector3;
  max: Vector3;
}

export interface EnvironmentInstance {
  root: TransformNode;
  colliders?: EnvironmentCollider[];
  dispose: () => void;
}

export interface BackgroundTheme {
  id: string;
  name: string;
  skyColor: Color4;
  hemiLightDiffuse?: Color3;
  hemiLightGround?: Color3;
  dirLightDiffuse?: Color3;
  dirLightIntensity?: number;
  setup: (scene: Scene, shadowGen?: ShadowGenerator) => EnvironmentInstance;
}
