import type { Rng } from '../../lib/rng';

export const MIN_STREAM = 8;
export const MAX_STREAM = 20;

export interface RunningSpanTrial {
  stream: number[];
  /** How many of the last digits to report. */
  n: number;
}

/**
 * Stream length is randomised per trial and never shown or hinted at. The
 * unpredictability is the point: the buffer has to be maintained continuously.
 */
export function generateTrial(rng: Rng, n: number): RunningSpanTrial {
  const length = Math.max(rng.int(MIN_STREAM, MAX_STREAM), n + 2);
  const stream: number[] = [];
  while (stream.length < length) {
    const d = rng.int(0, 9);
    if (stream.length > 0 && stream[stream.length - 1] === d) continue;
    stream.push(d);
  }
  return { stream, n };
}
