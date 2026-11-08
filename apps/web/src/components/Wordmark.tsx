import Link from 'next/link';
import { Bulbs } from './Bulbs';

export function Wordmark({ chase = false }: { chase?: boolean }) {
  return (
    <Link href="/" className="inline-flex flex-col items-center gap-1.5">
      <Bulbs count={14} chase={chase} />
      <span className="t-title-sm text-ink-1" style={{ letterSpacing: '-0.01em' }}>The Play House</span>
    </Link>
  );
}
