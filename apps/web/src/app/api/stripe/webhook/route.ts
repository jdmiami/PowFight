import type Stripe from 'stripe';
import { fail, json } from '@/lib/api';
import { env } from '@/lib/env';
import { getData } from '@/lib/data';

export const runtime = 'nodejs';

/**
 * Stripe → app. Verifies the signature, then:
 *  - audition checkout completed  → mark the audition paid (draft) and record the ledger entry
 *  - storyteller subscription paid → extend storyteller_until by one year
 */
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig || !env.stripeWebhookSecret) return fail('Missing signature', 400);
  const { stripe } = await import('@/lib/stripe');
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, env.stripeWebhookSecret);
  } catch (e) {
    return fail(`Invalid signature: ${e instanceof Error ? e.message : e}`, 400);
  }
  const data = await getData();
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      if (s.metadata?.kind === 'audition' && s.metadata.auditionId) {
        await data.markAuditionPaid(s.metadata.auditionId, typeof s.payment_intent === 'string' ? s.payment_intent : s.id, s.amount_total ?? env.entryFeeCents);
      }
      if (s.metadata?.kind === 'storyteller' && s.metadata.userId) {
        await data.grantStoryteller(s.metadata.userId, new Date(Date.now() + 365 * 86400_000).toISOString());
      }
      break;
    }
    case 'invoice.paid': {
      const inv = event.data.object;
      const userId = (inv.parent?.subscription_details?.metadata as Record<string, string> | undefined)?.userId;
      if (userId) await data.grantStoryteller(userId, new Date(Date.now() + 365 * 86400_000).toISOString());
      break;
    }
    default:
      break;
  }
  return json({ received: true });
}
