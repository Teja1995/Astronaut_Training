import type { Rng } from '../../lib/rng';

export type HeadingKind = 'reciprocal' | 'turn-direction' | 'turn-degrees';

export interface HeadingTrial {
  kind: HeadingKind;
  /** 1..360, north as 360. */
  heading: number;
  target?: number;
  prompt: string;
  /** Degrees for the numeric kinds, 'L' or 'R' for the direction kind. */
  answer: number | 'L' | 'R';
}

/** 1..360 with north as 360, so three digits always read as a heading. */
export function normalise(deg: number): number {
  return ((Math.round(deg) - 1 + 3600) % 360) + 1;
}

export function format(heading: number): string {
  return String(normalise(heading)).padStart(3, '0');
}

export function reciprocal(heading: number): number {
  return normalise(heading + 180);
}

/** Signed shortest turn in (-180, 180]: positive right, negative left. */
export function turn(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/** Errors cluster at the wrap, so trials are weighted toward 000/360. */
function drawHeading(rng: Rng): number {
  if (rng.bool(0.45)) return normalise(rng.int(-25, 25));
  return rng.int(1, 360);
}

export function generateTrial(rng: Rng): HeadingTrial {
  const heading = drawHeading(rng);
  const kind = rng.pick<HeadingKind>(['reciprocal', 'turn-direction', 'turn-degrees']);

  if (kind === 'reciprocal') {
    return {
      kind,
      heading,
      prompt: `Reciprocal of ${format(heading)}`,
      answer: reciprocal(heading),
    };
  }

  let target = drawHeading(rng);
  let delta = turn(heading, target);
  // A 0 or 180 degree difference has no defined turn direction.
  let guard = 0;
  while ((delta === 0 || Math.abs(delta) === 180) && guard++ < 50) {
    target = drawHeading(rng);
    delta = turn(heading, target);
  }

  if (kind === 'turn-direction') {
    return {
      kind,
      heading,
      target,
      prompt: `${format(heading)} → ${format(target)}: turn which way?`,
      answer: delta > 0 ? 'R' : 'L',
    };
  }
  return {
    kind,
    heading,
    target,
    prompt: `${format(heading)} → ${format(target)}: degrees through the turn?`,
    answer: Math.abs(delta),
  };
}
