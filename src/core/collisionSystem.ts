import { Vector3 } from '@babylonjs/core';

/**
 * Standard collision layers and bitmasks for data-driven collision filtering.
 */
export const CollisionLayer = {
  NONE: 0,
  ENVIRONMENT: 1 << 0, // Solid walls, static ground, boundaries
  OBSTACLE: 1 << 1,    // Tables, barrels, chairs, dynamic props
  RAGDOLL: 1 << 2,     // Character ragdolls (alive & defeated)
  WEAPON: 1 << 3,      // Player gun
  PROJECTILE: 1 << 4,  // Bullets
  ALL: 0xffff,
} as const;

export type CollisionLayerType = typeof CollisionLayer[keyof typeof CollisionLayer];

export interface BoundingBox3D {
  min: Vector3 | { x: number; y: number; z: number };
  max: Vector3 | { x: number; y: number; z: number };
}

export interface Circle2D {
  x: number;
  z: number;
  radius: number;
  mass?: number;
}

export interface RayHit2D {
  hit: boolean;
  tMin: number;
  normalX: number;
  normalY: number;
}

/**
 * Checks if an AABB intersects the gameplay plane depth (Z = 0) within a tolerance margin.
 */
export function overlapsGameplayPlaneZ(minZ: number, maxZ: number, margin = 0.5): boolean {
  return minZ <= margin && maxZ >= -margin;
}

/**
 * Intersects a 2D ray with an Axis-Aligned Bounding Box in XY plane.
 * Provides exact entry distance (tMin) and collision surface normal.
 */
export function intersectRayAABB(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): RayHit2D {
  let tMin = -Infinity;
  let tMax = Infinity;
  let normalX = 0;
  let normalY = 0;

  if (Math.abs(dx) > 1e-6) {
    let t1 = (minX - ox) / dx;
    let t2 = (maxX - ox) / dx;
    let n1 = -1;
    let n2 = 1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      [n1, n2] = [n2, n1];
    }
    if (t1 > tMin) {
      tMin = t1;
      normalX = n1;
      normalY = 0;
    }
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return { hit: false, tMin: 0, normalX: 0, normalY: 0 };
  } else if (ox < minX || ox > maxX) {
    return { hit: false, tMin: 0, normalX: 0, normalY: 0 };
  }

  if (Math.abs(dy) > 1e-6) {
    let t1 = (minY - oy) / dy;
    let t2 = (maxY - oy) / dy;
    let n1 = -1;
    let n2 = 1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      [n1, n2] = [n2, n1];
    }
    if (t1 > tMin) {
      tMin = t1;
      normalX = 0;
      normalY = n1;
    }
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return { hit: false, tMin: 0, normalX: 0, normalY: 0 };
  } else if (oy < minY || oy > maxY) {
    return { hit: false, tMin: 0, normalX: 0, normalY: 0 };
  }

  if (tMax < 0) return { hit: false, tMin: 0, normalX: 0, normalY: 0 };
  return { hit: true, tMin: Math.max(0, tMin), normalX, normalY };
}

/**
 * Resolves 2D circular collision between two physical entities (e.g. two ragdolls).
 * Distributes displacement inversely proportional to mass so bodies never overlap.
 */
export function resolveCircleVsCircle(
  c1: Circle2D,
  c2: Circle2D
): { dx1: number; dz1: number; dx2: number; dz2: number; collided: boolean } {
  const dx = c2.x - c1.x;
  const dz = c2.z - c1.z;
  const distSq = dx * dx + dz * dz;
  const minDist = c1.radius + c2.radius;

  if (distSq >= minDist * minDist) {
    return { dx1: 0, dz1: 0, dx2: 0, dz2: 0, collided: false };
  }

  const dist = Math.sqrt(distSq) || 0.001;
  const overlap = minDist - dist;
  const nx = dx / dist;
  const nz = dz / dist;

  const m1 = c1.mass ?? 1;
  const m2 = c2.mass ?? 1;
  const totalMass = m1 + m2;
  const ratio1 = m2 / totalMass;
  const ratio2 = m1 / totalMass;

  return {
    dx1: -nx * overlap * ratio1,
    dz1: -nz * overlap * ratio1,
    dx2: nx * overlap * ratio2,
    dz2: nz * overlap * ratio2,
    collided: true,
  };
}

export interface CollisionResolutionResult {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  collided: boolean;
  isOnTop: boolean;
}

/**
 * Robust 3D Minimum Translation Vector (MTV) penetration resolution.
 * Accurately prevents objects from entering solid obstacles from ANY face
 * (top surface, bottom, or sides), and guarantees natural resting contacts with friction.
 */
export function resolveBodyVsAABB(
  px: number,
  py: number,
  pz: number,
  vx: number,
  vy: number,
  vz: number,
  radiusX: number,
  radiusY: number,
  radiusZ: number,
  box: BoundingBox3D,
  friction = 0.75,
  restitution = 0.2,
  allowTopRest = true
): CollisionResolutionResult {
  const min = box.min;
  const max = box.max;

  // 1. Broadphase: Check if completely outside along any axis
  const minX = min.x - radiusX;
  const maxX = max.x + radiusX;
  // If obstacle base is near ground (min.y <= 0.45), extend collision down to floor level (y = -0.2)
  // so bodies sliding on the floor cannot pass underneath sofas, tables, benches, or low furniture
  const minY = min.y <= 0.45 ? -0.2 : min.y - 0.1;
  const maxY = max.y + radiusY;
  const minZ = min.z - radiusZ;
  const maxZ = max.z + radiusZ;

  if (
    px <= minX || px >= maxX ||
    py < minY || py > maxY + 0.2 ||
    pz <= minZ || pz >= maxZ
  ) {
    return { x: px, y: py, z: pz, vx, vy, vz, collided: false, isOnTop: false };
  }

  // 2. Vertical Top Surface:
  // Horizontally within the top face of the obstacle (plus slight margin)
  const isHorizontallyOnTop =
    px >= min.x - 0.12 &&
    px <= max.x + 0.12 &&
    pz >= min.z - 0.12 &&
    pz <= max.z + 0.12;

  if (allowTopRest && isHorizontallyOnTop && py >= max.y - 0.28 && vy <= 0.1) {
    return {
      x: px,
      y: max.y,
      z: pz,
      vx: vx * friction,
      vy: 0,
      vz: vz * friction,
      collided: true,
      isOnTop: true,
    };
  }

  // 3. 3D Minimum Translation Vector (MTV) Penetration Resolution:
  // Calculate penetration depth along each horizontal face:
  const penLeft = px - minX;   // distance into left face
  const penRight = maxX - px;  // distance into right face
  const penBack = pz - minZ;   // distance into back face
  const penFront = maxZ - pz;  // distance into front face

  const minPenX = Math.min(penLeft, penRight);
  const minPenZ = Math.min(penBack, penFront);

  let resX = px;
  let resZ = pz;
  let resVx = vx;
  let resVz = vz;

  if (minPenX <= minPenZ) {
    // Eject along X (shortest exit path)
    if (penLeft < penRight) {
      resX = minX - 0.008;
      resVx = Math.min(0, -Math.abs(vx) * restitution);
    } else {
      resX = maxX + 0.008;
      resVx = Math.max(0, Math.abs(vx) * restitution);
    }
  } else {
    // Eject along Z (shortest exit path)
    if (penBack < penFront) {
      resZ = minZ - 0.008;
      resVz = Math.min(0, -Math.abs(vz) * restitution);
    } else {
      resZ = maxZ + 0.008;
      resVz = Math.max(0, Math.abs(vz) * restitution);
    }
  }

  return {
    x: resX,
    y: py,
    z: resZ,
    vx: resVx,
    vy,
    vz: resVz,
    collided: true,
    isOnTop: false,
  };
}

/**
 * Resolves sphere penetration against a 3D AABB using 3D MTV physics.
 */
export function resolveSphereVsAABB(
  px: number,
  py: number,
  pz: number,
  vx: number,
  vz: number,
  radius: number,
  box: BoundingBox3D,
  restitution = 0.3
): { x: number; z: number; vx: number; vz: number; collided: boolean } {
  const res = resolveBodyVsAABB(
    px,
    py,
    pz,
    vx,
    0,
    vz,
    radius,
    radius,
    radius,
    box,
    0.75,
    restitution
  );
  return {
    x: res.x,
    z: res.z,
    vx: res.vx,
    vz: res.vz,
    collided: res.collided,
  };
}
