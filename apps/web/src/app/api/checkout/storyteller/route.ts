import { fail, json, withUser } from '@/lib/api';
import { getData } from '@/lib/data';
import { isDemo, stripeEnabled } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST() {
  return withUser(async (user) => {
    if (isDemo || !stripeEnabled) {
      await (await getData()).grantStoryteller(user.id, new Date(Date.now() + 365 * 86400_000).toISOString());
      return json({ granted: true });
    }
    const { storytellerCheckout } = await import('@/lib/stripe');
    const url = await storytellerCheckout({ userId: user.id });
    if (!url) return fail('Could not start checkout');
    return json({ checkoutUrl: url });
  });
}
