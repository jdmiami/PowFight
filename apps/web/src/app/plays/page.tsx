import Link from 'next/link';
import { getData } from '@/lib/data';
import { Countdown } from '@/components/Countdown';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plays' };

const label: Record<string, string> = { casting: 'Casting', voting_closed: 'Counting votes', filming: 'Filming', rendering: 'Stitching', premiered: 'Now playing', cancelled: 'Cancelled' };

export default async function Plays() {
  const productions = await (await getData()).listProductions();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Plays</h1>
      {productions.map((p) => (
        <Link key={p.id} href={`/plays/${p.slug}`} className="card block p-4 hover:bg-card-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl">{p.title}</h2>
              <p className="text-sm text-muted">{p.author ? `by ${p.author}` : p.scriptTitle}</p>
            </div>
            {p.status === 'casting' ? <Countdown to={p.auditionsCloseAt} prefix="Closes in" /> : <span className="pill">{label[p.status]}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}
