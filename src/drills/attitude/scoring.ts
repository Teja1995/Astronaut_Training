import { answerFor, type AttitudeAnswer, type AttitudeTrial } from './generator';

/** All three parts, or the trial is wrong. Reflexive reading is the target. */
export function score(
  trial: AttitudeTrial,
  response: Partial<AttitudeAnswer>,
): boolean {
  const want = answerFor(trial);
  return (
    response.direction === want.direction &&
    response.bucket === want.bucket &&
    response.pitch === want.pitch
  );
}
