import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '../env';

/** Request-scoped Supabase client (RLS applies; uses the signed-in user's session). */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try { for (const { name, value, options } of list) cookieStore.set(name, value, options); } catch { /* read-only in RSC */ }
      },
    },
  });
}
