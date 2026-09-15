import { describe, expect, it } from 'vitest';
import { generateTrackingCode } from './insurance-request.service.js';

/**
 * The lookup route validates the code before it reaches the database, with its
 * own copy of the alphabet. That duplication is deliberate — it rejects
 * nonsense without a query — but it means the two can drift, and if they do,
 * every code this issues becomes un-lookable.
 *
 * Contact tickets make that failure total rather than annoying: there is no
 * outbound email in this deployment, so the tracking code is the ONLY route
 * back to a visitor's own message. A code the lookup refuses is a message
 * nobody can ever read the answer to.
 */
const LOOKUP_PATTERN = /^[2346789ABCDEFGHJKMNPQRTVWXYZ]{10}$/;

describe('contact tracking codes', () => {
  it('produces codes the public lookup route accepts', () => {
    for (let i = 0; i < 500; i += 1) {
      expect(generateTrackingCode()).toMatch(LOOKUP_PATTERN);
    }
  });

  /**
   * The alphabet omits the characters that are ambiguous read aloud — 0/O,
   * 1/I/L, U (heard as "you") and S/5. Somebody quotes this down a phone line
   * or copies it off a screen, so a code containing both O and 0 is a support
   * call waiting to happen.
   */
  it('never emits a character that is ambiguous out loud', () => {
    const ambiguous = /[01OILU5S]/;
    const sample = Array.from({ length: 500 }, () => generateTrackingCode()).join('');

    expect(sample).not.toMatch(ambiguous);
  });

  it('is long enough that codes cannot be walked', () => {
    // 28 symbols, 10 places — about 48 bits. The lookup needs no account, so
    // the code is the whole credential and guessing has to be hopeless.
    const code = generateTrackingCode();
    expect(code).toHaveLength(10);
  });

  it('does not repeat itself in any practical run', () => {
    const seen = new Set(Array.from({ length: 2000 }, () => generateTrackingCode()));

    expect(seen.size).toBe(2000);
  });
});
