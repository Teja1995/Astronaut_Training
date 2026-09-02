import { describe, expect, it } from 'vitest';
import { emptyStore } from './defaults';
import { exportIsOverdue, parseStore } from './storage';
import type { DrillRecord, StoreDoc } from './types';

const record: DrillRecord = {
  drill: 'digit-span',
  timestamp: '2026-01-02T03:04:05.000Z',
  seed: 'abc',
  level: 5.5,
  score: 9,
  trials: 14,
};

function docWith(records: DrillRecord[]): StoreDoc {
  return { ...emptyStore(), records };
}

describe('store round trip', () => {
  it('survives serialisation unchanged', () => {
    const doc = docWith([record]);
    expect(parseStore(JSON.stringify(doc))).toEqual(doc);
  });

  it('rejects text that is not a store', () => {
    expect(parseStore('not json')).toBeNull();
    expect(parseStore('null')).toBeNull();
    expect(parseStore('{}')).toBeNull();
    expect(parseStore('[]')).toBeNull();
  });

  it('drops rows that are not records rather than failing the whole file', () => {
    const raw = JSON.stringify({ ...emptyStore(), records: [record, { drill: 'nope' }, 7] });
    const parsed = parseStore(raw);
    expect(parsed?.records).toEqual([record]);
  });

  it('fills in fields a older or partial document is missing', () => {
    const parsed = parseStore(JSON.stringify({ records: [record] }));
    expect(parsed?.visualMemory.exposureMs).toBe(3000);
    expect(parsed?.lastExportAt).toBeNull();
    expect(parsed?.staircases).toEqual({});
  });
});

describe('export reminder', () => {
  const now = new Date('2026-02-01T00:00:00.000Z');

  it('stays quiet when there is nothing to lose', () => {
    expect(exportIsOverdue(emptyStore(), now)).toBe(false);
  });

  it('prompts when a record has never been exported', () => {
    expect(exportIsOverdue(docWith([record]), now)).toBe(true);
  });

  it('prompts only after fourteen days', () => {
    const recent: StoreDoc = {
      ...docWith([record]),
      lastExportAt: '2026-01-25T00:00:00.000Z',
    };
    expect(exportIsOverdue(recent, now)).toBe(false);

    const stale: StoreDoc = {
      ...docWith([record]),
      lastExportAt: '2026-01-10T00:00:00.000Z',
    };
    expect(exportIsOverdue(stale, now)).toBe(true);
  });

  it('prompts if the stored date is unreadable', () => {
    const broken: StoreDoc = { ...docWith([record]), lastExportAt: 'whenever' };
    expect(exportIsOverdue(broken, now)).toBe(true);
  });
});
