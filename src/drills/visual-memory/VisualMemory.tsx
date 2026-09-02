import { useMemo, useState } from 'react';
import { makeRng } from '../../lib/rng';
import { BOUNDS, VISUAL_MEMORY_START_EXPOSURE_MS } from '../../lib/defaults';
import {
  Feedback,
  KeyHint,
  Label,
  Stage,
  useKeys,
  useTimeout,
} from '../../components/ui';
import type { DrillProps } from '../contract';
import { useStaircaseRun } from '../useStaircaseRun';
import { generateTrial } from './generator';
import { score } from './scoring';

const TRIALS = 12;
const GAP_MS = 400;
const FEEDBACK_MS = 1000;

type Phase = 'expose' | 'blank' | 'respond' | 'feedback';

export default function VisualMemory({
  seed,
  level,
  exposureMs = VISUAL_MEMORY_START_EXPOSURE_MS,
  onFinish,
}: DrillProps) {
  const bounds = BOUNDS['visual-memory']!;
  const run = useStaircaseRun({ start: level, bounds, trials: TRIALS, onFinish });

  const [phase, setPhase] = useState<Phase>('expose');
  const [picked, setPicked] = useState<number[]>([]);
  const [cursor, setCursor] = useState(0);
  const [wasCorrect, setWasCorrect] = useState(false);

  const trial = useMemo(
    () => generateTrial(makeRng(seed + ':' + run.index), run.level),
    [seed, run.index, run.level],
  );

  useTimeout(() => setPhase('blank'), phase === 'expose' ? exposureMs : null, run.index);
  useTimeout(() => setPhase('respond'), phase === 'blank' ? GAP_MS : null, run.index);
  useTimeout(
    () => {
      setPhase('expose');
      setPicked([]);
      setCursor(0);
      run.submit(wasCorrect);
    },
    phase === 'feedback' ? FEEDBACK_MS : null,
    run.index,
  );

  const toggle = (i: number) => {
    if (phase !== 'respond') return;
    setPicked(picked.includes(i) ? picked.filter((p) => p !== i) : [...picked, i]);
  };

  const commit = () => {
    if (phase !== 'respond' || picked.length !== trial.filled.length) return;
    setWasCorrect(score(trial, picked));
    setPhase('feedback');
  };

  // Keyboard-first: a cursor walks the grid, space fills, enter commits.
  const move = (dx: number, dy: number) => {
    const n = trial.size;
    const x = Math.min(n - 1, Math.max(0, (cursor % n) + dx));
    const y = Math.min(n - 1, Math.max(0, Math.floor(cursor / n) + dy));
    setCursor(y * n + x);
  };

  useKeys(
    (e) => {
      if (phase !== 'respond') return;
      switch (e.key) {
        case 'Enter':
          commit();
          break;
        case 'Backspace':
          setPicked([]);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          move(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          move(1, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          move(0, -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          move(0, 1);
          break;
        case ' ':
          e.preventDefault();
          toggle(cursor);
          break;
      }
    },
    [phase, picked, cursor, trial],
  );

  if (phase === 'feedback') {
    return (
      <Stage>
        <div className="flex flex-col items-center gap-8">
          <Feedback correct={wasCorrect} />
          {!wasCorrect && <Grid trial={trial} filled={trial.filled} readOnly />}
        </div>
      </Stage>
    );
  }

  if (phase === 'expose') {
    return (
      <Stage>
        <Grid trial={trial} filled={trial.filled} readOnly />
      </Stage>
    );
  }

  if (phase === 'blank') {
    return (
      <Stage>
        <Grid trial={trial} filled={[]} readOnly />
      </Stage>
    );
  }

  return (
    <Stage>
      <div className="flex flex-col items-center gap-8">
        <Grid trial={trial} filled={picked} onToggle={toggle} cursor={cursor} />
        <Label>
          {picked.length} of {trial.filled.length}
        </Label>
        <KeyHint>arrows · space fills · backspace clears · enter</KeyHint>
      </div>
    </Stage>
  );
}

function Grid({
  trial,
  filled,
  onToggle,
  cursor,
  readOnly = false,
}: {
  trial: { size: number };
  filled: readonly number[];
  onToggle?(i: number): void;
  cursor?: number;
  readOnly?: boolean;
}) {
  const set = new Set(filled);
  return (
    <div
      className="grid gap-px border border-rule bg-rule"
      style={{ gridTemplateColumns: 'repeat(' + trial.size + ', 3.25rem)' }}
    >
      {Array.from({ length: trial.size * trial.size }, (_, i) => {
        const on = set.has(i);
        const at = cursor === i;
        const base = 'aspect-square ' + (on ? 'bg-graphite' : 'bg-paper');
        const ring = at ? ' outline-2 -outline-offset-2 outline-signal' : '';
        if (readOnly) return <div key={i} className={base} />;
        return (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            aria-pressed={on}
            onClick={() => onToggle?.(i)}
            className={base + ring + ' cursor-pointer hover:bg-signal/20'}
          />
        );
      })}
    </div>
  );
}
