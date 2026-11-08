import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { VoteButton } from '@/components/VoteButton';
import { clipUrl } from '@/lib/storage';
import { ResumeRecording } from './ResumeRecording';

export const dynamic = 'force-dynamic';

export default async function AuditionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData();
  const a = await data.getAudition(id);
  if (!a) notFound();
  const user = await currentUser();
  const [board, productions] = await Promise.all([data.getRoleBoard(a.productionId), data.listProductions()]);
  const production = productions.find((p) => p.id === a.productionId);
  const role = board.find((r) => r.character.id === a.characterId);
  const myVotes = user ? await data.getMyVotes(a.productionId, user.id) : {};
  const isMine = user?.id === a.actorId;
  const open = production?.status === 'casting' && new Date(production.auditionsCloseAt) > new Date();
  const clipsWithUrls = await Promise.all(a.clips.map(async (c) => ({ ...c, url: c.url ?? (await clipUrl(c.storagePath)) ?? undefined })));
  const missing = a.sides.filter((s) => !a.clips.some((c) => c.lineId === s.id));

  return (
    <div className="space-y-5">
      {production && role && <Link href={`/plays/${production.slug}/roles/${role.character.key}`} className="text-sm text-muted">← {role.character.name} in {production.title}</Link>}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="display text-3xl">{a.actor.displayName}</h1>
          <p className="text-muted text-sm">@{a.actor.handle} as {role?.character.name} · {a.status}</p>
        </div>
        {!isMine && <VoteButton auditionId={a.id} count={a.voteCount} voted={myVotes[a.characterId] === a.id} disabled={!open || !user} />}
      </header>

      {a.stitchedUrl ? (
        <video src={a.stitchedUrl} poster={a.posterUrl ?? undefined} controls playsInline className="w-full rounded-2xl border border-line aspect-[9/16] bg-black" />
      ) : (
        <div className="space-y-3">
          {a.sides.map((s, i) => {
            const clip = clipsWithUrls.find((c) => c.lineId === s.id);
            return (
              <div key={s.id} className="card p-3">
                <p className="text-xs text-gold mb-1">Side {i + 1}</p>
                <p className="display text-sm whitespace-pre-line mb-2">{s.text}</p>
                {clip?.url ? <video src={clip.url} controls playsInline className="w-full rounded-xl bg-black aspect-[9/16] max-h-[60vh]" />
                  : <p className="text-xs text-muted">{isMine ? 'Not recorded yet.' : 'Reel is being stitched…'}</p>}
              </div>
            );
          })}
        </div>
      )}

      {isMine && (a.status === 'draft' || a.status === 'pending_payment') && (
        <ResumeRecording auditionId={a.id} sides={a.sides} doneLineIds={a.clips.map((c) => c.lineId)} missing={missing.length} pending={a.status === 'pending_payment'} />
      )}
    </div>
  );
}
