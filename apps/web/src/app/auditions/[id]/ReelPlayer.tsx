'use client';
/** Full-screen reel: plays the sides in order as chapters, with the ticket on the clip. */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Ticket } from '@/components/Ticket';
import { ShareButton } from '@/components/ShareButton';
import { IconBack, IconMute, IconSound } from '@/components/icons';
import { Verse, useModernSpelling } from '@/components/ScriptText';
import type { Line } from '@/lib/types';

interface Props {
  auditionId: string; actorName: string; handle: string; roleName: string; playTitle: string; backHref: string;
  chapters: { line: Line; url?: string }[]; stitchedUrl?: string | null; posterUrl?: string | null;
  voteCount: number; voted: boolean; currentPickId?: string | null; open: boolean; signedIn: boolean; isMine: boolean; status: string;
}

export function ReelPlayer(p: Props) {
  const [i, setI] = useState(0);
  const [muted, setMuted] = useState(false);
  const [modern] = useModernSpelling();
  const ref = useRef<HTMLVideoElement>(null);
  const urls = p.stitchedUrl ? [p.stitchedUrl] : p.chapters.map((c) => c.url).filter((u): u is string => Boolean(u));
  useEffect(() => { const v = ref.current; if (v) { v.load(); v.play().catch(() => setMuted(true)); } }, [i]);
  const chapter = p.stitchedUrl ? undefined : p.chapters[i];
  return (
    <div className="fixed inset-0 lg:left-64 bg-house z-30 flex flex-col md:items-center md:justify-center" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {p.posterUrl && <div className="stage-backdrop hidden md:block" style={{ backgroundImage: `url(${p.posterUrl})` }} aria-hidden />}
      <div className="relative flex-1 md:flex-none overflow-hidden stage">
        {urls.length ? (
          <video ref={ref} src={urls[i]} poster={p.posterUrl ?? undefined} muted={muted} playsInline autoPlay onEnded={() => setI((k) => (k + 1) % urls.length)} onClick={() => { const v = ref.current; if (v) (v.paused ? v.play() : v.pause()); }} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 curtain-panel flex flex-col items-center justify-center text-center p-8 gap-2"><p className="t-title">No footage yet</p><p className="text-ink-2 text-sm">{p.isMine ? 'Record your sides to put a face here.' : 'This reel is still being recorded.'}</p></div>
        )}
        <div className="absolute top-0 inset-x-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-start justify-between bg-gradient-to-b from-house/80 to-transparent">
          <Link href={p.backHref} className="h-10 w-10 rounded-full pill-glass pill flex items-center justify-center" aria-label="Back"><IconBack /></Link>
          <div className="flex gap-1 flex-1 mx-4 mt-4">
            {urls.map((_, k) => <button key={k} onClick={() => setI(k)} className={`h-1 flex-1 rounded-full ${k === i ? 'bg-spot' : k < i ? 'bg-ink-1/70' : 'bg-ink-1/30'}`} aria-label={`Side ${k + 1}`} />)}
          </div>
          <button onClick={() => setMuted((m) => !m)} className="h-10 w-10 rounded-full pill-glass pill flex items-center justify-center" aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <IconMute /> : <IconSound />}</button>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 pb-6 bg-gradient-to-t from-house/90 to-transparent">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="t-cue text-spot">{p.roleName} · {p.playTitle}</p>
              <p className="poster-name mt-1 truncate">{p.actorName} <span className="t-caption not-italic text-ink-2">@{p.handle}</span></p>
              {chapter && <p className="t-caption text-ink-2 mt-1">Side {i + 1} of {p.chapters.length}</p>}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {!p.isMine ? <Ticket auditionId={p.auditionId} count={p.voteCount} voted={p.voted} currentPickId={p.currentPickId} open={p.open} signedIn={p.signedIn} /> : <span className="pill pill-glass"><span className="t-num">{p.voteCount}</span> votes · yours</span>}
              <ShareButton title={`${p.actorName} as ${p.roleName}`} text={`Vote for ${p.actorName} as ${p.roleName} on The Play House`} path={`/auditions/${p.auditionId}`} className="btn-ghost h-10 min-h-0 text-sm pill-glass border-0" />
            </div>
          </div>
          {chapter && (
            <div className="mt-3 rounded-lg bg-black/45 backdrop-blur px-3 py-2 max-h-28 overflow-auto">
              <Verse text={chapter.line.text} modern={modern} className="text-ink-1" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
