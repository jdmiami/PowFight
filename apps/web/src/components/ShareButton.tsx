'use client';
import { useState } from 'react';
import { IconShare } from './icons';

export function ShareButton({ title, text, path, className = 'btn-ghost' }: { title: string; text: string; path: string; className?: string }) {
  const [done, setDone] = useState(false);
  async function share() {
    const url = `${location.origin}${path}`;
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`); setDone(true); setTimeout(() => setDone(false), 1500);
    } catch {}
  }
  return <button onClick={share} className={className}><IconShare width={18} height={18} /> {done ? 'Link copied' : 'Share'}</button>;
}
