import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { concat, normalize, titleCard, poster } from './ffmpeg.ts';

export type Segment =
  | { kind: 'clip'; file: string; speaker?: string; trimStartMs?: number | null; trimEndMs?: number | null }
  | { kind: 'card'; text: string; small?: string; seconds?: number };

export interface StitchPlan {
  title: string;
  segments: Segment[];
  workDir: string;
  output: string;
  posterOutput?: string;
  burnSpeakerNames?: boolean;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Turn a plan (ordered clips + cards) into one MP4. Each clip is normalized to the house format,
 * every card is rendered, then everything is concatenated with stream copy.
 */
export async function stitch(plan: StitchPlan): Promise<{ output: string; poster?: string; segments: number }> {
  await mkdir(plan.workDir, { recursive: true });
  const prepared: string[] = [];
  const total = plan.segments.length;
  for (let i = 0; i < total; i++) {
    const seg = plan.segments[i];
    const n = String(i).padStart(4, '0');
    const out = path.join(plan.workDir, `seg-${n}.mp4`);
    if (seg.kind === 'card') {
      await titleCard(seg.text, out, seg.seconds ?? 3, { small: seg.small });
    } else {
      await normalize(seg.file, out, { trimStartMs: seg.trimStartMs, trimEndMs: seg.trimEndMs, speaker: plan.burnSpeakerNames ? seg.speaker : undefined });
    }
    prepared.push(out);
    plan.onProgress?.(i + 1, total);
  }
  await concat(prepared, plan.output);
  let posterPath: string | undefined;
  if (plan.posterOutput) { await poster(plan.output, plan.posterOutput); posterPath = plan.posterOutput; }
  return { output: plan.output, poster: posterPath, segments: prepared.length };
}
