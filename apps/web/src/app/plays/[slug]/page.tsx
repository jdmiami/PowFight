import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { formatUsd, prizeForRole } from '@/lib/money';
import { Page } from '@/components/Page';
import { Bulbs } from '@/components/Bulbs';
import { PosterFrame } from '@/components/PosterFrame';
import { CloseCastingButton } from './CloseCastingButton';
import { clipUrl } from '@/lib/storage';
import { isDemo } from '@/lib/env';
import { IconChevron } from '@/components/icons';

export const dynamic = 'force-dynamic';

function closes(iso: string) {
  const ms = new Date(iso).getTime() - Date.now(); if (ms <= 0) return 'Auditions closed';
  const d = Math.floor(ms / 86400_000), h = Math.floor((ms % 86400_000) / 3600_000);
  return d > 0 ? `Auditions close in ${d}d ${h}h` : `Auditions close in ${h}h`;
}

export default async function PlayPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ admin?: string }> }) {
  const { slug } = await params;
  const admin = (await searchParams).admin !== undefined;
  const data = await getData();
  const found = await data.getProductionBySlug(slug);
  if (!found) notFound();
  const { production, script } = found;
  const [board, cast, user, progress] = await Promise.all([data.getRoleBoard(production.id), data.getCast(production.id), currentUser(), data.productionProgress(production.id)]);
  const myVotes = user ? await data.getMyVotes(production.id, user.id) : {};
  const castByChar = new Map(cast.map((c) => [c.characterId, c]));
  const live = board.filter((r) => r.entrants > 0);
  const empty = board.filter((r) => r.entrants === 0);
  const leaders = await Promise.all(live.map(async (r) => ({ r, poster: r.leader?.posterUrl ?? null, media: r.leader?.stitchedUrl ?? null })));
  const heroFace = leaders.find((l) => l.poster)?.poster;
  const casting = production.status === 'casting';
  const inCast = user ? cast.some((c) => c.actorId === user.id) : false;
  const easiest = [...empty, ...live].sort((a, b) => a.entrants - b.entrants || b.character.lineCount - a.character.lineCount)[0];
  void clipUrl;

  return (
    <Page back={{ href: '/plays', label: 'Plays' }} className="!px-0">
      {/* Poster header */}
      <header className="relative mx-0 overflow-hidden md:rounded-3xl md:border md:border-line">
        {heroFace ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroFace} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 scale-125 blur-xl" />
        ) : <div className="absolute inset-0 curtain-panel opacity-60" />}
        <div className="absolute inset-0 bg-gradient-to-t from-house via-house/60 to-house/20" />
        <div className="relative px-4 md:px-8 pt-8 pb-6">
          <Bulbs count={16} chase={production.status === 'premiered'} className="justify-start" />
          <p className={`t-label mt-3 ${production.status === 'premiered' ? 'text-spot' : 'text-ink-2'}`}>{casting ? 'Now casting' : production.status === 'premiered' ? 'Now playing' : production.status === 'rendering' ? 'Stitching' : 'In rehearsal'}</p>
          <h1 className="t-display mt-1">{production.title}</h1>
          <p className="text-ink-2 text-sm mt-1">{script.author ? `by ${script.author} · ` : ''}{script.characters.length} roles · {script.lines.filter((l) => l.type === 'dialogue').length} lines</p>
          <p className="t-caption text-ink-2 mt-3 tabular-nums">{casting ? closes(production.auditionsCloseAt) : `${progress.filmed} of ${progress.total} lines filmed`} · {live.reduce((s, r) => s + r.entrants, 0)} auditions</p>
          <div className="mt-4 flex gap-2">
            {production.status === 'premiered' && <Link href={`/plays/${slug}/watch`} className="btn-spot">Watch the play</Link>}
            {inCast && ['filming', 'rendering'].includes(production.status) && <Link href={`/plays/${slug}/film`} className="btn-spot">Film your lines</Link>}
            {casting && easiest && <Link href={`/plays/${slug}/roles/${easiest.character.key}`} className="btn-spot">Audition · {formatUsd(production.entryFeeCents)}</Link>}
            {!casting && production.status !== 'premiered' && !inCast && <Link href={`/plays/${slug}/watch`} className="btn-ghost">Cast &amp; progress</Link>}
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 lg:px-0 lg:mt-6 lg:grid lg:grid-cols-[1fr_440px] lg:gap-8 lg:items-start">
        {/* Leading reels */}
        {live.length > 0 && (
          <section className="mt-2 lg:order-2 lg:sticky lg:top-8">
            <div className="flex items-baseline justify-between mb-3"><h2 className="t-label text-ink-3">{casting ? 'Leading each role' : 'The cast'}</h2><Link href="/" className="t-caption text-ink-2">Watch all</Link></div>
            <div className="-mx-4 px-4 md:-mx-8 md:px-8 lg:mx-0 lg:px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] lg:overflow-visible" style={{ scrollbarWidth: 'none' }}>
              {leaders.map(({ r }) => r.leader && (
                <div key={r.character.id} className="w-[46%] md:w-[30%] lg:w-auto shrink-0 snap-start rise" style={{ ['--i' as string]: leaders.indexOf(leaders.find((l) => l.r === r)!) }}>
                  <PosterFrame a={r.leader} roleName={r.character.name} href={`/plays/${slug}/roles/${r.character.key}`}
                    vote={user ? { voted: myVotes[r.character.id] === r.leader.id, currentPickId: myVotes[r.character.id], open: casting, signedIn: true, isMine: r.leader.actorId === user.id } : { voted: false, open: casting, signedIn: false, isMine: false }} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Roles */}
        <section className="mt-6 lg:mt-2 lg:order-1">
          <h2 className="t-label text-ink-3 mb-3">Roles</h2>
          <ul className="card divide-y divide-line">
            {live.map(({ character, entrants, leader }, rowIdx) => {
              const member = castByChar.get(character.id);
              const pool = prizeForRole({ entrants, entryFeeCents: production.entryFeeCents, houseFeeCents: production.houseFeeCents });
              return (
                <li key={character.id} className="rise" style={{ ['--i' as string]: rowIdx }}>
                  <Link href={`/plays/${slug}/roles/${character.key}`} className="press flex items-center gap-3 p-3">
                    <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-curtain">
                      {leader?.posterUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={leader.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{character.name} <span className="t-caption text-ink-3 font-normal">{character.lineCount} lines</span></span>
                      <span className="block text-sm text-ink-2 truncate">{member ? <>Cast: {member.actor.displayName}</> : leader ? <>{leader.actor.displayName} leads · {leader.voteCount} votes</> : null}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block t-num text-ink-1">{formatUsd(member ? member.prizeCents : pool.winnerCents)}</span>
                      <span className="block t-caption text-ink-3">{entrants} entered</span>
                    </span>
                    <IconChevron className="text-ink-3" />
                  </Link>
                </li>
              );
            })}
            {empty.length > 0 && (
              <li>
                <details className="group">
                  <summary className="press flex items-center gap-3 p-3 cursor-pointer list-none">
                    <span className="h-12 w-9 shrink-0 rounded border border-dashed border-line" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold">{empty.length} roles open, no entrants</span>
                      <span className="block text-sm text-ink-2">{casting ? 'Uncontested roles win automatically. Be first.' : 'Filled by stand-ins.'}</span>
                    </span>
                    <IconChevron className="text-ink-3 transition group-open:rotate-90" />
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {empty.map(({ character }) => (
                      <li key={character.id}><Link href={`/plays/${slug}/roles/${character.key}`} className="press flex items-center justify-between px-4 py-2.5 text-sm"><span>{character.name} <span className="t-caption text-ink-3">{character.lineCount} lines</span></span><span className="t-caption text-ink-3">{castByChar.get(character.id)?.actor.displayName ?? 'Be first'}</span></Link></li>
                    ))}
                  </ul>
                </details>
              </li>
            )}
          </ul>
        </section>

        <p className="t-caption text-ink-3 mt-6 lg:order-3 lg:col-span-2">{script.source}{script.license ? ` · ${script.license}` : ''}</p>
        {casting && (user?.isAdmin || (isDemo && admin)) && <div className="mt-6 border-t border-line pt-4 lg:order-4 lg:col-span-2"><p className="t-caption text-ink-3 mb-2">{isDemo ? 'Demo control' : 'Admin'}</p><CloseCastingButton productionId={production.id} /></div>}
      </div>
    </Page>
  );
}
