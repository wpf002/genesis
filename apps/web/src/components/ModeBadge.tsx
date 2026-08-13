// Permanent mode indicator (locked invariant #8). SANDBOX carries the hatch,
// which is the same watermark used on exports and survives a screenshot. "No run
// loaded" is its own state and never defaults to either mode.

export type RunMode = 'RIGOR' | 'SANDBOX' | null;

const HATCH =
  'repeating-linear-gradient(45deg, rgba(213,81,129,0.22) 0 4px, transparent 4px 8px)';

export function ModeBadge({ mode }: { mode: RunMode }) {
  if (mode === null) {
    return (
      <span className="inline-flex items-center gap-2 rounded-sm border border-rule px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.11em] text-ink-muted">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-ink-muted" />
        NO RUN LOADED
      </span>
    );
  }

  const isSandbox = mode === 'SANDBOX';
  const color = isSandbox ? 'var(--prov-invented)' : 'var(--prov-calibrated)';

  return (
    <span
      className="inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.11em]"
      style={{
        color,
        borderColor: color,
        ...(isSandbox ? { backgroundImage: HATCH } : {}),
      }}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: color }} />
      {mode}
      {isSandbox && <span className="text-ink-muted">— NOT A RESULT</span>}
    </span>
  );
}
