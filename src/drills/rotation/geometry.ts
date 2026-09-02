export type Vec3 = readonly [number, number, number];

const AXES: Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export const DIRECTIONS: readonly Vec3[] = AXES;

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function apply(m: readonly Vec3[], v: Vec3): Vec3 {
  return [
    m[0]![0] * v[0] + m[0]![1] * v[1] + m[0]![2] * v[2],
    m[1]![0] * v[0] + m[1]![1] * v[1] + m[1]![2] * v[2],
    m[2]![0] * v[0] + m[2]![1] * v[1] + m[2]![2] * v[2],
  ];
}

/** The 24 orientation-preserving rotations of the cubic lattice. */
export const LATTICE_ROTATIONS: readonly (readonly Vec3[])[] = (() => {
  const out: Vec3[][] = [];
  for (const x of AXES) {
    for (const y of AXES) {
      if (Math.abs(x[0] * y[0] + x[1] * y[1] + x[2] * y[2]) > 0) continue;
      const z = cross(x, y);
      // Rows are the images of the basis vectors, so build column-wise.
      out.push([
        [x[0], y[0], z[0]],
        [x[1], y[1], z[1]],
        [x[2], y[2], z[2]],
      ]);
    }
  }
  return out;
})();

export function mirror(cubes: readonly Vec3[]): Vec3[] {
  return cubes.map((c) => [-c[0], c[1], c[2]] as Vec3);
}

/** Translate to the origin and sort, so shape alone determines the string. */
function normalise(cubes: readonly Vec3[]): string {
  const minX = Math.min(...cubes.map((c) => c[0]));
  const minY = Math.min(...cubes.map((c) => c[1]));
  const minZ = Math.min(...cubes.map((c) => c[2]));
  return cubes
    .map((c) => `${c[0] - minX},${c[1] - minY},${c[2] - minZ}`)
    .sort()
    .join(';');
}

/** Smallest normal form over all 24 rotations: equal iff the shapes match. */
export function canonical(cubes: readonly Vec3[]): string {
  let best: string | null = null;
  for (const r of LATTICE_ROTATIONS) {
    const key = normalise(cubes.map((c) => apply(r, c)));
    if (best === null || key < best) best = key;
  }
  return best!;
}

/**
 * A shape equal to its own mirror image makes a mirrored trial unanswerable,
 * so only chiral figures may be used.
 */
export function isChiral(cubes: readonly Vec3[]): boolean {
  return canonical(cubes) !== canonical(mirror(cubes));
}

export function centre(cubes: readonly Vec3[]): Vec3 {
  const n = cubes.length;
  return [
    cubes.reduce((s, c) => s + c[0], 0) / n,
    cubes.reduce((s, c) => s + c[1], 0) / n,
    cubes.reduce((s, c) => s + c[2], 0) / n,
  ];
}
