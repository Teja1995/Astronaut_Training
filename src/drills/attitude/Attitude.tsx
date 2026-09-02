import { useEffect, useMemo, useState } from 'react';
import { makeRng } from '../../lib/rng';
import { BOUNDS, deadlineForLevel } from '../../lib/defaults';
import { Feedback, KeyHint, Label, Stage, useKeys, useTimeout } from '../../components/ui';
import type { DrillProps, DrillResult } from '../contract';
import { useStaircaseRun } from '../useStaircaseRun';
import AttitudeIndicator from './AttitudeIndicator';
import {
  answerFor,
  BUCKET_LABEL,
  generateTrial,
  type AttitudeAnswer,
  type BankBucket,
} from './generator';
import { score } from './scoring';

const TRIALS = 24;
const FEEDBACK_MS = 1000;

const STEPS = ['direction', 'bucket', 'pitch'] as const;
type Step = (typeof STEPS)[number];

export default function Attitude({ seed, level, onFinish }: DrillProps) {
  const bounds = BOUNDS['attitude']!;

  const run = useStaircaseRun({
    start: level,
    bounds,
    trials: TRIALS,
    // The staircase counts deadline steps; the record keeps milliseconds,
    // which is the figure that means anything later. Lower is better here.
    onFinish: (r: DrillResult) =>
      onFinish({ ...r, level: deadlineForLevel(r.level) }),
  });

  const [answer, setAnswer] = useState<Partial<AttitudeAnswer>>({});
  const [mark, setMark] = useState<null | boolean>(null);

  const trial = useMemo(
    () => generateTrial(makeRng(seed + ':' + run.index)),
    [seed, run.index],
  );
  const deadline = deadlineForLevel(run.level);
  const step: Step | null =
    mark !== null ? null : (STEPS.find((s) => answer[s] === undefined) ?? null);

  const settle = (final: Partial<AttitudeAnswer>) => {
    setMark(score(trial, final));
  };

  const give = (patch: Partial<AttitudeAnswer>) => {
    const next = { ...answer, ...patch };
    setAnswer(next);
    if (STEPS.every((s) => next[s] !== undefined)) settle(next);
  };

  // The deadline is the difficulty. Running out is a wrong trial.
  useTimeout(() => setMark(false), mark === null ? deadline : null, run.index);

  useTimeout(
    () => {
      setAnswer({});
      setMark(null);
      run.submit(mark === true);
    },
    mark !== null ? FEEDBACK_MS : null,
    run.index,
  );

  useKeys(
    (e) => {
      if (step === null) return;
      const k = e.key.toLowerCase();
      if (step === 'direction') {
        if (k === 'l' || e.key === 'ArrowLeft') give({ direction: 'L' });
        else if (k === 'r' || e.key === 'ArrowRight') give({ direction: 'R' });
      } else if (step === 'bucket') {
        const map: Record<string, BankBucket> = {
          '1': 'shallow',
          '2': 'medium',
          '3': 'steep',
        };
        const b = map[e.key];
        if (b) give({ bucket: b });
      } else {
        if (k === 'u' || e.key === 'ArrowUp') give({ pitch: 'up' });
        else if (k === 'd' || e.key === 'ArrowDown') give({ pitch: 'down' });
      }
    },
    [step, answer, trial],
  );

  if (mark !== null) {
    const want = answerFor(trial);
    return (
      <Stage>
        <Feedback
          correct={mark}
          answer={
            (want.direction === 'L' ? 'left' : 'right') +
            ' ' +
            BUCKET_LABEL[want.bucket] +
            ', ' +
            want.pitch
          }
        />
      </Stage>
    );
  }

  return (
    <Stage>
      <div className="flex flex-col items-center gap-7">
        <AttitudeIndicator bank={trial.bank} pitch={trial.pitch} />
        <DeadlineBar key={run.index} deadline={deadline} />
        <Prompt step={step} />
      </div>
    </Stage>
  );
}

function Prompt({ step }: { step: Step | null }) {
  if (step === 'direction') {
    return (
      <div className="flex flex-col items-center gap-2">
        <Label>Bank direction</Label>
        <KeyHint>l — left · r — right</KeyHint>
      </div>
    );
  }
  if (step === 'bucket') {
    return (
      <div className="flex flex-col items-center gap-2">
        <Label>Bank magnitude</Label>
        <KeyHint>
          1 — {BUCKET_LABEL.shallow} · 2 — {BUCKET_LABEL.medium} · 3 — {BUCKET_LABEL.steep}
        </KeyHint>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <Label>Pitch</Label>
      <KeyHint>u — up · d — down</KeyHint>
    </div>
  );
}

/**
 * The visible deadline, tightening as the staircase moves. Driven by a tick
 * rather than a CSS transition so it still reads under reduced motion.
 */
function DeadlineBar({ deadline }: { deadline: number }) {
  const [left, setLeft] = useState(deadline);

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => {
      setLeft(Math.max(0, deadline - (performance.now() - started)));
    }, 50);
    return () => window.clearInterval(id);
  }, [deadline]);

  return (
    <div className="h-0.5 w-72 bg-rule/30">
      <div
        className="h-full bg-signal"
        style={{ width: (100 * left) / deadline + '%' }}
      />
    </div>
  );
}
