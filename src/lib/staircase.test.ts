import { describe, expect, it } from 'vitest';
import {
  createStaircase,
  recordTrial,
  reportedLevel,
  resumeForSession,
  warmupLevel,
  type StaircaseState,
} from './staircase';

const bounds = { min: 2, max: 12, step: 1 };
const run = (state: StaircaseState, outcomes: boolean[]): StaircaseState =>
  outcomes.reduce(recordTrial, state);

describe('2-down / 1-up staircase', () => {
  it('needs two consecutive correct to step up', () => {
    let s = createStaircase(4, bounds);
    s = recordTrial(s, true);
    expect(s.level).toBe(4);
    s = recordTrial(s, true);
    expect(s.level).toBe(5);
  });

  it('steps down on a single incorrect', () => {
    const s = recordTrial(createStaircase(4, bounds), false);
    expect(s.level).toBe(3);
  });

  it('resets the correct run after an error', () => {
    const s = run(createStaircase(4, bounds), [true, false, true]);
    expect(s.level).toBe(3);
  });

  it('clamps at the bounds', () => {
    const low = run(createStaircase(2, bounds), [false, false, false]);
    expect(low.level).toBe(2);
    const high = run(createStaircase(12, bounds), [true, true, true, true]);
    expect(high.level).toBe(12);
  });

  it('records a reversal at the turning point, not after the step', () => {
    // up to 5, then wrong: the turn happened at 5.
    const s = run(createStaircase(4, bounds), [true, true, false]);
    expect(s.reversals).toEqual([5]);
    expect(s.level).toBe(4);
  });

  it('does not record a reversal while the direction holds', () => {
    const s = run(createStaircase(8, bounds), [false, false, false]);
    expect(s.reversals).toEqual([]);
  });

  it('reports the mean of the last six reversals, not the peak reached', () => {
    const s: StaircaseState = {
      ...createStaircase(4, bounds),
      level: 3,
      reversals: [9, 4, 5, 4, 6, 4, 6, 5],
    };
    // The 9 is dropped; only the last six count.
    expect(reportedLevel(s)).toBe((5 + 4 + 6 + 4 + 6 + 5) / 6);
  });

  it('falls back to the current level before any reversal', () => {
    expect(reportedLevel(createStaircase(4, bounds))).toBe(4);
  });

  it('warms up two steps below the carried level', () => {
    const s = { ...createStaircase(7, bounds) };
    expect(warmupLevel(s)).toBe(5);
    const resumed = resumeForSession(s);
    expect(resumed.level).toBe(5);
    expect(resumed.reversals).toEqual([]);
    expect(resumed.lastDirection).toBeNull();
  });

  it('does not mutate the state passed in', () => {
    const s = createStaircase(4, bounds);
    recordTrial(recordTrial(s, true), true);
    expect(s.level).toBe(4);
    expect(s.consecutiveCorrect).toBe(0);
  });

  it('converges into the target band on a simulated observer', () => {
    // Correct with p = 1 when the level is below threshold, p = 0 above it.
    const threshold = 7;
    let s = createStaircase(4, bounds);
    for (let i = 0; i < 200; i++) s = recordTrial(s, s.level <= threshold);
    expect(reportedLevel(s)).toBeGreaterThanOrEqual(threshold);
    expect(reportedLevel(s)).toBeLessThanOrEqual(threshold + 1);
  });
});
