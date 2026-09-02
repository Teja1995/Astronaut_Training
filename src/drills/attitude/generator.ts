import type { Rng } from '../../lib/rng';

/** Bucket edges in degrees of bank. Trials never land near an edge. */
export const SHALLOW_MAX = 15;
export const MEDIUM_MAX = 35;

export type BankBucket = 'shallow' | 'medium' | 'steep';
export type BankDirection = 'L' | 'R';
export type PitchDirection = 'up' | 'down';

export interface AttitudeTrial {
  /** Degrees, positive is right wing down. */
  bank: number;
  /** Degrees, positive is nose up. */
  pitch: number;
}

export interface AttitudeAnswer {
  direction: BankDirection;
  bucket: BankBucket;
  pitch: PitchDirection;
}

export function bucketFor(bankMagnitude: number): BankBucket {
  if (bankMagnitude < SHALLOW_MAX) return 'shallow';
  if (bankMagnitude <= MEDIUM_MAX) return 'medium';
  return 'steep';
}

export const BUCKET_LABEL: Record<BankBucket, string> = {
  shallow: `under ${SHALLOW_MAX}°`,
  medium: `${SHALLOW_MAX}–${MEDIUM_MAX}°`,
  steep: `over ${MEDIUM_MAX}°`,
};

export function answerFor(trial: AttitudeTrial): AttitudeAnswer {
  return {
    direction: trial.bank >= 0 ? 'R' : 'L',
    bucket: bucketFor(Math.abs(trial.bank)),
    pitch: trial.pitch >= 0 ? 'up' : 'down',
  };
}

export function generateTrial(rng: Rng): AttitudeTrial {
  // Magnitudes sit clear of the bucket edges: the drill trains reading the
  // instrument, not guessing which side of a boundary a value fell on.
  const bucket = rng.pick<BankBucket>(['shallow', 'medium', 'steep']);
  const magnitude =
    bucket === 'shallow' ? rng.int(5, 12) : bucket === 'medium' ? rng.int(20, 30) : rng.int(42, 58);
  const bank = rng.bool() ? magnitude : -magnitude;
  const pitchMagnitude = rng.int(4, 18);
  const pitch = rng.bool() ? pitchMagnitude : -pitchMagnitude;
  return { bank, pitch };
}
