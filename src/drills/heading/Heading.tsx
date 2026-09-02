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
import { format, generateTrial } from './generator';
import { score } from './scoring';

export const DURATION_MS = 2 * 60 * 1000;
const FEEDBACK_MS = 550;

export default function Heading({ seed, onFinish }: DrillProps) {
  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState('');
  const [mark, setMark] = useState<null | { correct: boolean; answer: string }>(null);
  const correct = useRef(0);
  const done = useRef(false);

  const trial = useMemo(
    () => generateTrial(makeRng(seed + ':' + index)),
    [seed, index],
  );
  const wantsLetter = trial.kind === 'turn-direction';

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
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

  const submit = (value: string) => {
    const ok = score(trial, value);
    if (ok) correct.current += 1;
    setMark({
      correct: ok,
      answer:
        trial.answer === 'L'
          ? 'left'
          : trial.answer === 'R'
            ? 'right'
            : trial.kind === 'reciprocal'
              ? format(trial.answer)
              : String(trial.answer) + '°',
    });
  };

  useKeys(
    (e) => {
      if (mark || done.current) return;
      const k = e.key.toLowerCase();
      if (wantsLetter) {
        // Letters or arrows: whichever the hand reaches first.
        if (k === 'l' || e.key === 'ArrowLeft') submit('L');
        else if (k === 'r' || e.key === 'ArrowRight') submit('R');
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        if (entry.length >= 3) return;
        setEntry(entry + e.key);
      } else if (e.key === 'Backspace') setEntry(entry.slice(0, -1));
      else if (e.key === 'Enter' && entry !== '') submit(entry);
    },
    [entry, trial, mark, wantsLetter],
  );

  return (
    <Stage>
      <div className="flex w-full max-w-xl flex-col items-center gap-10">
        <div className="text-center font-mono text-3xl tracking-tight">
          {trial.prompt}
        </div>

        {wantsLetter ? (
          <div className="flex gap-10 font-mono text-4xl text-rule">
            <span>L</span>
            <span>R</span>
          </div>
        ) : (
          <div
            className={
              'flex h-16 w-40 items-center justify-center border-b-2 font-mono text-4xl tabular-nums ' +
              (mark === null
                ? 'border-signal'
                : mark.correct
                  ? 'border-graphite'
                  : 'border-wrong text-wrong')
            }
          >
            {entry || ' '}
          </div>
        )}

        <div className="h-6 font-mono text-lg" aria-live="assertive">
          {mark && !mark.correct && <span className="text-wrong">{mark.answer}</span>}
          {mark && mark.correct && <span>✓</span>}
        </div>
        <Clock remaining={remaining} />
        <KeyHint>{wantsLetter ? 'l / r' : 'digits · backspace · enter'}</KeyHint>
      </div>
    </Stage>
  );
}
