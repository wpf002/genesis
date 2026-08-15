import type { Metadata } from 'next';
import { ModeBadge } from '@/components/ModeBadge';
import './globals.css';

export const metadata: Metadata = {
  title: 'Genesis',
  description:
    'A civilization simulation engine with two operating modes and one enforced boundary between them.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-50 border-b border-rule bg-plane/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm font-medium tracking-[0.24em] text-ink">
                GENESIS
              </span>
              <span className="label hidden sm:inline">Phase 8 · 18 subsystems</span>
            </div>
            {/* Permanent. Never conditionally rendered away. */}
            <ModeBadge mode={null} />
          </div>
        </header>

        {children}

        <footer className="border-t border-rule">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              Determinism and the provenance gate run in CI on every push. A red gate
              blocks merge.
            </span>
            <a
              className="font-mono tracking-[0.08em] underline decoration-rule underline-offset-4 transition-colors hover:text-ink"
              href="https://github.com/wpf002/genesis"
            >
              github.com/wpf002/genesis
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
