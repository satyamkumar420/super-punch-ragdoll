import type { AssetDef } from '../types';

export const ENTITY_ROOM_ASSETS: AssetDef[] = [
  // Entity Spawners
  {
    id: 'entity_target',
    name: 'Target Character',
    category: 'entity',
    isEntity: true,
    entityType: 'target',
    icon: 'user',
    description: 'Mannequin ragdoll target with customizable animations',
    defaultScale: 1.0,
  },
  {
    id: 'prop_static_pistol',
    name: 'Static Pistol',
    category: 'entity',
    modelPath: 'Pistol.glb',
    defaultScale: 1.89,
    hasCollision: true,
    castShadow: true,
    icon: 'gun',
    description: 'Static decorative display pistol - stays in fixed position and scale',
  },

  // Room & Dining Props (In Game)
  { id: 'room_table', name: 'Dining Table', category: 'room', modelPath: 'room_dinner/table.glb', defaultScale: 1.0, hasCollision: true, castShadow: true, icon: 'furniture' },
  { id: 'room_chair', name: 'Dining Chair', category: 'room', modelPath: 'room_dinner/chair.glb', defaultScale: 1.0, hasCollision: true, castShadow: true, icon: 'furniture' },
  { id: 'room_couch', name: 'Living Couch', category: 'room', modelPath: 'room_dinner/couch.glb', defaultScale: 1.0, hasCollision: true, castShadow: true, icon: 'furniture' },
  { id: 'room_arcade_machine', name: 'Arcade Machine', category: 'room', modelPath: 'room_dinner/arcade_machine.glb', defaultScale: 1.0, hasCollision: true, castShadow: true, icon: 'box' },

  // Audio Props
  {
    id: 'room_boombox',
    name: 'Retro Boombox',
    category: 'room',
    modelPath: 'boombox.glb',
    defaultScale: 1.0,
    hasCollision: true,
    castShadow: true,
    icon: 'box',
    description: 'Vintage portable dual-speaker cassette boombox',
  },
];
