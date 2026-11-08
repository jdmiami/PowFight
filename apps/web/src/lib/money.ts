/**
 * Prize economics for one role in one production.
 *   - Every entrant pays the entry fee ($12).
 *   - The house keeps the house fee ($2) from each entry.
 *   - The winner receives (entry - house) = $10 from EACH entrant (their own $10 included).
 * So a role with 7 entrants pays the winner $70 and the house $14.
 */
export interface RolePool {
  entrants: number;
  entryFeeCents: number;
  houseFeeCents: number;
}

export function prizeForRole({ entrants, entryFeeCents, houseFeeCents }: RolePool) {
  if (entrants < 0) throw new Error('entrants must be >= 0');
  if (houseFeeCents > entryFeeCents) throw new Error('house fee cannot exceed entry fee');
  const perEntrantToWinner = entryFeeCents - houseFeeCents;
  return {
    winnerCents: perEntrantToWinner * entrants,
    houseCents: houseFeeCents * entrants,
    grossCents: entryFeeCents * entrants,
    perEntrantToWinner,
  };
}

/** A role with a single entrant is uncontested: they win and get their $10 back (house keeps $2). */
export function isUncontested(entrants: number) {
  return entrants === 1;
}

export function formatUsd(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 === 0 ? 0 : 2 });
}
