import Link from 'next/link';
export default function NotFound() {
  return <div className="text-center pt-20 space-y-3"><p className="display text-5xl">Exit, pursued by a bear.</p><p className="text-muted">That page isn&apos;t in the script.</p><Link href="/" className="btn-gold">Back to the marquee</Link></div>;
}
