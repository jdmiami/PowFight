'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function StorytellerButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} className="btn-gold w-full" onClick={async () => {
      setBusy(true);
      const res = await fetch('/api/checkout/storyteller', { method: 'POST' });
      setBusy(false);
      if (res.status === 401) { router.push('/login?next=/pricing'); return; }
      const r = await res.json();
      if (r.checkoutUrl) window.location.href = r.checkoutUrl; else router.push('/upload');
    }}>{busy ? 'One moment…' : 'Become a Storyteller'}</button>
  );
}
