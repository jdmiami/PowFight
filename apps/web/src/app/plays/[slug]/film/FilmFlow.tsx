'use client';
import { useRouter } from 'next/navigation';
import { Recorder } from '@/components/Recorder';
import type { Line } from '@/lib/types';

export function FilmFlow({ productionId, lines, doneLineIds }: { productionId: string; lines: Line[]; doneLineIds: string[] }) {
  const router = useRouter();
  if (doneLineIds.length === lines.length) return <p className="card p-4 text-gold">All your lines are in. The play premieres once the whole cast is done. 🎭</p>;
  return <Recorder lines={lines} uploadUrl={`/api/productions/${productionId}/clips`} doneLineIds={doneLineIds} onAllDone={() => router.refresh()} />;
}
