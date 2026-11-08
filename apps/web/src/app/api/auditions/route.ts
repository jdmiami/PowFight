import { fail, json, withUser } from '@/lib/api';
import { getData } from '@/lib/data';
import { env, isDemo, stripeEnabled } from '@/lib/env';

export const runtime = 'nodejs';

/** Enter an audition for a role. Returns a Stripe Checkout URL, or (demo) marks it paid immediately. */
export async function POST(req: Request) {
  return withUser(async (user) => {
    const { productionId, characterId, returnPath } = (await req.json()) as { productionId: string; characterId: string; returnPath: string };
    const data = await getData();
    const audition = await data.createAudition(productionId, characterId, user.id);
    if (audition.status !== 'pending_payment') return json({ auditionId: audition.id, paid: true });
    if (isDemo || !stripeEnabled) {
      await data.markAuditionPaid(audition.id, 'demo', env.entryFeeCents);
      return json({ auditionId: audition.id, paid: true });
    }
    const [{ auditionCheckout }, role] = await Promise.all([import('@/lib/stripe'), data.getRoleBoard(productionId)]);
    const r = role.find((x) => x.character.id === characterId);
    if (!r) return fail('Role not found');
    const url = await auditionCheckout({ auditionId: audition.id, userId: user.id, roleName: r.character.name, playTitle: 'The Play House', returnPath });
    return json({ auditionId: audition.id, paid: false, checkoutUrl: url });
  });
}
