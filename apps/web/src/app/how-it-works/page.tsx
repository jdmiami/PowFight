import Link from 'next/link';
import { env } from '@/lib/env';
import { formatUsd } from '@/lib/money';
import { Page } from '@/components/Page';

export const metadata = { title: 'How it works' };

export default function HowItWorks() {
  const steps = [
    ['A play goes up', 'A Storyteller uploads a script. We split it into characters, lines and audition sides.'],
    ['Auditions open', `Pick a role. Try the sides free. Enter for ${formatUsd(env.entryFeeCents)} and submit your reel.`],
    ['The audience votes', 'Everyone scrolls the reels and votes for the best actor in each role. One vote per role, free.'],
    ['Casting', `When auditions close, the top-voted actor wins each role and its pool: ${formatUsd(env.entryFeeCents - env.houseFeeCents)} from every entrant.`],
    ['Filming', 'The cast films every line of their role, scene by scene, with their partner’s cue on screen.'],
    ['Premiere', 'We stitch every clip in order with cards for scenes and stage directions. The play goes up on the marquee.'],
  ];
  return (
    <Page back={{ href: '/me', label: 'Me' }} title="How it works">
      <ol className="space-y-2">
        {steps.map(([t, d], i) => (
          <li key={t} className={`card p-4 flex gap-4 ${i === 1 ? 'spotlight' : ''}`}>
            <span className="t-title text-ink-3 w-8 shrink-0 tabular-nums">{i + 1}</span>
            <div><h2 className="font-semibold">{t}</h2><p className="text-sm text-ink-2 mt-0.5">{d}</p></div>
          </li>
        ))}
      </ol>
      <Link href="/record" className="btn-spot w-full mt-6">Find a role</Link>
    </Page>
  );
}
