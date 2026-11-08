import { parseUpload } from '@playhouse/script-parser';
import { fail, json } from '@/lib/api';

export const runtime = 'nodejs';

/** Parse an uploaded script and return the ParsedScript preview (nothing is saved). */
export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get('file');
  if (!(file instanceof File)) return fail('Attach a file');
  if (file.size > 20 * 1024 * 1024) return fail('File too large (20MB max)');
  const title = (fd.get('title') as string | null) || undefined;
  try {
    const parsed = parseUpload(file.name, Buffer.from(await file.arrayBuffer()), { title });
    if (parsed.characters.length === 0) return fail('No speaking parts found. Use a play with speaker cues like "ROMEO." or "Rom. ..."');
    return json(parsed);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not read the file');
  }
}
