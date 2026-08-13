// The three provenance colours are reserved and never reused as chart series.
// Colour is never the only channel: every tag ships with a distinct glyph and
// the word, so it survives CVD, greyscale and forced-colors.
//
// Palette chosen by running the validator, not by eye. Green/amber/red fails
// deuteranopia separation (ΔE 4.1); blue/yellow/magenta passes all-pairs.
// See docs/interface-bar.md.

export type Provenance = 'CALIBRATED' | 'ESTIMATED' | 'INVENTED';

const SPEC: Record<
  Provenance,
  { glyph: string; color: string; gloss: string; ships: string }
> = {
  CALIBRATED: {
    glyph: '◆',
    color: 'var(--prov-calibrated)',
    gloss: 'Fit to historical data via the calibration service.',
    ships: 'Posterior interval, dataset reference',
  },
  ESTIMATED: {
    glyph: '◐',
    color: 'var(--prov-estimated)',
    gloss: 'Taken from published literature.',
    ships: 'Citation',
  },
  INVENTED: {
    glyph: '▲',
    color: 'var(--prov-invented)',
    gloss: 'Chosen because it produces good behaviour.',
    ships: 'Nothing. It is a guess and is labelled as one.',
  },
};

export function ProvenanceTag({ tag }: { tag: Provenance }) {
  const spec = SPEC[tag];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[0.6875rem] tracking-[0.08em]"
      style={{ color: spec.color, borderColor: spec.color }}
    >
      <span aria-hidden="true">{spec.glyph}</span>
      {tag}
    </span>
  );
}

export function ProvenanceCard({ tag }: { tag: Provenance }) {
  const spec = SPEC[tag];
  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded border border-rule bg-surface p-5">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: spec.color }}
      />
      <div className="flex items-baseline gap-2">
        <span aria-hidden="true" style={{ color: spec.color }} className="text-sm">
          {spec.glyph}
        </span>
        <h3
          className="font-mono text-xs tracking-[0.11em]"
          style={{ color: spec.color }}
        >
          {tag}
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-ink-secondary">{spec.gloss}</p>
      <p className="mt-auto border-t border-rule pt-3 text-xs leading-relaxed text-ink-muted">
        <span className="label block pb-1">Ships with</span>
        {spec.ships}
      </p>
    </div>
  );
}

export const PROVENANCE_ORDER: readonly Provenance[] = [
  'CALIBRATED',
  'ESTIMATED',
  'INVENTED',
];
