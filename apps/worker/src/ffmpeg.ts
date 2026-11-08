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

export interface NormalizeOptions {
  /** Trim window in ms, from the recorder (half a second before the first word to half a second after the last). */
  trimStartMs?: number | null;
  trimEndMs?: number | null;
  /** Burn a speaker lower-third in the same pass. */
  speaker?: string;
}

/**
 * Normalize any phone clip into the house format: 1080x1920 portrait, 30fps, h264 + aac 48k stereo.
 *  - Near-portrait sources are padded; wide sources (laptops, landscape phones) are centre-cropped to 9:16
 *    so faces fill the frame the way the recorder's guide promised.
 *  - Trims to the recorder's pre/post-roll points with accurate seeking.
 *  - Audio: high-pass, light denoise, loudness normalization, 40 ms fades so hard cuts never click.
 *  - Adds a silent track when the source has none so the concat demuxer never sees a stream mismatch.
 */
export async function normalize(input: string, output: string, opts: NormalizeOptions = {}): Promise<void> {
  const info = await probe(input);
  const aspect = info.width && info.height ? info.width / info.height : 9 / 16;
  const frame = aspect > 0.6
    ? `crop=ih*9/16:ih,scale=${OUTPUT.width}:${OUTPUT.height}`
    : `scale=${OUTPUT.width}:${OUTPUT.height}:force_original_aspect_ratio=decrease,pad=${OUTPUT.width}:${OUTPUT.height}:(ow-iw)/2:(oh-ih)/2:color=black`;
  const vfParts = [frame, 'setsar=1', `fps=${OUTPUT.fps}`];
  if (opts.speaker) vfParts.push(`drawtext=text='${escapeDrawtext(opts.speaker)}':fontcolor=0xF4EDE4:fontsize=44:box=1:boxcolor=0x09070AAA:boxborderw=18:x=60:y=h-200:font=sans`);
  vfParts.push('format=yuv420p');
  const start = Math.max(0, (opts.trimStartMs ?? 0) / 1000);
  const end = opts.trimEndMs && opts.trimEndMs > (opts.trimStartMs ?? 0) ? opts.trimEndMs / 1000 : undefined;
  // Silent sources get an infinite anullsrc track, so always bound the output duration explicitly
  // (-shortest over-runs by up to a second with lavfi inputs).
  const dur = end !== undefined ? Math.max(0.5, end - start) : !info.hasAudio && info.duration ? Math.max(0.5, info.duration - start) : undefined;
  const args = ['-y', '-i', input];
  if (!info.hasAudio) args.push('-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=${OUTPUT.audioRate}`);
  if (start > 0) args.push('-ss', start.toFixed(3));           // after -i: accurate seek
  if (dur !== undefined) args.push('-t', dur.toFixed(3));
  const afade = dur !== undefined ? `,afade=t=out:st=${Math.max(0, dur - 0.04).toFixed(3)}:d=0.04` : '';
  args.push(
    '-vf', vfParts.join(','),
    '-af', `highpass=f=80,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.04${afade}`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high', '-level', '4.1',
    '-c:a', 'aac', '-b:a', '128k', '-ar', String(OUTPUT.audioRate), '-ac', '2',
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
