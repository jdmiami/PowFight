import Link from 'next/link';
import { Page } from '@/components/Page';
export default function NotFound() {
  return <Page><div className="text-center pt-24 space-y-4"><p className="t-display">Exit, pursued by a bear.</p><p className="text-ink-2">That page isn’t in the script.</p><Link href="/" className="btn-spot">Back to the auditions</Link></div></Page>;
}
