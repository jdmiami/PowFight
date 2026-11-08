import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { AuditionCard } from '@/components/AuditionCard';
import { formatUsd, prizeForRole } from '@/lib/money';
import { Countdown } from '@/components/Countdown';

export const dynamic = 'force-dynamic';

export default async function RolePage({ params }: { params: Promise<{ slug: string; character: string }> }) {
  const { slug, character: key } = await params;
  const data = await getData();
  const found = await data.getProductionBySlug(slug);
  if (!found) notFound();
  const { production } = found;
  const role = await data.getRole(production.id, key);
  if (!role) notFound();
  const user = await currentUser();
  const [auditions, myVotes] = await Promise.all([data.listAuditions(production.id, role.character.id), user ? data.getMyVotes(production.id, user.id) : Promise.resolve({} as Record<string, string>)]);
  const myVote = myVotes[role.character.id];
  const mine = user ? auditions.find((a) => a.actorId === user.id) : undefined;
  const open = production.status === 'casting' && new Date(production.auditionsCloseAt) > new Date();
  const pool = prizeForRole({ entrants: auditions.length, entryFeeCents: production.entryFeeCents, houseFeeCents: production.houseFeeCents });

  return (
    <div className="space-y-6">
      <Link href={`/plays/${slug}`} className="text-sm text-muted">← {production.title}</Link>
      <header>
        <h1 className="display text-4xl">{role.character.name}</h1>
        <p className="text-muted text-sm">{role.character.lineCount} lines in the play · also cued as {role.character.aliases.join(', ')}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {open && <Countdown to={production.auditionsCloseAt} />}
          <span className="pill">{auditions.length} auditioning</span>
          <span className="pill text-gold">Prize so far {formatUsd(pool.winnerCents)}</span>
        </div>
      </header>

      <section className="card p-4">
        <h2 className="text-lg mb-2">The sides <span className="text-muted text-sm font-normal">— every entrant performs these {role.sides.length} lines</span></h2>
        <ol className="space-y-3">
          {role.sides.map((s, i) => <li key={s.id} className="text-sm"><span className="text-gold mr-2">{i + 1}.</span><span className="whitespace-pre-line display">{s.text}</span></li>)}
        </ol>
        {open && !mine && (
          <Link href={`/plays/${slug}/roles/${key}/audition`} className="btn-gold w-full mt-4">Audition for {role.character.name} · {formatUsd(production.entryFeeCents)}</Link>
        )}
        {mine && <Link href={`/auditions/${mine.id}`} className="btn-ghost w-full mt-4">Your audition ({mine.status})</Link>}
        {!open && !mine && <p className="text-xs text-muted mt-3">Auditions for this role are closed.</p>}
      </section>

      <section>
        <h2 className="text-2xl mb-3">Auditions</h2>
        {auditions.length === 0 && <p className="text-muted">No one has auditioned yet.</p>}
        <div className="grid grid-cols-2 gap-3">
          {auditions.map((a, i) => <AuditionCard key={a.id} a={a} roleName={role.character.name} voted={myVote === a.id} canVote={open && !!user && a.actorId !== user.id} rank={i + 1} />)}
        </div>
        <p className="text-xs text-muted mt-3">One vote per role. Voting is free; you can change your pick until auditions close. You can&apos;t vote for yourself.</p>
      </section>
    </div>
  );
}
