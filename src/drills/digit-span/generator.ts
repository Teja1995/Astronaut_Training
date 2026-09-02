import type { Rng } from '../../lib/rng';

export interface DigitSpanTrial {
  digits: number[];
}

/** Digits presented one at a time, recalled in reverse. No repeats adjacent. */
export function generateTrial(rng: Rng, span: number): DigitSpanTrial {
  const digits: number[] = [];
  while (digits.length < span) {
    const d = rng.int(0, 9);
    if (digits.length > 0 && digits[digits.length - 1] === d) continue;
    digits.push(d);
  }
  return { digits };
}
