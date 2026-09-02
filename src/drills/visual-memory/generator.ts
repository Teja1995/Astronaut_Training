import type { Rng } from '../../lib/rng';
import { gridSizeForCells } from '../../lib/defaults';

export interface VisualMemoryTrial {
  size: number;
  /** Filled cell indices, row-major, ascending. */
  filled: number[];
}

export function generateTrial(rng: Rng, cells: number): VisualMemoryTrial {
  const size = gridSizeForCells(cells);
  const total = size * size;
  const count = Math.min(cells, total);
  const filled = rng.shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, count);
  filled.sort((a, b) => a - b);
  return { size, filled };
}
