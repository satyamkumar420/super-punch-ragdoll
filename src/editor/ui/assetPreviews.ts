// 2.5D Visual Previews for Asset Palette (Pure SVG Illustrations, Zero Emojis)
import { getEntityRoomPreview } from './previews/entityRoomPreviews';
import { getCityPreview } from './previews/cityPreviews';
import { getWorkshopWeaponPreview } from './previews/workshopWeaponPreviews';
import { getNatureTerrainPreview } from './previews/natureTerrainPreviews';

export function getAssetPreview(assetId: string): string {
  // Check category-specific 2.5D vector illustrations
  const entityOrRoom = getEntityRoomPreview(assetId);
  if (entityOrRoom) return entityOrRoom;

  const city = getCityPreview(assetId);
  if (city) return city;

  const workshopWeapon = getWorkshopWeaponPreview(assetId);
  if (workshopWeapon) return workshopWeapon;

  const natureTerrain = getNatureTerrainPreview(assetId);
  if (natureTerrain) return natureTerrain;

  // Generic fallback 2.5D cube
  const common = 'viewBox="0 0 64 64" width="100%" height="100%" fill="none"';
  return `<svg ${common}>
    <polygon points="32,14 52,24 32,34 12,24" fill="#64748b"/>
    <polygon points="32,34 52,24 52,44 32,54" fill="#475569"/>
    <polygon points="32,34 12,24 12,44 32,54" fill="#334155"/>
  </svg>`;
}
