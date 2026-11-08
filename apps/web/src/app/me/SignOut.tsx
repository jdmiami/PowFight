'use client';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function SignOut() {
  const router = useRouter();
  return <button className="text-sm text-ink-3 underline" onClick={async () => { await supabaseBrowser().auth.signOut(); router.push('/'); router.refresh(); }}>Sign out</button>;
}
