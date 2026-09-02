import { useCallback, useRef, useState } from 'react';
import { createStaircase, recordTrial, reportedLevel } from '../lib/staircase';
import type { StaircaseBounds, StaircaseState } from '../lib/staircase';
import type { DrillResult } from './contract';

interface Options {
  start: number;
  bounds: StaircaseBounds;
  trials: number;
  onFinish(result: DrillResult): void;
}

/**
 * Shared plumbing for the staircased drills: hold the controller, count the
 * trials, and report the mean of the last six reversals at the end.
 */
export function useStaircaseRun({ start, bounds, trials, onFinish }: Options) {
  const [state, setState] = useState<StaircaseState>(() =>
    createStaircase(start, bounds),
  );
  const [index, setIndex] = useState(0);
  const correct = useRef(0);
  const finished = useRef(false);

  const submit = useCallback(
    (wasCorrect: boolean) => {
      if (wasCorrect) correct.current += 1;
      const next = recordTrial(state, wasCorrect);
      setState(next);
      const done = index + 1;
      setIndex(done);
      if (done >= trials && !finished.current) {
        finished.current = true;
        onFinish({
          level: reportedLevel(next),
          score: correct.current,
          trials: done,
          staircase: next,
        });
      }
      return next;
    },
    [state, index, trials, onFinish],
  );

  return {
    /** The difficulty to present on the current trial. */
    level: state.level,
    state,
    index,
    remaining: trials - index,
    submit,
  };
}
