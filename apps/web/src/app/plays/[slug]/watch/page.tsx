import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/data';
import { formatUsd } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getData();
  const found = await data.getProductionBySlug(slug);
  if (!found) notFound();
  const { production, script } = found;
  const cast = await data.getCast(production.id);
  const byChar = new Map(cast.map((c) => [c.characterId, c]));
  return (
    <div className="space-y-5">
      <Link href={`/plays/${slug}`} className="text-sm text-muted">← {production.title}</Link>
      <h1 className="display text-3xl">{production.title}</h1>
      {production.finalVideoUrl ? (
        <video src={production.finalVideoUrl} poster={production.finalPosterUrl ?? undefined} controls playsInline className="w-full rounded-2xl border border-line aspect-[9/16] bg-black" />
      ) : (
        <div className="card p-6 text-center curtain">
          <p className="display text-2xl">Curtain&apos;s still down</p>
          <p className="text-sm text-muted mt-2">Status: {production.status.replace('_', ' ')}. The play premieres here as soon as every line is filmed and stitched.</p>
        </div>
      )}
      <section>
        <h2 className="text-xl mb-2">Cast</h2>
        <ul className="divide-y divide-line card">
          {script.characters.map((c) => {
            const m = byChar.get(c.id);
            return <li key={c.id} className="flex justify-between px-4 py-2 text-sm"><span>{c.name}</span><span className="text-muted">{m ? `${m.actor.displayName}${m.prizeCents ? ` · ${formatUsd(m.prizeCents)}` : ''}` : '—'}</span></li>;
          })}
        </ul>
      </section>
    </div>
  );
}
