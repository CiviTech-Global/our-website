import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Time-based one-time passwords, RFC 6238.
 *
 * Hand-written for the same reason the SigV4 signer is: the algorithm is a
 * short, frozen specification with published test vectors, and `otplib` and
 * friends bring a dependency tree for what amounts to an HMAC and a modulo.
 * Correctness here is not a matter of opinion — the vectors either reproduce
 * or they do not, and totp.test.ts runs them.
 *
 * SHA-1 is not a mistake. RFC 6238 defines SHA-1 as the default, and it is
 * what every authenticator app implements; the HMAC construction is not
 * affected by SHA-1's collision weaknesses, and choosing SHA-256 here would
 * mean codes that Google Authenticator cannot generate.
 */

const DIGITS = 6;
const PERIOD_SECONDS = 30;

// RFC 4648 base32, which is what otpauth:// URIs and every authenticator use.
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];

  // Deliberately unpadded: authenticator apps accept it, and '=' in a URI
  // query value has to be escaped, which is one more thing to get wrong.
  return output;
}

export function base32Decode(input: string): Buffer {
  // People retype these from a screen, so spaces, case and padding are all
  // forgiven rather than rejected.
  const clean = input.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/** 20 bytes — the SHA-1 block size RFC 4226 recommends. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** RFC 4226 HOTP: HMAC the counter, then dynamically truncate. */
export function hotp(secret: Buffer, counter: number, digits = DIGITS): string {
  const counterBuffer = Buffer.alloc(8);
  // Counters exceed 32 bits eventually; writing as BigInt64 avoids the
  // silent truncation a writeUInt32BE pair invites.
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const digest = createHmac('sha1', secret).update(counterBuffer).digest();

  // Dynamic truncation: the low nibble of the last byte picks the offset.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function totp(secretBase32: string, atMs = Date.now(), digits = DIGITS): string {
  const counter = Math.floor(atMs / 1000 / PERIOD_SECONDS);
  return hotp(base32Decode(secretBase32), counter, digits);
}

/**
 * Checks a submitted code, allowing for clock drift.
 *
 * One step either side by default — thirty seconds — which covers a phone
 * whose clock is slightly off and a person who started typing just before the
 * code rolled over. Widening this trades security for convenience directly:
 * every extra step is another valid code at any moment.
 *
 * The comparison is constant-time. A code is a six-digit secret, and an
 * early-exit compare leaks how much of a guess was right.
 */
export function verifyTotp(
  secretBase32: string,
  submitted: string,
  { window = 1, atMs = Date.now() }: { window?: number; atMs?: number } = {},
): boolean {
  const cleaned = submitted.replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleaned)) return false;

  const secret = base32Decode(secretBase32);
  const counter = Math.floor(atMs / 1000 / PERIOD_SECONDS);
  const submittedBuffer = Buffer.from(cleaned, 'utf8');

  let matched = false;
  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = Buffer.from(hotp(secret, counter + offset), 'utf8');
    // No early break: bailing on the first match makes the loop's duration
    // depend on which step matched.
    if (
      candidate.length === submittedBuffer.length &&
      timingSafeEqual(candidate, submittedBuffer)
    ) {
      matched = true;
    }
  }

  return matched;
}

/**
 * The otpauth:// URI an authenticator scans or accepts pasted.
 *
 * The issuer appears twice by convention — as a label prefix and as a
 * parameter — because apps disagree about which one they read.
 */
export function otpauthUri(secretBase32: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Recovery codes, for the phone that fell in the sea.
 *
 * Without these, enabling MFA is a way to lock yourself out permanently, and
 * the support process for that is somebody disabling it in the database.
 */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    // Grouped in fives, which is how anyone reads a code off a printout
    // without losing their place.
    const raw = base32Encode(randomBytes(10)).slice(0, 10);
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}
