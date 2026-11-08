import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/data';
import { Countdown } from '@/components/Countdown';
import { formatUsd, prizeForRole } from '@/lib/money';
import { currentUser } from '@/lib/auth';
import { CloseCastingButton } from './CloseCastingButton';

export const dynamic = 'force-dynamic';

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getData();
  const found = await data.getProductionBySlug(slug);
  if (!found) notFound();
  const { production, script } = found;
  const [board, cast, user] = await Promise.all([data.getRoleBoard(production.id), data.getCast(production.id), currentUser()]);
  const totalEntrants = board.reduce((s, r) => s + r.entrants, 0);
  const dialogue = script.lines.filter((l) => l.type === 'dialogue').length;
  const castByChar = new Map(cast.map((c) => [c.characterId, c]));

  return (
    <div className="space-y-6">
      <header className="curtain rounded-3xl p-6 border border-line">
        <p className="text-gold text-xs tracking-[0.3em] uppercase">{production.status === 'casting' ? 'Now casting' : production.status.replace('_', ' ')}</p>
        <h1 className="display text-4xl mt-1">{production.title}</h1>
        <p className="text-muted text-sm mt-1">{script.author ? `by ${script.author} · ` : ''}{script.characters.length} roles · {dialogue} lines</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {production.status === 'casting' && <Countdown to={production.auditionsCloseAt} />}
          <span className="pill">{totalEntrants} auditions</span>
          <span className="pill">{formatUsd(production.entryFeeCents)} to enter</span>
        </div>
        <div className="flex gap-2 mt-4">
          {production.status === 'premiered' && <Link href={`/plays/${slug}/watch`} className="btn-gold">▶ Watch the play</Link>}
          {(production.status === 'filming' || production.status === 'rendering') && user && cast.some((c) => c.actorId === user.id) && <Link href={`/plays/${slug}/film`} className="btn-gold">🎬 Film your lines</Link>}
          {production.status === 'casting' && (user?.isAdmin || process.env.NEXT_PUBLIC_SUPABASE_URL === undefined) && <CloseCastingButton productionId={production.id} />}
        </div>
      </header>

      <section>
        <h2 className="text-2xl mb-3">{production.status === 'casting' ? 'Roles' : 'Cast'}</h2>
        <ul className="space-y-2">
          {board.map(({ character, entrants, leader }) => {
            const pool = prizeForRole({ entrants, entryFeeCents: production.entryFeeCents, houseFeeCents: production.houseFeeCents });
            const member = castByChar.get(character.id);
            return (
              <li key={character.id}>
                <Link href={`/plays/${slug}/roles/${character.key}`} className="card flex items-center gap-3 p-3 hover:bg-card-2">
                  <div className="w-12 h-12 rounded-full bg-bg-2 border border-line flex items-center justify-center display text-lg text-gold">{character.name.slice(0, 1)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{character.name} <span className="text-muted text-xs font-normal">{character.lineCount} lines</span></p>
                    {member ? <p className="text-sm text-gold truncate">Cast: {member.actor.displayName}{member.prizeCents ? ` · won ${formatUsd(member.prizeCents)}` : ''}</p>
                      : leader ? <p className="text-sm text-muted truncate">Leading: {leader.actor.displayName} · {leader.voteCount} votes</p>
                      : <p className="text-sm text-muted">No auditions yet. Be first.</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gold">{formatUsd(pool.winnerCents)}</p>
                    <p className="text-[11px] text-muted">{entrants} entered</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="text-xs text-muted">{script.source}{script.license ? ` · ${script.license}` : ''}</p>
    </div>
  );
}
