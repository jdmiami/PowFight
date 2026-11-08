import Link from 'next/link';
import { env } from '@/lib/env';
import { formatUsd } from '@/lib/money';

export const metadata = { title: 'How it works' };

export default function HowItWorks() {
  const steps = [
    ['A play goes up', 'A Storyteller uploads a script (Shakespeare, a public-domain classic, or their own). We split it into characters and lines.'],
    ['Auditions open', `Pick a role. Pay ${formatUsd(env.entryFeeCents)}. Record the role's sides, a few key lines, with your front camera. Submit your reel.`],
    ['The audience votes', 'Everyone can scroll the auditions for each role and vote for their favorite. One vote per role, change it anytime before close.'],
    ['Casting', `When auditions close, the top-voted actor wins each role and the prize pool: ${formatUsd(env.entryFeeCents - env.houseFeeCents)} from every entrant for that role.`],
    ['Filming', 'The cast films every line of their role, selfie-style, line by line. Progress saves as you go.'],
    ['Premiere', 'We stitch every clip in script order with title cards for scenes and stage directions, and the whole play premieres on the marquee.'],
  ];
  return (
    <div className="space-y-5">
      <h1 className="display text-3xl">How it works</h1>
      <ol className="space-y-3">
        {steps.map(([t, d], i) => <li key={t} className="card p-4 flex gap-3"><span className="display text-3xl text-gold leading-none">{i + 1}</span><div><h2 className="font-semibold">{t}</h2><p className="text-sm text-muted">{d}</p></div></li>)}
      </ol>
      <Link href="/plays" className="btn-gold w-full">Find a role</Link>
    </div>
  );
}
