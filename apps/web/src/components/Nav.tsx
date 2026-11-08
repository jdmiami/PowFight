'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBook, IconClapper, IconTicket, IconUser } from './icons';
import { Bulbs } from './Bulbs';

const items = [
  { href: '/', label: 'Auditions', Icon: IconTicket, match: (p: string) => p === '/' || p.startsWith('/auditions') },
  { href: '/plays', label: 'Plays', Icon: IconBook, match: (p: string) => p.startsWith('/plays') },
  { href: '/record', label: 'Record', Icon: IconClapper, match: (p: string) => p.startsWith('/record'), raised: true },
  { href: '/me', label: 'Me', Icon: IconUser, match: (p: string) => p.startsWith('/me') || p.startsWith('/upload') || p.startsWith('/pricing') || p.startsWith('/login') || p.startsWith('/how-it-works') },
];

/** Bottom tab bar on phones and tablets in portrait; a left sidebar from 1024px up. */
export function Nav() {
  const path = usePathname();
  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-pit/92 backdrop-blur border-t border-line" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Primary">
        <ul className="mx-auto max-w-xl md:max-w-3xl grid grid-cols-4" style={{ height: '4.25rem' }}>
          {items.map(({ href, label, Icon, match, raised }) => {
            const active = match(path);
            return (
              <li key={href} className="relative">
                <Link href={href} aria-current={active ? 'page' : undefined} className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? 'text-spot' : 'text-ink-3'}`}>
                  {active && <span className="bulb absolute top-1.5" style={{ opacity: 1 }} />}
                  {raised ? <span className={`-mt-5 flex h-12 w-12 items-center justify-center rounded-full border ${active ? 'border-spot bg-spot text-black' : 'border-line bg-surface text-ink-1'}`}><Icon /></span> : <Icon />}
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 z-40 flex-col border-r border-line bg-pit/80 backdrop-blur px-5 py-8" aria-label="Primary">
        <Link href="/" className="flex flex-col items-start gap-2">
          <Bulbs count={10} className="justify-start" />
          <span className="t-title-sm">The Play House</span>
        </Link>
        <ul className="mt-10 space-y-1">
          {items.map(({ href, label, Icon, match, raised }) => {
            const active = match(path);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? 'page' : undefined} className={`press flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium ${raised ? 'mt-4 bg-spot text-black hover:brightness-105' : active ? 'bg-surface text-spot' : 'text-ink-2 hover:bg-surface hover:text-ink-1'}`}>
                  <Icon width={22} height={22} /> {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-auto t-caption text-ink-3">Free to watch and vote · $12 to audition</p>
      </aside>
    </>
  );
}
