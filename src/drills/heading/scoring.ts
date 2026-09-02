import type { HeadingTrial } from './generator';

export function score(trial: HeadingTrial, response: string): boolean {
  const r = response.trim().toUpperCase();
  if (r === '') return false;
  if (trial.answer === 'L' || trial.answer === 'R') return r === trial.answer;
  const n = Number(r);
  if (!Number.isFinite(n)) return false;
  // 000 and 360 are the same heading; accept either for north.
  if (trial.kind === 'reciprocal') {
    return ((n - trial.answer) % 360 === 0) && Number.isInteger(n);
  }
  return n === trial.answer;
}
