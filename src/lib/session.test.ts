import { describe, expect, it } from 'vitest';
import {
  ALWAYS,
  benchmarks,
  MAX_DRILLS_PER_SESSION,
  nextVisualMemoryExposure,
  planSession,
} from './session';
import { defaultVisualMemory, VISUAL_MEMORY_START_EXPOSURE_MS } from './defaults';
import { emptyStore } from './defaults';
import type { DrillId, DrillRecord } from './types';

const day = 86_400_000;
const at = (daysAgo: number): string =>
  new Date(Date.now() - daysAgo * day).toISOString();

const record = (drill: DrillId, daysAgo: number, level = 5): DrillRecord => ({
  drill,
  timestamp: at(daysAgo),
  seed: 's',
  level,
  score: 1,
  trials: 1,
});

describe('session rotation', () => {
  it('always includes the two cheap drills and never exceeds four', () => {
    const plan = planSession([]);
    expect(plan).toHaveLength(MAX_DRILLS_PER_SESSION);
    for (const d of ALWAYS) expect(plan).toContain(d);
    expect(new Set(plan).size).toBe(plan.length);
  });

  it('picks the two least recently practised of the rotating drills', () => {
    const records = [
      record('digit-span', 0),
      record('running-span', 1),
      record('visual-memory', 9),
      record('rotation', 2),
      record('attitude', 12),
    ];
    const plan = planSession(records);
    expect(plan).toContain('attitude');
    expect(plan).toContain('visual-memory');
    expect(plan).not.toContain('digit-span');
    expect(plan).not.toContain('running-span');
  });

  it('treats a never-practised drill as the most overdue', () => {
    const records = [
      record('digit-span', 30),
      record('running-span', 29),
      record('visual-memory', 28),
      record('rotation', 27),
    ];
    // attitude has never been run, so it must come first.
    expect(planSession(records)).toContain('attitude');
  });

  it('is deterministic for the same history', () => {
    const records = [record('rotation', 3), record('attitude', 4)];
    expect(planSession(records)).toEqual(planSession(records));
  });
});

describe('visual memory exposure', () => {
  const week = 7;

  it('holds exposure at 3s until a plateau is shown', () => {
    const state = defaultVisualMemory();
    const climbing = [
      record('visual-memory', 10, 6),
      record('visual-memory', 9, 6),
      record('visual-memory', 3, 8),
      record('visual-memory', 2, 9),
    ];
    expect(nextVisualMemoryExposure(state, climbing).exposureMs).toBe(
      VISUAL_MEMORY_START_EXPOSURE_MS,
    );
  });

  it('steps exposure down once cell count plateaus across two weeks', () => {
    const state = defaultVisualMemory();
    const flat = [
      record('visual-memory', 10, 8),
      record('visual-memory', 9, 8),
      record('visual-memory', 3, 8),
      record('visual-memory', 2, 7),
    ];
    const next = nextVisualMemoryExposure(state, flat);
    expect(next.exposureMs).toBe(VISUAL_MEMORY_START_EXPOSURE_MS - 250);
    expect(next.lastExposureStepAt).not.toBeNull();
  });

  it('will not step twice inside a week', () => {
    const flat = [
      record('visual-memory', 10, 8),
      record('visual-memory', 9, 8),
      record('visual-memory', 3, 8),
      record('visual-memory', 2, 7),
    ];
    const stepped = { exposureMs: 2750, lastExposureStepAt: at(2) };
    expect(nextVisualMemoryExposure(stepped, flat)).toEqual(stepped);
    const older = { exposureMs: 2750, lastExposureStepAt: at(week + 1) };
    expect(nextVisualMemoryExposure(older, flat).exposureMs).toBe(2500);
  });

  it('never goes below the floor', () => {
    const flat = [
      record('visual-memory', 10, 8),
      record('visual-memory', 9, 8),
      record('visual-memory', 3, 8),
      record('visual-memory', 2, 7),
    ];
    const floored = { exposureMs: 500, lastExposureStepAt: null };
    expect(nextVisualMemoryExposure(floored, flat).exposureMs).toBe(500);
  });

  it('needs both weeks populated before claiming a plateau', () => {
    const state = defaultVisualMemory();
    const thisWeekOnly = [record('visual-memory', 2, 8), record('visual-memory', 1, 8)];
    expect(nextVisualMemoryExposure(state, thisWeekOnly).exposureMs).toBe(
      VISUAL_MEMORY_START_EXPOSURE_MS,
    );
  });
});

describe('benchmarks', () => {
  it('reports the best digit span and the best rotation count', () => {
    const doc = emptyStore();
    doc.records = [
      { ...record('digit-span', 5), level: 6.5 },
      { ...record('digit-span', 1), level: 5.8 },
      { ...record('rotation', 2), score: 21 },
      { ...record('rotation', 1), score: 18 },
    ];
    expect(benchmarks(doc)).toEqual({ digitSpan: 6.5, rotation: 21 });
  });

  it('reports nothing before there is anything to report', () => {
    expect(benchmarks(emptyStore())).toEqual({ digitSpan: null, rotation: null });
  });
});
