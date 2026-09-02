import { useMemo, useState } from 'react';
import { makeRng } from '../../lib/rng';
import { BOUNDS } from '../../lib/defaults';
import {
  DigitStrip,
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
import { expected, score } from './scoring';

const TRIALS = 14;
const DIGIT_MS = 1000;
const GAP_MS = 250;
const FEEDBACK_MS = 900;

type Phase = 'present' | 'respond' | 'feedback';

export default function DigitSpan({ seed, level, onFinish }: DrillProps) {
  const bounds = BOUNDS['digit-span']!;
  const run = useStaircaseRun({ start: level, bounds, trials: TRIALS, onFinish });

  const [phase, setPhase] = useState<Phase>('present');
  const [shown, setShown] = useState(0);
  const [response, setResponse] = useState<number[]>([]);
  const [wasCorrect, setWasCorrect] = useState(false);

  const trial = useMemo(
    () => generateTrial(makeRng(seed + ':' + run.index), run.level),
    [seed, run.index, run.level],
  );

  // One digit at a time. The last one holds for its full second plus the gap
  // before the recall prompt replaces it.
  const presenting = phase === 'present';
  const more = shown < trial.digits.length;
  useTimeout(
    () => {
      if (more) setShown(shown + 1);
      else setPhase('respond');
    },
    presenting ? (more ? DIGIT_MS : DIGIT_MS + GAP_MS) : null,
    shown,
  );

  useTimeout(
    () => {
      setPhase('present');
      setShown(0);
      setResponse([]);
      run.submit(wasCorrect);
    },
    phase === 'feedback' ? FEEDBACK_MS : null,
    run.index,
  );

  useKeys(
    (e) => {
      if (phase !== 'respond') return;
      if (e.key >= '0' && e.key <= '9') {
        if (response.length >= trial.digits.length) return;
        setResponse([...response, Number(e.key)]);
      } else if (e.key === 'Backspace') {
        setResponse(response.slice(0, -1));
      } else if (e.key === 'Enter' && response.length === trial.digits.length) {
        setWasCorrect(score(trial, response));
        setPhase('feedback');
      }
    },
    [phase, response, trial],
  );

  if (phase === 'feedback') {
    return (
      <Stage>
        <Feedback
          correct={wasCorrect}
          answer={expected(trial).join(' ')}
        />
      </Stage>
    );
  }

  if (phase === 'present') {
    // Stimulus only. No count, no progress, nothing to encode against.
    return (
      <Stage>
        <div className="font-mono text-[8rem] leading-none tabular-nums">
          {shown > 0 && shown <= trial.digits.length ? trial.digits[shown - 1] : ''}
        </div>
      </Stage>
    );
  }

  return (
    <Stage>
      <div className="flex flex-col items-center gap-8">
        <Label>Backwards</Label>
        <DigitStrip values={response} length={trial.digits.length} />
        <KeyHint>digits · backspace · enter</KeyHint>
      </div>
    </Stage>
  );
}
