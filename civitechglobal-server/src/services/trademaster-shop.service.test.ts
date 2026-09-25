import { describe, expect, it } from 'vitest';
import { slugify } from './trademaster-shop.service.js';

/**
 * Slugs, which are the one piece of this service that is pure enough to test
 * without a database and consequential enough to be worth it: a slug is the
 * address a seller hands out, it is immutable once published, and getting it
 * wrong means a shop nobody can reach.
 */
describe('shop slugs', () => {
  it('lower-cases and hyphenates an ordinary name', () => {
    expect(slugify('Tehran Ceramics')).toBe('tehran-ceramics');
  });

  it('keeps Persian letters rather than transliterating them', () => {
    // Most shops here are named in Persian. Transliterating would hand the
    // owner an address they do not recognise as their own.
    expect(slugify('فروشگاه مرکزی')).toBe('فروشگاه-مرکزی');
  });

  it('drops the zero-width non-joiner', () => {
    // U+200C is a real part of Persian spelling — کتاب‌فروشی is written with
    // one — but it is invisible, so two slugs differing only by a ZWNJ look
    // identical to a reader while being different addresses. Dropping it
    // leaves a word that is still plainly readable.
    expect(slugify('کتاب‌فروشی')).toBe('کتابفروشی');
    expect(slugify('کتاب‌فروشی')).toBe(slugify('کتابفروشی'));
  });

  it('drops punctuation a URL cannot carry', () => {
    expect(slugify('Ali & Sons, Ltd.')).toBe('ali-sons-ltd');
  });

  it('collapses runs of separators instead of leaving empty segments', () => {
    expect(slugify('a   b___c')).toBe('a-b-c');
  });

  it('does not begin or end with a hyphen', () => {
    const slug = slugify('  --Hello--  ');
    expect(slug.startsWith('-')).toBe(false);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('keeps digits, which are often the whole name', () => {
    expect(slugify('Shop 24')).toBe('shop-24');
  });

  it('returns empty for a name with nothing URL-safe in it', () => {
    // The caller falls back to the shop code. Worth asserting rather than
    // assuming: if this returned '-' or '--' instead, the fallback would never
    // fire and shops would collide on a meaningless slug.
    expect(slugify('!!! ??? ...')).toBe('');
  });

  it('caps the length, so one long name cannot fill the column', () => {
    expect(slugify('a'.repeat(200)).length).toBe(60);
  });
});
