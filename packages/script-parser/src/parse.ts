import type { ParseOptions, ParsedScript, ScriptCharacter, ScriptLine, ScriptScene } from './types.ts';

const HEADING_RE = /^\s*(ACT\b|Actus\b|SCENE\b|Sc(?:oe|e|ae)na\b|Scena\b|PROLOGUE\b|The Prologue\b|EPILOGUE\b|Epilogue\b|INT\.|EXT\.|INT\/EXT)/i;
const DIRECTION_RE = /^\s*(Enter\b|Exit\b|Exeunt\b|Alarum|Flourish|Sennet|Musick|Music\b|Sound\b|They fight|Dies\b|Dyes\b|Fight\b|Retreat|Within\b|Aside\b|\[|\()/i;
const TRAILING_DIRECTION_RE = /\s+((?:Exit|Exeunt|Dies|Dyes|Exit Romeo|Exeunt omnes)[^.]*\.?)\s*$/i;
const INLINE_CUE_RE = /^(\s*)(?:\d\.\s?)?((?:[A-Z][A-Za-z']{1,14}\.?\s?){1,3})\.\s+(\S.*)$/;
const BLOCK_CUE_RE = /^\s*([A-Z][A-Z' .-]{1,30}?)\.?\s*(\(.*\))?\s*$/;
const DRAMATIS_RE = /^\s*(Dramatis Person|PERSONS REPRESENTED|CHARACTERS|The Persons)/i;

export function foldCue(raw: string): string {
  return raw.toLowerCase().replace(/[.\s']/g, '');
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
}

function titleCase(s: string): string {
  return s.split(/\s+/).map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(' ');
}

function wordCount(s: string): number {
  return (s.match(/[A-Za-z0-9']+/g) ?? []).length;
}

interface RawSpeech { kind: 'dialogue' | 'direction' | 'heading'; cue?: string; text: string }

/** Detect which script layout we are looking at. */
export function detectFormat(lines: string[]): ParsedScript['format'] {
  let inline = 0, block = 0, fountain = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    if (/^(INT|EXT)[./ ]/.test(l.trim()) || /^\./.test(l.trim())) fountain++;
    const m = INLINE_CUE_RE.exec(l);
    if (m && m[1].length > 0) inline++;
    else if (BLOCK_CUE_RE.test(l) && l.trim() === l.trim().toUpperCase() && /[A-Z]/.test(l) && (lines[i + 1] ?? '').trim()) block++;
  }
  if (fountain > 3 && block > inline) return 'fountain';
  if (block > inline * 1.5) return 'block-cue';
  if (inline > 10) return 'inline-cue';
  return 'unknown';
}

/** Find where the play proper begins, skipping prefaces that may quote other works. */
function findStart(lines: string[]): number {
  const dram = lines.findIndex((l) => DRAMATIS_RE.test(l));
  const head = lines.findIndex((l) => HEADING_RE.test(l));
  const candidates = [dram, head].filter((i) => i >= 0);
  return candidates.length ? Math.min(...candidates) : 0;
}

/** Pass 1: split the text into speeches, directions and headings. */
function segment(lines: string[], format: ParsedScript['format'], opts: ParseOptions): RawSpeech[] {
  const out: RawSpeech[] = [];
  // Pre-pass: learn which cue words are real speaker cues (indented & repeated, or supplied aliases).
  const known = new Set<string>();
  for (const cues of Object.values(opts.aliases ?? {})) for (const c of cues) known.add(foldCue(c));
  for (const name of Object.keys(opts.aliases ?? {})) known.add(foldCue(name));
  const seen = new Map<string, number>();
  for (const line of lines) {
    const m = INLINE_CUE_RE.exec(line);
    if (m && m[1].length > 0) {
      const first = m[2].trim().split(/\s+/)[0].replace(/\.$/, '');
      seen.set(foldCue(first), (seen.get(foldCue(first)) ?? 0) + 1);
    }
  }
  for (const [k, v] of seen) if (v >= 2) known.add(k);
  /** Resolve the cue words of a regex match: prefer the longest known combination, else the first word if indented. */
  const resolveCue = (m: RegExpExecArray): { cue: string; rest: string } | null => {
    const words = m[2].trim().split(/\s+/).map((w) => w.replace(/\.$/, ''));
    for (let n = words.length; n >= 1; n--) {
      const cue = words.slice(0, n).join(' ');
      if (known.has(foldCue(cue))) {
        const rest = n < words.length ? words.slice(n).join('. ') + '. ' + m[3] : m[3];
        return { cue, rest };
      }
    }
    if (m[1].length > 0 && words.length === 1) return { cue: words[0], rest: m[3] };
    if (m[1].length > 0) return { cue: words[0], rest: words.slice(1).join('. ') + '. ' + m[3] };
    return null;
  };
  let cur: RawSpeech | null = null;
  const flush = () => { if (cur && cur.text.trim()) out.push({ ...cur, text: cur.text.trim() }); cur = null; };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { if (cur?.kind !== 'dialogue') flush(); continue; }
    if (HEADING_RE.test(trimmed)) { flush(); out.push({ kind: 'heading', text: trimmed }); continue; }

    if (format === 'inline-cue' || format === 'unknown') {
      const m = INLINE_CUE_RE.exec(line);
      // Cue lines are usually indented in Gutenberg folio texts; verse continuations start at
      // column 0, but a known cue at column 0 still starts a new speech.
      const r = m ? resolveCue(m) : null;
      if (r) {
        flush();
        cur = { kind: 'dialogue', cue: r.cue, text: r.rest };
        continue;
      }
    } else {
      const m = BLOCK_CUE_RE.exec(line);
      if (m && trimmed === trimmed.toUpperCase() && /[A-Z]{2}/.test(trimmed) && !DIRECTION_RE.test(trimmed)) {
        flush();
        cur = { kind: 'dialogue', cue: m[1].trim(), text: '' };
        continue;
      }
    }

    if (DIRECTION_RE.test(trimmed) && (cur === null || cur.kind !== 'dialogue' || /^(Enter|Exit|Exeunt)\b/i.test(trimmed))) {
      flush();
      cur = { kind: 'direction', text: trimmed };
      continue;
    }
    if (cur) cur.text += (cur.text ? '\n' : '') + trimmed;
    else cur = { kind: 'direction', text: trimmed };
  }
  flush();

  // Peel trailing "Exit." / "Exeunt." off dialogue into their own direction entries.
  const peeled: RawSpeech[] = [];
  for (const s of out) {
    if (s.kind === 'dialogue') {
      const m = TRAILING_DIRECTION_RE.exec(s.text);
      if (m && m.index > 0) {
        peeled.push({ ...s, text: s.text.slice(0, m.index).trim() });
        peeled.push({ kind: 'direction', text: m[1].trim() });
        continue;
      }
    }
    peeled.push(s);
  }
  return peeled;
}

/** Pass 2: group raw cues into characters using supplied aliases + prefix heuristics. */
function resolveCharacters(speeches: RawSpeech[], opts: ParseOptions, warnings: string[]): Map<string, ScriptCharacter> {
  const counts = new Map<string, number>();
  for (const s of speeches) if (s.kind === 'dialogue' && s.cue) counts.set(s.cue, (counts.get(s.cue) ?? 0) + 1);

  const ignore = new Set((opts.ignoreCues ?? []).map(foldCue));
  const cueToName = new Map<string, string>(); // folded cue -> display name
  for (const [name, cues] of Object.entries(opts.aliases ?? {})) {
    for (const c of cues) cueToName.set(foldCue(c), name);
    cueToName.set(foldCue(name), name);
  }

  const cues = [...counts.keys()].filter((c) => !ignore.has(foldCue(c)));
  // Longest/most frequent cues become anchors; shorter cues that prefix them merge in.
  const anchors = cues.filter((c) => !cueToName.has(foldCue(c)) && (counts.get(c)! >= (opts.minLinesForCharacter ?? 2) || foldCue(c).length >= 5));
  for (const c of cues) {
    const f = foldCue(c);
    if (cueToName.has(f)) continue;
    const longer = anchors.filter((a) => a !== c && foldCue(a).startsWith(f) && foldCue(a).length > f.length);
    if (longer.length) {
      longer.sort((a, b) => counts.get(b)! - counts.get(a)!);
      if (longer.length > 1) warnings.push(`Cue "${c}" is ambiguous (${longer.join(', ')}); merged into "${longer[0]}". Override with aliases if wrong.`);
      const target = longer[0];
      cueToName.set(f, cueToName.get(foldCue(target)) ?? titleCase(target));
      continue;
    }
    const shorterAnchorsOfMe = anchors.filter((a) => a !== c && f.startsWith(foldCue(a)));
    const name = titleCase(c);
    cueToName.set(f, name);
    for (const a of shorterAnchorsOfMe) if (!cueToName.has(foldCue(a))) cueToName.set(foldCue(a), name);
  }

  const chars = new Map<string, ScriptCharacter>();
  for (const s of speeches) {
    if (s.kind !== 'dialogue' || !s.cue) continue;
    const f = foldCue(s.cue);
    if (ignore.has(f)) { s.kind = 'direction'; s.text = `${s.cue}. ${s.text}`; continue; }
    const name = cueToName.get(f) ?? titleCase(s.cue);
    const id = slugify(name);
    const ch = chars.get(id) ?? { id, name, aliases: [], lineCount: 0, wordCount: 0 };
    if (!ch.aliases.includes(s.cue)) ch.aliases.push(s.cue);
    ch.lineCount++;
    ch.wordCount += wordCount(s.text);
    chars.set(id, ch);
    s.cue = id;
  }
  return chars;
}

export function parseScript(text: string, opts: ParseOptions = {}): ParsedScript {
  const warnings: string[] = [];
  const allLines = text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').split('\n');
  const start = findStart(allLines);
  if (start > 0) warnings.push(`Skipped ${start} lines of front matter before the first act/scene heading.`);
  const body = allLines.slice(start);
  // Drop a trailing "FINIS" / "THE END" block if present (use the last marker; some
  // EPUB conversions insert a stray one at a chapter boundary).
  let finis = -1;
  for (let i = body.length - 1; i >= 0; i--) if (/^\s*(FINIS|THE END)\.?\s*$/i.test(body[i])) { finis = i; break; }
  const lines = finis > body.length * 0.8 ? body.slice(0, finis) : body;

  const format = detectFormat(lines);
  if (format === 'unknown') warnings.push('Could not confidently detect the script layout; results may need manual review.');
  const speeches = segment(lines, format, opts);
  const chars = resolveCharacters(speeches, opts, warnings);

  const outLines: ScriptLine[] = [];
  const scenes: ScriptScene[] = [];
  let sceneIndex = -1;
  const openScene = (title: string) => {
    if (sceneIndex >= 0) scenes[sceneIndex].lastLine = outLines.length - 1;
    sceneIndex++;
    scenes.push({ id: `s${sceneIndex + 1}`, index: sceneIndex, title, firstLine: outLines.length, lastLine: outLines.length });
  };
  for (const s of speeches) {
    if (s.kind === 'heading') { openScene(s.text.replace(/\s+/g, ' ')); continue; }
    if (sceneIndex < 0) openScene('Scene 1');
    const idx = outLines.length;
    outLines.push({
      id: `l${String(idx).padStart(5, '0')}`,
      index: idx,
      type: s.kind,
      characterId: s.kind === 'dialogue' ? s.cue : undefined,
      text: s.text,
      sceneIndex,
    });
  }
  if (sceneIndex >= 0) scenes[sceneIndex].lastLine = outLines.length - 1;

  const characters = [...chars.values()].sort((a, b) => b.lineCount - a.lineCount);
  if (characters.length === 0) warnings.push('No speaking characters found.');

  return {
    title: opts.title ?? 'Untitled Script',
    author: opts.author,
    source: opts.source,
    license: opts.license,
    format,
    characters,
    scenes,
    lines: outLines,
    warnings,
  };
}
