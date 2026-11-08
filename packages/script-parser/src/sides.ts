import type { ParsedScript, ScriptLine } from './types.ts';

/**
 * Pick "audition sides" for a character: the N most substantial speeches, in script order.
 * Everyone auditioning for a role performs the same sides so votes compare like with like.
 */
export function pickSides(script: ParsedScript, characterId: string, n = 3, maxWordsPerSide = 60): ScriptLine[] {
  const mine = script.lines.filter((l) => l.type === 'dialogue' && l.characterId === characterId);
  const scored = mine
    .map((l) => ({ l, w: (l.text.match(/[A-Za-z']+/g) ?? []).length }))
    .filter((x) => x.w >= 6 && x.w <= maxWordsPerSide)
    .sort((a, b) => b.w - a.w)
    .slice(0, n)
    .map((x) => x.l)
    .sort((a, b) => a.index - b.index);
  return scored.length ? scored : mine.slice(0, n);
}

/** Estimate seconds an actor needs to read a line (≈2.5 words/sec + 1.5s slack). */
export function estimateSeconds(text: string): number {
  const words = (text.match(/[A-Za-z0-9']+/g) ?? []).length;
  return Math.max(3, Math.ceil(words / 2.5 + 1.5));
}
