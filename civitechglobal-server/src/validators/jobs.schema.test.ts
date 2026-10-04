import { describe, expect, it } from 'vitest';
import { alertCreateSchema, companySchema } from './jobs.schema.js';

describe('companySchema', () => {
  it('reads a founding year typed in Persian digits, in either calendar', () => {
    expect(companySchema.parse({ name: 'رایان تمدن', foundedYear: '۱۳۸۵' }).foundedYear).toBe(1385);
    expect(companySchema.parse({ name: 'Acme', foundedYear: 2006 }).foundedYear).toBe(2006);
  });

  it('clears a field sent empty, and refuses an industry it does not know', () => {
    expect(companySchema.parse({ name: 'Acme', website: '' }).website).toBeNull();
    expect(companySchema.safeParse({ name: 'Acme', industry: 'SPACE_PIRACY' }).success).toBe(false);
  });

  it('refuses a website that is not http(s)', () => {
    expect(companySchema.safeParse({ name: 'Acme', website: 'javascript:alert(1)' }).success).toBe(false);
  });
});

describe('alertCreateSchema', () => {
  it('stores only what was chosen', () => {
    const parsed = alertCreateSchema.parse({
      name: 'React in Tehran',
      query: { search: 'react', province: '', salaryMin: '۵۰۰۰۰۰۰۰' },
    });
    expect(parsed.query).toEqual({ search: 'react', salaryMin: '50000000' });
  });

  it('refuses a filter the board does not have', () => {
    expect(alertCreateSchema.safeParse({ name: 'x', query: { favouriteColour: 'blue' } }).success).toBe(false);
  });
});
