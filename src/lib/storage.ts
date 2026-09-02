import { emptyStore } from './defaults';
import { DRILL_IDS, STORE_VERSION, type DrillRecord, type StoreDoc } from './types';

export const STORE_KEY = 'astronaut-training/v1';
/**
 * Shadow copy. Written and verified before the main key is touched, so an
 * interrupted or failed write can never leave a truncated history behind.
 */
const SHADOW_KEY = 'astronaut-training/v1.shadow';

export const EXPORT_REMINDER_DAYS = 14;

function isRecord(v: unknown): v is DrillRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r['drill'] === 'string' &&
    (DRILL_IDS as readonly string[]).includes(r['drill']) &&
    typeof r['timestamp'] === 'string' &&
    typeof r['seed'] === 'string' &&
    typeof r['level'] === 'number' &&
    typeof r['score'] === 'number' &&
    typeof r['trials'] === 'number'
  );
}

/** Accepts anything shaped like a store; drops rows that are not records. */
export function parseStore(raw: string): StoreDoc | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as Partial<StoreDoc>;
  if (!Array.isArray(p.records)) return null;

  const base = emptyStore();
  return {
    version: typeof p.version === 'number' ? p.version : STORE_VERSION,
    records: p.records.filter(isRecord),
    staircases: typeof p.staircases === 'object' && p.staircases !== null ? p.staircases : {},
    visualMemory: { ...base.visualMemory, ...(p.visualMemory ?? {}) },
    lastExportAt: typeof p.lastExportAt === 'string' ? p.lastExportAt : null,
  };
}

export function loadStore(): StoreDoc {
  let main: StoreDoc | null = null;
  let shadow: StoreDoc | null = null;
  try {
    const rawMain = localStorage.getItem(STORE_KEY);
    if (rawMain) main = parseStore(rawMain);
    const rawShadow = localStorage.getItem(SHADOW_KEY);
    if (rawShadow) shadow = parseStore(rawShadow);
  } catch {
    // Storage unavailable (private mode, blocked cookies). Run stateless.
    return emptyStore();
  }

  // A shadow survives only when the main write did not land. Whichever holds
  // more history wins; history is append-only, so this cannot lose rows.
  if (shadow && (!main || shadow.records.length > main.records.length)) return shadow;
  return main ?? emptyStore();
}

export class StorageWriteError extends Error {}

/**
 * Write the whole document. Serialise first, verify the string round-trips,
 * stage it in the shadow key, then commit. A failure at any point leaves the
 * previous document intact.
 */
export function saveStore(doc: StoreDoc): void {
  const serialised = JSON.stringify(doc);
  const check = parseStore(serialised);
  if (!check || check.records.length !== doc.records.length) {
    throw new StorageWriteError('refusing to write a document that will not read back');
  }
  try {
    localStorage.setItem(SHADOW_KEY, serialised);
    localStorage.setItem(STORE_KEY, serialised);
    localStorage.removeItem(SHADOW_KEY);
  } catch (err) {
    throw new StorageWriteError(
      err instanceof Error ? err.message : 'localStorage rejected the write',
    );
  }
}

export function daysSinceExport(doc: StoreDoc, now = new Date()): number | null {
  if (!doc.lastExportAt) return doc.records.length > 0 ? Infinity : null;
  const then = Date.parse(doc.lastExportAt);
  if (Number.isNaN(then)) return Infinity;
  return (now.getTime() - then) / 86_400_000;
}

export function exportIsOverdue(doc: StoreDoc, now = new Date()): boolean {
  const days = daysSinceExport(doc, now);
  return days !== null && days > EXPORT_REMINDER_DAYS;
}
