import type { Rng } from '../../lib/rng';
import { DIRECTIONS, isChiral, mirror, type Vec3 } from './geometry';

export interface Euler {
  x: number;
  y: number;
  z: number;
}

export interface RotationTrial {
  /** The reference figure, as unit-cube lattice coordinates. */
  cubes: Vec3[];
  /** The comparison figure: the same shape, or its reflection. */
  other: Vec3[];
  mirrored: boolean;
  rotA: Euler;
  rotB: Euler;
}

const SEGMENTS = 4;

function perpendicular(rng: Rng, prev: Vec3 | null): Vec3 {
  const candidates = DIRECTIONS.filter((d) =>
    prev === null ? true : d[0] * prev[0] + d[1] * prev[1] + d[2] * prev[2] === 0,
  );
  return rng.pick(candidates);
}

/** A connected walk of cubes with right-angle bends, in the Shepard–Metzler form. */
function walk(rng: Rng): Vec3[] | null {
  const cubes: Vec3[] = [[0, 0, 0]];
  const seen = new Set(['0,0,0']);
  let at: Vec3 = [0, 0, 0];
  let dir: Vec3 | null = null;

  for (let s = 0; s < SEGMENTS; s++) {
    dir = perpendicular(rng, dir);
    const length = rng.int(2, 3);
    for (let i = 0; i < length; i++) {
      const next: Vec3 = [at[0] + dir[0], at[1] + dir[1], at[2] + dir[2]];
      const key = `${next[0]},${next[1]},${next[2]}`;
      if (seen.has(key)) return null;
      seen.add(key);
      cubes.push(next);
      at = next;
    }
  }
  return cubes;
}

function euler(rng: Rng): Euler {
  const step = (): number => rng.int(0, 11) * 30;
  return { x: step(), y: step(), z: step() };
}

export function generateTrial(rng: Rng): RotationTrial {
  let cubes: Vec3[] | null = null;
  for (let attempt = 0; attempt < 200 && cubes === null; attempt++) {
    const candidate = walk(rng);
    if (candidate && isChiral(candidate)) cubes = candidate;
  }
  // Fall back to a known-chiral figure rather than emit an unanswerable trial.
  if (cubes === null) {
    cubes = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [2, 1, 0],
      [2, 2, 0],
      [2, 2, 1],
      [2, 2, 2],
      [3, 2, 2],
    ];
  }

  const mirrored = rng.bool();
  return {
    cubes,
    other: mirrored ? mirror(cubes) : cubes.slice(),
    mirrored,
    rotA: euler(rng),
    rotB: euler(rng),
  };
}
