import Link from 'next/link';
import { currentUser, isStoryteller } from '@/lib/auth';
import { getData } from '@/lib/data';
import { formatUsd } from '@/lib/money';
import { isDemo } from '@/lib/env';
import { SignOut } from './SignOut';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Me' };

export default async function Me() {
  const user = await currentUser();
  if (!user) return <div className="space-y-4"><h1 className="display text-3xl">Your dressing room</h1><Link href="/login" className="btn-gold">Sign in</Link></div>;
  const data = await getData();
  const [auditions, balance] = await Promise.all([data.myAuditions(user.id), data.myBalanceCents(user.id)]);
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-card border border-line flex items-center justify-center display text-2xl text-gold">{user.displayName.slice(0, 1)}</div>
        <div><h1 className="display text-2xl">{user.displayName}</h1><p className="text-sm text-muted">@{user.handle} · {isStoryteller(user) ? 'Storyteller' : 'Actor'}</p></div>
      </header>
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-xs text-muted">Winnings</p><p className="display text-2xl text-gold">{formatUsd(Math.max(0, balance))}</p></div>
        <div className="card p-4"><p className="text-xs text-muted">Auditions</p><p className="display text-2xl">{auditions.length}</p></div>
      </div>
      {balance > 0 && <p className="text-xs text-muted">Payouts are sent with Stripe Connect after the play premieres. {isDemo ? '(Demo: no real money.)' : 'Set up payouts in Settings.'}</p>}
      <section>
        <h2 className="text-xl mb-2">My auditions</h2>
        {auditions.length === 0 && <p className="text-muted text-sm">None yet. <Link href="/plays" className="text-gold underline">Find a role</Link>.</p>}
        <ul className="space-y-2">
          {auditions.map((a) => (
            <li key={a.id}><Link href={`/auditions/${a.id}`} className="card flex justify-between p-3 hover:bg-card-2">
              <span>{a.characterName} <span className="text-muted text-sm">in {a.productionTitle}</span></span>
              <span className="pill">{a.status === 'won' ? '🏆 cast' : a.status} · {a.voteCount}★</span>
            </Link></li>
          ))}
        </ul>
      </section>
      {!isStoryteller(user) && <Link href="/pricing" className="btn-ghost w-full">Stage your own plays →</Link>}
      {!isDemo && <SignOut />}
    </div>
  );
}
