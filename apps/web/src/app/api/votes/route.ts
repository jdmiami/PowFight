import { json, withUser } from '@/lib/api';
import { getData } from '@/lib/data';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  return withUser(async (user) => {
    const { auditionId } = (await req.json()) as { auditionId: string };
    await (await getData()).vote(auditionId, user.id);
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return withUser(async (user) => {
    const { auditionId } = (await req.json()) as { auditionId: string };
    const data = await getData();
    const a = await data.getAudition(auditionId);
    if (a) await data.unvote(a.productionId, a.characterId, user.id);
    return json({ ok: true });
  });
}
