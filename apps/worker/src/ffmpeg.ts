import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const OUTPUT = { width: 1080, height: 1920, fps: 30, audioRate: 48000 } as const;

export function run(cmd: string, args: string[], opts: { cwd?: string } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}\n${err.slice(-4000)}`))));
  });
}

/** Probe duration (seconds) and whether an audio stream exists. */
export async function probe(file: string): Promise<{ duration: number; hasAudio: boolean; width: number; height: number }> {
  const json = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  const info = JSON.parse(json);
  const v = info.streams.find((s: { codec_type: string }) => s.codec_type === 'video') ?? {};
  return {
    duration: Number(info.format?.duration ?? 0),
    hasAudio: info.streams.some((s: { codec_type: string }) => s.codec_type === 'audio'),
    width: Number(v.width ?? 0),
    height: Number(v.height ?? 0),
  };
}

/**
 * Normalize any phone clip into the house format: 1080x1920 portrait, 30fps, h264 + aac 48k stereo.
 * Letterbox/pillarbox instead of cropping so nothing of the actor's frame is lost, and add a silent
 * audio track when the source has none so the concat demuxer never sees a stream mismatch.
 */
export async function normalize(input: string, output: string): Promise<void> {
  const { hasAudio } = await probe(input);
  const vf = `scale=${OUTPUT.width}:${OUTPUT.height}:force_original_aspect_ratio=decrease,pad=${OUTPUT.width}:${OUTPUT.height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${OUTPUT.fps},format=yuv420p`;
  const args = ['-y', '-i', input];
  if (!hasAudio) args.push('-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=${OUTPUT.audioRate}`, '-shortest');
  args.push(
    '-vf', vf,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high', '-level', '4.1',
    '-c:a', 'aac', '-b:a', '128k', '-ar', String(OUTPUT.audioRate), '-ac', '2',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-movflags', '+faststart',
    output,
  );
  await run('ffmpeg', args);
}

function escapeDrawtext(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\\\\\'").replace(/%/g, '\\%');
}

/** Wrap text to a given max characters per line for drawtext. */
export function wrap(text: string, max = 28): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.join('\n');
}

/**
 * Render a title/stage-direction card: dark red curtain gradient, centered serif text, silent audio.
 * Used for the production title, act/scene headings and stage directions ("Enter Romeo").
 */
export async function titleCard(text: string, output: string, seconds = 3, opts: { small?: string } = {}): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'ph-card-'));
  try {
    const main = path.join(dir, 'main.txt');
    await writeFile(main, wrap(text));
    const filters = [
      `drawtext=textfile='${main}':fontcolor=0xF5E6C8:fontsize=64:line_spacing=18:x=(w-text_w)/2:y=(h-text_h)/2:font=serif`,
    ];
    if (opts.small) {
      const small = path.join(dir, 'small.txt');
      await writeFile(small, wrap(opts.small, 40));
      filters.push(`drawtext=textfile='${small}':fontcolor=0xC9A86A:fontsize=34:x=(w-text_w)/2:y=h*0.72:font=serif`);
    }
    await run('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', `color=c=0x1a0a0c:s=${OUTPUT.width}x${OUTPUT.height}:r=${OUTPUT.fps}:d=${seconds}`,
      '-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=${OUTPUT.audioRate}`,
      '-t', String(seconds),
      '-vf', `${filters.join(',')},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high', '-level', '4.1',
      '-c:a', 'aac', '-b:a', '128k', '-ar', String(OUTPUT.audioRate), '-ac', '2',
      '-movflags', '+faststart',
      output,
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Concatenate already-normalized segments losslessly via the concat demuxer. */
export async function concat(segments: string[], output: string): Promise<void> {
  if (segments.length === 0) throw new Error('nothing to concat');
  const dir = await mkdtemp(path.join(tmpdir(), 'ph-concat-'));
  try {
    const list = path.join(dir, 'list.txt');
    await writeFile(list, segments.map((s) => `file '${path.resolve(s).replace(/'/g, "'\\''")}'`).join('\n'));
    await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Grab a poster frame one second in. */
export async function poster(video: string, output: string): Promise<void> {
  await run('ffmpeg', ['-y', '-ss', '1', '-i', video, '-frames:v', '1', '-q:v', '3', output]);
}

/** Lower-third caption burned into a clip (speaker name). Optional; keeps the stitched play legible. */
export async function captionSpeaker(input: string, speaker: string, output: string): Promise<void> {
  await run('ffmpeg', [
    '-y', '-i', input,
    '-vf', `drawtext=text='${escapeDrawtext(speaker)}':fontcolor=0xF5E6C8:fontsize=44:box=1:boxcolor=0x000000AA:boxborderw=18:x=60:y=h-200:font=sans`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-c:a', 'copy', '-movflags', '+faststart', output,
  ]);
}
