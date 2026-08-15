'use client';

import { useMemo, useState } from 'react';
import { CATALOGUE, ERAS, formatYear, type CatalogueEntry } from '@genesis/replay';
import { ModeBadge } from '@/components/ModeBadge';

// Discovery only. Selecting a scenario opens the Reality Explorer at
// /what-if/[id], which is where the two worlds actually run.

const ARCHETYPE_SUPPORT: Record<string, string> = {
  'empire endures': 'structural',
  'empire breaks': 'structural',
  conquest: 'structural',
  'conquest fails': 'structural',
  'plague averted': 'partial',
  'plague worse': 'partial',
  'population spared': 'partial',
  'population collapse': 'partial',
  'technology early': 'partial',
  'technology lost': 'partial',
  'trade opens': 'partial',
  'trade closes': 'partial',
  industrialise: 'partial',
  'agriculture fails': 'partial',
  'public works': 'partial',
  'cultural turn': 'structural',
  'internal strife': 'structural',
};

export default function WhatIf() {
  const [era, setEra] = useState<string>('All');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    return CATALOGUE.filter(
      (entry) =>
        (era === 'All' || entry.era === era) &&
        (text === '' ||
          entry.title.toLowerCase().includes(text) ||
          entry.premise.toLowerCase().includes(text) ||
          entry.lever.archetype.includes(text)),
    );
  }, [era, query]);

  const byArchetype = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of CATALOGUE) {
      counts.set(entry.lever.archetype, (counts.get(entry.lever.archetype) ?? 0) + 1);
    }
    return counts;
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-ink">What if</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            180 ways history could have gone. Pick one and both worlds run from the year
            it split.
          </p>
        </div>
        <ModeBadge mode="SANDBOX" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, premise or archetype"
          className="w-64 rounded border border-rule bg-surface px-3 py-1.5 text-sm text-ink"
        />
        {['All', ...ERAS].map((name) => (
          <button
            key={name}
            onClick={() => setEra(name)}
            className={`rounded border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
              name === era
                ? 'border-ink bg-surface text-ink'
                : 'border-rule text-ink-muted hover:text-ink-secondary'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <p className="label mt-4">
        {shown.length} scenarios · {byArchetype.size} structural archetypes between them
      </p>

      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {shown.map((entry: CatalogueEntry) => (
          <li key={entry.id}>
            <a
              href={`/what-if/${entry.id}`}
              className="block rounded border border-rule p-3 transition-colors hover:bg-surface"
            >
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] tabular-nums text-ink-muted">
                  {String(entry.n).padStart(3, '0')}
                </span>
                <span className="text-sm text-ink">{entry.title}</span>
              </span>
              <span className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[10px] text-ink-muted">
                <span className="text-ink-secondary">{formatYear(entry.year)}</span>
                <span>{entry.era}</span>
                <span>
                  {entry.regions.length === 0 ? 'worldwide' : `${entry.regions.length} countries`}
                </span>
                <span style={{ color: '#3987e5' }}>{entry.lever.archetype}</span>
                <span>
                  engine: {ARCHETYPE_SUPPORT[entry.lever.archetype] ?? 'structural'}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>

      {shown.length === 0 && (
        <p className="mt-8 text-sm text-ink-muted">
          Nothing matches. Try an archetype like “plague averted” or “empire breaks”.
        </p>
      )}
    </main>
  );
}
