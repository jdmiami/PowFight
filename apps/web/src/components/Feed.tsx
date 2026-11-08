'use client';
/**
 * The product: a vertical feed of audition reels. Full-bleed on phones; on tablets and desktops
 * each reel sits on a centred 9:16 stage with the action rail beside it and a blurred backdrop.
 * The visible reel autoplays (muted until the viewer unmutes once); double-tap or the ticket votes.
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { FeedItem } from '@/lib/types';
import { Ticket } from './Ticket';
import { IconMute, IconSound, IconShare, IconChevron } from './icons';
import { formatUsd } from '@/lib/money';
import { modernize } from '@playhouse/script-parser';

export interface FeedReel extends FeedItem { mediaUrls: string[]; posterUrl?: string | null }

interface Props { reels: FeedReel[]; myVotes: Record<string, string>; viewerId?: string | null; signedIn: boolean; header?: React.ReactNode }

function closesIn(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'closed';
  const d = Math.floor(ms / 86400_000), h = Math.floor((ms % 86400_000) / 3600_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export function Feed({ reels, myVotes, viewerId, signedIn, header }: Props) {
  const [muted, setMuted] = useState(true);
  const [now] = useState(() => Date.now());
  const [picks, setPicks] = useState(myVotes);
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(reels.map((r) => [r.audition.id, r.audition.voteCount])));
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current; if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-reel-index]'));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const v = e.target.querySelector<HTMLVideoElement>('video[data-reel]');
        if (e.intersectionRatio > 0.6) { setActive(Number((e.target as HTMLElement).dataset.reelIndex)); v?.play().catch(() => {}); } else v?.pause();
      }
    }, { root, threshold: [0, 0.6, 1] });
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [reels.length]);

  if (reels.length === 0) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-8 text-center gap-4">
        {header}
        <p className="t-title">The house is quiet.</p>
        <p className="text-ink-2">No one has auditioned yet. Be the first face on the marquee.</p>
        <Link href="/plays" className="btn-spot">Find a role</Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="feed relative bg-house">
      {reels.map((r, idx) => {
        const a = r.audition;
        const isMine = viewerId === a.actorId;
        const pickId = picks[r.character.id];
        const voted = pickId === a.id;
        const open = r.production.status === 'casting' && new Date(r.production.auditionsCloseAt).getTime() > now;
        const pickName = pickId && pickId !== a.id ? reels.find((x) => x.audition.id === pickId)?.audition.actor.displayName : undefined;
        const prize = (r.production.entryFeeCents - r.production.houseFeeCents) * r.entrants;
        const rail = (cls: string) => (
          <div className={cls}>
            <button onClick={() => setMuted((m) => !m)} className="h-11 w-11 rounded-full pill-glass pill flex items-center justify-center" aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <IconMute /> : <IconSound />}</button>
            <ShareReel id={a.id} name={a.actor.displayName} role={r.character.name} />
            {!isMine ? (
              <div id={`ticket-${a.id}`}>
                <Ticket auditionId={a.id} count={counts[a.id] ?? a.voteCount} voted={voted} currentPickId={pickId} currentPickName={pickName} open={open} signedIn={signedIn} compact
                  onChange={(n) => { setCounts((c) => ({ ...c, [a.id]: n.count })); setPicks((p) => { const q = { ...p }; if (n.voted) q[r.character.id] = a.id; else if (q[r.character.id] === a.id) delete q[r.character.id]; return q; }); }} />
              </div>
            ) : <span className="pill pill-glass"><span className="t-num">{counts[a.id]}</span> votes · yours</span>}
            <Link href={`/plays/${r.production.slug}/roles/${r.character.key}`} className="pill pill-glass">All {r.character.name}s <IconChevron width={14} height={14} /></Link>
          </div>
        );
        return (
          <section key={a.id} data-reel-index={idx} className="relative" aria-label={`${a.actor.displayName} as ${r.character.name}`}>
            {r.posterUrl && <div className="stage-backdrop hidden md:block" style={{ backgroundImage: `url(${r.posterUrl})` }} aria-hidden />}
            <div className="stage">
              <ReelVideo src={r.mediaUrls} poster={r.posterUrl ?? undefined} muted={muted} near={Math.abs(idx - active) <= 1} first={idx === 0} onDoubleTap={() => document.getElementById(`ticket-${a.id}`)?.querySelector('button')?.click()} />
              <div className="absolute top-0 inset-x-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:pt-4 bg-gradient-to-b from-house/80 to-transparent">
                {idx === 0 && <div className="lg:hidden">{header}</div>}
                <div className="mt-3 lg:mt-0 flex gap-1" aria-label="Standings">
                  {Array.from({ length: Math.min(r.entrants, 12) }, (_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i + 1 === r.rank ? 'bg-spot' : 'bg-ink-1/30'}`} />)}
                </div>
                <p className="t-caption text-ink-2 mt-1.5 tabular-nums">#{r.rank} of {r.entrants} for {r.character.name} · {open ? `closes in ${closesIn(r.production.auditionsCloseAt, now)}` : 'voting closed'}</p>
              </div>
              <div className="absolute left-4 right-[9.5rem] md:right-4 bottom-[calc(var(--nav-h)+1.25rem)] md:bottom-5 text-ink-1">
                <Link href={`/plays/${r.production.slug}/roles/${r.character.key}`} className="t-cue text-spot">{r.character.name} · {r.production.title}</Link>
                <p className="poster-name mt-1">{a.actor.displayName} <span className="t-caption not-italic text-ink-2 font-ui">@{a.actor.handle}</span></p>
                {r.caption && <p className="t-script text-ink-1/90 mt-2 line-clamp-3" style={{ fontSize: '1.0625rem', lineHeight: '1.5rem' }}>“{modernize(r.caption).replace(/\n/g, ' ')}”</p>}
                <div className="mt-3 flex items-center gap-2 text-ink-2 t-caption">
                  <span className="pill pill-glass">{r.entrants} auditioning</span>
                  {prize > 0 && <span className="pill pill-glass"><span className="t-num text-ink-1">{formatUsd(prize)}</span> pool</span>}
                </div>
              </div>
              {rail('rail-inside absolute right-3 bottom-[calc(var(--nav-h)+1.25rem)] flex flex-col items-end gap-3')}
            </div>
            {rail('rail-outside relative z-[1] flex-col items-center gap-3 self-end pb-6')}
          </section>
        );
      })}
    </div>
  );
}

function ReelVideo({ src, poster, muted, near, first, onDoubleTap }: { src: string[]; poster?: string; muted: boolean; near: boolean; first: boolean; onDoubleTap: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const lastTap = useRef(0);
  useEffect(() => { const v = ref.current; if (v && src[i] && i > 0) { v.load(); v.play().catch(() => {}); } }, [i, src]);
  if (src.length === 0) return <div className="absolute inset-0 curtain-panel flex items-center justify-center"><span className="poster-big">?</span></div>;
  return (
    <video ref={ref} data-reel src={src[i]} poster={poster} muted={muted} playsInline loop={src.length === 1} autoPlay={first} preload={first || near ? 'auto' : 'metadata'}
      onEnded={() => setI((k) => (k + 1) % src.length)}
      onClick={() => { const t = Date.now(); if (t - lastTap.current < 300) onDoubleTap(); else { const v = ref.current; if (v) (v.paused ? v.play().catch(() => {}) : v.pause()); } lastTap.current = t; }}
      className="absolute inset-0 h-full w-full object-cover" />
  );
}

function ShareReel({ id, name, role }: { id: string; name: string; role: string }) {
  return (
    <button onClick={async () => { const url = `${location.origin}/auditions/${id}`; const text = `Vote for ${name} as ${role} on The Play House`; try { if (navigator.share) await navigator.share({ title: text, text, url }); else await navigator.clipboard.writeText(`${text} ${url}`); } catch {} }}
      className="h-11 w-11 rounded-full pill-glass pill flex items-center justify-center" aria-label="Share"><IconShare /></button>
  );
}
