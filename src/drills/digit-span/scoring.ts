import type { DigitSpanTrial } from './generator';

export function expected(trial: DigitSpanTrial): number[] {
  return trial.digits.slice().reverse();
}

/** All-or-nothing: the staircase needs a binary outcome per trial. */
export function score(trial: DigitSpanTrial, response: readonly number[]): boolean {
  const want = expected(trial);
  return want.length === response.length && want.every((d, i) => d === response[i]);
}
