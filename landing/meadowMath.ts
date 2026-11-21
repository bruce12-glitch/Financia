export interface GrassBladeInstanceData {
  x: number;
  y: number;
  z: number;
  height: number;
  width: number;
  yaw: number;
  stiffness: number;
  hueShift: number;
  dryTip: number;
  sunlit: number;
}

export interface WildflowerInstanceData {
  x: number;
  y: number;
  z: number;
  stemHeight: number;
  flowerScale: number;
  yaw: number;
  tilt: number;
  phase: number;
}

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Gentle rolling meadow ground height calibrated to align the 3D horizon
 * cleanly with the seated astronaut photo in image_612bb5a4.png (~58-63% Y).
 */
export function meadowGroundHeightAt(x: number, z: number): number {
  const depthFactor = Math.max(0, (-z + 2.5) * 0.038);
  const mound = Math.sin(x * 0.34 + 0.4) * 0.065 + Math.cos(z * 0.42) * 0.04;
  const sideRise = Math.min(0.24, x * x * 0.004);
  return -1.86 + depthFactor + mound + sideRise;
}

/**
 * Smooth clearing multiplier [0.22..1.0] centered on the seated astronaut
 * silhouette so grass rises lushly around his boots & knees while keeping
 * his torso, gloved hands, and glowing visor cleanly visible.
 */
export function astronautClearingFactor(x: number, z: number): number {
  const dx = (x - 0.55) / 1.45;
  const dz = (z + 2.85) / 1.65;
  const distSq = dx * dx + dz * dz;
  if (distSq >= 1.8) return 1.0;
  const t = Math.min(1, Math.max(0, distSq / 1.8));
  const smooth = t * t * (3 - 2 * t);
  return 0.22 + 0.78 * smooth;
}

/**
 * Diagonal sunbeam intensity [0.12..1.0] matching the volumetric god-rays
 * streaming from top-right to bottom-left in image_612bb5a4.png.
 */
export function sunbeamExposureAt(x: number, z: number): number {
  const bandA = Math.exp(-Math.pow((x * 0.75 + z * 0.45 - 0.75) / 2.4, 2));
  const bandB = Math.exp(-Math.pow((x * 0.75 + z * 0.45 + 2.2) / 2.0, 2)) * 0.68;
  return Math.min(1, Math.max(0.12, bandA + bandB));
}

export function generateGrassFieldInstances(
  count: number,
  seed = 20261117
): GrassBladeInstanceData[] {
  const rng = createSeededRng(seed);
  const blades: GrassBladeInstanceData[] = [];

  for (let i = 0; i < count; i += 1) {
    // Concentrate blades cleanly inside the camera perspective frustum [-7.0 .. 2.8]
    const u = rng();
    const z = 2.8 - Math.pow(u, 0.76) * 9.8;
    const spreadX = 1.08 + Math.max(0, 2.8 - z) * 0.34;
    let x = (rng() * 2 - 1) * spreadX;

    // Subtle organic tuft clustering so blades grow in natural meadow clumps
    if (i % 3 !== 0) {
      x += (rng() - 0.5) * 0.14;
    }

    const clearing = astronautClearingFactor(x, z);
    const groundY = meadowGroundHeightAt(x, z);
    const sun = sunbeamExposureAt(x, z);

    // Subtle perspective height taper: rich foreground turf framing lower third,
    // softly lower across midground & astronaut clearing
    const depthScale = z > 0.2 ? 1.0 : Math.max(0.54, 1.0 - (-z) * 0.055);
    const baseHeight = (0.34 + rng() * 0.44) * depthScale;
    const height = baseHeight * (0.46 + 0.54 * clearing);
    const width = (0.032 + rng() * 0.024) * (z > 0 ? 1.08 : 0.92);

    blades.push({
      x,
      y: groundY,
      z,
      height,
      width,
      yaw: rng() * Math.PI * 2,
      stiffness: 0.58 + rng() * 0.72,
      hueShift: rng(),
      dryTip: rng() * 0.52,
      sunlit: sun,
    });
  }

  return blades;
}

export function generateWildflowerInstances(
  count: number,
  seed = 90421
): WildflowerInstanceData[] {
  const rng = createSeededRng(seed);
  const flowers: WildflowerInstanceData[] = [];

  for (let i = 0; i < count; i += 1) {
    const u = rng();
    const z = 2.4 - Math.pow(u, 0.82) * 8.4;
    const spreadX = 1.0 + Math.max(0, 2.5 - z) * 0.32;
    const x = (rng() * 2 - 1) * spreadX;

    const clearing = astronautClearingFactor(x, z);
    if (clearing < 0.48 && z < -1.4) {
      continue;
    }

    const groundY = meadowGroundHeightAt(x, z);
    const depthScale = z > 0 ? 0.96 : Math.max(0.58, 1.0 - (-z) * 0.055);

    flowers.push({
      x,
      y: groundY,
      z,
      stemHeight: (0.28 + rng() * 0.28) * depthScale * (0.56 + 0.44 * clearing),
      flowerScale: 0.72 + rng() * 0.54,
      yaw: rng() * Math.PI * 2,
      tilt: (rng() - 0.5) * 0.35,
      phase: rng() * Math.PI * 2,
    });
  }

  return flowers;
}
