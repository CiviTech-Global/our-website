import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  generateSecret,
  hotp,
  otpauthUri,
  totp,
  verifyTotp,
} from './totp.js';

/**
 * RFC 4226 and RFC 6238 publish test vectors precisely so that a hand-written
 * implementation can be shown to be correct rather than merely
 * self-consistent. If these pass, every authenticator app will agree with us.
 */

// RFC 4226 Appendix D — secret "12345678901234567890".
const HOTP_SECRET = Buffer.from('12345678901234567890', 'ascii');
const HOTP_VECTORS = [
  '755224', '287082', '359152', '969429', '338314',
  '254676', '287922', '162583', '399871', '520489',
];

describe('HOTP (RFC 4226)', () => {
  it.each(HOTP_VECTORS.map((code, counter) => ({ counter, code })))(
    'counter $counter produces $code',
    ({ counter, code }) => {
      expect(hotp(HOTP_SECRET, counter)).toBe(code);
    },
  );
});

describe('TOTP (RFC 6238)', () => {
  // The RFC's SHA-1 vectors. Times are seconds since the epoch.
  const secret = base32Encode(HOTP_SECRET);
  const vectors: Array<[number, string]> = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ];

  it.each(vectors)('at %i seconds produces %s', (seconds, code) => {
    expect(totp(secret, seconds * 1000)).toBe(code);
  });
});

describe('base32', () => {
  it('round-trips arbitrary bytes', () => {
    for (const input of ['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar']) {
      const buffer = Buffer.from(input, 'ascii');
      expect(base32Decode(base32Encode(buffer))).toEqual(buffer);
    }
  });

  it('matches RFC 4648, unpadded', () => {
    expect(base32Encode(Buffer.from('foobar', 'ascii'))).toBe('MZXW6YTBOI');
  });

  it('forgives the way people retype a secret', () => {
    // Off a screen, into a phone: lowercase, spaced, sometimes padded.
    const canonical = base32Decode('MZXW6YTBOI');
    expect(base32Decode('mzxw 6ytb oi')).toEqual(canonical);
    expect(base32Decode('MZXW6YTBOI======')).toEqual(canonical);
  });

  it('rejects a character that is not base32', () => {
    // 0, 1 and 8 are excluded from the alphabet precisely because they are
    // misread as O, I and B.
    expect(() => base32Decode('MZXW6YTB01')).toThrow(/Invalid base32/);
  });
});

describe('verifyTotp', () => {
  const secret = base32Encode(HOTP_SECRET);
  const at = 1111111111 * 1000;

  it('accepts the current code', () => {
    expect(verifyTotp(secret, '050471', { atMs: at })).toBe(true);
  });

  it('tolerates a clock one step out, in either direction', () => {
    // A phone thirty seconds fast, and somebody who started typing just
    // before the code rolled over.
    expect(verifyTotp(secret, totp(secret, at - 30_000), { atMs: at })).toBe(true);
    expect(verifyTotp(secret, totp(secret, at + 30_000), { atMs: at })).toBe(true);
  });

  it('refuses a code two steps out', () => {
    // Every extra step of tolerance is another code valid at any moment.
    expect(verifyTotp(secret, totp(secret, at - 90_000), { atMs: at })).toBe(false);
  });

  it('refuses the wrong code', () => {
    expect(verifyTotp(secret, '000000', { atMs: at })).toBe(false);
  });

  it('refuses anything that is not six digits', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 56 78']) {
      expect(verifyTotp(secret, bad, { atMs: at })).toBe(false);
    }
  });

  it('ignores spaces, which authenticator apps display', () => {
    expect(verifyTotp(secret, '050 471', { atMs: at })).toBe(true);
  });
});

describe('secrets and enrolment', () => {
  it('generates a 160-bit secret', () => {
    // RFC 4226 recommends 160 bits for SHA-1; 20 bytes is 32 base32 chars.
    expect(generateSecret()).toHaveLength(32);
  });

  it('generates a different secret every time', () => {
    const secrets = new Set(Array.from({ length: 50 }, generateSecret));
    expect(secrets.size).toBe(50);
  });

  it('builds an otpauth URI an authenticator will accept', () => {
    const uri = otpauthUri('JBSWY3DPEHPK3PXP', 'sara@example.com', 'CiviTech Global');

    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    // The issuer appears in the label and as a parameter; apps disagree about
    // which they read.
    expect(uri).toContain(encodeURIComponent('CiviTech Global:sara@example.com'));
    expect(uri).toContain('issuer=CiviTech+Global');
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});

describe('recovery codes', () => {
  it('generates the requested number, all distinct', () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
  });

  it('formats them so they can be read off a printout', () => {
    for (const code of generateRecoveryCodes(5)) {
      expect(code).toMatch(/^[A-Z2-7]{5}-[A-Z2-7]{5}$/);
    }
  });
});
