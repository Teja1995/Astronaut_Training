import type { ArithmeticTrial } from './generator';

/** Single answer, typed. Score is correct answers in the window, not accuracy. */
export function score(trial: ArithmeticTrial, response: string): boolean {
  const n = Number(response.trim());
  return response.trim() !== '' && Number.isFinite(n) && n === trial.answer;
}
