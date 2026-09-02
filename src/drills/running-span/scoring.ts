import type { RunningSpanTrial } from './generator';

/** The last n digits, in presentation order. */
export function expected(trial: RunningSpanTrial): number[] {
  return trial.stream.slice(trial.stream.length - trial.n);
}

export function score(trial: RunningSpanTrial, response: readonly number[]): boolean {
  const want = expected(trial);
  return want.length === response.length && want.every((d, i) => d === response[i]);
}
