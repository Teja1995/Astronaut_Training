import { centre, type Vec3 } from './geometry';
import type { Euler } from './generator';

const CUBE = 34;

/**
 * Faces are shaded by orientation only, so the two figures are read from form
 * rather than from any incidental difference in colouring.
 */
const FACES: { transform: string; background: string }[] = [
  { transform: 'translateZ(' + CUBE / 2 + 'px)', background: '#DCE0DE' },
  { transform: 'rotateY(180deg) translateZ(' + CUBE / 2 + 'px)', background: '#DCE0DE' },
  { transform: 'rotateY(90deg) translateZ(' + CUBE / 2 + 'px)', background: '#B4BCBE' },
  { transform: 'rotateY(-90deg) translateZ(' + CUBE / 2 + 'px)', background: '#B4BCBE' },
  { transform: 'rotateX(90deg) translateZ(' + CUBE / 2 + 'px)', background: '#F2F3F1' },
  { transform: 'rotateX(-90deg) translateZ(' + CUBE / 2 + 'px)', background: '#9AA3A7' },
];

export default function Figure({
  cubes,
  rotation,
}: {
  cubes: readonly Vec3[];
  rotation: Euler;
}) {
  const [cx, cy, cz] = centre(cubes);

  return (
    <div
      className="flex h-64 w-64 items-center justify-center"
      style={{ perspective: '900px' }}
    >
      <div
        className="relative"
        style={{
          transformStyle: 'preserve-3d',
          // A fixed viewing angle, then the figure's own rotation.
          transform:
            'rotateX(-22deg) rotateY(28deg) rotateZ(' +
            rotation.z +
            'deg) rotateY(' +
            rotation.y +
            'deg) rotateX(' +
            rotation.x +
            'deg)',
        }}
      >
        {cubes.map((c, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              transformStyle: 'preserve-3d',
              width: CUBE,
              height: CUBE,
              left: -CUBE / 2,
              top: -CUBE / 2,
              transform:
                'translate3d(' +
                (c[0] - cx) * CUBE +
                'px,' +
                (c[1] - cy) * CUBE +
                'px,' +
                (c[2] - cz) * CUBE +
                'px)',
            }}
          >
            {FACES.map((f, j) => (
              <div
                key={j}
                className="absolute inset-0 border border-graphite"
                style={{ transform: f.transform, background: f.background }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
