import type { VisualMemoryTrial } from './generator';

/** Exact reproduction; partial credit would not drive the staircase. */
export function score(trial: VisualMemoryTrial, response: readonly number[]): boolean {
  if (response.length !== trial.filled.length) return false;
  const got = new Set(response);
  return got.size === trial.filled.length && trial.filled.every((i) => got.has(i));
}
