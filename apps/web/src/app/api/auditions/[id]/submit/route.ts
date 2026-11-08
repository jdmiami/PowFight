import { fail, json, withUser } from '@/lib/api';
import { getData } from '@/lib/data';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(async (user) => {
    const data = await getData();
    const a = await data.getAudition(id);
    if (!a || a.actorId !== user.id) return fail('Not your audition', 403);
    if (a.sides.length === 0) return fail('This role has no audition sides configured');
    const recorded = new Set(a.clips.map((c) => c.lineId));
    const missing = a.sides.filter((s) => !recorded.has(s.id));
    if (missing.length) return fail(`Record all ${a.sides.length} sides first (${missing.length} missing)`);
    await data.submitAudition(id, user.id);
    return json({ ok: true });
  });
}
