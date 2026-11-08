'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Marquee', icon: '🎭' },
  { href: '/plays', label: 'Plays', icon: '📜' },
  { href: '/upload', label: 'Stage', icon: '✍️' },
  { href: '/me', label: 'Me', icon: '👤' },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/70" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="mx-auto max-w-xl grid grid-cols-4">
        {items.map((it) => {
          const active = it.href === '/' ? path === '/' : path.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link href={it.href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${active ? 'text-gold' : 'text-muted'}`}>
                <span className="text-xl leading-none" aria-hidden>{it.icon}</span>{it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
