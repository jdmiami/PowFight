import { isDemo } from './env';
import type { Profile } from './types';

/** The signed-in user, or null. In demo mode everyone is the demo user. */
export async function currentUser(): Promise<Profile | null> {
  if (isDemo) {
    const { DEMO_USER } = await import('./data/demo');
    return DEMO_USER;
  }
  const { supabaseServer } = await import('./supabase/server');
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: p } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (p) return { id: p.id, handle: p.handle, displayName: p.display_name, avatarUrl: p.avatar_url, storytellerUntil: p.storyteller_until, isAdmin: p.is_admin };
  // First login: create a profile from the auth record.
  const handle = (user.email?.split('@')[0] ?? 'actor').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) + Math.floor(Math.random() * 900 + 100);
  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Actor';
  await db.from('profiles').insert({ id: user.id, handle, display_name: displayName, avatar_url: user.user_metadata?.avatar_url ?? null });
  return { id: user.id, handle, displayName };
}

export async function requireUser(): Promise<Profile> {
  const u = await currentUser();
  if (!u) throw new Error('UNAUTHENTICATED');
  return u;
}

export function isStoryteller(p: Profile | null): boolean {
  return Boolean(p?.storytellerUntil && new Date(p.storytellerUntil) > new Date());
}
