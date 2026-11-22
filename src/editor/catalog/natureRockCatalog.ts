import type { AssetDef } from '../types';

export const NATURE_ROCK_ASSETS: AssetDef[] = [
  // Nature & Park Props (In Game)
  { id: 'nature_campfire', name: 'Campfire', category: 'nature', modelPath: 'nature/campfire.glb', defaultScale: 1.0, hasCollision: false, castShadow: true, icon: 'scene' },
  { id: 'nature_bench', name: 'Park Bench', category: 'nature', modelPath: 'nature/bench.glb', defaultScale: 1.0, hasCollision: true, castShadow: true, icon: 'furniture' },
];
