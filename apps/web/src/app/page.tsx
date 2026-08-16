import { FlowField } from '@/components/FlowField';

// Nothing on this page is simulation output.

const LINKS = [
  { href: '/what-if', label: 'What if — 180 scenarios' },
  { href: '/what-if/build', label: 'Build your own' },
  { href: '/scenarios', label: 'Run a timeline' },
  { href: '/map', label: 'Map' },
  { href: '/diff', label: 'Compare runs' },
  { href: '/inspector', label: 'Inspect a number' },
] as const;

export default function Home() {
  return (
    <main>
      <section className="relative isolate overflow-hidden border-b border-rule">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-plane" />
        <FlowField className="absolute inset-0 -z-10 size-full" />
        <div aria-hidden="true" className="graticule absolute inset-0 -z-10" />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_58%_86%_at_12%_52%,var(--plane)_38%,transparent_78%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-plane via-transparent to-plane"
        />

        <div className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
          <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-5xl">
            Five thousand years of history. Change one thing and watch it happen
            differently.
          </h1>
          <p className="mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-ink-secondary">
            Genesis runs every country on the map from 3000 BC to AD 2100 — farming,
            plague, trade, war, dynasties, ideas. Move one number and the next five
            thousand years take a different course. Both timelines run side by side so
            you can see exactly what your change cost.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 rounded border border-rule px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-colors hover:bg-surface"
              >
                {link.label} →
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-2xl font-semibold tracking-[-0.01em] text-ink">
          What you can actually do with it
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Run the whole span</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              177 countries, one year per tick, 3000 BC to AD 2100. Eighteen systems
              each, all of them feeding each other, and the last seventy-five years are
              the model running ahead of the record.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Break something on purpose</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              180 of them ready to run: Rome never falls, the Black Death never comes,
              Carthage beats Hannibal's enemies, Germany wins the first war. Or exhaust
              the soil and close the roads yourself.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Send it to someone</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Every run is a link that carries the whole world with it. Anyone who opens
              it gets the same five thousand years, down to the last digit.
            </p>
          </div>
        </div>
      </section>

    </main>
  );
}
