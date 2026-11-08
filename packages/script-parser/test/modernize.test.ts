import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modernize, looksEarlyModern } from '../src/index.ts';

test('modernizes folio spelling', () => {
  assert.equal(modernize("'Tis almost morning, I would haue thee gone,"), "'Tis almost morning, I would have thee gone,");
  assert.equal(modernize('So louing Iealous of his liberty'), 'So loving Jealous of his liberty');
  assert.equal(modernize('Is there no pittie sitting in the Cloudes,'), 'Is there no pity sitting in the Clouds,');
  assert.equal(modernize('What draw, and talke of peace? I hate the word'), 'What draw, and talk of peace? I hate the word');
  assert.equal(modernize('Haue at thee Coward.'), 'Have at thee Coward.');
  assert.equal(modernize('A dog of the house of Mountague, moues me'), 'A dog of the house of Montague, moves me');
  assert.equal(modernize('O Romeo, Romeo, wherefore art thou Romeo?'), 'O Romeo, Romeo, wherefore art thou Romeo?');
  assert.equal(modernize('Iuliet is the Sunne'), 'Juliet is the Sun');
  assert.equal(modernize('vp'), 'up');
  assert.equal(modernize('That let\'s it hop a little from his hand, like a gentle bird'), 'That let\'s it hop a little from his hand, like a gentle bird');
  assert.equal(modernize('the bottome of my griefe, a poore prisoner, a weeke'), 'the bottom of my grief, a poor prisoner, a week');
});

test('leaves modern text alone', () => {
  const s = 'But soft, what light through yonder window breaks? It is the east, and Juliet is the sun.';
  assert.equal(modernize(s), s);
});

test('detects early modern text', () => {
  assert.equal(looksEarlyModern('I would haue thee gone, loue, vpon my selfe, neuer euer giue'), true);
  assert.equal(looksEarlyModern('Hello there, general Kenobi.'), false);
});
