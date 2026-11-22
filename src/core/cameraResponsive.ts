export interface GameplayBounds {
  minX: number;
  maxX: number;
  minY?: number;
  maxY?: number;
}

/**
 * Calculates responsive camera radius to guarantee all level targets, obstacles,
 * and the player weapon remain fully inside visible screen bounds across any aspect ratio.
 */
export function calculateResponsiveCameraRadius(
  baseRadius: number,
  width: number,
  height: number,
  refAspect = 1.48
): number {
  if (width <= 0 || height <= 0 || baseRadius <= 0) return baseRadius;
  const aspect = width / height;

  if (aspect < refAspect) {
    const scaleFactor = refAspect / aspect;
    const dampened = 1 + (scaleFactor - 1) * 0.75;
    return baseRadius * dampened;
  }
  return baseRadius;
}

/**
 * Computes horizontal and vertical gameplay bounds from gun spawn position,
 * character targets, patrol ranges, and level props/obstacles.
 */
export function computeLevelGameplayBounds(level: {
  gunSpawnPos?: { x: number; y: number; z: number } | [number, number, number];
  targets?: {
    position: { x: number; y: number; z: number } | [number, number, number];
    patrolRange?: [number, number] | number[];
    scale?: number;
  }[];
  props?: {
    position?: { x: number; y: number; z: number } | [number, number, number];
    scale?: number;
    hasCollision?: boolean;
    isPunchable?: boolean;
  }[];
}): GameplayBounds {
  const getX = (pos: unknown): number | undefined => {
    if (!pos) return undefined;
    if (typeof (pos as { x?: number }).x === 'number') return (pos as { x: number }).x;
    if (Array.isArray(pos) && typeof pos[0] === 'number') return pos[0];
    return undefined;
  };

  const getY = (pos: unknown): number | undefined => {
    if (!pos) return undefined;
    if (typeof (pos as { y?: number }).y === 'number') return (pos as { y: number }).y;
    if (Array.isArray(pos) && typeof pos[1] === 'number') return pos[1];
    return undefined;
  };

  // Baseline street arcade framing: minimum comfortable visible width
  let minX = -2.4;
  let maxX = 2.4;
  let minY = 0.0;
  let maxY = 2.0;

  // Include character targets and their walking patrol ranges
  if (level.targets && level.targets.length > 0) {
    for (const t of level.targets) {
      const tx = getX(t.position);
      const ty = getY(t.position);
      const tScale = typeof t.scale === 'number' && t.scale > 0 ? t.scale : 1.0;

      if (tx !== undefined) {
        minX = Math.min(minX, tx - 0.7 * tScale);
        maxX = Math.max(maxX, tx + 0.7 * tScale);
      }

      if (Array.isArray(t.patrolRange) && t.patrolRange.length >= 2) {
        const pMin = Math.min(t.patrolRange[0], t.patrolRange[1]);
        const pMax = Math.max(t.patrolRange[0], t.patrolRange[1]);
        minX = Math.min(minX, pMin - 0.7 * tScale);
        maxX = Math.max(maxX, pMax + 0.7 * tScale);
      }

      if (ty !== undefined) {
        minY = Math.min(minY, ty);
        maxY = Math.max(maxY, ty + 2.0 * tScale);
      }
    }
  }

  // Include level props and obstacles (e.g. boombox, cars, benches, barriers)
  if (level.props && level.props.length > 0) {
    for (const p of level.props) {
      const px = getX(p.position);
      const py = getY(p.position);
      const pScale = typeof p.scale === 'number' && p.scale > 0 ? p.scale : 1.0;
      const margin = 0.6 * pScale;

      if (px !== undefined) {
        minX = Math.min(minX, px - margin);
        maxX = Math.max(maxX, px + margin);
      }

      if (py !== undefined) {
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py + 1.2 * pScale);
      }
    }
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Calculates optimal camera radius based on actual gameplay bounds (targets + props + stage),
 * preventing side cutoff on mobile portrait while maintaining crisp arcade framing on landscape.
 */
export function calculateDynamicGameplayRadius(
  bounds: GameplayBounds,
  width: number,
  height: number,
  baseRadius = 7.6,
  fov = 0.8,
  targetX = 0,
  targetY = 1.15
): number {
  if (width <= 0 || height <= 0) return baseRadius;
  const aspect = width / height;
  const halfFov = fov / 2;

  // Horizontal requirement
  const maxReachX = Math.max(
    Math.abs(bounds.minX - targetX),
    Math.abs(bounds.maxX - targetX),
    (bounds.maxX - bounds.minX) / 2
  );
  const requiredHalfWidth = maxReachX + 0.45;
  const visibleHalfWidthPerUnit = Math.tan(halfFov) * aspect;
  const radiusFromWidth = requiredHalfWidth / Math.max(0.05, visibleHalfWidthPerUnit);

  // Vertical requirement
  const boundsMinY = bounds.minY ?? 0;
  const boundsMaxY = bounds.maxY ?? (targetY + 2.0);
  const maxReachY = Math.max(
    Math.abs(boundsMaxY - targetY),
    Math.abs(targetY - boundsMinY)
  );
  const requiredHalfHeight = maxReachY + 0.55;
  const visibleHalfHeightPerUnit = Math.tan(halfFov);
  const radiusFromHeight = requiredHalfHeight / Math.max(0.05, visibleHalfHeightPerUnit);

  const optimalRadius = Math.max(radiusFromWidth, radiusFromHeight);

  // Landscape / Widescreen: use baseRadius as primary baseline
  if (aspect >= 1.2) {
    return Math.max(baseRadius, optimalRadius);
  }

  // Portrait / Mobile: scale smoothly up to 16.5 so full stage width and props fit with no side clipping
  const minPortraitRadius = Math.max(8.0, baseRadius);
  const clampedRadius = Math.max(minPortraitRadius, Math.min(optimalRadius, 16.5));

  return clampedRadius;
}
