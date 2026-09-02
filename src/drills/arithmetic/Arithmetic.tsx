import { useCallback, useMemo, useRef, useState } from 'react';
import { makeRng } from '../../lib/rng';
import {
  Clock,
  KeyHint,
  Stage,
  useCountdown,
  useKeys,
  useTimeout,
} from '../../components/ui';
import type { DrillProps } from '../contract';
import { generateTrial } from './generator';
import { score } from './scoring';

export const DURATION_MS = 3 * 60 * 1000;
const FEEDBACK_MS = 550;

export default function Arithmetic({ seed, onFinish }: DrillProps) {
  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState('');
  const [mark, setMark] = useState<null | { correct: boolean; answer: number }>(null);
  const correct = useRef(0);
  const done = useRef(false);

  const trial = useMemo(
    () => generateTrial(makeRng(seed + ':' + index)),
    [seed, index],
  );

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    // Score is correct answers in the window, not accuracy: speed is the
    // construct, so the level reported is the count itself.
    onFinish({ level: correct.current, score: correct.current, trials: index });
  }, [onFinish, index]);

  const remaining = useCountdown(DURATION_MS, finish);

  useTimeout(
    () => {
      setMark(null);
      setEntry('');
      setIndex((i) => i + 1);
    },
    mark ? FEEDBACK_MS : null,
    index,
  );

  useKeys(
    (e) => {
      if (mark || done.current) return;
      if (e.key >= '0' && e.key <= '9') setEntry(entry + e.key);
      else if (e.key === 'Backspace') setEntry(entry.slice(0, -1));
      else if (e.key === 'Enter' && entry !== '') {
        const ok = score(trial, entry);
        if (ok) correct.current += 1;
        setMark({ correct: ok, answer: trial.answer });
      }
    },
    [entry, trial, mark],
  );

  return (
    <Stage>
      <div className="flex w-full max-w-xl flex-col items-center gap-10">
        <div className="text-center font-mono text-4xl tracking-tight">
          {trial.prompt}
        </div>
        <div
          className={
            'flex h-16 min-w-[10rem] items-center justify-center border-b-2 px-6 font-mono text-4xl tabular-nums ' +
            (mark === null
              ? 'border-signal'
              : mark.correct
                ? 'border-graphite'
                : 'border-wrong text-wrong')
          }
        >
          {entry || ' '}
        </div>
        <div className="h-6 font-mono text-lg" aria-live="assertive">
          {mark && !mark.correct && (
            <span className="text-wrong">
              {mark.answer}
              {trial.unit ? ' ' + trial.unit : ''}
            </span>
          )}
          {mark && mark.correct && <span>✓</span>}
        </div>
        {/* A timer is chrome, but three minutes under pressure is the construct. */}
        <Clock remaining={remaining} />
        <KeyHint>digits · backspace · enter</KeyHint>
      </div>
    </Stage>
  );
}
