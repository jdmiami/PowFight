import Link from 'next/link';
import type { Audition } from '@/lib/types';
import { Ticket } from './Ticket';
import { IconPlay } from './icons';

interface Props {
  a: Audition & { posterUrl?: string | null; mediaUrl?: string | null };
  roleName: string;
  rank?: number;
  href?: string;
  vote?: { voted: boolean; currentPickId?: string | null; currentPickName?: string | null; open: boolean; signedIn: boolean; isMine: boolean };
}

/** 9:16 reel card: face first, name in italic display, rank seal, ticket inside the frame. */
export function PosterFrame({ a, roleName, rank, href, vote }: Props) {
  const link = href ?? `/auditions/${a.id}`;
  return (
    <article className="poster">
      <Link href={link} className="absolute inset-0 z-[1]" aria-label={`${a.actor.displayName} as ${roleName}`}>
        {a.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 overflow-hidden flex items-end"><span className="poster-big -mb-4 -ml-2 select-none">{roleName}</span></div>
        )}
        <div className="poster-shade" />
        <span className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-black/40 text-ink-1 flex items-center justify-center backdrop-blur-sm"><IconPlay /></span>
      </Link>
      {rank !== undefined && <span className={`seal absolute top-3 left-3 z-[3] ${rank === 1 ? 'seal-spot' : ''}`}>{rank}</span>}
      {a.status === 'won' && <span className="absolute top-3 right-3 z-[3] pill pill-spot text-[10px] tracking-widest">CAST</span>}
      <div className="absolute inset-x-3 bottom-3 z-[3] flex items-end justify-between gap-2 pointer-events-none">
        <div className="min-w-0">
          <p className="poster-name text-ink-1 truncate">{a.actor.displayName}</p>
          <p className="t-cue text-ink-2 truncate">as {roleName}</p>
        </div>
        {vote && !vote.isMine && (
          <div className="pointer-events-auto shrink-0">
            <Ticket auditionId={a.id} count={a.voteCount} voted={vote.voted} currentPickId={vote.currentPickId} currentPickName={vote.currentPickName} open={vote.open} signedIn={vote.signedIn} compact />
          </div>
        )}
        {vote?.isMine && <span className="pill pill-glass text-[11px]"><span className="t-num">{a.voteCount}</span> votes · yours</span>}
      </div>
    </article>
  );
}
