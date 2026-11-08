import type { ParsedScript } from '@playhouse/script-parser';
import { fail, json, withUser } from '@/lib/api';
import { isStoryteller } from '@/lib/auth';
import { getData } from '@/lib/data';
import { isDemo } from '@/lib/env';

export const runtime = 'nodejs';

/** Save a parsed script and open its first production for casting. Requires the Storyteller plan. */
export async function POST(req: Request) {
  return withUser(async (user) => {
    const body = (await req.json()) as { parsed: ParsedScript; auditionDays?: number; attest?: boolean };
    if (!body.attest) return fail('You must confirm you have the rights to this script');
    if (!isDemo && !isStoryteller(user)) return fail('Storyteller plan required', 402);
    if (!body.parsed?.lines?.length) return fail('Nothing to stage');
    const data = await getData();
    const script = await data.createScript(body.parsed, user.id);
    const closeAt = new Date(Date.now() + Math.min(30, Math.max(1, body.auditionDays ?? 7)) * 86400_000).toISOString();
    const production = await data.createProduction(script.id, script.title, closeAt);
    return json({ slug: production.slug, productionId: production.id });
  });
}
