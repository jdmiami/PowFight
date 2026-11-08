'use client';
/**
 * The capture screen. Full-screen takeover. Study → countdown → record → review → next.
 *  - Beat prompter under the lens: three beats visible, the current one always at the same y.
 *  - Countdown 3-2-1-Action at 1000 ms steps; recording starts on "1" so the first word is never clipped.
 *  - Level meter, noise-floor check during the countdown, auto-stop on 1.5 s of silence.
 *  - Face guide, lighting hint, portrait block, explicit camera-permission states.
 *  - Review autoplays unmirrored; "Use this take" uploads in the background and advances.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Line } from '@/lib/types';
import { toBeats, beatSeconds } from '@/lib/beats';
import { AudioMeter } from '@/lib/audioMeter';
import { Verse, useModernSpelling, SpellingToggle } from './ScriptText';
import { modernize } from '@playhouse/script-parser';
import { IconX, IconCheck } from './icons';

export type RecorderMode = 'practice' | 'audition' | 'performance';
export interface Cue { kind: 'line'; speaker: string; text: string }
export interface Cue2 { kind: 'heading'; text: string }

interface Props {
  lines: Line[];
  mode: RecorderMode;
  /** POST multipart target; omitted in practice mode (nothing uploads). */
  uploadUrl?: string;
  doneLineIds?: string[];
  cues?: Record<string, Cue | Cue2 | undefined>;
  speakerName: string;
  headline?: string;          // e.g. "$10 unlocks at premiere · 17 lines to go"
  onAllDone: () => void;
  onClose: () => void;
  onLineDone?: (lineId: string) => void;
}

type Cam = 'requesting' | 'ready' | 'denied' | 'nocamera' | 'busy';
type Phase = 'study' | 'countdown' | 'recording' | 'review' | 'done';
interface Take { blob: Blob; url: string; durationMs: number; actionAtMs: number; speechEndMs: number; flags: string[] }

function pickMime() {
  const c = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return c.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ?? '';
}
const SIZES = [22, 26, 30, 36];

export function Recorder({ lines, mode, uploadUrl, doneLineIds = [], cues = {}, speakerName, headline, onAllDone, onClose, onLineDone }: Props) {
  const [i, setI] = useState(() => Math.max(0, lines.findIndex((l) => !doneLineIds.includes(l.id))));
  const line = lines[i];
  const [phase, setPhase] = useState<Phase>('study');
  const [cam, setCam] = useState<Cam>('requesting');
  const [count, setCount] = useState<number | 'Action'>(3);
  const [beat, setBeat] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(-100);
  const [noisy, setNoisy] = useState(false);
  const [dark, setDark] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const [take, setTake] = useState<Take | null>(null);
  const [done, setDone] = useState<string[]>(doneLineIds);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState<{ lineId: string; fd: FormData }[]>([]);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [pace, setPace] = useState(1);
  const [modern, setModern] = useModernSpelling();
  const [rehearsing, setRehearsing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const meterRef = useRef<AudioMeter | null>(null);
  const startedAt = useRef(0);
  const actionAt = useRef(0);
  const lastSpeech = useRef(0);
  const noiseFloor = useRef(-60);
  const timers = useRef<number[]>([]);
  const beatTimer = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const stopRef = useRef<() => void>(() => {});

  const text = modern ? modernize(line?.text ?? '') : (line?.text ?? '');
  const beats = toBeats(text);
  const estSeconds = line?.estSeconds ?? 5;
  const cue = line ? cues[line.id] : undefined;

  // ---- camera ----
  const startCamera = useCallback(async () => {
    setCam('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => setCam('busy'));
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; await videoRef.current.play().catch(() => {}); }
      setCam('ready');
    } catch (e) {
      const name = (e as DOMException)?.name;
      setCam(name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocamera' : name === 'NotReadableError' || name === 'AbortError' ? 'busy' : 'denied');
    }
  }, []);

  useEffect(() => {
    const onResize = () => setLandscape(window.innerWidth > window.innerHeight && window.innerWidth < 1024);
    const boot = window.setTimeout(() => { startCamera(); onResize(); }, 0);
    window.addEventListener('resize', onResize);
    const onVis = () => { if (document.visibilityState === 'visible' && streamRef.current && !streamRef.current.active) startCamera(); };
    document.addEventListener('visibilitychange', onVis);
    document.body.classList.add('overflow-hidden');
    const pendingTimers = timers.current;
    return () => {
      clearTimeout(boot);
      window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      document.body.classList.remove('overflow-hidden');
      streamRef.current?.getTracks().forEach((t) => t.stop()); meterRef.current?.close();
      pendingTimers.forEach(clearTimeout); if (beatTimer.current) clearTimeout(beatTimer.current); if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [startCamera]);

  // Lighting hint: sample the preview twice a second.
  useEffect(() => {
    if (cam !== 'ready') return;
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const id = window.setInterval(() => {
      const v = videoRef.current; if (!v || !ctx || v.readyState < 2) return;
      ctx.drawImage(v, 0, 0, 32, 32);
      const d = ctx.getImageData(8, 8, 16, 16).data; let sum = 0;
      for (let k = 0; k < d.length; k += 4) sum += 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2];
      setDark(sum / (d.length / 4) < 55);
    }, 500);
    return () => clearInterval(id);
  }, [cam]);

  // ---- meter loop (countdown + recording) ----
  const meterLoop = useCallback(() => {
    const m = meterRef.current; if (!m) return;
    const lv = m.level(); setLevel(lv);
    const now = performance.now();
    if (phaseRef.current === 'recording') {
      const t = now - startedAt.current; setElapsed(t);
      if (lv > noiseFloor.current + 10) lastSpeech.current = t;
      const spoke = lastSpeech.current > actionAt.current;
      const quietFor = t - lastSpeech.current;
      if ((spoke && t >= actionAt.current + estSeconds * 600 && quietFor > 1500) || t > actionAt.current + estSeconds * 2000 + 5000) { stopRef.current(); return; }
    }
    raf.current = requestAnimationFrame(meterLoop);
  }, [estSeconds]);
  const phaseRef = useRef<Phase>('study');
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ---- countdown → record ----
  function begin(practice = false) {
    if (cam !== 'ready' || !streamRef.current) return;
    setRehearsing(practice);
    if (!meterRef.current) { try { meterRef.current = new AudioMeter(streamRef.current); } catch {} }
    meterRef.current?.resume();
    setBeat(0); setCount(3); setPhase('countdown');
    const floors: number[] = [];
    const sample = window.setInterval(() => { const l = meterRef.current?.level() ?? -100; floors.push(l); setLevel(l); }, 100);
    timers.current.push(window.setTimeout(() => setCount(2), 1000));
    timers.current.push(window.setTimeout(() => {
      setCount(1);
      clearInterval(sample);
      noiseFloor.current = floors.length ? floors.sort((a, b) => a - b)[Math.floor(floors.length / 2)] : -60;
      setNoisy(noiseFloor.current > -45);
      if (!practice) startRecording();            // pre-roll: recording begins on "1"
      else startedAt.current = performance.now();
    }, 2000));
    timers.current.push(window.setTimeout(() => {
      setCount('Action');
      actionAt.current = performance.now() - startedAt.current; lastSpeech.current = 0;
      setPhase('recording'); scheduleBeats(0);
      if (practice) raf.current = requestAnimationFrame(meterLoop);
    }, 3000));
  }

  function startRecording() {
    const stream = streamRef.current!; chunksRef.current = [];
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 3_000_000 } : undefined);
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
      const durationMs = Math.round(performance.now() - startedAt.current);
      const flags: string[] = [];
      if (lastSpeech.current && lastSpeech.current < actionAt.current + 150) flags.push('Spoke before Action');
      if (durationMs > actionAt.current + estSeconds * 2000 + 4900) flags.push('Cut off at the end');
      setTake({ blob, url: URL.createObjectURL(blob), durationMs, actionAtMs: Math.round(actionAt.current), speechEndMs: Math.round(lastSpeech.current || durationMs), flags });
      setPhase('review');
    };
    rec.start(250); recRef.current = rec; startedAt.current = performance.now();
    raf.current = requestAnimationFrame(meterLoop);
  }

  function scheduleBeats(k: number) {
    if (beatTimer.current) clearTimeout(beatTimer.current);
    if (k >= beats.length - 1) return;
    beatTimer.current = window.setTimeout(() => { setBeat(k + 1); scheduleBeats(k + 1); }, beatSeconds(beats[k], pace) * 1000);
  }

  const stop = useCallback(() => {
    if (beatTimer.current) clearTimeout(beatTimer.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    if (rehearsing) { setPhase('study'); setRehearsing(false); return; }
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
  }, [rehearsing]);
  useEffect(() => { stopRef.current = stop; }, [stop]);

  function retake() { if (take) URL.revokeObjectURL(take.url); setTake(null); setPhase('study'); }

  async function useTake() {
    if (!take || !line) return;
    const lineId = line.id;
    const fd = new FormData();
    fd.append('file', take.blob, `${lineId}.${take.blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
    fd.append('lineId', lineId);
    fd.append('durationMs', String(take.durationMs));
    fd.append('actionAtMs', String(take.actionAtMs));
    fd.append('trimStartMs', String(Math.max(0, take.actionAtMs - 500)));
    fd.append('trimEndMs', String(Math.min(take.durationMs, take.speechEndMs + 500)));
    URL.revokeObjectURL(take.url); setTake(null);
    if (uploadUrl) {
      setPending((p) => p + 1);
      fetch(uploadUrl, { method: 'POST', body: fd }).then((r) => { if (!r.ok) throw new Error(); onLineDone?.(lineId); }).catch(() => setFailed((f) => [...f, { lineId, fd }])).finally(() => setPending((p) => p - 1));
    }
    const nextDone = [...done, lineId]; setDone(nextDone);
    const next = lines.findIndex((l) => !nextDone.includes(l.id));
    if (next === -1) { setPhase('done'); onAllDone(); } else { setI(next); setPhase('study'); }
  }

  function retryFailed(item: { lineId: string; fd: FormData }) {
    setFailed((f) => f.filter((x) => x !== item)); setPending((p) => p + 1);
    fetch(uploadUrl!, { method: 'POST', body: item.fd }).then((r) => { if (!r.ok) throw new Error(); onLineDone?.(item.lineId); }).catch(() => setFailed((f) => [...f, item])).finally(() => setPending((p) => p - 1));
  }

  // ---- render ----
  const size = SIZES[sizeIdx];
  const progress = lines.length > 1 ? `${lines.length - lines.filter((l) => !done.includes(l.id)).length + (phase === 'done' ? 0 : 1)} of ${lines.length}` : '';
  const meterPct = Math.max(0, Math.min(1, (level + 60) / 60));

  if (landscape) return <Takeover onClose={onClose}><div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3"><p className="t-title">Turn your phone upright</p><p className="text-ink-2 text-sm">Plays are filmed portrait so every actor cuts together.</p></div></Takeover>;

  return (
    <Takeover onClose={onClose}>
      {/* camera */}
      {phase === 'review' && take ? (
        <video key={take.url} src={take.url} autoPlay loop playsInline className="absolute inset-0 h-full w-full object-cover" onLoadedMetadata={(e) => e.currentTarget.play().catch(() => {})} />
      ) : (
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover -scale-x-100" />
      )}
      {cam !== 'ready' && phase !== 'review' && <CameraState cam={cam} retry={startCamera} />}

      {/* face guide */}
      {cam === 'ready' && (phase === 'study' || phase === 'countdown') && (
        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 178" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <ellipse cx="50" cy="56" rx="17" ry="22" fill="none" stroke="rgba(244,237,228,.45)" strokeWidth=".6" strokeDasharray="2 2" />
          <path d="M14 112c6-16 20-22 36-22s30 6 36 22" fill="none" stroke="rgba(244,237,228,.35)" strokeWidth=".6" strokeDasharray="2 2" />
        </svg>
      )}

      {/* status strip */}
      <div className="absolute top-0 inset-x-0 px-4 pt-[max(.75rem,env(safe-area-inset-top))] flex items-center gap-3 z-10">
        <button onClick={onClose} className="h-10 w-10 rounded-full pill-glass pill flex items-center justify-center shrink-0" aria-label="Close"><IconX /></button>
        <div className="flex-1 min-w-0">
          <p className="t-caption text-ink-1 truncate">{mode === 'practice' ? 'Practice take' : mode === 'audition' ? `Side ${i + 1} of ${lines.length}` : `Line ${progress}`}{mode === 'performance' && line?.sceneTitle ? ` · ${line.sceneTitle}` : ''}</p>
          {headline && <p className="t-caption text-spot truncate">{headline}</p>}
        </div>
        <div className="h-1.5 w-14 rounded-full bg-ink-1/20 overflow-hidden shrink-0" aria-label="Mic level"><div className={`h-full ${level > -3 ? 'bg-danger' : 'bg-spot'}`} style={{ width: `${meterPct * 100}%` }} /></div>
      </div>
      {lines.length > 1 && lines.length <= 24 && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+3.75rem)] inset-x-4 flex gap-1 z-10">{lines.map((l, k) => <span key={l.id} data-line-id={l.id} className={`h-0.5 flex-1 rounded ${done.includes(l.id) ? 'bg-spot' : k === i ? 'bg-ink-1' : 'bg-ink-1/30'}`} />)}</div>
      )}
      {lines.length > 24 && lines.map((l) => <span key={l.id} data-line-id={l.id} hidden />)}

      {/* prompter zone */}
      {(phase === 'countdown' || phase === 'recording') && (
        <div className="absolute inset-x-0 top-[13%] px-5 z-10" onClick={(e) => { if (phase !== 'recording') return; const x = e.nativeEvent.offsetX / (e.currentTarget as HTMLElement).clientWidth; if (x > 0.66 && beat < beats.length - 1) { setBeat(beat + 1); scheduleBeats(beat + 1); } else if (x < 0.33 && beat > 0) { setBeat(beat - 1); scheduleBeats(beat - 1); } }}>
          <div className="spotlight rounded-2xl bg-black/55 backdrop-blur-sm px-4 py-4 text-center">
            {cue && <p className="t-caption text-ink-2 mb-2 line-clamp-2">{cue.kind === 'line' ? <><span className="t-cue text-ink-1">{cue.speaker}:</span> {modernize(cue.text).replace(/\n/g, ' ')}</> : cue.text}</p>}
            <div className="flex items-center justify-center gap-3 mb-2">
              <p className="t-cue text-spot">{speakerName}</p>
              {phase === 'recording' && <span className="t-caption inline-flex items-center gap-1.5 text-ink-2 tabular-nums"><span className={`h-2 w-2 rounded-full ${rehearsing ? 'bg-ink-2' : 'bg-curtain-2'} animate-pulse`} /> {rehearsing ? 'rehearsal' : 'rec'} {Math.floor(elapsed / 1000)}s</span>}
            </div>
            {beats.length > 1 && beat > 0 && <p className="prompter-line prompter-ghost text-ink-2 mb-2" style={{ fontSize: size * 0.75, lineHeight: 1.25 }}>{beats[beat - 1]}</p>}
            <p key={beat} className="prompter-line text-ink-1 enter-line" style={{ fontSize: size, lineHeight: 1.3 }}>{beats[beat]}</p>
            {beat < beats.length - 1 && <p className="prompter-line prompter-ghost text-ink-2 mt-2" style={{ fontSize: size * 0.75, lineHeight: 1.25 }}>{beats[beat + 1]}</p>}
            {beats.length > 1 && <p className="t-caption text-ink-3 mt-3 tabular-nums">{beat + 1}/{beats.length} · tap right to advance</p>}
          </div>
        </div>
      )}
      {phase === 'countdown' && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"><span key={String(count)} className="t-display text-spot enter-line" style={{ fontSize: count === 'Action' ? 64 : 120 }}>{count === 'Action' ? 'Action' : count}</span></div>}

      {/* hints */}
      <div className="absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+4.5rem)] z-10 flex flex-col gap-1 items-start pointer-events-none">
        {dark && phase !== 'review' && <span className="pill pill-glass">Too dark. Face a window or a lamp.</span>}
        {noisy && phase !== 'review' && <span className="pill pill-glass">Noisy room. Find somewhere quieter if you can.</span>}
      </div>

      {/* study pane */}
      {phase === 'study' && line && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-house via-house/90 to-transparent pt-16 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4">
          <div className="playbill max-h-[38vh] overflow-auto">
            <div className="playbill-rule" />
            {cue && <p className="t-caption text-paper-ink-2 mb-2">{cue.kind === 'line' ? <><span className="t-cue text-paper-ink">{cue.speaker}:</span> {modernize(cue.text).replace(/\n/g, ' ')}</> : cue.text}</p>}
            <p className="t-cue text-paper-ink-2 mb-1">{speakerName} <span className="font-normal normal-case tracking-normal">· ~{estSeconds}s</span></p>
            <Verse text={line.text} modern={modern} className="text-paper-ink" />
            <div className="hairline mt-3 pt-2 flex items-center justify-between gap-2">
              <SpellingToggle modern={modern} onChange={setModern} />
              <div className="flex items-center gap-2 t-caption text-paper-ink-2">
                <button onClick={() => setSizeIdx((s) => Math.max(0, s - 1))} className="px-2" aria-label="Smaller prompter text">A−</button>
                <button onClick={() => setSizeIdx((s) => Math.min(SIZES.length - 1, s + 1))} className="px-2 text-base" aria-label="Larger prompter text">A+</button>
                <select value={pace} onChange={(e) => setPace(Number(e.target.value))} className="bg-transparent" aria-label="Prompter pace"><option value={0.8}>Slow</option><option value={1}>Normal</option><option value={1.2}>Brisk</option></select>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => begin(true)} disabled={cam !== 'ready'} className="btn-ghost flex-1 pill-glass border-0">Rehearse</button>
            <button onClick={() => begin(false)} disabled={cam !== 'ready'} className="rec-ring shrink-0" aria-label="Record"><span className="rec-dot" /></button>
            <span className="flex-1 t-caption text-ink-2 text-right">{mode === 'practice' ? 'Nothing is saved' : pending ? `${pending} uploading…` : done.length ? `${done.length} saved` : ''}</span>
          </div>
        </div>
      )}

      {/* recording controls */}
      {phase === 'recording' && (
        <div className="absolute inset-x-0 bottom-0 z-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-2">
          <button onClick={stop} className="rec-ring" aria-label="Stop"><span className="rec-dot rec-dot-stop" /></button>
          <span className="t-caption text-ink-2">Stops by itself when you go quiet · tap to stop</span>
        </div>
      )}

      {/* review */}
      {phase === 'review' && take && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-house to-transparent pt-16 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4">
          <div className="flex items-center justify-between mb-3">
            <span className="t-caption text-ink-2 tabular-nums">Take · {(take.durationMs / 1000).toFixed(1)}s{take.flags.length ? ` · ${take.flags.join(' · ')}` : ''}</span>
            {mode !== 'practice' && <span className="t-caption text-ink-3">Trimmed to your words automatically</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={retake} className="btn-ghost flex-1 pill-glass border-0">Again</button>
            {mode === 'practice' ? <button onClick={() => { retake(); onAllDone(); }} className="btn-spot flex-[1.4]"><IconCheck width={18} height={18} /> Looked good</button>
              : <button onClick={useTake} className="btn-spot flex-[1.4]"><IconCheck width={18} height={18} /> Use this take</button>}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-house to-transparent pt-16 pb-[max(1.25rem,env(safe-area-inset-bottom))] px-4 text-center">
          <p className="t-title">That’s a wrap.</p>
          <p className="text-ink-2 text-sm mt-1">{pending ? `Finishing ${pending} upload${pending > 1 ? 's' : ''}…` : 'All takes saved.'}</p>
          <button onClick={onClose} disabled={pending > 0} className="btn-spot w-full mt-4">Continue</button>
        </div>
      )}

      {failed.length > 0 && (
        <div className="absolute left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] z-20 card p-3 flex items-center justify-between gap-3">
          <span className="text-sm">{failed.length} upload{failed.length > 1 ? 's' : ''} failed. Your take is kept.</span>
          <button onClick={() => failed.forEach(retryFailed)} className="btn-spot h-9 min-h-0 px-3 text-sm">Retry</button>
        </div>
      )}
    </Takeover>
  );
}

function Takeover({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  void onClose;
  return <div className="fixed inset-0 z-50 bg-black text-ink-1 overflow-hidden md:flex md:items-center md:justify-center" role="dialog" aria-modal="true" style={{ height: '100dvh' }}><div className="stage">{children}</div></div>;
}

function CameraState({ cam, retry }: { cam: Cam; retry: () => void }) {
  const copy: Record<Cam, { title: string; body: string }> = {
    requesting: { title: 'Allow the camera', body: 'Your browser is asking for camera and microphone access. Takes are recorded on your phone; nothing uploads until you choose a take.' },
    denied: { title: 'Camera is blocked', body: 'Allow camera and microphone for this site in your browser settings (the lock icon in the address bar, or Settings → Safari → Camera), then try again.' },
    nocamera: { title: 'No camera found', body: 'Open The Play House on a phone or a laptop with a webcam.' },
    busy: { title: 'Camera is in use', body: 'Another app or tab is using the camera. Close it and try again.' },
    ready: { title: '', body: '' },
  };
  const c = copy[cam];
  return (
    <div className="absolute inset-0 z-[5] bg-house/85 flex flex-col items-center justify-center text-center px-8 gap-3">
      <p className="t-title">{c.title}</p>
      <p className="text-sm text-ink-2 max-w-xs">{c.body}</p>
      {cam !== 'requesting' && <button onClick={retry} className="btn-spot mt-2">Try again</button>}
    </div>
  );
}
