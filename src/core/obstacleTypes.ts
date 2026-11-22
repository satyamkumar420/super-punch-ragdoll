import type { Vector3, AbstractMesh, TransformNode } from '@babylonjs/core';
import type { RagdollController } from '../ragdoll';

export type ObstacleMaterialType =
  | 'wood'
  | 'metal'
  | 'concrete'
  | 'stone'
  | 'glass'
  | 'cardboard'
  | 'fabric';

export interface ObstacleMaterialConfig {
  type: ObstacleMaterialType;
  penetrationResistance: number;
  ricochetChance: number;
  soundType: 'wood' | 'metal' | 'concrete' | 'glass' | 'cardboard';
  debrisColor: [number, number, number];
}

export const OBSTACLE_MATERIALS: Record<ObstacleMaterialType, ObstacleMaterialConfig> = {
  wood: {
    type: 'wood',
    penetrationResistance: 22,
    ricochetChance: 0.05,
    soundType: 'wood',
    debrisColor: [0.65, 0.45, 0.25],
  },
  metal: {
    type: 'metal',
    penetrationResistance: 65,
    ricochetChance: 0.35,
    soundType: 'metal',
    debrisColor: [0.75, 0.78, 0.82],
  },
  concrete: {
    type: 'concrete',
    penetrationResistance: 120,
    ricochetChance: 0.15,
    soundType: 'concrete',
    debrisColor: [0.68, 0.68, 0.65],
  },
  stone: {
    type: 'stone',
    penetrationResistance: 140,
    ricochetChance: 0.20,
    soundType: 'concrete',
    debrisColor: [0.55, 0.52, 0.48],
  },
  glass: {
    type: 'glass',
    penetrationResistance: 8,
    ricochetChance: 0.02,
    soundType: 'glass',
    debrisColor: [0.85, 0.95, 1.0],
  },
  cardboard: {
    type: 'cardboard',
    penetrationResistance: 6,
    ricochetChance: 0.0,
    soundType: 'cardboard',
    debrisColor: [0.78, 0.64, 0.46],
  },
  fabric: {
    type: 'fabric',
    penetrationResistance: 10,
    ricochetChance: 0.0,
    soundType: 'cardboard',
    debrisColor: [0.85, 0.40, 0.40],
  },
};

export interface ObstacleConfig {
  id?: string;
  name?: string;
  modelPath?: string;
  material?: ObstacleMaterialType;
  durability?: number; // 0 or undefined = indestructible
  isDestructible?: boolean;
  isMovable?: boolean;
  mass?: number; // in kg
  isPenetrable?: boolean;
  penetrationResistance?: number;
  scoreReward?: number;
}

export interface ObstacleState {
  id: string;
  name: string;
  modelPath?: string;
  rootNode: TransformNode;
  mesh: AbstractMesh;
  allMeshes: AbstractMesh[];
  material: ObstacleMaterialType;
  maxDurability: number;
  currentDurability: number;
  isDestructible: boolean;
  isMovable: boolean;
  mass: number;
  isPenetrable: boolean;
  penetrationResistance: number;
  scoreReward: number;
  isDestroyed: boolean;
  // Physics state for dynamic movable obstacles
  velocity: Vector3;
  angularVelocityY: number;
  angularVelocityX?: number;
  angularVelocityZ?: number;
  isLaunched?: boolean;
  restingY: number;
  cachedPosition?: Vector3;
  cachedBounds?: { min: Vector3; max: Vector3 };
}

export interface WeaponBallistics {
  damage: number;
  impactForce: number;
  penetrationPower: number;
  maxPenetrations: number;
}

export const DEFAULT_WEAPON_BALLISTICS: WeaponBallistics = {
  damage: 50,
  impactForce: 24,
  penetrationPower: 0,
  maxPenetrations: 0,
};

export interface ObstacleImpactResult {
  obstacle: ObstacleState;
  hitPoint: Vector3;
  damageApplied: number;
  destroyed: boolean;
  penetrated: boolean;
}

export interface HitResolution {
  hitPoint: Vector3;
  hitTarget: RagdollController | null;
  hitObstacle: ObstacleState | null;
  penetratedObstacles: ObstacleImpactResult[];
  effectiveDamage: number;
  isDirect: boolean;
  stoppedByObstacle: boolean;
}
