import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The drill field. During a trial it holds the stimulus and nothing else;
 * chrome belongs between trials.
 */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      {children}
    </div>
  );
}

export function Rule({ className = '' }: { className?: string }) {
  return <hr className={'border-0 border-t border-rule/50 ' + className} />;
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.18em] text-rule">{children}</div>
  );
}

/** The one unambiguous mark after a trial, and the answer if it was wrong. */
export function Feedback({
  correct,
  answer,
}: {
  correct: boolean;
  answer?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3" aria-live="assertive">
      <div
        className={
          'text-5xl leading-none ' + (correct ? 'text-graphite' : 'text-wrong')
        }
      >
        {correct ? '✓' : '✗'}
      </div>
      {!correct && answer !== undefined && (
        <div className="font-mono text-2xl text-graphite">{answer}</div>
      )}
    </div>
  );
}

export function Button({
  children,
  onClick,
  hint,
}: {
  children: ReactNode;
  onClick(): void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-signal px-5 py-2 text-signal transition-colors hover:bg-signal hover:text-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
    >
      {children}
      {hint && <span className="ml-3 font-mono text-xs opacity-70">{hint}</span>}
    </button>
  );
}

export function KeyHint({ children }: { children: ReactNode }) {
  return <div className="font-mono text-xs text-rule">{children}</div>;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}

/**
 * Counts down from durationMs and fires once. Shown only where speed under
 * pressure is the construct being measured.
 */
export function useCountdown(durationMs: number, onDone: () => void) {
  const [remaining, setRemaining] = useState(durationMs);
  const done = useRef(false);
  const cb = useRef(onDone);
  cb.current = onDone;

  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => {
      const left = durationMs - (performance.now() - started);
      setRemaining(left);
      if (left <= 0 && !done.current) {
        done.current = true;
        window.clearInterval(id);
        cb.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [durationMs]);

  return remaining;
}

export function Clock({ remaining }: { remaining: number }) {
  return (
    <div className="font-mono text-sm tabular-nums text-rule">
      {formatClock(remaining)}
    </div>
  );
}

/** Key handler bound to the window, so no drill needs a focused element. */
export function useKeys(handler: (e: KeyboardEvent) => void, deps: unknown[]) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => ref.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * A single timeout, cleared on unmount. `key` identifies the timeout instance:
 * successive waits of the same length re-arm only when the key changes, which
 * is what stepping through a stimulus one item at a time needs.
 */
export function useTimeout(fn: () => void, ms: number | null, key: unknown = 0) {
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    if (ms === null) return;
    const id = window.setTimeout(() => cb.current(), ms);
    return () => window.clearTimeout(id);
  }, [ms, key]);
}

/** Digits typed into a fixed-width answer strip. */
export function DigitStrip({
  values,
  length,
}: {
  values: readonly number[];
  length: number;
}) {
  return (
    <div className="flex gap-2">
      {Array.from({ length }, (_, i) => (
        <div
          key={i}
          className={
            'flex h-14 w-11 items-center justify-center border-b-2 font-mono text-3xl tabular-nums ' +
            (i < values.length ? 'border-signal text-graphite' : 'border-rule/60')
          }
        >
          {values[i] ?? ''}
        </div>
      ))}
    </div>
  );
}
