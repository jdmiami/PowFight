import { demoMediaGet } from '@/lib/storage';

export const runtime = 'nodejs';

/** Serves clips recorded in demo mode (in-memory). Real deployments stream from Supabase Storage. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = demoMediaGet(id);
  if (!m) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(m.buf), { headers: { 'content-type': m.type, 'cache-control': 'no-store', 'accept-ranges': 'bytes' } });
}
