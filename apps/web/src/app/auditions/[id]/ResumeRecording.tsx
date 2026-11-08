'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Recorder } from '@/components/Recorder';
import type { Line } from '@/lib/types';

export function ResumeRecording({ auditionId, sides, doneLineIds, missing, pending }: { auditionId: string; sides: Line[]; doneLineIds: string[]; missing: number; pending: boolean }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(missing === 0);
  const [err, setErr] = useState<string | null>(null);
  if (pending) return <p className="card p-4 text-sm text-gold">Payment not completed yet. Finish checkout to start recording.</p>;
  async function submit() {
    const res = await fetch(`/api/auditions/${auditionId}/submit`, { method: 'POST' });
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not submit'); return; }
    router.refresh();
  }
  return (
    <div className="space-y-3">
      {!show && !done && <button className="btn-gold w-full" onClick={() => setShow(true)}>Record remaining {missing} side{missing === 1 ? '' : 's'}</button>}
      {show && !done && <Recorder lines={sides} uploadUrl={`/api/auditions/${auditionId}/clips`} doneLineIds={doneLineIds} onAllDone={() => { setDone(true); router.refresh(); }} />}
      {done && <button className="btn-gold w-full" onClick={submit}>Submit my audition</button>}
      {err && <p className="text-sm text-red">{err}</p>}
    </div>
  );
}
