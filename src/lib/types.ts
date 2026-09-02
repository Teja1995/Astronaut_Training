import type { StaircaseState } from './staircase';

export const DRILL_IDS = [
  'digit-span',
  'running-span',
  'visual-memory',
  'arithmetic',
  'heading',
  'rotation',
  'attitude',
] as const;

export type DrillId = (typeof DRILL_IDS)[number];

export type DrillGroup = 'memory' | 'spatial' | 'speed';

export interface DrillMeta {
  id: DrillId;
  name: string;
  group: DrillGroup;
  /** Whether difficulty is under staircase control. */
  staircased: boolean;
  /** Nominal minutes, used to build a 15-minute session. */
  minutes: number;
  /** What the reported number means, for the session summary. */
  unit: string;
}

export const DRILLS: Record<DrillId, DrillMeta> = {
  'digit-span': {
    id: 'digit-span',
    name: 'Digit span backwards',
    group: 'memory',
    staircased: true,
    minutes: 4,
    unit: 'span',
  },
  'running-span': {
    id: 'running-span',
    name: 'Running memory span',
    group: 'memory',
    staircased: true,
    minutes: 4,
    unit: 'N',
  },
  'visual-memory': {
    id: 'visual-memory',
    name: 'Visual memory capacity',
    group: 'memory',
    staircased: true,
    minutes: 4,
    unit: 'cells',
  },
  arithmetic: {
    id: 'arithmetic',
    name: 'Mental arithmetic',
    group: 'speed',
    staircased: false,
    minutes: 3,
    unit: 'correct in 3:00',
  },
  heading: {
    id: 'heading',
    name: 'Heading arithmetic',
    group: 'speed',
    staircased: false,
    minutes: 2,
    unit: 'correct in 2:00',
  },
  rotation: {
    id: 'rotation',
    name: 'Mental rotation',
    group: 'spatial',
    staircased: false,
    minutes: 3,
    unit: 'correct in 3:00',
  },
  attitude: {
    id: 'attitude',
    name: 'Attitude interpretation',
    group: 'spatial',
    staircased: true,
    minutes: 3,
    unit: 'ms deadline',
  },
};

/** One completed drill run. Append-only history. */
export interface DrillRecord {
  drill: DrillId;
  /** ISO 8601, UTC. */
  timestamp: string;
  seed: string;
  /** Staircase reported level, or the drill's difficulty parameter. */
  level: number;
  /** Raw score: items correct. */
  score: number;
  trials: number;
}

export interface VisualMemoryState {
  /** Held at 3000 ms until cell count plateaus for a week. */
  exposureMs: number;
  /** ISO date of the last exposure reduction, so it steps at most weekly. */
  lastExposureStepAt: string | null;
}

export const STORE_VERSION = 1;

export interface StoreDoc {
  version: number;
  records: DrillRecord[];
  staircases: Partial<Record<DrillId, StaircaseState>>;
  visualMemory: VisualMemoryState;
  /** ISO timestamp of the last full JSON export. */
  lastExportAt: string | null;
}
