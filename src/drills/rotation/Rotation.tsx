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
import Figure from './Figure';
import { generateTrial } from './generator';
import { score, type RotationResponse } from './scoring';

export const DURATION_MS = 3 * 60 * 1000;
const FEEDBACK_MS = 550;

export default function Rotation({ seed, onFinish }: DrillProps) {
  const [index, setIndex] = useState(0);
  const [mark, setMark] = useState<null | { correct: boolean; answer: string }>(null);
  const correct = useRef(0);
  const done = useRef(false);

  const trial = useMemo(
    () => generateTrial(makeRng(seed + ':' + index)),
    [seed, index],
  );

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onFinish({ level: correct.current, score: correct.current, trials: index });
  }, [onFinish, index]);

  const remaining = useCountdown(DURATION_MS, finish);

  useTimeout(
    () => {
      setMark(null);
      setIndex((i) => i + 1);
    },
    mark ? FEEDBACK_MS : null,
    index,
  );

  const answer = (response: RotationResponse) => {
    if (mark || done.current) return;
    const ok = score(trial, response);
    if (ok) correct.current += 1;
    setMark({ correct: ok, answer: trial.mirrored ? 'mirrored' : 'same' });
  };

  useKeys(
    (e) => {
      const k = e.key.toLowerCase();
      if (k === 's' || e.key === 'ArrowLeft') answer('same');
      else if (k === 'm' || e.key === 'ArrowRight') answer('mirrored');
    },
    [trial, mark],
  );

  return (
    <Stage>
      <div className="flex flex-col items-center gap-8">
        <div className="flex items-center gap-4">
          <Figure cubes={trial.cubes} rotation={trial.rotA} />
          <div className="h-40 w-px bg-rule/50" />
          <Figure cubes={trial.other} rotation={trial.rotB} />
        </div>

        <div className="h-6 font-mono text-lg" aria-live="assertive">
          {mark && !mark.correct && <span className="text-wrong">{mark.answer}</span>}
          {mark && mark.correct && <span>✓</span>}
        </div>
        <Clock remaining={remaining} />
        <KeyHint>s — same rotated · m — mirrored</KeyHint>
      </div>
    </Stage>
  );
}
