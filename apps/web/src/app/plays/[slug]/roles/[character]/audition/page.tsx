import { notFound, redirect } from 'next/navigation';
import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { AuditionFlow } from './AuditionFlow';
import { Page } from '@/components/Page';
import { Sides } from '@/components/Sides';
import { isDemo } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function AuditionPage({ params }: { params: Promise<{ slug: string; character: string }> }) {
  const { slug, character: key } = await params;
  const user = await currentUser();
  const data = await getData();
  const found = await data.getProductionBySlug(slug);
  if (!found) notFound();
  const role = await data.getRole(found.production.id, key);
  if (!role) notFound();
  const auditions = await data.listAuditions(found.production.id, role.character.id);
  const existing = user ? auditions.find((a) => a.actorId === user.id) : undefined;
  if (existing) redirect(`/auditions/${existing.id}`);

  return (
    <Page back={{ href: `/plays/${slug}/roles/${key}`, label: role.character.name }}>
      <p className="t-label text-ink-3">Audition</p>
      <h1 className="t-display mb-4">{role.character.name}</h1>
      <AuditionFlow productionId={found.production.id} characterId={role.character.id} roleName={role.character.name} playTitle={found.production.title} sides={role.sides}
        returnPath={`/plays/${slug}/roles/${key}/audition`} entryFeeCents={found.production.entryFeeCents} houseFeeCents={found.production.houseFeeCents} entrants={auditions.length} isDemo={isDemo} />
      <div className="mt-6"><Sides sides={role.sides} characterName={role.character.name} /></div>
    </Page>
  );
}
