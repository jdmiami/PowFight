import { fail, json, withUser } from '@/lib/api';
import { getData } from '@/lib/data';
import { storeClip } from '@/lib/storage';

export const runtime = 'nodejs';

/** Cast members upload a performance take for one of their lines. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(async (user) => {
    const data = await getData();
    const fd = await req.formData();
    const file = fd.get('file'); const lineId = fd.get('lineId') as string | null;
    if (!(file instanceof File) || !lineId) return fail('file and lineId required');
    const mine = await data.myLinesToFilm(id, user.id);
    if (!mine.some((m) => m.line.id === lineId)) return fail('That line is not yours to perform', 403);
    const { storagePath, url } = await storeClip({ userId: user.id, folder: `performance/${id}`, name: lineId, file });
    const clip = await data.addClip({ ownerId: user.id, productionId: id, lineId, purpose: 'performance', storagePath, durationMs: Number(fd.get('durationMs') ?? 0) || null, actionAtMs: Number(fd.get('actionAtMs') ?? 0) || null, trimStartMs: Number(fd.get('trimStartMs') ?? 0) || null, trimEndMs: Number(fd.get('trimEndMs') ?? 0) || null });
    return json({ clip: { ...clip, url } });
  });
}
