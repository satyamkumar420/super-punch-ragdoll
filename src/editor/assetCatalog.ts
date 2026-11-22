import type { AssetDef } from './types';
import { ENTITY_ROOM_ASSETS } from './catalog/roomEntityCatalog';
import { CITY_ASSETS } from './catalog/cityCatalog';
import { NATURE_ROCK_ASSETS } from './catalog/natureRockCatalog';
import { WORKSHOP_WEAPON_ASSETS } from './catalog/workshopWeaponCatalog';

export { CHARACTER_ANIMATIONS } from './catalog/animationCatalog';

export const ASSET_CATALOG: AssetDef[] = [
  ...ENTITY_ROOM_ASSETS,
  ...CITY_ASSETS,
  ...NATURE_ROCK_ASSETS,
  ...WORKSHOP_WEAPON_ASSETS,
];
