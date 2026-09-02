import type { Rng } from '../../lib/rng';

export type ArithmeticCategory =
  | 'multiply'
  | 'running-total'
  | 'percentage'
  | 'conversion'
  | 'std';

export interface ArithmeticTrial {
  category: ArithmeticCategory;
  prompt: string;
  /** Always an exact integer; no tolerance, no rounding rules to remember. */
  answer: number;
  /** Shown after a wrong answer, where the working is not obvious. */
  unit?: string;
}

const CATEGORIES: ArithmeticCategory[] = [
  'multiply',
  'running-total',
  'percentage',
  'conversion',
  'std',
];

function multiply(rng: Rng): ArithmeticTrial {
  const a = rng.int(12, 99);
  const b = rng.int(12, 99);
  return { category: 'multiply', prompt: `${a} × ${b}`, answer: a * b };
}

function runningTotal(rng: Rng): ArithmeticTrial {
  const terms = rng.int(4, 6);
  let total = rng.int(20, 90);
  const parts = [String(total)];
  for (let i = 1; i < terms; i++) {
    const add = rng.bool(0.6);
    const v = rng.int(7, 48);
    if (add) {
      total += v;
      parts.push(`+ ${v}`);
    } else {
      // Keep the running total positive so nothing hinges on sign handling.
      const sub = Math.min(v, total - 1);
      total -= sub;
      parts.push(`− ${sub}`);
    }
  }
  return { category: 'running-total', prompt: parts.join(' '), answer: total };
}

function percentage(rng: Rng): ArithmeticTrial {
  const pct = rng.pick([5, 8, 12, 15, 18, 24, 25, 35, 40, 60, 75]);
  // Base chosen so the answer lands exactly on an integer.
  const g = gcd(pct, 100);
  const unitBase = 100 / g;
  const base = unitBase * rng.int(2, Math.floor(2400 / unitBase));
  return {
    category: 'percentage',
    prompt: `${pct}% of ${base}`,
    answer: (base * pct) / 100,
  };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const CONVERSIONS: { from: string; to: string; factor: number; max: number }[] = [
  { from: 'h', to: 'min', factor: 60, max: 12 },
  { from: 'min', to: 's', factor: 60, max: 15 },
  { from: 'km', to: 'm', factor: 1000, max: 40 },
  { from: 'kg', to: 'g', factor: 1000, max: 25 },
  { from: 'ft', to: 'in', factor: 12, max: 90 },
  { from: 'l', to: 'ml', factor: 1000, max: 30 },
];

function conversion(rng: Rng): ArithmeticTrial {
  const c = rng.pick(CONVERSIONS);
  const v = rng.int(2, c.max);
  return {
    category: 'conversion',
    prompt: `${v} ${c.from} in ${c.to}`,
    answer: v * c.factor,
    unit: c.to,
  };
}

/**
 * Speed, time and distance in aviation units. Doubles as flight-training
 * practice, so the numbers are the ones that come up in the cockpit.
 */
function speedTimeDistance(rng: Rng): ArithmeticTrial {
  const kind = rng.int(0, 3);
  if (kind === 0) {
    // Distance covered. Groundspeeds are multiples of 60 kt: nm per minute.
    const nmPerMin = rng.int(2, 8);
    const minutes = rng.pick([5, 6, 10, 12, 15, 20, 24, 30]);
    return {
      category: 'std',
      prompt: `${nmPerMin * 60} kt for ${minutes} min — distance?`,
      answer: nmPerMin * minutes,
      unit: 'nm',
    };
  }
  if (kind === 1) {
    // Time to run a distance.
    const nmPerMin = rng.int(2, 8);
    const minutes = rng.pick([5, 6, 10, 12, 15, 20, 24, 30]);
    return {
      category: 'std',
      prompt: `${nmPerMin * minutes} nm at ${nmPerMin * 60} kt — minutes?`,
      answer: minutes,
      unit: 'min',
    };
  }
  if (kind === 2) {
    // Time to climb or descend at a given rate.
    const fpm = rng.pick([500, 600, 750, 800, 1000, 1200, 1500]);
    const minutes = rng.int(3, 15);
    return {
      category: 'std',
      prompt: `Climb ${fpm * minutes} ft at ${fpm} fpm — minutes?`,
      answer: minutes,
      unit: 'min',
    };
  }
  // Rate of descent required for a given profile.
  const nmPerMin = rng.int(2, 6);
  const minutes = rng.pick([5, 6, 10, 12, 15]);
  const fpm = rng.pick([400, 500, 600, 700, 800]);
  return {
    category: 'std',
    prompt: `Lose ${fpm * minutes} ft over ${nmPerMin * minutes} nm at ${nmPerMin * 60} kt — fpm?`,
    answer: fpm,
    unit: 'fpm',
  };
}

export function generateTrial(rng: Rng): ArithmeticTrial {
  switch (rng.pick(CATEGORIES)) {
    case 'multiply':
      return multiply(rng);
    case 'running-total':
      return runningTotal(rng);
    case 'percentage':
      return percentage(rng);
    case 'conversion':
      return conversion(rng);
    case 'std':
      return speedTimeDistance(rng);
  }
}
