import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

/** Service-role client. Server only. Bypasses RLS: use for ledger, casting, render jobs, webhooks. */
export function supabaseAdmin() {
  if (!env.supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false } });
}
