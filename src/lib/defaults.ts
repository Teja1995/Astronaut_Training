import { createStaircase, type StaircaseBounds, type StaircaseState } from './staircase';
import type { DrillId, StoreDoc, VisualMemoryState } from './types';
import { STORE_VERSION } from './types';

/** Staircase geometry per drill. Level always increases with difficulty. */
export const BOUNDS: Partial<Record<DrillId, StaircaseBounds & { start: number }>> = {
  'digit-span': { min: 2, max: 12, step: 1, start: 4 },
  'running-span': { min: 2, max: 10, step: 1, start: 3 },
  'visual-memory': { min: 3, max: 20, step: 1, start: 6 },
  // Level is a deadline index; see deadlineForLevel.
  attitude: { min: 0, max: 16, step: 1, start: 4 },
};

export const ATTITUDE_BASE_MS = 5000;
export const ATTITUDE_STEP_MS = 250;

export function deadlineForLevel(level: number): number {
  return ATTITUDE_BASE_MS - Math.round(level) * ATTITUDE_STEP_MS;
}

/** Grid grows so the filled cells never crowd the field. */
export function gridSizeForCells(cells: number): number {
  if (cells <= 10) return 4;
  if (cells <= 15) return 5;
  return 6;
}

export const VISUAL_MEMORY_START_EXPOSURE_MS = 3000;
export const VISUAL_MEMORY_MIN_EXPOSURE_MS = 500;
export const VISUAL_MEMORY_EXPOSURE_STEP_MS = 250;

export function defaultStaircase(drill: DrillId): StaircaseState {
  const b = BOUNDS[drill];
  if (!b) throw new Error(`${drill} is not staircased`);
  return createStaircase(b.start, { min: b.min, max: b.max, step: b.step });
}

export function defaultVisualMemory(): VisualMemoryState {
  return {
    exposureMs: VISUAL_MEMORY_START_EXPOSURE_MS,
    lastExposureStepAt: null,
  };
}

export function emptyStore(): StoreDoc {
  return {
    version: STORE_VERSION,
    records: [],
    staircases: {},
    visualMemory: defaultVisualMemory(),
    lastExportAt: null,
  };
}
