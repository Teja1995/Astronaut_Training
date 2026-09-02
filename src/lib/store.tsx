import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { defaultStaircase, defaultVisualMemory } from './defaults';
import { nextVisualMemoryExposure } from './session';
import { loadStore, saveStore, StorageWriteError } from './storage';
import type { StaircaseState } from './staircase';
import type { DrillId, DrillRecord, StoreDoc } from './types';

interface StoreApi {
  doc: StoreDoc;
  /** Set once a write has failed; the run is still usable but unrecorded. */
  writeError: string | null;
  staircaseFor(drill: DrillId): StaircaseState;
  /** Append one completed run and its carried staircase, then persist at once. */
  commitRun(
    record: DrillRecord,
    staircase?: StaircaseState,
  ): void;
  markExported(): void;
  replaceDoc(doc: StoreDoc): void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [doc, setDoc] = useState<StoreDoc>(() => loadStore());
  const [writeError, setWriteError] = useState<string | null>(null);
  // The document of record, so two commits in one tick cannot lose a run.
  const latest = useRef(doc);
  latest.current = doc;

  const persist = useCallback((next: StoreDoc) => {
    try {
      saveStore(next);
      setWriteError(null);
    } catch (err) {
      setWriteError(
        err instanceof StorageWriteError
          ? err.message
          : 'this run could not be saved',
      );
    }
    latest.current = next;
    setDoc(next);
  }, []);

  const staircaseFor = useCallback((drill: DrillId): StaircaseState => {
    return latest.current.staircases[drill] ?? defaultStaircase(drill);
  }, []);

  const commitRun = useCallback(
    (record: DrillRecord, staircase?: StaircaseState) => {
      const base = latest.current;
      const next: StoreDoc = {
        ...base,
        // Append only. History is never rewritten in place.
        records: [...base.records, record],
        staircases: staircase
          ? { ...base.staircases, [record.drill]: staircase }
          : base.staircases,
        visualMemory: base.visualMemory,
      };
      if (record.drill === 'visual-memory') {
        next.visualMemory = nextVisualMemoryExposure(
          base.visualMemory,
          next.records,
        );
      }
      persist(next);
    },
    [persist],
  );

  const markExported = useCallback(() => {
    persist({ ...latest.current, lastExportAt: new Date().toISOString() });
  }, [persist]);

  const replaceDoc = useCallback(
    (incoming: StoreDoc) => {
      persist({
        ...incoming,
        visualMemory: incoming.visualMemory ?? defaultVisualMemory(),
      });
    },
    [persist],
  );

  const api = useMemo<StoreApi>(
    () => ({ doc, writeError, staircaseFor, commitRun, markExported, replaceDoc }),
    [doc, writeError, staircaseFor, commitRun, markExported, replaceDoc],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}
