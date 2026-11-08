/**
 * Render worker. Polls `render_jobs`, builds a stitch plan from the database, downloads the clips,
 * renders with ffmpeg, uploads the MP4 + poster to the public `renders` bucket and updates rows.
 *
 * Run anywhere ffmpeg exists (Docker image provided). Scale horizontally: jobs are claimed with
 * an atomic UPDATE ... WHERE status='queued'.
 */
import { createClient } from '@supabase/supabase-js';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stitch, type Segment } from './stitch.ts';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const POLL_MS = Number(process.env.POLL_MS ?? 5000);

interface Job { id: string; kind: 'audition_reel' | 'production'; production_id: string | null; audition_id: string | null; attempts: number }

async function claimJob(): Promise<Job | null> {
  const { data } = await db.from('render_jobs').select('id, kind, production_id, audition_id, attempts')
    .eq('status', 'queued').order('created_at').limit(1).maybeSingle();
  if (!data) return null;
  const { data: claimed } = await db.from('render_jobs')
    .update({ status: 'running', started_at: new Date().toISOString(), attempts: data.attempts + 1 })
    .eq('id', data.id).eq('status', 'queued').select('id').maybeSingle();
  return claimed ? (data as Job) : null;
}

async function download(storagePath: string, dest: string) {
  const { data, error } = await db.storage.from('clips').download(storagePath);
  if (error || !data) throw new Error(`download ${storagePath}: ${error?.message}`);
  await writeFile(dest, Buffer.from(await data.arrayBuffer()));
}

async function upload(local: string, remote: string, contentType: string) {
  const { error } = await db.storage.from('renders').upload(remote, await readFile(local), { contentType, upsert: true });
  if (error) throw error;
  return db.storage.from('renders').getPublicUrl(remote).data.publicUrl;
}

/** Audition reel: the actor's side clips in script order, with a name card first. */
async function planAuditionReel(auditionId: string, work: string): Promise<{ title: string; segments: Segment[] }> {
  const { data: a } = await db.from('auditions')
    .select('id, production_id, character:characters(name), actor:profiles(display_name, handle), production:productions(title)')
    .eq('id', auditionId).single();
  if (!a) throw new Error('audition not found');
  const { data: clips } = await db.from('clips').select('id, storage_path, trim_start_ms, trim_end_ms, line:script_lines(idx, text)')
    .eq('audition_id', auditionId).eq('purpose', 'audition').neq('moderation', 'rejected');
  const sorted = (clips ?? []).sort((x, y) => (x.line as { idx: number }).idx - (y.line as { idx: number }).idx);
  const segments: Segment[] = [{ kind: 'card', text: `${(a.actor as { display_name: string }).display_name} as ${(a.character as { name: string }).name}`, small: (a.production as { title: string }).title, seconds: 2 }];
  for (const c of sorted) {
    const local = path.join(work, `${c.id}.mp4`);
    await download(c.storage_path, local);
    segments.push({ kind: 'clip', file: local, trimStartMs: c.trim_start_ms, trimEndMs: c.trim_end_ms });
  }
  return { title: `${(a.actor as { handle: string }).handle} audition`, segments };
}

/** Full production: title card, then every line in order; headings/directions become cards. */
async function planProduction(productionId: string, work: string): Promise<{ title: string; segments: Segment[] }> {
  const { data: p } = await db.from('productions').select('id, title, script_id, script:scripts(title, author)').eq('id', productionId).single();
  if (!p) throw new Error('production not found');
  const { data: lines } = await db.from('script_lines').select('id, idx, type, text, character:characters(name)').eq('script_id', p.script_id).order('idx');
  const { data: clips } = await db.from('clips').select('id, line_id, storage_path, trim_start_ms, trim_end_ms, created_at')
    .eq('production_id', productionId).eq('purpose', 'performance').eq('moderation', 'approved').order('created_at', { ascending: false });
  const latestByLine = new Map<string, { id: string; storage_path: string; trim_start_ms: number | null; trim_end_ms: number | null }>();
  for (const c of clips ?? []) if (!latestByLine.has(c.line_id)) latestByLine.set(c.line_id, c);

  const script = p.script as { title: string; author: string | null };
  const segments: Segment[] = [{ kind: 'card', text: script.title, small: `${script.author ? 'by ' + script.author + ' · ' : ''}performed by The Play House`, seconds: 4 }];
  const missing: string[] = [];
  for (const l of lines ?? []) {
    if (l.type === 'heading') { segments.push({ kind: 'card', text: l.text, seconds: 3 }); continue; }
    if (l.type === 'direction') { segments.push({ kind: 'card', text: l.text, seconds: Math.min(4, 2 + l.text.length / 60) }); continue; }
    const c = latestByLine.get(l.id);
    if (!c) { missing.push(l.id); continue; }
    const local = path.join(work, `${c.id}.mp4`);
    await download(c.storage_path, local);
    segments.push({ kind: 'clip', file: local, speaker: (l.character as { name: string } | null)?.name, trimStartMs: c.trim_start_ms, trimEndMs: c.trim_end_ms });
  }
  if (missing.length) throw new Error(`${missing.length} dialogue lines have no approved clip`);
  segments.push({ kind: 'card', text: 'FINIS', small: 'Made line by line at theplayhouse.app', seconds: 4 });
  return { title: p.title, segments };
}

async function process(job: Job) {
  const work = await mkdtemp(path.join(tmpdir(), 'ph-job-'));
  try {
    const plan = job.kind === 'audition_reel'
      ? await planAuditionReel(job.audition_id!, work)
      : await planProduction(job.production_id!, work);
    const output = path.join(work, 'out.mp4');
    const posterOut = path.join(work, 'poster.jpg');
    await stitch({ ...plan, workDir: path.join(work, 'w'), output, posterOutput: posterOut, burnSpeakerNames: job.kind === 'production',
      onProgress: (d, t) => console.log(`[${job.id}] ${d}/${t}`) });
    const base = job.kind === 'audition_reel' ? `auditions/${job.audition_id}` : `productions/${job.production_id}`;
    const videoUrl = await upload(output, `${base}/${job.id}.mp4`, 'video/mp4');
    const posterUrl = await upload(posterOut, `${base}/${job.id}.jpg`, 'image/jpeg');
    if (job.kind === 'audition_reel') {
      await db.from('auditions').update({ stitched_url: videoUrl, poster_url: posterUrl }).eq('id', job.audition_id!);
    } else {
      await db.from('productions').update({ final_video_url: videoUrl, final_poster_url: posterUrl, status: 'premiered' }).eq('id', job.production_id!);
    }
    await db.from('render_jobs').update({ status: 'done', output_path: videoUrl, finished_at: new Date().toISOString() }).eq('id', job.id);
    console.log(`[${job.id}] done -> ${videoUrl}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[${job.id}] failed: ${msg}`);
    await db.from('render_jobs').update({ status: job.attempts >= 3 ? 'failed' : 'queued', error: msg.slice(0, 2000), finished_at: new Date().toISOString() }).eq('id', job.id);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

async function main() {
  console.log('The Play House render worker started');
  for (;;) {
    const job = await claimJob();
    if (job) await process(job);
    else await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
