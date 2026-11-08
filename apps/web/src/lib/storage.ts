import { isDemo } from './env';

const g = globalThis as unknown as { __playhouseMedia?: Map<string, { buf: Buffer; type: string }> };
const demoMedia = (g.__playhouseMedia ??= new Map<string, { buf: Buffer; type: string }>());

/** Persist an uploaded clip. Returns the storage path and a playable URL. */
export async function storeClip(opts: { userId: string; folder: string; name: string; file: File }): Promise<{ storagePath: string; url: string }> {
  const ext = opts.file.type.includes('mp4') ? 'mp4' : 'webm';
  const key = `${opts.userId}/${opts.folder}/${opts.name}.${ext}`;
  const buf = Buffer.from(await opts.file.arrayBuffer());
  if (isDemo) {
    const id = key.replace(/[^a-zA-Z0-9]/g, '_');
    demoMedia.set(id, { buf, type: opts.file.type || 'video/webm' });
    return { storagePath: `demo:${id}`, url: `/api/media/${id}` };
  }
  const { supabaseServer } = await import('./supabase/server');
  const db = await supabaseServer();
  const { error } = await db.storage.from('clips').upload(key, buf, { contentType: opts.file.type || 'video/webm', upsert: true });
  if (error) throw error;
  const { data } = await db.storage.from('clips').createSignedUrl(key, 3600);
  return { storagePath: key, url: data?.signedUrl ?? '' };
}

export function demoMediaGet(id: string) { return demoMedia.get(id); }

export async function clipUrl(storagePath: string): Promise<string | null> {
  if (storagePath.startsWith('demo:')) return `/api/media/${storagePath.slice(5)}`;
  if (isDemo) return null;
  const { supabaseServer } = await import('./supabase/server');
  const db = await supabaseServer();
  const { data } = await db.storage.from('clips').createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}
