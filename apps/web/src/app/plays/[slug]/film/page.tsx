import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { FilmFlow } from './FilmFlow';

export const dynamic = 'force-dynamic';

/** Cast members record every line of their role here after winning the audition. */
export default async function FilmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/plays/${slug}/film`);
  const data = await getData();
  const found = await data.getProductionBySlug(slug);
  if (!found) notFound();
  const todo = await data.myLinesToFilm(found.production.id, user.id);
  const remaining = todo.filter((t) => !t.clip);
  return (
    <div className="space-y-4">
      <Link href={`/plays/${slug}`} className="text-sm text-muted">← {found.production.title}</Link>
      <h1 className="display text-3xl">Film your lines</h1>
      {todo.length === 0 ? <p className="text-muted">You&apos;re not in this cast.</p> : (
        <>
          <p className="text-sm text-muted">You play <span className="text-fg">{[...new Set(todo.map((t) => t.character.name))].join(', ')}</span>. {todo.length - remaining.length}/{todo.length} lines filmed. Record them in order; a few at a time is fine, progress is saved.</p>
          <FilmFlow productionId={found.production.id} lines={todo.map((t) => t.line)} doneLineIds={todo.filter((t) => t.clip).map((t) => t.line.id)} />
        </>
      )}
    </div>
  );
}
