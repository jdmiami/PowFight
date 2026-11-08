import Link from 'next/link';
import type { Audition } from '@/lib/types';
import { VoteButton } from './VoteButton';

export function AuditionCard({ a, roleName, voted, canVote, rank }: { a: Audition; roleName: string; voted: boolean; canVote: boolean; rank?: number }) {
  return (
    <article className="card overflow-hidden">
      <Link href={`/auditions/${a.id}`} className="block relative aspect-[9/12] bg-bg-2">
        {a.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 curtain flex items-center justify-center">
            <span className="display text-5xl text-gold/80">{a.actor.displayName.slice(0, 1)}</span>
          </div>
        )}
        {rank !== undefined && <span className="absolute top-2 left-2 pill bg-black/60">#{rank}</span>}
        {a.status === 'won' && <span className="absolute top-2 right-2 pill bg-gold text-black">Cast ✓</span>}
        <span className="absolute bottom-2 left-2 right-2 text-sm font-semibold drop-shadow">{a.actor.displayName} <span className="text-muted font-normal">as {roleName}</span></span>
      </Link>
      <div className="flex items-center justify-between p-3">
        <span className="text-xs text-muted">@{a.actor.handle}</span>
        <VoteButton auditionId={a.id} count={a.voteCount} voted={voted} disabled={!canVote} />
      </div>
    </article>
  );
}
