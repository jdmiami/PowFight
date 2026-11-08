import { notFound } from 'next/navigation';
import { getData } from '@/lib/data';
import { Page } from '@/components/Page';
import { Playbill } from '@/components/Playbill';
import { Bulbs } from '@/components/Bulbs';
import { formatUsd } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getData();
  const found = await data.getProductionBySlug(slug);
  if (!found) notFound();
  const { production, script } = found;
  const [cast, progress, board] = await Promise.all([data.getCast(production.id), data.productionProgress(production.id), data.getRoleBoard(production.id)]);
  const byChar = new Map(cast.map((c) => [c.characterId, c]));
  const faces = board.filter((r) => r.leader?.posterUrl).slice(0, 6);
  const pct = progress.total ? Math.round((progress.filmed / progress.total) * 100) : 0;
  const live = production.status === 'premiered' && production.finalVideoUrl;

  return (
    <Page back={{ href: `/plays/${slug}`, label: production.title }} className="!px-0">
      {live ? (
        <video src={production.finalVideoUrl!} poster={production.finalPosterUrl ?? undefined} controls playsInline className="w-full aspect-[9/16] max-h-[80vh] bg-black" />
      ) : (
        <div className="relative mx-4 poster" style={{ aspectRatio: '3 / 4' }}>
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 opacity-60">
            {faces.map((r) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={r.character.id} src={r.leader!.posterUrl!} alt="" className="h-full w-full object-cover" />
            ))}
          </div>
          <div className="poster-shade" style={{ background: 'linear-gradient(180deg, rgba(9,7,10,.2), rgba(9,7,10,.92))' }} />
          <div className="absolute inset-x-6 bottom-6 z-[3] text-center">
            <Bulbs count={16} />
            <p className="t-label text-ink-2 mt-3">The Play House presents</p>
            <h1 className="t-display mt-1">{production.title}</h1>
            <p className="t-caption text-ink-2 mt-3 tabular-nums">Curtain up when every line is filmed · {pct}%</p>
            <div className="mt-2 h-1.5 rounded-full bg-ink-1/15 overflow-hidden"><div className="h-full bg-spot" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
      )}
      <div className="px-4 mt-6">
        <Playbill kicker="Dramatis personae" title={production.title}>
          <ul>
            {script.characters.map((c, i) => {
              const m = byChar.get(c.id);
              return (
                <li key={c.id} className={`flex items-center gap-3 py-2 ${i ? 'hairline' : ''}`}>
                  <span className="t-cue text-paper-ink flex-1">{c.name}</span>
                  <span className="t-script text-paper-ink" style={{ fontSize: '1rem', lineHeight: '1.25rem' }}>{m ? m.actor.displayName : <span className="text-paper-ink-2 italic">to be cast</span>}</span>
                  {m && m.prizeCents > 0 && <span className="t-caption text-paper-ink-2 tabular-nums">{formatUsd(m.prizeCents)}</span>}
                </li>
              );
            })}
          </ul>
        </Playbill>
      </div>
    </Page>
  );
}
