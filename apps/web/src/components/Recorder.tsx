'use client';
/**
 * Selfie line recorder.
 *  - Shows one line at a time as a teleprompter over the front camera preview.
 *  - Records with MediaRecorder (webm/mp4 depending on the browser), lets the actor re-take,
 *    then uploads each take to `uploadUrl` with the line id.
 *  - Works as a PWA on iOS Safari 14.5+ and Android Chrome.
 */
import { useEffect, useRef, useState } from 'react';
import type { Line } from '@/lib/types';

interface Props {
  lines: Line[];
  uploadUrl: string;          // POST multipart: file, lineId
  onAllDone: () => void;
  doneLineIds?: string[];
}

type Phase = 'idle' | 'countdown' | 'recording' | 'review' | 'uploading' | 'done';

function pickMime() {
  const cands = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return cands.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ?? '';
}

export function Recorder({ lines, uploadUrl, onAllDone, doneLineIds = [] }: Props) {
  const [i, setI] = useState(() => Math.max(0, lines.findIndex((l) => !doneLineIds.includes(l.id))));
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>(doneLineIds);
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const line = lines[i];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: { echoCancellation: true, noiseSuppression: true } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; await videoRef.current.play().catch(() => {}); }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Camera or microphone blocked. Allow access in your browser settings and reload.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function beginRecording() {
    const stream = streamRef.current; if (!stream) return;
    chunksRef.current = [];
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined);
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
      blobRef.current = blob;
      setBlobUrl(URL.createObjectURL(blob));
      setPhase('review');
    };
    rec.start(250);
    recRef.current = rec;
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    setPhase('recording');
  }

  /** 3-2-1-Action! then record. Timer-driven so no state is set synchronously inside an effect. */
  function startCountdown() {
    setCount(3); setPhase('countdown');
    let c = 3;
    const tick = () => {
      c -= 1; setCount(c);
      if (c <= 0) setTimeout(beginRecording, 400); else setTimeout(tick, 800);
    };
    setTimeout(tick, 800);
  }

  function stop() { recRef.current?.stop(); }

  async function upload() {
    if (!blobRef.current) return;
    setPhase('uploading'); setError(null);
    const fd = new FormData();
    const ext = blobRef.current.type.includes('mp4') ? 'mp4' : 'webm';
    fd.append('file', blobRef.current, `${line.id}.${ext}`);
    fd.append('lineId', line.id);
    fd.append('durationMs', String(elapsed * 1000));
    const res = await fetch(uploadUrl, { method: 'POST', body: fd });
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Upload failed, try again.'); setPhase('review'); return; }
    const nextDone = [...done, line.id];
    setDone(nextDone);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null); blobRef.current = null;
    const next = lines.findIndex((l) => !nextDone.includes(l.id));
    if (next === -1) { setPhase('done'); onAllDone(); } else { setI(next); setPhase('idle'); }
  }

  function retake() { if (blobUrl) URL.revokeObjectURL(blobUrl); setBlobUrl(null); blobRef.current = null; setPhase('idle'); }

  if (!line) return <p className="text-muted">Nothing to record.</p>;

  return (
    <div className="relative rounded-3xl overflow-hidden bg-black aspect-[9/16] max-h-[78vh] mx-auto border border-line">
      {phase === 'review' && blobUrl ? (
        <video src={blobUrl} controls playsInline className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
      )}

      {/* progress */}
      <div className="absolute top-3 left-3 right-3 flex gap-1">
        {lines.map((l, k) => <span key={l.id} data-line-id={l.id} className={`h-1 flex-1 rounded ${done.includes(l.id) ? 'bg-gold' : k === i ? 'bg-fg' : 'bg-white/30'}`} />)}
      </div>

      {/* teleprompter */}
      {phase !== 'review' && (
        <div className="absolute top-8 left-0 right-0 px-5">
          <div className="rounded-2xl bg-black/55 backdrop-blur p-4">
            <p className="text-[11px] uppercase tracking-wider text-gold mb-1">Line {i + 1} of {lines.length} · ~{line.estSeconds}s</p>
            <p className="display text-lg leading-snug whitespace-pre-line">{line.text}</p>
          </div>
        </div>
      )}

      {phase === 'countdown' && <div className="absolute inset-0 flex items-center justify-center"><span className="display text-8xl text-gold marquee">{count || 'Action!'}</span></div>}
      {phase === 'recording' && <span className="absolute top-20 right-5 flex items-center gap-2 text-sm bg-red/90 rounded-full px-3 py-1"><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC {elapsed}s</span>}
      {error && <p className="absolute bottom-24 left-4 right-4 text-center text-sm text-red bg-black/70 rounded-xl p-2">{error}</p>}

      {/* controls */}
      <div className="absolute bottom-0 inset-x-0 p-4 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent">
        {phase === 'idle' && <button onClick={startCountdown} className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center" aria-label="Record"><span className="w-14 h-14 rounded-full bg-red" /></button>}
        {phase === 'recording' && <button onClick={stop} className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center" aria-label="Stop"><span className="w-8 h-8 rounded bg-white" /></button>}
        {phase === 'review' && (<>
          <button onClick={retake} className="btn-ghost">Retake</button>
          <button onClick={upload} className="btn-gold">Use this take →</button>
        </>)}
        {phase === 'uploading' && <span className="pill">Uploading…</span>}
        {phase === 'done' && <span className="pill bg-gold text-black">All lines recorded ✓</span>}
      </div>
    </div>
  );
}
