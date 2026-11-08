'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    if (error) setErr(error.message); else setSent(true);
  }
  async function google() {
    await supabaseBrowser().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
  }
  if (sent) return <p className="card p-4 text-center">Check your inbox for the link ✉️</p>;
  return (
    <form onSubmit={submit} className="card p-5 space-y-3">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl bg-bg-2 border border-line px-4 py-3" />
      <button className="btn-gold w-full">Email me a link</button>
      <button type="button" onClick={google} className="btn-ghost w-full">Continue with Google</button>
      {err && <p className="text-sm text-red">{err}</p>}
      <p className="text-[11px] text-muted text-center">By continuing you agree to the Terms and confirm you are 13 or older.</p>
    </form>
  );
}
