import { notFound, redirect } from 'next/navigation';
import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { FilmFlow } from './FilmFlow';
import { Page } from '@/components/Page';

export const dynamic = 'force-dynamic';

export default async function FilmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/plays/${slug}/film`);
  const data = await getData();
  const found = await data.getProductionBySlug(slug);
  if (!found) notFound();
  const [items, cast] = await Promise.all([data.myLinesToFilm(found.production.id, user.id), data.getCast(found.production.id)]);
  const prize = cast.filter((c) => c.actorId === user.id).reduce((s, c) => s + c.prizeCents, 0);
  const roles = [...new Set(items.map((t) => t.character.name))];
  return (
    <Page back={{ href: `/plays/${slug}`, label: found.production.title }}>
      <p className="t-label text-ink-3">Filming</p>
      <h1 className="t-display mb-1">{roles.join(' & ') || 'Not cast'}</h1>
      {items.length === 0 ? <p className="text-ink-2">You’re not in this cast.</p> : (
        <>
          <p className="text-sm text-ink-2 mb-5">{items.length} lines across {new Set(items.map((t) => t.line.sceneIdx)).size} scene{new Set(items.map((t) => t.line.sceneIdx)).size === 1 ? '' : 's'}. Your scene partner’s cue shows on the prompter so you’re answering someone.</p>
          <FilmFlow productionId={found.production.id} items={items} prizeCents={prize} />
        </>
      )}
    </Page>
  );
}
