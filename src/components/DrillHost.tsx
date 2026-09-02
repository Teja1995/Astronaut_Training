import { lazy, Suspense } from 'react';
import type { DrillId } from '../lib/types';
import type { DrillProps } from '../drills/contract';
import { Stage } from './ui';

/** One entry per drill; the session runner needs to know nothing else. */
const MODULES: Record<DrillId, React.LazyExoticComponent<React.FC<DrillProps>>> = {
  'digit-span': lazy(() => import('../drills/digit-span/DigitSpan')),
  'running-span': lazy(() => import('../drills/running-span/RunningSpan')),
  'visual-memory': lazy(() => import('../drills/visual-memory/VisualMemory')),
  arithmetic: lazy(() => import('../drills/arithmetic/Arithmetic')),
  heading: lazy(() => import('../drills/heading/Heading')),
  rotation: lazy(() => import('../drills/rotation/Rotation')),
  attitude: lazy(() => import('../drills/attitude/Attitude')),
};

export default function DrillHost({
  drill,
  ...props
}: DrillProps & { drill: DrillId }) {
  const Component = MODULES[drill];
  return (
    <Suspense fallback={<Stage>{null}</Stage>}>
      <Component {...props} />
    </Suspense>
  );
}
