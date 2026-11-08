import Link from 'next/link';
import { IconBack } from './icons';

/** Standard scrolling page shell: 390px-first, 16px gutter, room for the nav. */
export function Page({ children, back, title, className = '' }: { children: React.ReactNode; back?: { href: string; label: string }; title?: string; className?: string }) {
  return (
    <main className={`flex-1 w-full max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto px-4 md:px-8 pt-3 lg:pt-8 safe-bottom ${className}`}>
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-ink-2 -ml-1 py-2"><IconBack width={18} height={18} /> {back.label}</Link>
      )}
      {title && <h1 className="t-title mt-1 mb-4">{title}</h1>}
      {children}
      <footer className="mt-12 pt-5 border-t border-line t-caption text-ink-3 flex flex-wrap gap-x-3 gap-y-1"><span>Free to watch and vote · $12 to audition</span><Link href="/how-it-works" className="text-ink-2">How it works</Link><Link href="/pricing" className="text-ink-2">Pricing</Link></footer>
    </main>
  );
}
