import { inflateRawSync } from 'node:zlib';

/** Decode HTML entities and strip tags, turning <br> and </p> into newlines. */
export function htmlToText(html: string): string {
  let t = html;
  t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  t = t.replace(/\s*<br\s*\/?>\s*/gi, '\n');
  t = t.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n\n');
  t = t.replace(/<[^>]+>/g, '');
  t = t
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  return t.replace(/\r\n?/g, '\n');
}

interface ZipEntry { name: string; data: Buffer }

/** Minimal ZIP reader (stored + deflate) so we can read EPUBs with zero dependencies. */
export function readZip(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  // Locate End Of Central Directory record.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a ZIP/EPUB file');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('Bad central directory');
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.subarray(off + 46, off + 46 + nameLen).toString('utf8');
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    const data = method === 8 ? inflateRawSync(raw) : method === 0 ? Buffer.from(raw) : null;
    if (data) entries.push({ name, data });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Extract readable text from an EPUB, following the OPF spine order when available. */
export function epubToText(buf: Buffer): { text: string; title?: string; author?: string } {
  const entries = readZip(buf);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const container = byName.get('META-INF/container.xml')?.data.toString('utf8') ?? '';
  const opfPath = /full-path="([^"]+)"/.exec(container)?.[1];
  let ordered: string[] = [];
  let title: string | undefined;
  let author: string | undefined;
  if (opfPath && byName.has(opfPath)) {
    const opf = byName.get(opfPath)!.data.toString('utf8');
    const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
    title = /<dc:title[^>]*>([^<]+)</.exec(opf)?.[1]?.trim();
    author = /<dc:creator[^>]*>([^<]+)</.exec(opf)?.[1]?.trim();
    const items = new Map<string, string>();
    for (const m of opf.matchAll(/<item\s[^>]*?id="([^"]+)"[^>]*?href="([^"]+)"[^>]*?media-type="application\/xhtml\+xml"/g)) items.set(m[1], base + m[2]);
    for (const m of opf.matchAll(/<item\s[^>]*?href="([^"]+)"[^>]*?id="([^"]+)"[^>]*?media-type="application\/xhtml\+xml"/g)) items.set(m[2], base + m[1]);
    for (const m of opf.matchAll(/<itemref\s[^>]*?idref="([^"]+)"/g)) {
      const href = items.get(m[1]);
      if (href && byName.has(href)) ordered.push(href);
    }
  }
  if (ordered.length === 0) {
    ordered = entries.filter((e) => /\.x?html?$/i.test(e.name)).map((e) => e.name).sort();
  }
  const text = ordered.map((n) => htmlToText(byName.get(n)!.data.toString('utf8'))).join('\n\n');
  return { text, title, author };
}

/** Trim Project Gutenberg boilerplate (header/footer) when present. */
export function stripGutenberg(text: string): { text: string; source?: string; title?: string; author?: string } {
  let out = text;
  let source: string | undefined;
  const id = /\[e(?:Book|text) #(\d+)\]/i.exec(text)?.[1];
  if (id) source = `Project Gutenberg #${id}`;
  const title = /^\s*Title:\s*(.+)$/m.exec(text)?.[1]?.trim();
  const author = /^\s*Author:\s*(.+)$/m.exec(text)?.[1]?.trim();
  const start = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*\*\*\*/i.exec(out);
  if (start) out = out.slice(start.index + start[0].length);
  const end = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG/i.exec(out);
  if (end) out = out.slice(0, end.index);
  return { text: out, source, title, author };
}
