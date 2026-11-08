import Link from 'next/link';
import { currentUser, isStoryteller } from '@/lib/auth';
import { getData } from '@/lib/data';
import { formatUsd } from '@/lib/money';
import { isDemo } from '@/lib/env';
import { Page } from '@/components/Page';
import { SignOut } from './SignOut';
import { IconChevron } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Me' };

const statusCopy: Record<string, string> = { pending_payment: 'Finish entry', draft: 'Finish recording', submitted: 'In the running', won: 'Cast', lost: 'Not cast', withdrawn: 'Withdrawn', disqualified: 'Disqualified' };

export default async function Me() {
  const user = await currentUser();
  if (!user) return <Page title="Your dressing room"><p className="text-ink-2 mb-4">Sign in to audition, vote and track your roles.</p><Link href="/login" className="btn-spot w-full">Sign in</Link></Page>;
  const data = await getData();
  const [auditions, balance] = await Promise.all([data.myAuditions(user.id), data.myBalanceCents(user.id)]);
  const won = auditions.filter((a) => a.status === 'won');
  return (
    <Page>
      <header className="flex items-center gap-4 pt-2">
        <div className="h-16 w-16 rounded-full bg-surface border border-line flex items-center justify-center t-title-sm text-ink-2">{user.displayName.slice(0, 1)}</div>
        <div className="min-w-0"><h1 className="t-title truncate">{user.displayName}</h1><p className="t-caption text-ink-2">@{user.handle} · {isStoryteller(user) ? 'Storyteller' : 'Actor'}</p></div>
      </header>
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="card p-3"><p className="t-label text-ink-3">Winnings</p><p className="t-num text-xl mt-1">{formatUsd(Math.max(0, balance))}</p></div>
        <div className="card p-3"><p className="t-label text-ink-3">Roles</p><p className="t-num text-xl mt-1">{won.length}</p></div>
        <div className="card p-3"><p className="t-label text-ink-3">Auditions</p><p className="t-num text-xl mt-1">{auditions.length}</p></div>
      </div>
      {balance > 0 && <p className="t-caption text-ink-3 mt-2">Paid out after the play premieres{isDemo ? ' (demo: no real money)' : ' via Stripe'}.</p>}

      <section className="mt-6">
        <h2 className="t-label text-ink-3 mb-3">My auditions</h2>
        {auditions.length === 0 ? <p className="text-ink-2 text-sm">None yet. <Link href="/record" className="text-spot">Find a role</Link>.</p> : (
          <ul className="card divide-y divide-line">
            {auditions.map((a) => (
              <li key={a.id}><Link href={`/auditions/${a.id}`} className="press flex items-center gap-3 p-3">
                <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-curtain">{a.posterUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />)}</span>
                <span className="flex-1 min-w-0"><span className="block font-semibold">{a.characterName}</span><span className="block text-sm text-ink-2 truncate">{a.productionTitle}</span></span>
                <span className="text-right"><span className={`block t-caption ${a.status === 'won' ? 'text-spot' : a.status === 'draft' || a.status === 'pending_payment' ? 'text-ink-1' : 'text-ink-3'}`}>{statusCopy[a.status]}</span><span className="block t-caption text-ink-3 tabular-nums">{a.voteCount} votes</span></span>
                <IconChevron className="text-ink-3" />
              </Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 space-y-2">
        <Link href="/upload" className="card press flex items-center justify-between p-4"><span><span className="block font-semibold">Stage a play</span><span className="block text-sm text-ink-2">{isStoryteller(user) || isDemo ? 'Upload a script and open casting' : 'Storyteller plan · $20 a year'}</span></span><IconChevron className="text-ink-3" /></Link>
        <Link href="/how-it-works" className="card press flex items-center justify-between p-4"><span className="font-semibold">How it works</span><IconChevron className="text-ink-3" /></Link>
        <Link href="/pricing" className="card press flex items-center justify-between p-4"><span className="font-semibold">Pricing</span><IconChevron className="text-ink-3" /></Link>
      </section>
      {!isDemo && <div className="mt-6"><SignOut /></div>}
    </Page>
  );
}
