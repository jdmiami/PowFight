'use client';
/**
 * The vote control. One ticket per audition; voting is optimistic, one vote per role, switching
 * roles' picks asks first, and your own reel never shows a ticket (see ShareButton).
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  auditionId: string;
  count: number;
  voted: boolean;
  /** The audition id currently holding this voter's vote for the role, if different. */
  currentPickId?: string | null;
  currentPickName?: string | null;
  open: boolean;
  signedIn: boolean;
  compact?: boolean;
  /** Count + star only, for poster cards. */
  tiny?: boolean;
  onChange?: (next: { voted: boolean; count: number }) => void;
}

export function Ticket({ auditionId, count, voted, currentPickId, currentPickName, open, signedIn, compact, tiny, onChange }: Props) {
  const router = useRouter();
  // Optimistic local state, re-synced when the server props change (keyed by the props themselves).
  const [state, setState] = useState({ voted, count, key: `${voted}|${count}` });
  if (state.key !== `${voted}|${count}`) setState({ voted, count, key: `${voted}|${count}` });
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(method: 'POST' | 'DELETE') {
    const res = await fetch('/api/votes', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ auditionId }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not vote');
  }

  async function toggle() {
    if (!open) return;
    if (!signedIn) { router.push(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
    if (!state.voted && currentPickId && currentPickId !== auditionId && !confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 2500); return; }
    setConfirm(false); setErr(null);
    const next = state.voted ? { voted: false, count: state.count - 1 } : { voted: true, count: state.count + 1 };
    setState({ ...next, key: state.key }); onChange?.(next);
    try { navigator.vibrate?.(8); } catch {}
    try {
      await send(state.voted ? 'DELETE' : 'POST');
      router.refresh();
    } catch (e) {
      setState({ voted: state.voted, count: state.count, key: state.key }); onChange?.({ voted: state.voted, count: state.count });
      setErr(e instanceof Error ? e.message : 'Could not vote');
    }
  }

  return (
    <div className="relative inline-flex flex-col items-end gap-1">
      {confirm && (
        <button onClick={toggle} className="absolute -top-11 right-0 whitespace-nowrap pill pill-glass text-ink-1 text-xs">
          Switch your vote from {currentPickName ?? 'your pick'}? <span className="text-spot font-semibold">Switch</span>
        </button>
      )}
      <button onClick={toggle} disabled={!open} aria-pressed={state.voted} className={`ticket ${state.voted ? 'ticket-on' : ''} ${compact || tiny ? 'compact' : ''} ${tiny ? 'tiny' : ''}`} aria-label={state.voted ? 'Your pick' : 'Vote'}>
        <span className="ticket-l">
          <span className="t-num">{state.count}</span>
          {!tiny && <span>{state.voted ? (compact ? 'PICK' : 'YOUR PICK') : open ? 'VOTE' : 'VOTES'}</span>}
        </span>
        <span className="ticket-r">{state.voted ? '★' : '☆'}</span>
      </button>
      {err && <span className="text-[11px] text-danger">{err}</span>}
    </div>
  );
}
