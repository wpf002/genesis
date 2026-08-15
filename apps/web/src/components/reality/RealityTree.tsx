'use client';

import { formatYear, type CascadeEvent } from '@genesis/replay';

// The reality tree.
//
// One history, then a split, then two. The whole application is an argument
// about that split being clean — pre-divergence state is byte-identical and the
// RNG substreams carry across the branch — so this is the one drawing that has
// to make it obvious.
//
// Horizontal axis is the run, not linear time: a 5,100-year span with a
// divergence in 1347 would otherwise put the interesting part in the last 3% of
// the picture. The scale expands around the divergence deliberately, and says so.

export interface TreeProps {
  readonly firstTick: number;
  readonly lastTick: number;
  readonly divergenceTick: number;
  readonly currentTick: number;
  readonly cascades: readonly CascadeEvent[];
  readonly distance: readonly { tick: number; distance: number }[];
  readonly onSeek: (tick: number) => void;
  readonly title: string;
}

const W = 960;
const H = 190;
const PAD = 56;

/** Half the width for the run up to the divergence, half for everything after. */
function projector(first: number, divergence: number, last: number) {
  const mid = PAD + (W - PAD * 2) * 0.34;
  return (tick: number): number => {
    if (tick <= divergence) {
      const span = Math.max(1, divergence - first);
      return PAD + ((tick - first) / span) * (mid - PAD);
    }
    const span = Math.max(1, last - divergence);
    return mid + ((tick - divergence) / span) * (W - PAD - mid);
  };
}

export function RealityTree({
  firstTick,
  lastTick,
  divergenceTick,
  currentTick,
  cascades,
  distance,
  onSeek,
  title,
}: TreeProps) {
  const x = projector(firstTick, divergenceTick, lastTick);
  const splitX = x(divergenceTick);
  const trunkY = H / 2;

  // The alternate branch bows away from the baseline in proportion to how far
  // the two worlds have actually moved apart. The geometry is the metric.
  const maxDistance = Math.max(0.02, ...distance.map((d) => d.distance));
  const spread = 62;
  const branch = distance
    .filter((d) => d.tick >= divergenceTick)
    .map((d) => `${x(d.tick).toFixed(1)},${(trunkY - (d.distance / maxDistance) * spread).toFixed(1)}`);

  const path = branch.length > 0 ? `M${splitX},${trunkY}L${branch.join('L')}` : '';

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair"
        role="img"
        aria-label={`Reality tree for ${title}`}
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const px = ((event.clientX - box.left) / box.width) * W;
          // Invert the two-segment projection.
          const mid = PAD + (W - PAD * 2) * 0.34;
          const tick =
            px <= mid
              ? firstTick + ((px - PAD) / Math.max(1, mid - PAD)) * (divergenceTick - firstTick)
              : divergenceTick +
                ((px - mid) / Math.max(1, W - PAD - mid)) * (lastTick - divergenceTick);
          onSeek(Math.round(Math.max(firstTick, Math.min(lastTick, tick))));
        }}
      >
        {/* One history */}
        <line
          x1={PAD}
          y1={trunkY}
          x2={splitX}
          y2={trunkY}
          stroke="#e8e6df"
          strokeWidth={2.5}
        />
        <text x={PAD} y={trunkY - 14} fill="#e8e6df" fontSize={10} fontFamily="ui-monospace, monospace">
          ONE HISTORY
        </text>

        {/* Baseline continues straight */}
        <line
          x1={splitX}
          y1={trunkY}
          x2={W - PAD}
          y2={trunkY}
          stroke="var(--ink-muted)"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <text
          x={W - PAD}
          y={trunkY + 18}
          textAnchor="end"
          fill="var(--ink-muted)"
          fontSize={10}
          fontFamily="ui-monospace, monospace"
        >
          BASELINE
        </text>

        {/* The counterfactual, bowing by Reality Distance */}
        <path d={path} fill="none" stroke="#3987e5" strokeWidth={2.5} />
        <text
          x={W - PAD}
          y={trunkY - spread - 8}
          textAnchor="end"
          fill="#3987e5"
          fontSize={10}
          fontFamily="ui-monospace, monospace"
        >
          COUNTERFACTUAL
        </text>

        {/* The split */}
        <line x1={splitX} y1={22} x2={splitX} y2={H - 22} stroke="#d55181" strokeWidth={1.5} />
        <circle cx={splitX} cy={trunkY} r={5} fill="#d55181" />
        <text
          x={splitX + 6}
          y={30}
          fill="#d55181"
          fontSize={10}
          fontFamily="ui-monospace, monospace"
        >
          POINT OF DIVERGENCE · {formatYear(divergenceTick - 3000)}
        </text>

        {/* Cascades: where the model itself accelerated */}
        {cascades.map((event) => (
          <g key={event.tick}>
            <circle cx={x(event.tick)} cy={trunkY - 34} r={3} fill="#c98500" />
            <title>
              {`Cascade ${formatYear(event.year)} — ${event.acceleration.toFixed(1)}x the usual rate, driven by ${event.drivers.join(', ')}`}
            </title>
          </g>
        ))}

        {/* Playhead */}
        <line
          x1={x(currentTick)}
          y1={16}
          x2={x(currentTick)}
          y2={H - 16}
          stroke="var(--ink)"
          strokeWidth={1}
          opacity={0.55}
        />

        <text x={PAD} y={H - 6} fill="var(--ink-muted)" fontSize={9} fontFamily="ui-monospace, monospace">
          {formatYear(firstTick - 3000)}
        </text>
        <text
          x={W - PAD}
          y={H - 6}
          textAnchor="end"
          fill="var(--ink-muted)"
          fontSize={9}
          fontFamily="ui-monospace, monospace"
        >
          {formatYear(lastTick - 3000)}
        </text>
      </svg>
      <figcaption className="mt-1 font-mono text-[10px] text-ink-muted">
        Time is scaled around the divergence, not linear. Branch height is Reality
        Distance. Amber dots are model-detected cascades.
      </figcaption>
    </figure>
  );
}
