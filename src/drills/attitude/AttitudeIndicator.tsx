/**
 * Artificial horizon.
 *
 * Geometry, derived rather than eyeballed. The display shows the world in the
 * aircraft's frame: a world direction v maps to screen (v·b_y, v·b_z) for
 * right-wing axis b_y and cockpit-up axis b_z. In a right bank the world's
 * right-hand horizon lands above centre, so the horizon line tilts with its
 * right side up — anticlockwise on screen. SVG rotate() is clockwise positive,
 * hence rotate(-bank). Nose up puts more sky in view, so the card translates
 * down by pitch, along the card's own vertical: rotate() outside, translate()
 * inside.
 *
 * Roll indication follows the transport-aircraft arrangement: a fixed scale and
 * zero index on the case, and a sky pointer carried by the card, which
 * therefore swings toward the raised wing. Classic vacuum instruments put the
 * graduations on the card instead and the pointer appears to move the other
 * way. Check this against a real instrument before treating the drill as done.
 */

const R = 100;
/** Pixels of card travel per degree of pitch. */
const PITCH_K = 3.2;

const SKY = '#C9D3DA';
const GROUND = '#6E7377';
const INK = '#232628';
const PAPER = '#F2F3F1';

/** Standard graduations. 45 and 60 read longer than the 10-degree marks. */
const BANK_MARKS: { deg: number; length: number }[] = [
  { deg: 10, length: 8 },
  { deg: 20, length: 8 },
  { deg: 30, length: 8 },
  { deg: 45, length: 12 },
  { deg: 60, length: 16 },
];

function pitchLadder() {
  const rungs = [];
  for (let deg = -30; deg <= 30; deg += 5) {
    if (deg === 0) continue;
    const major = deg % 10 === 0;
    const halfWidth = major ? 26 : 13;
    const y = -deg * PITCH_K;
    rungs.push(
      <g key={deg}>
        <line
          x1={-halfWidth}
          y1={y}
          x2={halfWidth}
          y2={y}
          stroke={PAPER}
          strokeWidth={1.6}
        />
        {major && (
          <>
            <text
              x={-halfWidth - 5}
              y={y + 3.4}
              fontSize={9}
              fill={PAPER}
              textAnchor="end"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {Math.abs(deg)}
            </text>
            <text
              x={halfWidth + 5}
              y={y + 3.4}
              fontSize={9}
              fill={PAPER}
              textAnchor="start"
              fontFamily="'IBM Plex Mono', monospace"
            >
              {Math.abs(deg)}
            </text>
          </>
        )}
      </g>,
    );
  }
  return rungs;
}

export default function AttitudeIndicator({
  bank,
  pitch,
  size = 300,
}: {
  /** Degrees, positive is right wing down. */
  bank: number;
  /** Degrees, positive is nose up. */
  pitch: number;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-110 -110 220 220"
      role="img"
      aria-label="Attitude indicator"
    >
      <defs>
        <clipPath id="ai-face">
          <circle cx="0" cy="0" r={R} />
        </clipPath>
      </defs>

      {/* The moving card: sky, ground, horizon and pitch ladder. */}
      <g clipPath="url(#ai-face)">
        <g transform={'rotate(' + -bank + ') translate(0,' + pitch * PITCH_K + ')'}>
          <rect x={-400} y={-400} width={800} height={400} fill={SKY} />
          <rect x={-400} y={0} width={800} height={400} fill={GROUND} />
          <line x1={-400} y1={0} x2={400} y2={0} stroke={PAPER} strokeWidth={2} />
          {pitchLadder()}
        </g>

        {/* Sky pointer, carried by the card, read against the fixed scale. */}
        <g transform={'rotate(' + -bank + ')'}>
          <polygon points="0,-84 -6,-73 6,-73" fill={PAPER} stroke={INK} strokeWidth={1} />
        </g>
      </g>

      {/* Fixed case: bank scale and zero index. */}
      <g>
        {BANK_MARKS.flatMap(({ deg, length }) =>
          [-1, 1].map((sign) => (
            <line
              key={sign * deg}
              x1={0}
              y1={-R}
              x2={0}
              y2={-R + length}
              stroke={INK}
              strokeWidth={deg === 60 || deg === 45 ? 2.4 : 1.8}
              transform={'rotate(' + sign * deg + ')'}
            />
          )),
        )}
        <polygon points="0,-100 -7,-88 7,-88" fill={INK} />
        <circle cx="0" cy="0" r={R} fill="none" stroke={INK} strokeWidth={2.5} />
      </g>

      {/* Fixed aircraft symbol: wings and centre. */}
      <g stroke={INK} strokeWidth={4} fill="none">
        <line x1={-58} y1={0} x2={-20} y2={0} />
        <line x1={20} y1={0} x2={58} y2={0} />
        <line x1={-20} y1={0} x2={-20} y2={9} />
        <line x1={20} y1={0} x2={20} y2={9} />
      </g>
      <circle cx="0" cy="0" r={3.5} fill={INK} />
    </svg>
  );
}
