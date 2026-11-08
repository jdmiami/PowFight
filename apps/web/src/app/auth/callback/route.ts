import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { env } from '@/lib/env';

/** Supabase magic-link / OAuth redirect target. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/me';
  if (code) {
    const db = await supabaseServer();
    await db.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${env.appUrl}${next}`);
}
