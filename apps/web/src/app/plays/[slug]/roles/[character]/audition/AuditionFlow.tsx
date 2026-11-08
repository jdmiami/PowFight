'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Recorder } from '@/components/Recorder';
import type { Line } from '@/lib/types';

export function AuditionFlow({ productionId, characterId, sides, returnPath }: { productionId: string; characterId: string; sides: Line[]; returnPath: string }) {
  const router = useRouter();
  const [auditionId, setAuditionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  async function enter() {
    setBusy(true); setErr(null);
    const res = await fetch('/api/auditions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productionId, characterId, returnPath }) });
    setBusy(false);
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not enter'); return; }
    const r = await res.json();
    if (r.checkoutUrl) { window.location.href = r.checkoutUrl; return; }
    setAuditionId(r.auditionId);
  }

  async function submit() {
    if (!auditionId) return;
    setBusy(true); setErr(null);
    const res = await fetch(`/api/auditions/${auditionId}/submit`, { method: 'POST' });
    setBusy(false);
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not submit'); return; }
    router.push(`/auditions/${auditionId}`);
  }

  if (!auditionId) {
    return (
      <div className="card p-5 space-y-3">
        <ol className="text-sm space-y-1 list-decimal pl-5 text-muted">
          <li>Pay the entry fee (secure checkout).</li>
          <li>Record each side with your front camera. Retake as often as you like.</li>
          <li>Submit. Your reel appears on the role page for the audience to vote on.</li>
        </ol>
        <button onClick={enter} disabled={busy} className="btn-gold w-full">{busy ? 'One moment…' : 'Enter & pay'}</button>
        {err && <p className="text-sm text-red">{err}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Recorder lines={sides} uploadUrl={`/api/auditions/${auditionId}/clips`} onAllDone={() => setRecorded(true)} />
      {recorded && <button onClick={submit} disabled={busy} className="btn-gold w-full">{busy ? 'Submitting…' : 'Submit my audition'}</button>}
      {err && <p className="text-sm text-red">{err}</p>}
    </div>
  );
}
