'use client';
/**
 * Audition funnel: practice (free, nothing saved) → enter & pay → record the sides → submit →
 * post-submit screen with Share first. Price is on every primary button.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Recorder } from '@/components/Recorder';
import { ShareButton } from '@/components/ShareButton';
import { Bulbs } from '@/components/Bulbs';
import type { Line } from '@/lib/types';
import { formatUsd } from '@/lib/money';

type Step = 'intro' | 'practice' | 'practiced' | 'recording' | 'review' | 'submitted';

interface Props { productionId: string; characterId: string; roleName: string; playTitle: string; sides: Line[]; returnPath: string; entryFeeCents: number; houseFeeCents: number; entrants: number; isDemo: boolean }

export function AuditionFlow({ productionId, characterId, roleName, playTitle, sides, returnPath, entryFeeCents, houseFeeCents, entrants, isDemo }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [auditionId, setAuditionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string[]>([]);
  const prize = entryFeeCents - houseFeeCents;

  async function enter() {
    setBusy(true); setErr(null);
    const res = await fetch('/api/auditions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productionId, characterId, returnPath }) });
    setBusy(false);
    if (res.status === 401) { router.push(`/login?next=${encodeURIComponent(returnPath)}`); return; }
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not enter'); return; }
    const r = await res.json();
    if (r.checkoutUrl) { window.location.href = r.checkoutUrl; return; }
    setAuditionId(r.auditionId); setStep('recording');
  }

  async function submit() {
    if (!auditionId) return;
    setBusy(true); setErr(null);
    const res = await fetch(`/api/auditions/${auditionId}/submit`, { method: 'POST' });
    setBusy(false);
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not submit'); return; }
    setStep('submitted');
  }

  if (step === 'practice') return <Recorder lines={[sides[0]]} mode="practice" speakerName={roleName} onAllDone={() => setStep('practiced')} onClose={() => setStep('intro')} />;
  if (step === 'recording' && auditionId) return <Recorder lines={sides} mode="audition" uploadUrl={`/api/auditions/${auditionId}/clips`} speakerName={roleName} doneLineIds={recorded} onLineDone={(id) => setRecorded((r) => [...r, id])} onAllDone={() => setStep('review')} onClose={() => setStep('review')} />;

  if (step === 'submitted' && auditionId) {
    return (
      <div className="fixed inset-0 z-50 bg-house flex flex-col items-center justify-center text-center px-6 gap-4">
        <Bulbs count={18} chase />
        <p className="t-label text-spot">You’re in</p>
        <h1 className="t-display">{roleName}</h1>
        <p className="text-ink-2">Entry #{entrants + 1}. The audience decides when auditions close. Reels with the most shares tend to win.</p>
        <ShareButton title={`Vote for me as ${roleName}`} text={`I’m auditioning for ${roleName} in ${playTitle} on The Play House. Voting is free:`} path={`/auditions/${auditionId}`} className="btn-spot w-full max-w-xs" />
        <Link href={`/auditions/${auditionId}`} className="btn-ghost w-full max-w-xs">See your reel</Link>
        <Link href={returnPath.replace(/\/audition$/, '')} className="t-caption text-ink-3">See the competition</Link>
      </div>
    );
  }

  if (step === 'review' && auditionId) {
    const missing = sides.length - recorded.length;
    return (
      <div className="card p-5 space-y-3">
        <p className="t-label text-ink-3">Review</p>
        <p className="t-title-sm">{missing > 0 ? `${missing} side${missing > 1 ? 's' : ''} still uploading or unrecorded` : 'All three sides are in.'}</p>
        <p className="text-sm text-ink-2">This is what the audience sees. You can keep re-recording until auditions close.</p>
        <div className="flex gap-2">
          <button onClick={() => setStep('recording')} className="btn-ghost flex-1">Redo a side</button>
          <button onClick={submit} disabled={busy || missing > 0} className="btn-spot flex-[1.4]">{busy ? 'Submitting…' : 'Submit audition'}</button>
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-3">
        <p className="t-label text-ink-3">{step === 'practiced' ? 'Looked good' : 'Before you pay'}</p>
        <p className="t-title-sm">{step === 'practiced' ? 'Now do it for real.' : 'Try the first side free.'}</p>
        <p className="text-sm text-ink-2">{step === 'practiced' ? `Entry is ${formatUsd(entryFeeCents)}. ${formatUsd(prize)} goes into the ${roleName} pool and is paid to whoever the audience votes in. Record all ${sides.length} sides, retake as often as you like.` : 'Camera on, teleprompter up, nothing saved. See yourself say the line before you decide.'}</p>
        {step === 'intro' ? (
          <div className="flex gap-2">
            <button onClick={() => setStep('practice')} className="btn-spot flex-[1.4]">Try the sides free</button>
            <button onClick={() => setStep('practiced')} className="btn-ghost flex-1">Skip</button>
          </div>
        ) : (
          <button onClick={enter} disabled={busy} className="btn-spot w-full">{busy ? 'One moment…' : `Enter for ${formatUsd(entryFeeCents)}${isDemo ? ' (demo, no charge)' : ''}`}</button>
        )}
        {err && <p className="text-sm text-danger">{err}</p>}
      </div>
      <p className="t-caption text-ink-3 px-1">Cash-prize auditions are 18+. Secure checkout; nothing is charged until you confirm.</p>
    </div>
  );
}
