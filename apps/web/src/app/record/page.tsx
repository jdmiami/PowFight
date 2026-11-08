import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { Page } from '@/components/Page';
import { formatUsd } from '@/lib/money';
import { IconChevron } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Record' };

/** Context-aware Record tab: cast → filming queue; draft → resume; else the easiest roles to win. */
export default async function RecordPage() {
  const data = await getData();
  const user = await currentUser();
  if (!user) redirect('/login?next=/record');
  const [mine, productions] = await Promise.all([data.myAuditions(user.id), data.listProductions()]);
  for (const p of productions.filter((p) => ['filming', 'rendering'].includes(p.status))) {
    const todo = await data.myLinesToFilm(p.id, user.id);
    if (todo.some((t) => !t.clip)) redirect(`/plays/${p.slug}/film`);
  }
  const draft = mine.find((a) => a.status === 'draft' || a.status === 'pending_payment');
  if (draft) redirect(`/auditions/${draft.id}`);

  const casting = productions.filter((p) => p.status === 'casting');
  const roles: { slug: string; title: string; name: string; key: string; entrants: number; lines: number; fee: number }[] = [];
  for (const p of casting) {
    const board = await data.getRoleBoard(p.id);
    for (const r of board) if (!mine.some((m) => m.characterId === r.character.id)) roles.push({ slug: p.slug, title: p.title, name: r.character.name, key: r.character.key, entrants: r.entrants, lines: r.character.lineCount, fee: p.entryFeeCents });
  }
  roles.sort((a, b) => a.entrants - b.entrants || b.lines - a.lines);

  return (
    <Page title="Take the stage">
      <p className="text-ink-2 text-sm -mt-2 mb-5">Roles with the fewest entrants are the easiest to win. Uncontested roles win automatically.</p>
      <ul className="card divide-y divide-line">
        {roles.slice(0, 12).map((r) => (
          <li key={`${r.slug}-${r.key}`}>
            <Link href={`/plays/${r.slug}/roles/${r.key}`} className="press flex items-center gap-3 p-3">
              <span className="flex-1 min-w-0"><span className="block font-semibold">{r.name}</span><span className="block text-sm text-ink-2 truncate">{r.title} · {r.lines} lines</span></span>
              <span className="text-right"><span className="block t-caption text-ink-2">{r.entrants === 0 ? 'No entrants' : `${r.entrants} entered`}</span><span className="block t-caption text-ink-3">{formatUsd(r.fee)} to enter</span></span>
              <IconChevron className="text-ink-3" />
            </Link>
          </li>
        ))}
        {roles.length === 0 && <li className="p-4 text-sm text-ink-2">Nothing is casting right now.</li>}
      </ul>
    </Page>
  );
}
