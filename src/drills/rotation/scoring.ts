import type { RotationTrial } from './generator';

export type RotationResponse = 'same' | 'mirrored';

export function score(trial: RotationTrial, response: RotationResponse): boolean {
  return (response === 'mirrored') === trial.mirrored;
}
