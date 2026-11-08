'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Recorder } from '@/components/Recorder';
import type { Line } from '@/lib/types';

interface Props { auditionId: string; sides: Line[]; doneLineIds: string[]; missing: number; pending: boolean; productionId: string; characterId: string; returnPath: string; roleName: string }

export function ResumeRecording({ auditionId, sides, doneLineIds, missing, pending, productionId, characterId, returnPath, roleName }: Props) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(missing === 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function finishEntry() {
    setBusy(true); setErr(null);
    const res = await fetch('/api/auditions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productionId, characterId, returnPath }) });
    setBusy(false);
    if (!res.ok) { setErr('Could not restart checkout'); return; }
    const r = await res.json(); if (r.checkoutUrl) window.location.href = r.checkoutUrl; else router.refresh();
  }
  async function submit() {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/auditions/${auditionId}/submit`, { method: 'POST' });
    setBusy(false);
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not submit'); return; }
    router.refresh();
  }

  if (pending) return (
    <div className="card p-4 space-y-3">
      <p className="text-sm text-ink-2">Nothing was charged. Finish checkout to start recording, or come back later; the entry is kept for 24 hours.</p>
      <button onClick={finishEntry} disabled={busy} className="btn-spot w-full">Finish entry</button>
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
  return (
    <div className="space-y-3">
      {!done && <button className="btn-spot w-full" onClick={() => setShow(true)}>Record {missing} remaining side{missing === 1 ? '' : 's'}</button>}
      {show && !done && <Recorder lines={sides} mode="audition" uploadUrl={`/api/auditions/${auditionId}/clips`} doneLineIds={doneLineIds} speakerName={roleName} onAllDone={() => setDone(true)} onClose={() => { setShow(false); router.refresh(); }} />}
      {done && <button className="btn-spot w-full" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit my audition'}</button>}
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}
