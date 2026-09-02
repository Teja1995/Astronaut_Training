import {
  VISUAL_MEMORY_EXPOSURE_STEP_MS,
  VISUAL_MEMORY_MIN_EXPOSURE_MS,
} from './defaults';
import { DRILLS, type DrillId, type DrillRecord, type StoreDoc, type VisualMemoryState } from './types';

/** Cheap and central; every session gets them. */
export const ALWAYS: readonly DrillId[] = ['arithmetic', 'heading'];
/** The two the rotation chooses between. */
export const ROTATING: readonly DrillId[] = [
  'digit-span',
  'running-span',
  'visual-memory',
  'rotation',
  'attitude',
];
export const MAX_DRILLS_PER_SESSION = 4;
const ROTATING_PER_SESSION = MAX_DRILLS_PER_SESSION - ALWAYS.length;

export function lastPractisedAt(records: readonly DrillRecord[]): Map<DrillId, number> {
  const out = new Map<DrillId, number>();
  for (const r of records) {
    const t = Date.parse(r.timestamp);
    if (Number.isNaN(t)) continue;
    const prev = out.get(r.drill);
    if (prev === undefined || t > prev) out.set(r.drill, t);
  }
  return out;
}

/**
 * Arithmetic and heading always; then the two least recently practised of the
 * memory and spatial drills. Never more than four.
 */
export function planSession(records: readonly DrillRecord[]): DrillId[] {
  const last = lastPractisedAt(records);
  const ranked = ROTATING.slice().sort((a, b) => {
    const ta = last.get(a) ?? -Infinity;
    const tb = last.get(b) ?? -Infinity;
    if (ta !== tb) return ta - tb;
    // Stable, deterministic tie-break for a cold record.
    return ROTATING.indexOf(a) - ROTATING.indexOf(b);
  });
  const picked = ranked.slice(0, ROTATING_PER_SESSION);
  // Harder constructs while fresh, then the timed speed drills.
  return [...picked, ...ALWAYS];
}

export function sessionMinutes(drills: readonly DrillId[]): number {
  return drills.reduce((sum, d) => sum + DRILLS[d].minutes, 0);
}

const WEEK_MS = 7 * 86_400_000;

/**
 * Cell count has plateaued when the best level of the past week is no better
 * than the best of the week before it. Only then does exposure start coming
 * down, and by one 250 ms step per week at most.
 */
export function nextVisualMemoryExposure(
  state: VisualMemoryState,
  records: readonly DrillRecord[],
  now = new Date(),
): VisualMemoryState {
  if (state.exposureMs <= VISUAL_MEMORY_MIN_EXPOSURE_MS) return state;
  const t = now.getTime();

  if (state.lastExposureStepAt) {
    const since = t - Date.parse(state.lastExposureStepAt);
    if (!Number.isNaN(since) && since < WEEK_MS) return state;
  }

  const levels = (from: number, to: number): number[] =>
    records
      .filter((r) => r.drill === 'visual-memory')
      .filter((r) => {
        const rt = Date.parse(r.timestamp);
        return !Number.isNaN(rt) && rt >= from && rt < to;
      })
      .map((r) => r.level);

  const thisWeek = levels(t - WEEK_MS, t);
  const lastWeek = levels(t - 2 * WEEK_MS, t - WEEK_MS);
  // Needs both weeks populated before a plateau can be claimed at all.
  if (thisWeek.length < 2 || lastWeek.length < 2) return state;
  if (Math.max(...thisWeek) > Math.max(...lastWeek)) return state;

  return {
    exposureMs: Math.max(
      VISUAL_MEMORY_MIN_EXPOSURE_MS,
      state.exposureMs - VISUAL_MEMORY_EXPOSURE_STEP_MS,
    ),
    lastExposureStepAt: now.toISOString(),
  };
}

export interface Benchmarks {
  /** Maximum digit span backwards reached. */
  digitSpan: number | null;
  /** Mental-rotation items correct in three minutes. */
  rotation: number | null;
}

/** The two figures copied by hand into the external spreadsheet. */
export function benchmarks(doc: StoreDoc): Benchmarks {
  const best = (drill: DrillId, field: 'level' | 'score'): number | null => {
    const vals = doc.records.filter((r) => r.drill === drill).map((r) => r[field]);
    return vals.length ? Math.max(...vals) : null;
  };
  return {
    digitSpan: best('digit-span', 'level'),
    rotation: best('rotation', 'score'),
  };
}
