/**
 * Shared 2-down / 1-up staircase. Two consecutive correct trials move
 * difficulty one step up, a single incorrect moves it one step down.
 * Converges near 70.7% correct, which sits in the 70-80% target band.
 */

export type Direction = 'up' | 'down';

export interface StaircaseBounds {
  min: number;
  max: number;
  step: number;
}

export interface StaircaseState extends StaircaseBounds {
  level: number;
  consecutiveCorrect: number;
  lastDirection: Direction | null;
  /** Level held at each turning point, oldest first. */
  reversals: number[];
}

export const REVERSALS_FOR_REPORT = 6;
/** A session resumes two steps below where the last one ended, as a warm-up. */
export const WARMUP_STEPS_BELOW = 2;

export function createStaircase(
  start: number,
  bounds: StaircaseBounds,
): StaircaseState {
  return {
    ...bounds,
    level: clamp(start, bounds),
    consecutiveCorrect: 0,
    lastDirection: null,
    reversals: [],
  };
}

function clamp(level: number, b: StaircaseBounds): number {
  return Math.min(b.max, Math.max(b.min, level));
}

/** Score one trial. Returns a new state; the input is not mutated. */
export function recordTrial(
  state: StaircaseState,
  correct: boolean,
): StaircaseState {
  let consecutiveCorrect = correct ? state.consecutiveCorrect + 1 : 0;
  let direction: Direction | null = null;

  if (correct) {
    if (consecutiveCorrect >= 2) {
      direction = 'up';
      consecutiveCorrect = 0;
    }
  } else {
    direction = 'down';
  }

  if (direction === null) {
    return { ...state, consecutiveCorrect };
  }

  const reversals =
    state.lastDirection !== null && state.lastDirection !== direction
      ? [...state.reversals, state.level]
      : state.reversals;

  return {
    ...state,
    consecutiveCorrect,
    lastDirection: direction,
    reversals,
    level: clamp(state.level + (direction === 'up' ? state.step : -state.step), state),
  };
}

/**
 * The level to report for a session: the mean of the last six reversals, not
 * the highest level reached. Falls back to whatever reversals exist, and to
 * the current level before any turning point.
 */
export function reportedLevel(state: StaircaseState): number {
  const taken = state.reversals.slice(-REVERSALS_FOR_REPORT);
  if (taken.length === 0) return state.level;
  return taken.reduce((a, b) => a + b, 0) / taken.length;
}

/** True once the reported level rests on a full set of reversals. */
export function isReportStable(state: StaircaseState): boolean {
  return state.reversals.length >= REVERSALS_FOR_REPORT;
}

/** Where the next session starts: two steps below the carried level. */
export function warmupLevel(state: StaircaseState): number {
  return clamp(state.level - WARMUP_STEPS_BELOW * state.step, state);
}

/** Carry the staircase into a new session at its warm-up level. */
export function resumeForSession(state: StaircaseState): StaircaseState {
  return {
    ...state,
    level: warmupLevel(state),
    consecutiveCorrect: 0,
    lastDirection: null,
    reversals: [],
  };
}
