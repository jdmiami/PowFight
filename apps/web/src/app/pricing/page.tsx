import { env } from '@/lib/env';
import { formatUsd } from '@/lib/money';
import { Page } from '@/components/Page';
import { Playbill } from '@/components/Playbill';
import { StorytellerButton } from './StorytellerButton';

export const metadata = { title: 'Pricing' };

export default function Pricing() {
  const prize = env.entryFeeCents - env.houseFeeCents;
  return (
    <Page back={{ href: '/me', label: 'Me' }} title="The deal">
      <Playbill kicker="Admission" title="Prices">
        <dl className="space-y-4">
          <div className="flex items-baseline justify-between gap-4"><dt><span className="t-cue text-paper-ink">Audience</span><p className="text-sm text-paper-ink-2 mt-0.5">Watch, scroll, vote. One vote per role.</p></dt><dd className="t-num text-paper-ink text-xl">Free</dd></div>
          <div className="hairline pt-4 flex items-baseline justify-between gap-4"><dt><span className="t-cue text-paper-ink">Actor</span><p className="text-sm text-paper-ink-2 mt-0.5">Per audition. {formatUsd(prize)} goes to that role’s pool, {formatUsd(env.houseFeeCents)} to the house. Most votes wins the role and the whole pool. 18+ for cash prizes.</p></dt><dd className="t-num text-paper-ink text-xl">{formatUsd(env.entryFeeCents)}</dd></div>
          <div className="hairline pt-4 flex items-baseline justify-between gap-4"><dt><span className="t-cue text-paper-ink">Storyteller</span><p className="text-sm text-paper-ink-2 mt-0.5">Upload scripts, stage productions, set audition windows, assign stand-ins.</p></dt><dd className="t-num text-paper-ink text-xl">{formatUsd(env.storytellerYearlyCents)}<span className="t-caption text-paper-ink-2">/yr</span></dd></div>
        </dl>
      </Playbill>
      <p className="text-sm text-ink-2 mt-5">Ten entrants for a role means a {formatUsd(prize * 10)} prize. Winners are paid after the play premieres, which is also when their lines are due.</p>
      <div className="mt-5 mb-4"><StorytellerButton /></div>
    </Page>
  );
}
