import { notFound } from 'next/navigation';
import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { clipUrl } from '@/lib/storage';
import { ReelPlayer } from './ReelPlayer';
import { ResumeRecording } from './ResumeRecording';
import { Page } from '@/components/Page';

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
  if (!production || !role) notFound();
  const myVotes = user ? await data.getMyVotes(a.productionId, user.id) : {};
  const isMine = user?.id === a.actorId;
  const open = production.status === 'casting' && new Date(production.auditionsCloseAt) > new Date();
  const chapters = await Promise.all(a.sides.map(async (line) => { const c = a.clips.find((x) => x.lineId === line.id); return { line, url: c ? (c.url ?? (await clipUrl(c.storagePath)) ?? undefined) : undefined }; }));
  const backHref = `/plays/${production.slug}/roles/${role.character.key}`;

  if (isMine && (a.status === 'draft' || a.status === 'pending_payment')) {
    const missing = a.sides.filter((s) => !a.clips.some((c) => c.lineId === s.id));
    return (
      <Page back={{ href: backHref, label: role.character.name }}>
        <h1 className="t-title mb-2">Your {role.character.name} audition</h1>
        <p className="text-ink-2 text-sm mb-4">{a.status === 'pending_payment' ? 'Entry not completed.' : missing.length ? `${missing.length} of ${a.sides.length} sides left to record.` : 'All sides recorded. Submit when you’re happy.'}</p>
        <ResumeRecording auditionId={a.id} sides={a.sides} doneLineIds={a.clips.map((c) => c.lineId)} missing={missing.length} pending={a.status === 'pending_payment'} productionId={a.productionId} characterId={a.characterId} returnPath={`/auditions/${a.id}`} roleName={role.character.name} />
      </Page>
    );
  }

  return (
    <ReelPlayer auditionId={a.id} actorName={a.actor.displayName} handle={a.actor.handle} roleName={role.character.name} playTitle={production.title} backHref={backHref}
      chapters={chapters} stitchedUrl={a.stitchedUrl} posterUrl={a.posterUrl} voteCount={a.voteCount} voted={myVotes[a.characterId] === a.id} currentPickId={myVotes[a.characterId]} open={open} signedIn={Boolean(user)} isMine={isMine} status={a.status} />
  );
}
