import type { StaircaseState } from '../lib/staircase';

/** What every drill reports when it finishes. */
export interface DrillResult {
  /** Staircase reported level, or the drill's difficulty parameter. */
  level: number;
  /** Items correct. */
  score: number;
  trials: number;
  /** End-of-session staircase, carried to the next session. */
  staircase?: StaircaseState;
}

/** The single interface every drill module presents to the session runner. */
export interface DrillProps {
  seed: string;
  /** Warm-up level for staircased drills; ignored by the timed ones. */
  level: number;
  /** Visual memory only. */
  exposureMs?: number;
  onFinish(result: DrillResult): void;
}
