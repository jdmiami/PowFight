import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { run, probe, wrap } from '../src/ffmpeg.ts';
import { stitch } from '../src/stitch.ts';

async function fakePhoneClip(file: string, seconds: number, withAudio: boolean, size = '720x1280') {
  const args = ['-y', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=24:duration=${seconds}`];
  if (withAudio) args.push('-f', 'lavfi', '-i', `sine=frequency=440:duration=${seconds}`, '-c:a', 'aac');
  args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', file);
  await run('ffmpeg', args);
}

test('wrap breaks long lines', () => {
  const w = wrap('But soft, what light through yonder window breaks? It is the East, and Juliet is the sun.', 28);
  assert.ok(w.split('\n').every((l) => l.length <= 28));
});

test('stitches mixed clips and cards into one normalized mp4', { timeout: 120_000 }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ph-test-'));
  try {
    const a = path.join(dir, 'a.mp4'), b = path.join(dir, 'b.mp4'), c = path.join(dir, 'c.mp4');
    await fakePhoneClip(a, 2, true);              // portrait with audio
    await fakePhoneClip(b, 1.5, false, '1280x720'); // landscape, silent (gets letterboxed + silent track)
    await fakePhoneClip(c, 1, true, '1080x1920');
    const output = path.join(dir, 'play.mp4');
    const posterOut = path.join(dir, 'poster.jpg');
    const r = await stitch({
      title: 'Romeo and Juliet',
      workDir: path.join(dir, 'work'),
      output,
      posterOutput: posterOut,
      burnSpeakerNames: true,
      segments: [
        { kind: 'card', text: 'Romeo and Juliet', small: 'The Play House presents', seconds: 2 },
        { kind: 'clip', file: a, speaker: 'Romeo' },
        { kind: 'card', text: 'Enter Juliet above', seconds: 1 },
        { kind: 'clip', file: b, speaker: 'Juliet' },
        { kind: 'clip', file: c },
      ],
    });
    assert.equal(r.segments, 5);
    const info = await probe(output);
    assert.equal(info.width, 1080);
    assert.equal(info.height, 1920);
    assert.ok(info.hasAudio);
    assert.ok(info.duration > 7 && info.duration < 9, `duration ${info.duration}`);
    assert.ok(r.poster);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
