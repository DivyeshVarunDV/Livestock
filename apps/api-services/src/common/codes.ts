import { randomBytes } from 'crypto';

// 32 unambiguous symbols (no 0/O or 1/I). 32 divides 256 evenly, so
// `byte % 32` has no modulo bias.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a human-readable, collision-resistant reference number such as
 * `RX-260927-7K3F9Q`. Replaces the old `count() + 1` scheme, which produced
 * duplicate codes (and unique-constraint crashes) after any record was deleted
 * or when two requests ran concurrently.
 */
export function generateCode(prefix: string, date: Date = new Date()): string {
  const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
  const bytes = randomBytes(6);
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b % 32];
  return `${prefix}-${yymmdd}-${suffix}`;
}
