import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { formatUsd } from '@/lib/money';
import { AuditionFlow } from './AuditionFlow';

export const dynamic = 'force-dynamic';

export default async function AuditionPage({ params }: { params: Promise<{ slug: string; character: string }> }) {
  const { slug, character: key } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/plays/${slug}/roles/${key}/audition`);
  const data = await getData();
  const found = await data.getProductionBySlug(slug);
  if (!found) notFound();
  const role = await data.getRole(found.production.id, key);
  if (!role) notFound();
  const existing = (await data.listAuditions(found.production.id, role.character.id)).find((a) => a.actorId === user.id);
  if (existing) redirect(`/auditions/${existing.id}`);

  return (
    <div className="space-y-4">
      <Link href={`/plays/${slug}/roles/${key}`} className="text-sm text-muted">← {role.character.name}</Link>
      <h1 className="display text-3xl">Audition: {role.character.name}</h1>
      <p className="text-sm text-muted">Entry is {formatUsd(found.production.entryFeeCents)}. {formatUsd(found.production.entryFeeCents - found.production.houseFeeCents)} of it goes into this role&apos;s prize pool, paid to whoever the audience votes in. Record the {role.sides.length} sides below, selfie-style, one at a time.</p>
      <AuditionFlow productionId={found.production.id} characterId={role.character.id} sides={role.sides} returnPath={`/plays/${slug}/roles/${key}/audition`} />
    </div>
  );
}
