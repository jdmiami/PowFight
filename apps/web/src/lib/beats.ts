/**
 * Split a speech into prompter "beats": short phrases an actor can hold in one glance.
 * Splits on sentence punctuation, dashes and verse breaks, then merges tiny fragments so each
 * beat is roughly 6 to 12 words. An 80-word speech becomes 7 to 10 beats; a 6-word line is one.
 */
export function toBeats(text: string, target = 9, max = 13): string[] {
  const raw = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.;:?!])\s+|\s+[—–-]{1,2}\s+|(?<=,)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const verseAware = text.includes('\n') && raw.length <= 1 ? text.split('\n').map((s) => s.trim()).filter(Boolean) : raw;
  const beats: string[] = [];
  let cur = '';
  const words = (s: string) => s.split(' ').filter(Boolean).length;
  for (const piece of verseAware) {
    if (!cur) { cur = piece; continue; }
    if (words(cur) + words(piece) <= target) cur = `${cur} ${piece}`;
    else { beats.push(cur); cur = piece; }
  }
  if (cur) beats.push(cur);
  // Hard-wrap anything still too long.
  const out: string[] = [];
  for (const b of beats) {
    const w = b.split(' ');
    if (w.length <= max) { out.push(b); continue; }
    for (let i = 0; i < w.length; i += target) out.push(w.slice(i, i + target).join(' '));
  }
  return out.length ? out : [text.trim()];
}

/** Seconds a beat needs at a given pace (words per second, default 2.5). */
export function beatSeconds(beat: string, pace = 1): number {
  const n = beat.split(' ').filter(Boolean).length;
  return Math.max(1.2, n / (2.5 * pace) + 0.4);
}
