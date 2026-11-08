'use client';
import { useSyncExternalStore } from 'react';
import { modernize } from '@playhouse/script-parser';

const KEY = 'ph.spelling';

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); window.addEventListener('storage', cb); return () => { listeners.delete(cb); window.removeEventListener('storage', cb); }; };
const getSnapshot = () => { try { return localStorage.getItem(KEY) !== 'original'; } catch { return true; } };

/** Modern spelling preference, shared across components and persisted per device. Server renders modern. */
export function useModernSpelling(): [boolean, (v: boolean) => void] {
  const modern = useSyncExternalStore(subscribe, getSnapshot, () => true);
  const set = (v: boolean) => { try { localStorage.setItem(KEY, v ? 'modern' : 'original'); } catch {} listeners.forEach((l) => l()); };
  return [modern, set];
}

/** A passage of script set like a printed side: verse breaks kept, hanging indent, optional modern spelling. */
export function Verse({ text, modern = true, className = '' }: { text: string; modern?: boolean; className?: string }) {
  const t = modern ? modernize(text) : text;
  return (
    <span className={`t-script block ${className}`}>
      {t.split('\n').map((l, i) => <span key={i} className="verse-line">{l}</span>)}
    </span>
  );
}

export function SpellingToggle({ modern, onChange }: { modern: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!modern)} className="t-caption inline-flex items-center gap-2 text-paper-ink-2" aria-pressed={modern}>
      <span className={`inline-block h-4 w-7 rounded-full border transition ${modern ? 'bg-paper-ink border-paper-ink' : 'border-paper-ink-2'}`}>
        <span className={`block h-3 w-3 mt-[1px] rounded-full transition ${modern ? 'translate-x-3.5 bg-paper' : 'translate-x-[1px] bg-paper-ink-2'}`} />
      </span>
      {modern ? 'Modern spelling' : 'Original spelling'}
    </button>
  );
}
