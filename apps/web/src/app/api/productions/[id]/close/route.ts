import { fail, json, withUser } from '@/lib/api';
import { getData } from '@/lib/data';
import { isDemo } from '@/lib/env';

export const runtime = 'nodejs';

/** Close auditions, crown winners, fund prize pools, move to filming. Admin (or anyone in demo). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(async (user) => {
    if (!isDemo && !user.isAdmin) return fail('Admin only', 403);
    await (await getData()).closeCasting(id);
    return json({ ok: true });
  });
}
