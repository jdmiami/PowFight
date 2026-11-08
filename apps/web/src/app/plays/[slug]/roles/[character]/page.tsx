import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { formatUsd, prizeForRole } from '@/lib/money';
import { Page } from '@/components/Page';
import { Sides } from '@/components/Sides';
import { PosterFrame } from '@/components/PosterFrame';
import { clipUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

function closes(iso: string) {
  const ms = new Date(iso).getTime() - Date.now(); if (ms <= 0) return 'closed';
  const d = Math.floor(ms / 86400_000), h = Math.floor((ms % 86400_000) / 3600_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export default async function RolePage({ params }: { params: Promise<{ slug: string; character: string }> }) {
  const { slug, character: key } = await params;
  const data = await getData();
  const found = await data.getProductionBySlug(slug);
  if (!found) notFound();
  const { production } = found;
  const role = await data.getRole(production.id, key);
  if (!role) notFound();
  const user = await currentUser();
  const [auditions, myVotes, cast] = await Promise.all([data.listAuditions(production.id, role.character.id), user ? data.getMyVotes(production.id, user.id) : Promise.resolve({} as Record<string, string>), data.getCast(production.id)]);
  const myPick = myVotes[role.character.id];
  const mine = user ? auditions.find((a) => a.actorId === user.id) : undefined;
  const open = production.status === 'casting' && new Date(production.auditionsCloseAt) > new Date();
  const pool = prizeForRole({ entrants: auditions.length, entryFeeCents: production.entryFeeCents, houseFeeCents: production.houseFeeCents });
  const member = cast.find((c) => c.characterId === role.character.id);
  const withPosters = await Promise.all(auditions.map(async (a) => ({ ...a, posterUrl: a.posterUrl ?? null, mediaUrl: a.stitchedUrl ?? null })));
  const hero = withPosters[0];
  const pickName = myPick ? auditions.find((a) => a.id === myPick)?.actor.displayName : undefined;
  void clipUrl;

  return (
    <Page back={{ href: `/plays/${slug}`, label: production.title }} className="!px-0">
      <header className="relative overflow-hidden -mt-2 md:rounded-3xl md:border md:border-line">
        {hero?.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 blur-xl scale-125" />
        ) : <div className="absolute inset-0 curtain-panel opacity-70 flex items-end overflow-hidden"><span className="poster-big -mb-5 -ml-2">{role.character.name}</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-house via-house/50 to-transparent" />
        <div className="relative px-4 md:px-8 pt-8 pb-6 md:pb-8 lg:pr-72">
          <p className="t-label text-ink-2">{production.title}</p>
          <h1 className="t-display mt-1">{role.character.name}</h1>
          <p className="t-caption text-ink-2 mt-2 tabular-nums">{role.character.lineCount} lines · {auditions.length} auditioning{auditions.length > 0 ? ` · ${formatUsd(pool.winnerCents)} pool` : ''}{open ? ` · closes in ${closes(production.auditionsCloseAt)}` : ''}</p>
        </div>
      </header>

      <div className="px-4 md:px-8 lg:px-0 lg:mt-6 lg:grid lg:grid-cols-[1fr_400px] lg:gap-8 lg:items-start lg:space-y-0 space-y-6">
        {/* Status states */}
        {member && <div className="card p-4 lg:col-span-2 lg:order-0"><p className="t-label text-spot mb-1">Cast</p><p className="t-title-sm">{member.actor.displayName} plays {role.character.name}</p>{member.prizeCents > 0 && <p className="text-sm text-ink-2 mt-1">Won {formatUsd(member.prizeCents)} from {auditions.length} entrant{auditions.length === 1 ? '' : 's'}.</p>}</div>}
        {mine && mine.status === 'lost' && member && <div className="card p-4 text-sm text-ink-2">{role.character.name} went to {member.actor.displayName} ({auditions[0]?.voteCount} to {mine.voteCount}). Your reel stays on your profile.</div>}

        {/* Reels first */}
        <section className="lg:order-1">
          <h2 className="t-label text-ink-3 mb-3">{auditions.length === 0 ? 'No auditions yet' : open ? 'Auditions · vote for one' : 'Auditions'}</h2>
          {auditions.length === 0 ? (
            <div className="poster w-1/2 mx-auto flex items-end p-4"><div className="poster-shade" /><p className="relative z-[3] text-ink-1 text-sm">Be the first {role.character.name}. Uncontested roles win automatically.</p></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3">
              {withPosters.map((a, i) => (
                <div key={a.id} className="rise" style={{ ['--i' as string]: i }}><PosterFrame a={a} roleName={role.character.name} rank={i + 1}
                  vote={{ voted: myPick === a.id, currentPickId: myPick, currentPickName: pickName, open, signedIn: Boolean(user), isMine: user?.id === a.actorId }} /></div>
              ))}
            </div>
          )}
          {open && <p className="t-caption text-ink-3 mt-3">One vote per role. Change it any time before close. You can’t vote for yourself.</p>}
        </section>

        {/* Sides on paper + CTA */}
        <div className="lg:order-2 lg:sticky lg:top-8 space-y-4">
        {open && !mine && (
          <Link href={`/plays/${slug}/roles/${key}/audition`} className="btn-spot w-full hidden lg:flex">Try the sides free <span className="opacity-70 font-normal">· enter for {formatUsd(production.entryFeeCents)}</span></Link>
        )}
        <Sides sides={role.sides} characterName={role.character.name} note={`Every entrant performs these ${role.sides.length} lines, so votes compare like with like.`} />

        {/* CTA */}
        {open && !mine && (
          <div className="sticky bottom-0 lg:hidden z-30 -mx-4 px-4 pt-8 pb-[calc(var(--nav-h)+0.75rem)] shelf">
            <Link href={`/plays/${slug}/roles/${key}/audition`} className="btn-spot w-full shadow-[0_12px_32px_-8px_rgba(255,178,36,.45)]">Try the sides free <span className="opacity-70 font-normal">· enter for {formatUsd(production.entryFeeCents)}</span></Link>
          </div>
        )}
        {mine && <Link href={`/auditions/${mine.id}`} className="btn-ghost w-full">Your audition{mine.status === 'draft' ? ' · finish recording' : mine.status === 'pending_payment' ? ' · finish entry' : ''}</Link>}
        {!open && !mine && !member && <p className="t-caption text-ink-3 text-center">Auditions for this role are closed.</p>}
        </div>
      </div>
    </Page>
  );
}
