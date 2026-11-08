import Link from 'next/link';
import { getData } from '@/lib/data';
import { Page } from '@/components/Page';
import { Bulbs } from '@/components/Bulbs';
import { clipUrl } from '@/lib/storage';
import { IconChevron } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plays' };

function closes(iso: string) {
  const ms = new Date(iso).getTime() - Date.now(); if (ms <= 0) return 'Closed';
  const d = Math.floor(ms / 86400_000), h = Math.floor((ms % 86400_000) / 3600_000);
  return d > 0 ? `Closes in ${d}d ${h}h` : `Closes in ${h}h`;
}

export default async function Plays() {
  const data = await getData();
  const productions = await data.listProductions();
  const groups = [
    { key: 'premiered', title: 'Now playing', items: productions.filter((p) => p.status === 'premiered') },
    { key: 'casting', title: 'Now casting', items: productions.filter((p) => p.status === 'casting') },
    { key: 'filming', title: 'In rehearsal', items: productions.filter((p) => ['voting_closed', 'filming', 'rendering'].includes(p.status)) },
  ].filter((g) => g.items.length);

  // One face per production for the poster tile.
  const faces = new Map<string, string | null>();
  for (const p of productions) {
    const [top] = await data.listFeed({ productionId: p.id, limit: 1 });
    faces.set(p.id, top ? (top.audition.posterUrl ?? (top.clipPaths[0] ? await clipUrl(top.clipPaths[0]) : null)) : null);
  }

  return (
    <Page>
      <header className="text-center pt-2 pb-5">
        <Bulbs count={18} chase={groups.some((g) => g.key === 'premiered')} />
        <h1 className="t-display mt-2">Plays</h1>
      </header>
      {groups.map((g) => (
        <section key={g.key} className="mb-7">
          <h2 className="t-label text-ink-3 mb-3">{g.title}</h2>
          <div className="space-y-3">
            {g.items.map((p) => {
              const face = faces.get(p.id);
              const href = p.status === 'premiered' ? `/plays/${p.slug}/watch` : `/plays/${p.slug}`;
              return (
                <Link key={p.id} href={href} className="press card flex overflow-hidden">
                  <div className="relative w-24 shrink-0 aspect-[9/16] bg-curtain overflow-hidden">
                    {face ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={face} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : <span className="poster-big absolute -bottom-3 -left-1" style={{ fontSize: '4rem' }}>{p.title.slice(0, 1)}</span>}
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                    <h3 className="t-title-sm truncate">{p.title}</h3>
                    <p className="text-sm text-ink-2 truncate">{p.author ? `by ${p.author}` : p.scriptTitle}</p>
                    <p className={`t-caption mt-2 ${p.status === 'casting' ? 'text-spot' : 'text-ink-3'}`}>{p.status === 'casting' ? closes(p.auditionsCloseAt) : p.status === 'premiered' ? 'Watch now' : 'Cast is filming'}</p>
                  </div>
                  <span className="self-center pr-3 text-ink-3"><IconChevron /></span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      <Link href="/upload" className="card press block p-4 text-center text-ink-2 text-sm">Have a script? <span className="text-ink-1 font-semibold">Stage your own play →</span></Link>
    </Page>
  );
}
