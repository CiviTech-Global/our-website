import { describe, expect, it } from 'vitest';
import { BOOK_CATEGORIES, normalizeIsbnStrict } from '../catalog/book-taxonomy.js';
import { normalizeTitle } from './book-market.service.js';
import { boardSchema, offerSchema, requestSchema } from '../validators/bookshop.schema.js';

describe('normalizeIsbnStrict', () => {
  it('accepts a valid ISBN-13, with or without hyphens', () => {
    expect(normalizeIsbnStrict('978-0-06-357754-1')).toBe('9780063577541');
    expect(normalizeIsbnStrict('9780063577541')).toBe('9780063577541');
  });

  it('refuses a typo, which breaks the check digit', () => {
    expect(normalizeIsbnStrict('9780063577542')).toBeNull();
    expect(normalizeIsbnStrict('12345')).toBeNull();
  });

  it('stores an ISBN-10 as its ISBN-13, so both forms are one book', () => {
    // 0-306-40615-2 is the textbook example; its ISBN-13 is 978-0-306-40615-7.
    expect(normalizeIsbnStrict('0-306-40615-2')).toBe('9780306406157');
    expect(normalizeIsbnStrict('080442957X')).toBe('9780804429573');
    expect(normalizeIsbnStrict('0306406153')).toBeNull();
  });
});

describe('normalizeTitle', () => {
  it('folds Arabic letters, zero-width joiners and spacing', () => {
    expect(normalizeTitle('كليدر  ')).toBe(normalizeTitle('کلیدر'));
    expect(normalizeTitle('بوف‌کور')).toBe('بوف کور');
  });
});

describe('the shelves', () => {
  it('have unique ASCII slugs and names in both languages', () => {
    const all = BOOK_CATEGORIES.flatMap((node) => [node, ...(node.children ?? [])]);
    expect(new Set(all.map((entry) => entry.slug)).size).toBe(all.length);
    for (const entry of all) {
      expect(entry.slug).toMatch(/^b-[a-z0-9-]+$/);
      expect(entry.name.trim()).not.toBe('');
      expect(entry.nameEn.trim()).not.toBe('');
    }
  });
});

describe('the offer form', () => {
  const offer = { grade: 'GOOD', price: '۲۵۰۰۰۰', deliveryOptions: ['POST', 'POST', 'IN_PERSON'] };

  it('takes either a catalogue book or new facts, never both or neither', () => {
    expect(offerSchema.safeParse({ ...offer, bookId: 'abc' }).success).toBe(true);
    expect(offerSchema.safeParse({ ...offer, book: { title: 'Sووشون', authors: ['سیمین دانشور'] } }).success).toBe(true);
    expect(offerSchema.safeParse(offer).success).toBe(false);
    expect(offerSchema.safeParse({ ...offer, bookId: 'abc', book: { title: 'x', authors: ['y'] } }).success).toBe(false);
  });

  it('reads Persian digits and drops repeated delivery options', () => {
    const parsed = offerSchema.parse({ ...offer, bookId: 'abc' });
    expect(parsed.price).toBe(250_000n);
    expect(parsed.deliveryOptions).toEqual(['POST', 'IN_PERSON']);
  });

  it('needs at least one author for a new book', () => {
    expect(offerSchema.safeParse({ ...offer, book: { title: 'Untitled', authors: [] } }).success).toBe(false);
  });
});

describe('the board and requests', () => {
  it('reads switches and defaults the sort', () => {
    expect(boardSchema.parse({ discounted: 'true', grade: 'VERY_GOOD' })).toMatchObject({ discounted: true, sort: 'newest', grade: 'VERY_GOOD' });
  });

  it('needs a delivery method for a request', () => {
    expect(requestSchema.safeParse({ quantity: 1 }).success).toBe(false);
    expect(requestSchema.parse({ deliveryMethod: 'POST' })).toMatchObject({ quantity: 1 });
  });
});
