import Stripe from 'stripe';
import { env, stripeEnabled } from './env';

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!stripeEnabled) throw new Error('Stripe not configured');
  return (client ??= new Stripe(env.stripeSecretKey));
}

/** $12 one-time audition entry. Metadata lets the webhook mark the audition paid. */
export async function auditionCheckout(opts: { auditionId: string; userId: string; email?: string; roleName: string; playTitle: string; returnPath: string }) {
  const s = await stripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: opts.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd', unit_amount: env.entryFeeCents,
        product_data: { name: `Audition: ${opts.roleName} in ${opts.playTitle}`, description: `$${(env.entryFeeCents - env.houseFeeCents) / 100} goes to the role's prize pool, $${env.houseFeeCents / 100} to the house.` },
      },
    }],
    metadata: { kind: 'audition', auditionId: opts.auditionId, userId: opts.userId },
    success_url: `${env.appUrl}${opts.returnPath}?paid=1`,
    cancel_url: `${env.appUrl}${opts.returnPath}?cancelled=1`,
  });
  return s.url!;
}

/** $20/yr Storyteller subscription (upload scripts, stage productions). */
export async function storytellerCheckout(opts: { userId: string; email?: string }) {
  const s = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer_email: opts.email,
    line_items: [{ quantity: 1, price: env.stripeStorytellerPriceId }],
    metadata: { kind: 'storyteller', userId: opts.userId },
    subscription_data: { metadata: { kind: 'storyteller', userId: opts.userId } },
    success_url: `${env.appUrl}/upload?subscribed=1`,
    cancel_url: `${env.appUrl}/pricing?cancelled=1`,
  });
  return s.url!;
}
