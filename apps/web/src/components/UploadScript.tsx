'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ParsedScript } from '@playhouse/script-parser';

export function UploadScript({ canUpload }: { canUpload: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedScript | null>(null);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState(7);
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function parse() {
    if (!file) return;
    setBusy(true); setErr(null);
    const fd = new FormData(); fd.append('file', file); if (title) fd.append('title', title);
    const res = await fetch('/api/scripts/parse', { method: 'POST', body: fd });
    setBusy(false);
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not parse'); return; }
    const p = (await res.json()) as ParsedScript; setParsed(p); setTitle(p.title);
  }

  async function stage() {
    if (!parsed) return;
    setBusy(true); setErr(null);
    const res = await fetch('/api/scripts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ parsed: { ...parsed, title }, auditionDays: days, attest }) });
    setBusy(false);
    if (res.status === 402) { router.push('/pricing'); return; }
    if (res.status === 401) { router.push('/login'); return; }
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? 'Could not stage'); return; }
    const { slug } = await res.json(); router.push(`/plays/${slug}`);
  }

  const dialogue = parsed?.lines.filter((l) => l.type === 'dialogue').length ?? 0;

  return (
    <div className="space-y-4">
      <label className="card block p-4 cursor-pointer">
        <span className="block t-label text-ink-3 mb-2">Script file (.epub, .txt, .html, .fountain)</span>
        <input type="file" accept=".epub,.txt,.html,.htm,.xhtml,.fountain,.md" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setParsed(null); }} className="block w-full text-sm" />
      </label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional, detected from file)" className="w-full rounded-xl bg-pit border border-line px-4 py-3 text-ink-1 placeholder:text-ink-3" />
      {!parsed && <button onClick={parse} disabled={!file || busy} className="btn-spot w-full">{busy ? 'Reading…' : 'Read the script'}</button>}

      {parsed && (
        <div className="card p-4 space-y-3">
          <h3 className="t-title-sm">{title || parsed.title}</h3>
          <p className="text-sm text-ink-2">{parsed.author ? `by ${parsed.author} · ` : ''}{dialogue} spoken lines · {parsed.characters.length} characters · {parsed.scenes.length} scene{parsed.scenes.length === 1 ? '' : 's'} · layout: {parsed.format}</p>
          {parsed.warnings.length > 0 && <ul className="text-xs text-spot list-disc pl-4">{parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          <div className="max-h-56 overflow-auto rounded-xl border border-line divide-y divide-line text-sm">
            {parsed.characters.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2">
                <span>{c.name} <span className="text-ink-2 text-xs">({c.aliases.join(', ')})</span></span>
                <span className="text-ink-2 text-xs">{c.lineCount} lines</span>
              </div>
            ))}
          </div>
          <label className="block text-sm">Auditions open for
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="ml-2 rounded-lg bg-pit border border-line px-2 py-1">
              {[3, 5, 7, 10, 14].map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
          </label>
          <label className="flex gap-2 text-xs text-ink-2 items-start">
            <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5" />
            I confirm this script is in the public domain, or I hold the rights (or a license) to have it performed and recorded on The Play House.
          </label>
          {!canUpload && <p className="text-sm text-spot">Staging a play needs the Storyteller plan ($20/year). You&apos;ll be taken to checkout.</p>}
          <div className="flex gap-2">
            <button onClick={() => setParsed(null)} className="btn-ghost flex-1">Back</button>
            <button onClick={stage} disabled={!attest || busy} className="btn-spot flex-1">{busy ? 'Staging…' : 'Stage this play'}</button>
          </div>
        </div>
      )}
      {err && <p className="text-sm text-danger">{err}</p>}
    </div>
  );
}
