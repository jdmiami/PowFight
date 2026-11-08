'use client';
/** Winners film by scene: queue sheet, partner cue on the prompter, resume where you left off. */
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Recorder } from '@/components/Recorder';
import type { FilmQueueItem } from '@/lib/types';
import { formatUsd } from '@/lib/money';
import { IconChevron } from '@/components/icons';

export function FilmFlow({ productionId, items, prizeCents }: { productionId: string; items: FilmQueueItem[]; prizeCents: number }) {
  const router = useRouter();
  const [open, setOpen] = useState<{ from: number } | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>(() => items.filter((t) => t.clip).map((t) => t.line.id));
  const remaining = items.filter((t) => !doneIds.includes(t.line.id));
  const scenes = useMemo(() => {
    const m = new Map<number, FilmQueueItem[]>();
    for (const it of items) (m.get(it.line.sceneIdx) ?? m.set(it.line.sceneIdx, []).get(it.line.sceneIdx)!).push(it);
    return [...m.entries()].map(([idx, list]) => ({ idx, title: list[0].line.sceneTitle ?? `Scene ${idx + 1}`, items: list }));
  }, [items]);
  const headline = `${prizeCents ? formatUsd(prizeCents) + ' unlocks at premiere · ' : ''}${remaining.length} line${remaining.length === 1 ? '' : 's'} to go`;
  const cues = Object.fromEntries(items.map((t) => [t.line.id, t.cue]));

  if (open) {
    const queue = items.slice(open.from);
    return <Recorder lines={queue.map((t) => t.line)} mode="performance" uploadUrl={`/api/productions/${productionId}/clips`} doneLineIds={doneIds} cues={cues} speakerName={items[open.from].character.name} headline={headline}
      onLineDone={(id) => setDoneIds((d) => (d.includes(id) ? d : [...d, id]))} onAllDone={() => {}} onClose={() => { setOpen(null); router.refresh(); }} />;
  }

  if (remaining.length === 0) return <div className="card p-5 text-center"><p className="t-title-sm">All your lines are in.</p><p className="text-sm text-ink-2 mt-1">The play premieres once the whole cast is done{prizeCents ? `, and your ${formatUsd(prizeCents)} is released` : ''}.</p></div>;

  const firstMissing = items.findIndex((t) => !doneIds.includes(t.line.id));
  const pct = Math.round(((items.length - remaining.length) / items.length) * 100);
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="t-caption text-spot">{headline}</p>
        <div className="mt-2 h-1.5 rounded-full bg-ink-1/15 overflow-hidden"><div className="h-full bg-spot" style={{ width: `${pct}%` }} /></div>
        <button onClick={() => setOpen({ from: firstMissing })} className="btn-spot w-full mt-4">{doneIds.length ? 'Continue filming' : 'Start filming'} · {items[firstMissing].line.sceneTitle ?? 'next line'}</button>
        <p className="t-caption text-ink-3 mt-2 text-center">A scene at a time is plenty. Progress saves after every take.</p>
      </div>
      <ul className="card divide-y divide-line">
        {scenes.map((s) => {
          const d = s.items.filter((t) => doneIds.includes(t.line.id)).length;
          const first = items.indexOf(s.items.find((t) => !doneIds.includes(t.line.id)) ?? s.items[0]);
          const secs = s.items.reduce((a, t) => a + t.line.estSeconds, 0);
          return (
            <li key={s.idx}>
              <button onClick={() => setOpen({ from: first })} className="press w-full flex items-center gap-3 p-3 text-left">
                <span className={`seal ${d === s.items.length ? 'seal-spot' : ''}`}>{d === s.items.length ? '✓' : s.items.length - d}</span>
                <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{s.title}</span><span className="block t-caption text-ink-2">{s.items.length} line{s.items.length === 1 ? '' : 's'} · ~{Math.ceil(secs / 60)} min · {d}/{s.items.length} done</span></span>
                <IconChevron className="text-ink-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
