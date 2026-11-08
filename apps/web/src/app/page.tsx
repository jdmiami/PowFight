import Link from 'next/link';
import { getData } from '@/lib/data';
import { Countdown } from '@/components/Countdown';
import { formatUsd } from '@/lib/money';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await getData();
  const productions = await data.listProductions();
  const casting = productions.filter((p) => p.status === 'casting');
  const playing = productions.filter((p) => p.status === 'premiered');
  const prize = env.entryFeeCents - env.houseFeeCents;

  return (
    <div className="space-y-8">
      <header className="text-center pt-6">
        <p className="text-gold text-xs tracking-[0.3em] uppercase">Now showing on your phone</p>
        <h1 className="display text-5xl mt-2 marquee">The Play House</h1>
        <p className="text-muted mt-3 text-balance">Pick a character. Selfie your lines. We stitch the whole cast into one play.</p>
        <div className="flex justify-center gap-2 mt-4">
          <Link href="/plays" className="btn-gold">Audition now</Link>
          <Link href="/how-it-works" className="btn-ghost">How it works</Link>
        </div>
      </header>

      <section>
        <h2 className="text-2xl mb-3">Now casting</h2>
        <div className="space-y-3">
          {casting.map((p) => (
            <Link key={p.id} href={`/plays/${p.slug}`} className="card block p-4 hover:bg-card-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl">{p.title}</h3>
                  <p className="text-sm text-muted">{p.author ? `by ${p.author}` : p.scriptTitle}</p>
                </div>
                <Countdown to={p.auditionsCloseAt} prefix="Closes in" />
              </div>
            </Link>
          ))}
          {casting.length === 0 && <p className="text-muted">Nothing casting right now. <Link href="/upload" className="text-gold underline">Stage a play</Link>.</p>}
        </div>
      </section>

      {playing.length > 0 && (
        <section>
          <h2 className="text-2xl mb-3">Now playing</h2>
          <div className="grid grid-cols-2 gap-3">
            {playing.map((p) => (
              <Link key={p.id} href={`/plays/${p.slug}/watch`} className="card overflow-hidden">
                <div className="aspect-[9/12] curtain flex items-end p-3"><span className="display">{p.title}</span></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="card p-5 space-y-3">
        <h2 className="text-2xl">The deal</h2>
        <ul className="space-y-2 text-sm">
          <li><span className="text-gold font-semibold">Free</span> to watch, scroll and vote.</li>
          <li><span className="text-gold font-semibold">{formatUsd(env.entryFeeCents)}</span> to audition for a role. {formatUsd(prize)} of every entry goes to that role&apos;s winner, {formatUsd(env.houseFeeCents)} keeps the lights on.</li>
          <li><span className="text-gold font-semibold">{formatUsd(env.storytellerYearlyCents)}/year</span> to upload scripts and stage your own plays.</li>
        </ul>
      </section>
    </div>
  );
}
