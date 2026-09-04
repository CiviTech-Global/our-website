import { describe, it, expect } from 'vitest';
import { CATALOG, getProduct, type ResolvedProduct } from './index.js';
import { describeAnswers, validateAnswers } from './schema.js';

/** A minimal product built by hand, so these tests describe the rules rather
 *  than whichever real product happens to exercise them today. */
function fixture(fields: ResolvedProduct['allFields']): ResolvedProduct {
  return {
    slug: 'test',
    categorySlug: 'auto',
    title: 't',
    titleEn: 't',
    summary: 's',
    summaryEn: 's',
    description: 'd',
    descriptionEn: 'd',
    coverages: [],
    sourceUrl: '',
    intake: 'SELF_SERVE',
    audience: 'INDIVIDUAL',
    icon: 'Car',
    order: 1,
    fields: [],
    allFields: fields,
  };
}

function errorsFor(result: ReturnType<typeof validateAnswers>): Record<string, string> {
  if (result.ok) return {};
  return Object.fromEntries(result.errors.map((e) => [e.path, e.message]));
}

describe('validateAnswers — required and empty', () => {
  const product = fixture([
    { name: 'title', label: 'عنوان', labelEn: 'Title', type: 'text', required: true },
    { name: 'note', label: 'یادداشت', labelEn: 'Note', type: 'text', required: false },
  ]);

  it('accepts a complete submission', () => {
    const result = validateAnswers(product, { title: 'سلام' });
    expect(result).toEqual({ ok: true, answers: { title: 'سلام' } });
  });

  it('rejects a missing required field', () => {
    expect(errorsFor(validateAnswers(product, {}))).toHaveProperty('title');
  });

  it('treats a whitespace-only string as missing', () => {
    expect(errorsFor(validateAnswers(product, { title: '   ' }))).toHaveProperty('title');
  });

  it('omits an empty optional field rather than storing a blank', () => {
    const result = validateAnswers(product, { title: 'x', note: '' });
    expect(result.ok && result.answers).toEqual({ title: 'x' });
  });

  it('drops keys no field claims', () => {
    // A stale client sending a field we have since removed should still be able
    // to submit; storing what it sent would be worse than ignoring it.
    const result = validateAnswers(product, { title: 'x', removedLastYear: 'junk' });
    expect(result.ok && result.answers).toEqual({ title: 'x' });
  });
});

describe('validateAnswers — conditional fields', () => {
  const product = fixture([
    {
      name: 'subject',
      label: 'مورد بیمه',
      labelEn: 'Subject',
      type: 'select',
      required: true,
      options: [
        { value: 'building', label: 'بنا', labelEn: 'Building' },
        { value: 'contents', label: 'لوازم', labelEn: 'Contents' },
        { value: 'both', label: 'هر دو', labelEn: 'Both' },
      ],
    },
    {
      name: 'contentsValue',
      label: 'ارزش لوازم',
      labelEn: 'Contents value',
      type: 'currency',
      required: true,
      showWhen: { field: 'subject', equals: ['contents', 'both'] },
    },
  ]);

  it('requires a conditional field when its condition holds', () => {
    expect(errorsFor(validateAnswers(product, { subject: 'both' }))).toHaveProperty('contentsValue');
  });

  it('does not require it when the condition does not hold', () => {
    const result = validateAnswers(product, { subject: 'building' });
    expect(result.ok).toBe(true);
  });

  it('discards a value supplied for a hidden field', () => {
    // The client hides the input; a value arriving anyway is either a stale
    // form or someone poking at the API. Either way it is not an answer to a
    // question that was asked, so it must not be stored as one.
    const result = validateAnswers(product, { subject: 'building', contentsValue: 5_000_000 });
    expect(result.ok && result.answers).toEqual({ subject: 'building' });
  });

  it('evaluates a condition against a multiselect by intersection', () => {
    const multi = fixture([
      {
        name: 'covers',
        label: 'پوشش‌ها',
        labelEn: 'Covers',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'a', label: 'الف', labelEn: 'A' },
          { value: 'b', label: 'ب', labelEn: 'B' },
        ],
      },
      {
        name: 'detail',
        label: 'جزئیات',
        labelEn: 'Detail',
        type: 'text',
        required: true,
        showWhen: { field: 'covers', equals: ['b'] },
      },
    ]);

    expect(validateAnswers(multi, { covers: ['a'] }).ok).toBe(true);
    expect(errorsFor(validateAnswers(multi, { covers: ['a', 'b'] }))).toHaveProperty('detail');
  });
});

describe('validateAnswers — coercion per type', () => {
  it('normalises Persian digits in a number', () => {
    const product = fixture([
      { name: 'n', label: 'ن', labelEn: 'N', type: 'number', required: true, min: 1, max: 100 },
    ]);
    const result = validateAnswers(product, { n: '۴۲' });
    expect(result.ok && result.answers.n).toBe(42);
  });

  it('enforces numeric bounds', () => {
    const product = fixture([
      { name: 'n', label: 'ن', labelEn: 'N', type: 'number', required: true, min: 5, max: 10 },
    ]);
    expect(errorsFor(validateAnswers(product, { n: 4 }))).toHaveProperty('n');
    expect(errorsFor(validateAnswers(product, { n: 11 }))).toHaveProperty('n');
    expect(validateAnswers(product, { n: 7 }).ok).toBe(true);
  });

  it('strips thousands separators from a currency amount', () => {
    const product = fixture([
      { name: 'v', label: 'ارزش', labelEn: 'Value', type: 'currency', required: true, min: 0 },
    ]);
    const result = validateAnswers(product, { v: '1,250,000' });
    expect(result.ok && result.answers.v).toBe(1_250_000);
  });

  it('rejects an option that is not on the list', () => {
    const product = fixture([
      {
        name: 's',
        label: 'س',
        labelEn: 'S',
        type: 'select',
        required: true,
        options: [{ value: 'a', label: 'الف', labelEn: 'A' }],
      },
    ]);
    expect(errorsFor(validateAnswers(product, { s: 'z' }))).toHaveProperty('s');
  });

  it('de-duplicates multiselect values', () => {
    const product = fixture([
      {
        name: 'm',
        label: 'م',
        labelEn: 'M',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'a', label: 'الف', labelEn: 'A' },
          { value: 'b', label: 'ب', labelEn: 'B' },
        ],
      },
    ]);
    const result = validateAnswers(product, { m: ['a', 'a', 'b'] });
    expect(result.ok && result.answers.m).toEqual(['a', 'b']);
  });

  it('validates a national ID by checksum', () => {
    const product = fixture([
      { name: 'nid', label: 'کد ملی', labelEn: 'ID', type: 'nationalId', required: true },
    ]);
    expect(validateAnswers(product, { nid: '0084575948' }).ok).toBe(true);
    expect(errorsFor(validateAnswers(product, { nid: '0084575949' }))).toHaveProperty('nid');
  });

  it('rejects a malformed date and a past date where min is today', () => {
    const product = fixture([
      { name: 'd', label: 'ت', labelEn: 'D', type: 'date', required: true, min: 'today' },
    ]);
    expect(errorsFor(validateAnswers(product, { d: '03-09-2026' }))).toHaveProperty('d');
    expect(errorsFor(validateAnswers(product, { d: '2020-01-01' }))).toHaveProperty('d');
  });

  it('rejects a non-object payload', () => {
    const product = fixture([]);
    expect(validateAnswers(product, 'nope').ok).toBe(false);
    expect(validateAnswers(product, [1, 2]).ok).toBe(false);
  });
});

describe('describeAnswers', () => {
  const product = fixture([
    {
      name: 'plan',
      label: 'طرح',
      labelEn: 'Plan',
      type: 'select',
      required: true,
      options: [{ value: 'family', label: 'خانوادگی', labelEn: 'Family' }],
    },
    { name: 'ok', label: 'تأیید', labelEn: 'Confirmed', type: 'bool' },
  ]);

  it('resolves option values to their labels', () => {
    const [row] = describeAnswers(product, { plan: 'family' });
    expect(row).toMatchObject({ label: 'طرح', display: 'خانوادگی', displayEn: 'Family' });
  });

  it('renders booleans in both languages', () => {
    const rows = describeAnswers(product, { ok: true });
    expect(rows[0]).toMatchObject({ display: 'بله', displayEn: 'Yes' });
  });

  it('marks an answer whose field no longer exists rather than hiding it', () => {
    // A request filed under an older catalog is still a real request someone is
    // waiting on a call about. Showing its raw key beats showing nothing.
    const rows = describeAnswers(product, { plan: 'family', retiredField: 'x' });
    expect(rows.find((r) => r.name === 'retiredField')?.orphaned).toBe(true);
  });
});

describe('the real catalog', () => {
  it('gives every product a resolved field list ending in the contact block', () => {
    for (const product of CATALOG) {
      const names = product.allFields.map((f) => f.name);
      expect(names, product.slug).toContain('fullName');
      expect(names, product.slug).toContain('city');
      expect(names, product.slug).toContain('preferredContactTime');
    }
  });

  it('never asks for a phone number in a form', () => {
    // The number comes from the verified OTP token, never the body — otherwise
    // anyone could verify their own number and submit under someone else's.
    for (const product of CATALOG) {
      expect(product.allFields.some((f) => f.type === 'phone'), product.slug).toBe(false);
    }
  });

  it('asks corporate products for an organisation name', () => {
    for (const product of CATALOG.filter((p) => p.audience === 'CORPORATE')) {
      expect(product.allFields.map((f) => f.name), product.slug).toContain('organizationName');
    }
  });

  it('accepts a plausible submission for a real product', () => {
    const product = getProduct('travel-domestic');
    expect(product).toBeDefined();

    const result = validateAnswers(product!, {
      peopleCount: 2,
      durationDays: 5,
      startDate: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
      fullName: 'علی رضایی',
      province: 'tehran',
      city: 'تهران',
      preferredContactTime: 'morning',
    });

    expect(result.ok, JSON.stringify(!result.ok && result.errors)).toBe(true);
  });
});
