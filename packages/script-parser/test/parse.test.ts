import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseScript, parseUpload, ROMEO_AND_JULIET, pickSides, detectFormat } from '../src/index.ts';

const FIXTURE = path.join(import.meta.dirname, '..', '..', '..', 'content', 'romeo-and-juliet.txt');

test('parses the Gutenberg folio Romeo and Juliet', () => {
  const text = fs.readFileSync(FIXTURE, 'utf8');
  const s = parseUpload('romeo-and-juliet.txt', Buffer.from(text), ROMEO_AND_JULIET);
  assert.equal(s.title, 'Romeo and Juliet');
  assert.equal(s.format, 'inline-cue');
  const byId = Object.fromEntries(s.characters.map((c) => [c.id, c]));
  assert.ok(byId.romeo.lineCount > 150, 'Romeo has the most lines');
  assert.ok(byId.juliet.lineCount > 100);
  assert.ok(byId['friar-lawrence'].aliases.includes('Law'), 'Law. merges into Friar Lawrence');
  assert.ok(byId['lady-capulet'].aliases.includes('Wife'));
  assert.ok(!byId.barnardo, 'Hamlet lines quoted in the preface are ignored');
  assert.ok(byId.watchman.lineCount >= 7, 'numbered cues like "3.Wat." are parsed');
  const dialogue = s.lines.filter((l) => l.type === 'dialogue');
  assert.ok(dialogue.length > 800 && dialogue.length < 870, `dialogue count ${dialogue.length}`);
  assert.ok(s.lines[0].text.startsWith('Enter Sampson and Gregory'));
  assert.ok(s.lines[0].text.includes('Capulet'), 'multi-line stage direction is kept together');
});

test('block-cue format (modern uppercase names)', () => {
  const text = `ACT I\nSCENE I. Verona.\n\nEnter SAMPSON and GREGORY.\n\nSAMPSON.\nGregory, on my word, we'll not carry coals.\n\nGREGORY.\nNo, for then we should be colliers.\n\nSAMPSON.\nI mean, an we be in choler, we'll draw.\n\nGREGORY.\nAy, while you live, draw your neck out o' the collar.\n\nSAMPSON.\nI strike quickly, being moved.\n\nGREGORY.\nBut thou art not quickly moved to strike.\n`;
  const s = parseScript(text, { title: 'T' });
  assert.equal(s.format, 'block-cue');
  assert.deepEqual(s.characters.map((c) => c.name).sort(), ['Gregory', 'Sampson']);
  assert.equal(s.lines.filter((l) => l.type === 'dialogue').length, 6);
  assert.equal(s.scenes.length, 2);
});

test('pickSides returns the same sides deterministically', () => {
  const text = fs.readFileSync(FIXTURE, 'utf8');
  const s = parseUpload('x.txt', Buffer.from(text), ROMEO_AND_JULIET);
  const a = pickSides(s, 'juliet', 3).map((l) => l.id);
  const b = pickSides(s, 'juliet', 3).map((l) => l.id);
  assert.deepEqual(a, b);
  assert.equal(a.length, 3);
});

test('detectFormat on tiny input is unknown', () => {
  assert.equal(detectFormat(['hello', 'world']), 'unknown');
});
