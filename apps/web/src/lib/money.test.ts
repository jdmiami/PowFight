import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prizeForRole, formatUsd } from './money.ts';

test('spec example: $12 entry, $2 house, winner gets $10 per entrant', () => {
  const r = prizeForRole({ entrants: 7, entryFeeCents: 1200, houseFeeCents: 200 });
  assert.equal(r.winnerCents, 7000);
  assert.equal(r.houseCents, 1400);
  assert.equal(r.grossCents, 8400);
  assert.equal(r.winnerCents + r.houseCents, r.grossCents, 'money is conserved');
});

test('single entrant gets their $10 back', () => {
  const r = prizeForRole({ entrants: 1, entryFeeCents: 1200, houseFeeCents: 200 });
  assert.equal(r.winnerCents, 1000);
  assert.equal(r.houseCents, 200);
});

test('formatUsd', () => {
  assert.equal(formatUsd(1200), '$12');
  assert.equal(formatUsd(1250), '$12.50');
});
