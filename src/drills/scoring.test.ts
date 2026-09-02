import { describe, expect, it } from 'vitest';
import { makeRng } from '../lib/rng';

import * as digitSpan from './digit-span/scoring';
import { generateTrial as genDigitSpan } from './digit-span/generator';
import * as runningSpan from './running-span/scoring';
import {
  generateTrial as genRunningSpan,
  MAX_STREAM,
  MIN_STREAM,
} from './running-span/generator';
import * as visual from './visual-memory/scoring';
import { generateTrial as genVisual } from './visual-memory/generator';
import * as arithmetic from './arithmetic/scoring';
import { generateTrial as genArithmetic } from './arithmetic/generator';
import * as heading from './heading/scoring';
import {
  format,
  generateTrial as genHeading,
  normalise,
  reciprocal,
  turn,
} from './heading/generator';
import * as rotation from './rotation/scoring';
import { generateTrial as genRotation } from './rotation/generator';
import { canonical, isChiral, mirror, type Vec3 } from './rotation/geometry';
import * as attitude from './attitude/scoring';
import {
  answerFor,
  bucketFor,
  generateTrial as genAttitude,
} from './attitude/generator';

const rng = (s = 'test') => makeRng(s);

describe('digit span backwards', () => {
  it('scores the reversed sequence and nothing else', () => {
    const trial = { digits: [3, 1, 4, 9] };
    expect(digitSpan.score(trial, [9, 4, 1, 3])).toBe(true);
    expect(digitSpan.score(trial, [3, 1, 4, 9])).toBe(false);
    expect(digitSpan.score(trial, [9, 4, 1])).toBe(false);
    expect(digitSpan.score(trial, [9, 4, 1, 3, 3])).toBe(false);
  });

  it('generates the requested span with no adjacent repeats', () => {
    for (let i = 0; i < 50; i++) {
      const t = genDigitSpan(rng('d' + i), 7);
      expect(t.digits).toHaveLength(7);
      t.digits.forEach((d, j) => {
        if (j > 0) expect(d).not.toBe(t.digits[j - 1]);
      });
    }
  });
});

describe('running memory span', () => {
  it('scores the last n in presentation order', () => {
    const trial = { stream: [1, 2, 3, 4, 5, 6], n: 3 };
    expect(runningSpan.score(trial, [4, 5, 6])).toBe(true);
    expect(runningSpan.score(trial, [6, 5, 4])).toBe(false);
  });

  it('randomises stream length within range and always exceeds n', () => {
    const lengths = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const t = genRunningSpan(rng('r' + i), 5);
      expect(t.stream.length).toBeGreaterThan(t.n);
      expect(t.stream.length).toBeGreaterThanOrEqual(MIN_STREAM);
      expect(t.stream.length).toBeLessThanOrEqual(MAX_STREAM);
      lengths.add(t.stream.length);
    }
    // Unpredictable length is the construct; a constant length would break it.
    expect(lengths.size).toBeGreaterThan(5);
  });

  it('never lets n exceed the stream even at the top of the staircase', () => {
    const t = genRunningSpan(rng('edge'), 10);
    expect(t.stream.length).toBeGreaterThanOrEqual(12);
  });
});

describe('visual memory capacity', () => {
  it('scores the exact cell set, order-independent', () => {
    const trial = { size: 4, filled: [0, 5, 9] };
    expect(visual.score(trial, [9, 0, 5])).toBe(true);
    expect(visual.score(trial, [0, 5])).toBe(false);
    expect(visual.score(trial, [0, 5, 9, 10])).toBe(false);
    expect(visual.score(trial, [0, 5, 5])).toBe(false);
  });

  it('places the requested number of distinct cells inside the grid', () => {
    for (const cells of [6, 9, 12, 18]) {
      const t = genVisual(rng('v' + cells), cells);
      expect(new Set(t.filled).size).toBe(cells);
      expect(Math.max(...t.filled)).toBeLessThan(t.size * t.size);
      expect(Math.min(...t.filled)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('mental arithmetic', () => {
  it('accepts only the exact integer', () => {
    const trial = { category: 'multiply' as const, prompt: '12 x 12', answer: 144 };
    expect(arithmetic.score(trial, '144')).toBe(true);
    expect(arithmetic.score(trial, ' 144 ')).toBe(true);
    expect(arithmetic.score(trial, '145')).toBe(false);
    expect(arithmetic.score(trial, '')).toBe(false);
    expect(arithmetic.score(trial, 'abc')).toBe(false);
  });

  it('only ever asks for whole numbers', () => {
    for (let i = 0; i < 500; i++) {
      const t = genArithmetic(rng('a' + i));
      expect(Number.isInteger(t.answer)).toBe(true);
      expect(t.answer).toBeGreaterThan(0);
      expect(t.prompt).not.toBe('');
    }
  });
});

describe('heading arithmetic', () => {
  it('wraps at 360 with north as 360', () => {
    expect(normalise(0)).toBe(360);
    expect(normalise(360)).toBe(360);
    expect(normalise(361)).toBe(1);
    expect(normalise(-10)).toBe(350);
    expect(format(5)).toBe('005');
    expect(format(360)).toBe('360');
  });

  it('computes reciprocals across the wrap', () => {
    expect(reciprocal(90)).toBe(270);
    expect(reciprocal(350)).toBe(170);
    expect(reciprocal(10)).toBe(190);
    expect(reciprocal(180)).toBe(360);
    expect(reciprocal(360)).toBe(180);
  });

  it('takes the shortest turn and signs it right-positive', () => {
    expect(turn(350, 10)).toBe(20);
    expect(turn(10, 350)).toBe(-20);
    expect(turn(90, 180)).toBe(90);
    expect(turn(180, 90)).toBe(-90);
  });

  it('accepts 000 and 360 as the same reciprocal', () => {
    const trial = {
      kind: 'reciprocal' as const,
      heading: 180,
      prompt: '',
      answer: 360,
    };
    expect(heading.score(trial, '360')).toBe(true);
    expect(heading.score(trial, '000')).toBe(true);
    expect(heading.score(trial, '0')).toBe(true);
    expect(heading.score(trial, '180')).toBe(false);
  });

  it('scores turn direction on the letter', () => {
    const trial = {
      kind: 'turn-direction' as const,
      heading: 350,
      target: 10,
      prompt: '',
      answer: 'R' as const,
    };
    expect(heading.score(trial, 'r')).toBe(true);
    expect(heading.score(trial, 'L')).toBe(false);
    expect(heading.score(trial, '')).toBe(false);
  });

  it('never asks a turn with no defined direction', () => {
    for (let i = 0; i < 500; i++) {
      const t = genHeading(rng('h' + i));
      if (t.kind === 'reciprocal') continue;
      const delta = turn(t.heading, t.target!);
      expect(delta).not.toBe(0);
      expect(Math.abs(delta)).not.toBe(180);
    }
  });

  it('weights trials toward the wrap', () => {
    let nearNorth = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const h = genHeading(rng('w' + i)).heading;
      if (h <= 25 || h >= 335) nearNorth++;
    }
    // A uniform draw would give about 14 per cent.
    expect(nearNorth / n).toBeGreaterThan(0.3);
  });
});

describe('mental rotation', () => {
  it('scores the mirrored judgement', () => {
    const base = {
      cubes: [],
      other: [],
      rotA: { x: 0, y: 0, z: 0 },
      rotB: { x: 0, y: 0, z: 0 },
    };
    expect(rotation.score({ ...base, mirrored: true }, 'mirrored')).toBe(true);
    expect(rotation.score({ ...base, mirrored: true }, 'same')).toBe(false);
    expect(rotation.score({ ...base, mirrored: false }, 'same')).toBe(true);
  });

  it('treats rotations of a shape as the same shape', () => {
    const l: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [2, 1, 0],
    ];
    const rotated: Vec3[] = l.map(([x, y, z]) => [-y, x, z]);
    expect(canonical(l)).toBe(canonical(rotated));
  });

  it('detects an achiral shape', () => {
    // A straight bar is its own mirror image.
    const bar: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ];
    expect(isChiral(bar)).toBe(false);
    // A shape that turns out of its own plane is not.
    const z: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ];
    expect(isChiral(z)).toBe(true);
  });

  it('only generates chiral figures, so every trial is answerable', () => {
    for (let i = 0; i < 100; i++) {
      const t = genRotation(rng('m' + i));
      expect(isChiral(t.cubes)).toBe(true);
      expect(t.cubes.length).toBeGreaterThanOrEqual(6);
      const want = t.mirrored ? canonical(mirror(t.cubes)) : canonical(t.cubes);
      expect(canonical(t.other)).toBe(want);
      if (t.mirrored) expect(canonical(t.other)).not.toBe(canonical(t.cubes));
    }
  });
});

describe('attitude interpretation', () => {
  it('requires all three parts', () => {
    const trial = { bank: 25, pitch: -8 };
    const right = answerFor(trial);
    expect(right).toEqual({ direction: 'R', bucket: 'medium', pitch: 'down' });
    expect(attitude.score(trial, right)).toBe(true);
    expect(attitude.score(trial, { ...right, pitch: 'up' })).toBe(false);
    expect(attitude.score(trial, { ...right, bucket: 'steep' })).toBe(false);
    expect(attitude.score(trial, { direction: 'R' })).toBe(false);
  });

  it('buckets bank magnitude at the stated edges', () => {
    expect(bucketFor(14)).toBe('shallow');
    expect(bucketFor(15)).toBe('medium');
    expect(bucketFor(35)).toBe('medium');
    expect(bucketFor(36)).toBe('steep');
  });

  it('never generates a value near a bucket edge or near level', () => {
    for (let i = 0; i < 500; i++) {
      const t = genAttitude(rng('at' + i));
      const mag = Math.abs(t.bank);
      expect(mag).toBeGreaterThanOrEqual(5);
      expect(Math.abs(mag - 15)).toBeGreaterThanOrEqual(3);
      expect(Math.abs(mag - 35)).toBeGreaterThanOrEqual(5);
      expect(Math.abs(t.pitch)).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('seeded generation', () => {
  it('reproduces any trial from its seed', () => {
    expect(genArithmetic(rng('seed-1'))).toEqual(genArithmetic(rng('seed-1')));
    expect(genRotation(rng('seed-1'))).toEqual(genRotation(rng('seed-1')));
    expect(genHeading(rng('seed-1'))).toEqual(genHeading(rng('seed-1')));
    expect(genArithmetic(rng('seed-1'))).not.toEqual(genArithmetic(rng('seed-2')));
  });
});
