export * from './types.ts';
export { parseScript, detectFormat, foldCue, slugify } from './parse.ts';
export { epubToText, htmlToText, readZip, stripGutenberg } from './text.ts';
export { ROMEO_AND_JULIET } from './presets.ts';
export { pickSides, estimateSeconds } from './sides.ts';

import { parseScript } from './parse.ts';
import { epubToText, htmlToText, stripGutenberg } from './text.ts';
import type { ParseOptions, ParsedScript } from './types.ts';

/** One-shot: accept an uploaded file (epub/html/txt/fountain) and return a ParsedScript. */
export function parseUpload(filename: string, data: Buffer, opts: ParseOptions = {}): ParsedScript {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  let text: string;
  let meta: { title?: string; author?: string; source?: string } = {};
  if (ext === 'epub' || (data[0] === 0x50 && data[1] === 0x4b)) {
    const r = epubToText(data);
    text = r.text; meta = { title: r.title, author: r.author };
  } else if (ext === 'html' || ext === 'htm' || ext === 'xhtml') {
    text = htmlToText(data.toString('utf8'));
  } else {
    text = data.toString('utf8');
  }
  const g = stripGutenberg(text);
  return parseScript(g.text, {
    ...opts,
    title: opts.title ?? g.title ?? meta.title,
    author: opts.author ?? g.author ?? meta.author,
    source: opts.source ?? g.source,
  });
}
export { modernize, modernizeWord, looksEarlyModern } from './modernize.ts';
