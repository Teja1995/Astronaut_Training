import { useCallback, useMemo, useState } from 'react';
import { newSeed } from './rng';
import { planSession } from './session';
import { resumeForSession } from './staircase';
import { useStore } from './store';
import { DRILLS, type DrillId, type DrillRecord } from './types';
import type { DrillResult } from '../drills/contract';

export type Screen =
  | { name: 'home' }
  | { name: 'session'; queue: DrillId[]; at: number; seed: string }
  | { name: 'between'; queue: DrillId[]; at: number; seed: string; last: DrillResult }
  | { name: 'done'; queue: DrillId[] }
  | { name: 'picker' }
  | { name: 'export' };

/**
 * The session state machine: what to run, in what order, and what to write
 * down when each drill finishes.
 */
export function useSession() {
  const { doc, commitRun, staircaseFor } = useStore();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  const proposed = useMemo(() => planSession(doc.records), [doc.records]);

  const start = useCallback((queue: DrillId[]) => {
    setScreen({ name: 'session', queue, at: 0, seed: newSeed() });
  }, []);

  const go = useCallback((name: 'home' | 'picker' | 'export') => {
    switch (name) {
      case 'home':
        setScreen({ name: 'home' });
        break;
      case 'picker':
        setScreen({ name: 'picker' });
        break;
      case 'export':
        setScreen({ name: 'export' });
        break;
    }
  }, []);

  const finishDrill = useCallback(
    (result: DrillResult) => {
      if (screen.name !== 'session') return;
      const drill = screen.queue[screen.at]!;
      const record: DrillRecord = {
        drill,
        timestamp: new Date().toISOString(),
        seed: screen.seed + ':' + screen.at,
        level: Math.round(result.level * 100) / 100,
        score: result.score,
        trials: result.trials,
      };
      // Written now, not at session end: a run that happened is a run kept.
      commitRun(record, result.staircase);
      setScreen({ ...screen, name: 'between', last: result });
    },
    [screen, commitRun],
  );

  const advance = useCallback(() => {
    if (screen.name !== 'between') return;
    const at = screen.at + 1;
    if (at >= screen.queue.length) setScreen({ name: 'done', queue: screen.queue });
    else setScreen({ name: 'session', queue: screen.queue, at, seed: screen.seed });
  }, [screen]);

  /** The warm-up level for the drill now on screen. */
  const currentLevel = useCallback(
    (drill: DrillId): number =>
      DRILLS[drill].staircased ? resumeForSession(staircaseFor(drill)).level : 0,
    [staircaseFor],
  );

  return { screen, proposed, start, go, finishDrill, advance, currentLevel };
}
