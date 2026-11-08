export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripeStorytellerPriceId: process.env.STRIPE_STORYTELLER_PRICE_ID ?? '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  entryFeeCents: Number(process.env.NEXT_PUBLIC_ENTRY_FEE_CENTS ?? 1200),
  houseFeeCents: Number(process.env.NEXT_PUBLIC_HOUSE_FEE_CENTS ?? 200),
  storytellerYearlyCents: Number(process.env.NEXT_PUBLIC_STORYTELLER_YEARLY_CENTS ?? 2000),
};

/** True when no Supabase project is configured: the app runs on in-memory demo data. */
export const isDemo = !env.supabaseUrl || !env.supabaseAnonKey;
export const stripeEnabled = Boolean(env.stripeSecretKey);
