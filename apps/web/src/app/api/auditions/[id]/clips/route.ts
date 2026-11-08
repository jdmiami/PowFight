import { fail, json, withUser } from '@/lib/api';
import { getData } from '@/lib/data';
import { storeClip } from '@/lib/storage';

export const runtime = 'nodejs';

/** Upload one side take for an audition. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(async (user) => {
    const data = await getData();
    const a = await data.getAudition(id);
    if (!a || a.actorId !== user.id) return fail('Not your audition', 403);
    if (!['draft', 'submitted'].includes(a.status)) return fail('Pay the entry fee first', 402);
    const fd = await req.formData();
    const file = fd.get('file'); const lineId = fd.get('lineId') as string | null;
    if (!(file instanceof File) || !lineId) return fail('file and lineId required');
    if (file.size > 60 * 1024 * 1024) return fail('Clip too large (60MB max)');
    if (!a.sides.some((s) => s.id === lineId)) return fail('That line is not one of the sides');
    const { storagePath, url } = await storeClip({ userId: user.id, folder: `auditions/${id}`, name: lineId, file });
    const clip = await data.addClip({ ownerId: user.id, productionId: a.productionId, lineId, auditionId: id, purpose: 'audition', storagePath, durationMs: Number(fd.get('durationMs') ?? 0) || null, actionAtMs: Number(fd.get('actionAtMs') ?? 0) || null, trimStartMs: Number(fd.get('trimStartMs') ?? 0) || null, trimEndMs: Number(fd.get('trimEndMs') ?? 0) || null });
    return json({ clip: { ...clip, url } });
  });
}
