import { env } from '@/lib/env';
import { formatUsd } from '@/lib/money';
import { StorytellerButton } from './StorytellerButton';

export const metadata = { title: 'Pricing' };

export default function Pricing() {
  const prize = env.entryFeeCents - env.houseFeeCents;
  return (
    <div className="space-y-4">
      <h1 className="display text-3xl">Pricing</h1>
      <div className="card p-5">
        <h2 className="text-xl">Audience</h2>
        <p className="display text-4xl text-gold my-2">Free</p>
        <p className="text-sm text-muted">Watch every play, scroll every audition, vote for the best actor in each role.</p>
      </div>
      <div className="card p-5">
        <h2 className="text-xl">Actor</h2>
        <p className="display text-4xl text-gold my-2">{formatUsd(env.entryFeeCents)} <span className="text-base text-muted">per audition</span></p>
        <ul className="text-sm text-muted space-y-1">
          <li>{formatUsd(prize)} of every entry goes to that role&apos;s prize pool; {formatUsd(env.houseFeeCents)} goes to the house.</li>
          <li>Most votes when auditions close wins the role and the whole pool (10 entrants = {formatUsd(prize * 10)}).</li>
          <li>Winners record every line of their role and star in the finished play.</li>
          <li>Payouts via Stripe once the play premieres. 18+ to compete for cash.</li>
        </ul>
      </div>
      <div className="card p-5 border-gold/40">
        <h2 className="text-xl">Storyteller</h2>
        <p className="display text-4xl text-gold my-2">{formatUsd(env.storytellerYearlyCents)} <span className="text-base text-muted">per year</span></p>
        <ul className="text-sm text-muted space-y-1 mb-4">
          <li>Upload unlimited scripts and stage productions.</li>
          <li>Set audition windows, pick sides, assign stand-ins for empty roles.</li>
          <li>Your name on the marquee of every play you stage.</li>
        </ul>
        <StorytellerButton />
      </div>
    </div>
  );
}
