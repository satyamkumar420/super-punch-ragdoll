import type { AssetDef } from '../types';

export const CITY_ASSETS: AssetDef[] = [
  // Vehicles & Street Props (In Game)
  { id: 'city_sedan', name: 'Sedan Car', category: 'city', modelPath: 'city_traffic/sedan.glb', defaultScale: 1.0, hasCollision: true, castShadow: true, icon: 'car' },
  { id: 'city_cone', name: 'Traffic Cone', category: 'city', modelPath: 'city_traffic/cone.glb', defaultScale: 1.0, hasCollision: false, castShadow: true, icon: 'box' },
  { id: 'city_police', name: 'Police Cruiser', category: 'city', modelPath: 'city_traffic/police.glb', defaultScale: 1.0, hasCollision: true, castShadow: true, icon: 'car' },
  { id: 'city_suv', name: 'Offroad SUV', category: 'city', modelPath: 'city_traffic/suv.glb', defaultScale: 1.0, hasCollision: true, castShadow: true, icon: 'car' },
  { id: 'city_delivery', name: 'Delivery Van', category: 'city', modelPath: 'city_traffic/delivery.glb', defaultScale: 1.0, hasCollision: true, castShadow: true, icon: 'car' },
  { id: 'city_taxi', name: 'City Taxi', category: 'city', modelPath: 'city_traffic/taxi.glb', defaultScale: 1.0, hasCollision: true, castShadow: true, icon: 'car' },
];
