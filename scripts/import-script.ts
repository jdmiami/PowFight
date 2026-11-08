/**
 * Seed a parsed script into Supabase and open its first production.
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… OWNER_ID=<profile uuid> \
 *   node --experimental-strip-types scripts/import-script.ts content/romeo-and-juliet.json [auditionDays]
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { pickSides, estimateSeconds, slugify, type ParsedScript } from '../packages/script-parser/src/index.ts';

const [file, daysArg] = process.argv.slice(2);
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const owner = process.env.OWNER_ID;
if (!file || !url || !key || !owner) { console.error('usage: SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY OWNER_ID … import-script.ts <parsed.json> [days]'); process.exit(1); }

const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as ParsedScript;
const db = createClient(url, key, { auth: { persistSession: false } });

const slug = slugify(parsed.title);
const { data: s, error } = await db.from('scripts').insert({ owner_id: owner, slug, title: parsed.title, author: parsed.author, source: parsed.source, license: parsed.license, rights_attestation: true, status: 'published', format: parsed.format, parsed, warnings: parsed.warnings }).select('*').single();
if (error) throw error;
const { data: chars } = await db.from('characters').insert(parsed.characters.map((c, i) => ({ script_id: s.id, key: c.id, name: c.name, aliases: c.aliases, line_count: c.lineCount, word_count: c.wordCount, sort_order: i }))).select('id, key');
const charByKey = new Map((chars ?? []).map((c) => [c.key, c.id]));
const rows = parsed.lines.map((l) => ({ script_id: s.id, idx: l.index, scene_idx: l.sceneIndex, scene_title: parsed.scenes[l.sceneIndex]?.title ?? null, type: l.type, character_id: l.characterId ? charByKey.get(l.characterId) ?? null : null, text: l.text, est_seconds: estimateSeconds(l.text) }));
for (let i = 0; i < rows.length; i += 500) { const { error: e } = await db.from('script_lines').insert(rows.slice(i, i + 500)); if (e) throw e; }
const { data: lines } = await db.from('script_lines').select('id, idx').eq('script_id', s.id);
const lineIdByIdx = new Map((lines ?? []).map((l) => [l.idx, l.id]));
const sides = parsed.characters.flatMap((c) => pickSides(parsed, c.id, 3).map((l, i) => ({ character_id: charByKey.get(c.id), line_id: lineIdByIdx.get(l.index), sort_order: i })));
if (sides.length) { const { error: e } = await db.from('audition_sides').insert(sides); if (e) throw e; }
const days = Number(daysArg ?? 7);
const { data: p, error: pe } = await db.from('productions').insert({ script_id: s.id, title: parsed.title, slug, auditions_close_at: new Date(Date.now() + days * 86400_000).toISOString(), created_by: owner }).select('slug').single();
if (pe) throw pe;
console.log(`Imported "${parsed.title}": ${parsed.characters.length} characters, ${rows.length} lines. Casting open at /plays/${p.slug}`);
