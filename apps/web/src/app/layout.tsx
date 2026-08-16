import type { Metadata } from 'next';
import { ModeBadge } from '@/components/ModeBadge';
import './globals.css';

export const metadata: Metadata = {
  title: 'Genesis',
  description:
    'Five thousand years of history across six civilizations. Change one thing and watch it happen differently.',
};

const NAV = [
  { href: '/what-if', label: 'What if' },
  { href: '/what-if/build', label: 'Build' },
  { href: '/scenarios', label: 'Timelines' },
  { href: '/map', label: 'Map' },
  { href: '/diff', label: 'Compare' },
  { href: '/inspector', label: 'Inspect' },
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-50 border-b border-rule bg-plane/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
            <div className="flex items-baseline gap-6">
              <a
                href="/"
                className="font-mono text-sm font-medium tracking-[0.24em] text-ink"
              >
                GENESIS
              </a>
              <nav className="hidden items-baseline gap-5 sm:flex">
                {NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted transition-colors hover:text-ink"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
            {/* Permanent. Never conditionally rendered away. */}
            <ModeBadge mode={null} />
          </div>
        </header>

        {children}

        <footer className="border-t border-rule">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <span>Genesis does not claim Sandbox output means anything.</span>
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
