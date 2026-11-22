import type { ObstacleConfig } from './obstacleTypes';

/**
 * Real-world permanent objects (houses, homes, villas, residences, buildings, walls, heavy machinery)
 * MUST NEVER move, shift, shudder, disappear, hide, or get destroyed upon bullet impact.
 */
export function isPermanentObstacle(...identifiers: (string | undefined | null)[]): boolean {
  const combined = identifiers
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join(' ')
    .toLowerCase();

  if (!combined) return false;

  return (
    // 1. Houses, homes, residential, and architectural structures
    combined.includes('house') ||
    combined.includes('home') ||
    combined.includes('villa') ||
    combined.includes('residence') ||
    combined.includes('townhouse') ||
    combined.includes('mansion') ||
    combined.includes('cottage') ||
    combined.includes('tavern') ||
    combined.includes('pagoda') ||
    combined.includes('temple') ||
    combined.includes('cabin') ||
    combined.includes('shack') ||
    combined.includes('barn') ||
    combined.includes('garage') ||
    combined.includes('warehouse') ||
    combined.includes('depot') ||
    combined.includes('hangar') ||
    combined.includes('castle') ||
    combined.includes('tower') ||
    combined.includes('building') ||
    combined.includes('wall') ||
    combined.includes('cliff') ||
    combined.includes('structure') ||
    combined.includes('podium') ||
    combined.includes('dock') ||
    combined.includes('platform') ||
    combined.includes('island') ||
    // 2. Specific 3D model filenames
    combined.includes('house1') ||
    combined.includes('house2') ||
    combined.includes('building1') ||
    combined.includes('building2') ||
    combined.includes('building3') ||
    combined.includes('building4') ||
    combined.includes('building_a') ||
    combined.includes('building_b') ||
    combined.includes('cliff_rock') ||
    combined.includes('rock_large') ||
    // Large foliage & nature
    combined.includes('tree')
  );
}

/**
 * Infers default physical properties dynamically from model name/path or category
 * if not explicitly specified in level configuration.
 */
export function inferPhysicalDefaults(...identifiers: (string | undefined | null)[]): Required<ObstacleConfig> {
  const combined = identifiers
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .join(' ')
    .toLowerCase();

  const primaryName = identifiers.find((s): s is string => typeof s === 'string' && s.length > 0) || 'obstacle';
  const primaryModelPath = identifiers.find((s): s is string => typeof s === 'string' && s.endsWith('.glb')) || '';

  // 1. Concrete / Indestructible Heavy Structures, Houses, Homes, Villas, Buildings
  if (
    combined.includes('wall') ||
    combined.includes('building') ||
    combined.includes('cliff') ||
    combined.includes('house') ||
    combined.includes('home') ||
    combined.includes('villa') ||
    combined.includes('residence') ||
    combined.includes('townhouse') ||
    combined.includes('mansion') ||
    combined.includes('cottage') ||
    combined.includes('tavern') ||
    combined.includes('pagoda') ||
    combined.includes('temple') ||
    combined.includes('cabin') ||
    combined.includes('shack') ||
    combined.includes('barn') ||
    combined.includes('garage') ||
    combined.includes('warehouse') ||
    combined.includes('depot') ||
    combined.includes('hangar') ||
    combined.includes('castle') ||
    combined.includes('tower') ||
    combined.includes('machine') ||
    combined.includes('structure') ||
    combined.includes('house1') ||
    combined.includes('house2') ||
    combined.includes('building1') ||
    combined.includes('building2') ||
    combined.includes('building3') ||
    combined.includes('building4') ||
    combined.includes('building_a') ||
    combined.includes('building_b') ||
    combined.includes('dock') ||
    combined.includes('platform') ||
    combined.includes('island')
  ) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'concrete',
      durability: 0, // Indestructible
      isDestructible: false,
      isMovable: false,
      mass: 50000,
      isPenetrable: false,
      penetrationResistance: 250,
      scoreReward: 0,
    };
  }

  // 2. Large Quarry Rocks & Boulders
  if (combined.includes('rock') || combined.includes('boulder')) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'stone',
      durability: 0, // Indestructible
      isDestructible: false,
      isMovable: false,
      mass: 50000,
      isPenetrable: false,
      penetrationResistance: 250,
      scoreReward: 0,
    };
  }

  // 3. Sturdy Dining Table / Desk
  if (combined.includes('table') || combined.includes('desk')) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'wood',
      durability: 95, // Takes 2 direct pistol shots (50 dmg each) to break
      isDestructible: true,
      isMovable: true,
      mass: 35,
      isPenetrable: false, // Stops standard bullets from reaching sitting diners!
      penetrationResistance: 40,
      scoreReward: 20,
    };
  }

  // 4. Lightweight Wooden Chairs & Stools
  if (combined.includes('chair') || combined.includes('stool') || combined.includes('armchair')) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'wood',
      durability: 45, // Shatters in 1 solid direct shot or 2 glancing shots
      isDestructible: true,
      isMovable: true,
      mass: 7,
      isPenetrable: false, // Stops bullet at surface - no penetration!
      penetrationResistance: 40,
      scoreReward: 15,
    };
  }

  // 5. Oil Barrels / Industrial Cans
  if (combined.includes('barrel')) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'metal',
      durability: 85,
      isDestructible: true,
      isMovable: true,
      mass: 48,
      isPenetrable: false,
      penetrationResistance: 65,
      scoreReward: 25,
    };
  }

  // 6. Wooden Boxes / Crates
  if (combined.includes('box') || combined.includes('crate')) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'wood',
      durability: 35,
      isDestructible: true,
      isMovable: true,
      mass: 12,
      isPenetrable: false, // Stops bullet at surface
      penetrationResistance: 35,
      scoreReward: 10,
    };
  }

  // 7. Automobiles / Vehicles / Police / Taxi / Sedan / SUV / Delivery / Race Car
  if (
    combined.includes('car') ||
    combined.includes('sedan') ||
    combined.includes('taxi') ||
    combined.includes('police') ||
    combined.includes('suv') ||
    combined.includes('delivery') ||
    combined.includes('truck') ||
    combined.includes('van') ||
    combined.includes('traffic') ||
    combined.includes('vehicle') ||
    combined.includes('automobile') ||
    combined.includes('race_car')
  ) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'metal',
      durability: 0, // Indestructible: real cars never vanish
      isDestructible: false,
      isMovable: true,
      mass: 80,
      isPenetrable: false,
      penetrationResistance: 95,
      scoreReward: 0,
    };
  }

  // 8. Furniture: Couches, Bookshelves, Cabinets
  if (combined.includes('couch') || combined.includes('bookshelf') || combined.includes('cabinet')) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'wood',
      durability: 90,
      isDestructible: true,
      isMovable: true,
      mass: 42,
      isPenetrable: false,
      penetrationResistance: 45,
      scoreReward: 20,
    };
  }

  // 9. Procedural Wooden Fences
  if (combined.includes('fence') || combined.includes('picket') || combined.includes('rail')) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'wood',
      durability: 35,
      isDestructible: true,
      isMovable: false,
      mass: 14,
      isPenetrable: true,
      penetrationResistance: 15,
      scoreReward: 10,
    };
  }

  // 10. Procedural Trees
  if (combined.includes('tree') || combined.includes('trunk') || combined.includes('foliage')) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'wood',
      durability: 0,
      isDestructible: false,
      isMovable: false,
      mass: 1200,
      isPenetrable: false,
      penetrationResistance: 80,
      scoreReward: 0,
    };
  }

  // 11. Numbered Podium
  if (combined.includes('podium')) {
    return {
      id: '',
      name: primaryName,
      modelPath: primaryModelPath,
      material: 'concrete',
      durability: 0,
      isDestructible: false,
      isMovable: false,
      mass: 800,
      isPenetrable: false,
      penetrationResistance: 100,
      scoreReward: 0,
    };
  }

  // Default Fallback
  return {
    id: '',
    name: primaryName,
    modelPath: primaryModelPath,
    material: 'wood',
    durability: 60,
    isDestructible: true,
    isMovable: true,
    mass: 20,
    isPenetrable: false,
    penetrationResistance: 30,
    scoreReward: 10,
  };
}
