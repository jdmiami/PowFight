'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function VoteButton({ auditionId, count, voted, disabled }: { auditionId: string; count: number; voted: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function toggle() {
    setBusy(true); setErr(null);
    const res = await fetch('/api/votes', { method: voted ? 'DELETE' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ auditionId }) });
    setBusy(false);
    if (res.status === 401) { router.push('/login'); return; }
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not vote'); return; }
    router.refresh();
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={toggle} disabled={busy || disabled} className={voted ? 'btn-gold px-4 py-2 text-sm' : 'btn-ghost px-4 py-2 text-sm'} aria-pressed={voted}>
        <span aria-hidden>{voted ? '★' : '☆'}</span> {count} {voted ? 'Your pick' : 'Vote'}
      </button>
      {err && <span className="text-xs text-red">{err}</span>}
    </div>
  );
}
