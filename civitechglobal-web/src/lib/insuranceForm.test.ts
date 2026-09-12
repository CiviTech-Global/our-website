import { describe, it, expect } from 'vitest';
import {
  buildPayload,
  isFieldVisible,
  splitIntoSteps,
  validateAll,
  validateField,
  visibleFields,
} from './insuranceForm';
import type { FieldDef } from '@/types/insurance';

const subject: FieldDef = {
  name: 'insuredSubject',
  label: 'مورد بیمه',
  labelEn: 'Subject',
  type: 'select',
  required: true,
  options: [
    { value: 'building', label: 'بنا', labelEn: 'Building' },
    { value: 'contents', label: 'لوازم', labelEn: 'Contents' },
    { value: 'both', label: 'هر دو', labelEn: 'Both' },
  ],
};

const contentsValue: FieldDef = {
  name: 'contentsValue',
  label: 'ارزش لوازم',
  labelEn: 'Contents value',
  type: 'currency',
  required: true,
  min: 0,
  showWhen: { field: 'insuredSubject', equals: ['contents', 'both'] },
};

describe('isFieldVisible', () => {
  it('shows an unconditional field', () => {
    expect(isFieldVisible(subject, {})).toBe(true);
  });

  it('hides a conditional field until its trigger matches', () => {
    expect(isFieldVisible(contentsValue, {})).toBe(false);
    expect(isFieldVisible(contentsValue, { insuredSubject: 'building' })).toBe(false);
    expect(isFieldVisible(contentsValue, { insuredSubject: 'both' })).toBe(true);
  });

  it('matches a multiselect trigger by intersection', () => {
    const field: FieldDef = {
      ...contentsValue,
      showWhen: { field: 'covers', equals: ['b'] },
    };
    expect(isFieldVisible(field, { covers: ['a'] })).toBe(false);
    expect(isFieldVisible(field, { covers: ['a', 'b'] })).toBe(true);
  });
});

describe('validateField', () => {
  it('reports a missing required value and ignores a missing optional one', () => {
    expect(validateField(subject, undefined)).toBe('این فیلد الزامی است');
    expect(validateField({ ...subject, required: false }, undefined)).toBeNull();
  });

  it('accepts Persian digits in a currency field', () => {
    expect(validateField(contentsValue, '۱۲۳۴۵۶')).toBeNull();
  });

  it('tells a short national ID apart from a wrong one', () => {
    // Two different mistakes, two different messages. A single «invalid»
    // leaves someone who typed nine digits searching the ten they think they
    // typed, and leaves someone who invented a number believing the field is
    // broken rather than that the number is.
    const nid: FieldDef = { name: 'n', label: 'n', labelEn: 'n', type: 'nationalId', required: true };
    expect(validateField(nid, '0084575948')).toBeNull();
    expect(validateField(nid, '۰۰۸۴۵۷۵۹۴۸')).toBeNull();
    expect(validateField(nid, '008457594')).toBe('کد ملی باید دقیقاً ۱۰ رقم باشد');
    expect(validateField(nid, '0084575949')).toBe(
      'رقم کنترلی کد ملی هم‌خوانی ندارد؛ کد ملی واقعی را وارد کنید',
    );
  });

  it('enforces numeric bounds', () => {
    const n: FieldDef = {
      name: 'n',
      label: 'n',
      labelEn: 'n',
      type: 'number',
      required: true,
      min: 5,
      max: 10,
    };
    expect(validateField(n, 4)).toBe('حداقل 5');
    expect(validateField(n, 11)).toBe('حداکثر 10');
    expect(validateField(n, 7)).toBeNull();
  });
});

describe('validateAll', () => {
  it('does not demand a hidden required field', () => {
    // The whole point of showWhen: a question that is not on screen cannot
    // block submission, or the form becomes impossible to complete.
    const errors = validateAll([subject, contentsValue], { insuredSubject: 'building' });
    expect(errors).toEqual({});
  });

  it('demands it once shown', () => {
    const errors = validateAll([subject, contentsValue], { insuredSubject: 'both' });
    expect(errors).toHaveProperty('contentsValue');
  });
});

describe('buildPayload', () => {
  it('drops answers to fields that are no longer visible', () => {
    // Changing «هر دو» to «فقط بنا» leaves the old value in React state; sending
    // it would be an answer to a question the form stopped asking.
    const payload = buildPayload([subject, contentsValue], {
      insuredSubject: 'building',
      contentsValue: '500000',
    });
    expect(payload).toEqual({ insuredSubject: 'building' });
  });

  it('coerces numeric strings and strips separators', () => {
    const payload = buildPayload([subject, contentsValue], {
      insuredSubject: 'contents',
      contentsValue: '1,250,000',
    });
    expect(payload.contentsValue).toBe(1_250_000);
  });

  it('omits empty optional values', () => {
    const note: FieldDef = { name: 'notes', label: 'n', labelEn: 'n', type: 'textarea' };
    expect(buildPayload([note], { notes: '   ' })).toEqual({});
  });
});

describe('visibleFields and splitIntoSteps', () => {
  it('returns fields in catalog order', () => {
    expect(visibleFields([subject, contentsValue], { insuredSubject: 'both' })).toEqual([
      subject,
      contentsValue,
    ]);
  });

  it('puts the contact block in its own final step', () => {
    const fullName: FieldDef = { name: 'fullName', label: 'n', labelEn: 'n', type: 'text', required: true };
    const city: FieldDef = { name: 'city', label: 'c', labelEn: 'c', type: 'text', required: true };

    const steps = splitIntoSteps([subject, contentsValue, fullName, city]);
    expect(steps.map((s) => s.key)).toEqual(['details', 'contact']);
    expect(steps[1]!.fields.map((f) => f.name)).toEqual(['fullName', 'city']);
  });

  it('produces a single step when a product asks nothing of its own', () => {
    const fullName: FieldDef = { name: 'fullName', label: 'n', labelEn: 'n', type: 'text', required: true };
    const steps = splitIntoSteps([fullName]);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.key).toBe('contact');
  });
});
