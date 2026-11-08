'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBook, IconClapper, IconTicket, IconUser } from './icons';

const items = [
  { href: '/', label: 'Auditions', Icon: IconTicket, match: (p: string) => p === '/' || p.startsWith('/auditions') },
  { href: '/plays', label: 'Plays', Icon: IconBook, match: (p: string) => p.startsWith('/plays') },
  { href: '/record', label: 'Record', Icon: IconClapper, match: (p: string) => p.startsWith('/record'), raised: true },
  { href: '/me', label: 'Me', Icon: IconUser, match: (p: string) => p.startsWith('/me') || p.startsWith('/upload') || p.startsWith('/pricing') || p.startsWith('/login') },
];

export function Nav() {
  const path = usePathname();
  // Full-screen takeovers (recorder) hide the bar via a body class; keep markup simple.
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-pit/92 backdrop-blur border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Primary">
      <ul className="mx-auto max-w-xl grid grid-cols-4" style={{ height: 'var(--nav-h)' }}>
        {items.map(({ href, label, Icon, match, raised }) => {
          const active = match(path);
          return (
            <li key={href} className="relative">
              <Link href={href} aria-current={active ? 'page' : undefined} className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? 'text-spot' : 'text-ink-3'}`}>
                {active && <span className="bulb absolute top-1.5" style={{ opacity: 1 }} />}
                {raised ? (
                  <span className={`-mt-5 flex h-12 w-12 items-center justify-center rounded-full border ${active ? 'border-spot bg-spot text-black' : 'border-line bg-surface text-ink-1'}`}><Icon /></span>
                ) : <Icon />}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
