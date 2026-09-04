import type { Answers, AnswerValue, FieldDef } from '@/types/insurance';
import { isValidNationalId, normalizeIranMobile, normalizePersianDigits } from './persian';

/**
 * Client-side form rules.
 *
 * The server is authoritative — `validateAnswers` there decides what is stored,
 * and nothing here can be trusted by it. This exists so someone filling in a
 * fourteen-field form finds out about a mistyped national ID next to the field
 * rather than after pressing submit.
 *
 * The rules are read off the same `FieldDef` objects the server seeded, so the
 * two cannot disagree about which fields exist or what their bounds are. Only
 * the interpretation of a type is written twice, which is why the branches
 * below are kept in the same order and shape as the server's.
 */

/** Is this field shown, given what has been answered so far? */
export function isFieldVisible(field: FieldDef, answers: Answers): boolean {
  if (!field.showWhen) return true;
  const current = answers[field.showWhen.field];
  if (Array.isArray(current)) {
    return current.some((v) => field.showWhen!.equals.includes(String(v)));
  }
  return current !== undefined && field.showWhen.equals.includes(String(current));
}

/** The fields to render right now, in catalog order. */
export function visibleFields(fields: FieldDef[], answers: Answers): FieldDef[] {
  return fields.filter((field) => isFieldVisible(field, answers));
}

export function isEmpty(value: AnswerValue): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates one field. Returns a Persian message, or null when it passes.
 * Assumes the field is visible — hidden fields are never validated.
 */
export function validateField(field: FieldDef, value: AnswerValue): string | null {
  if (isEmpty(value)) {
    return field.required ? 'این فیلد الزامی است' : null;
  }

  switch (field.type) {
    case 'text':
    case 'textarea': {
      const text = String(value).trim();
      if (field.minLength !== undefined && text.length < field.minLength) {
        return `حداقل ${field.minLength} کاراکتر`;
      }
      if (field.maxLength !== undefined && text.length > field.maxLength) {
        return `حداکثر ${field.maxLength} کاراکتر`;
      }
      return null;
    }

    case 'number':
    case 'currency': {
      const raw = normalizePersianDigits(String(value)).replace(/[,\s]/g, '');
      const num = Number(raw);
      if (raw === '' || Number.isNaN(num) || !Number.isFinite(num)) return 'باید عدد باشد';
      if (field.type === 'currency' && !Number.isInteger(num)) return 'مبلغ باید عدد صحیح باشد';
      if (typeof field.min === 'number' && num < field.min) return `حداقل ${field.min}`;
      if (typeof field.max === 'number' && num > field.max) return `حداکثر ${field.max}`;
      return null;
    }

    case 'date': {
      const text = String(value);
      if (!ISO_DATE.test(text) || Number.isNaN(Date.parse(text))) return 'تاریخ نامعتبر است';
      const min = field.min === 'today' ? todayIso() : field.min;
      const max = field.max === 'today' ? todayIso() : field.max;
      if (typeof min === 'string' && text < min) return 'تاریخ نمی‌تواند در گذشته باشد';
      if (typeof max === 'string' && text > max) return 'تاریخ خارج از محدوده مجاز است';
      return null;
    }

    case 'select': {
      const allowed = new Set((field.options ?? []).map((o) => o.value));
      return allowed.has(String(value)) ? null : 'گزینه نامعتبر است';
    }

    case 'multiselect': {
      const values = Array.isArray(value) ? value : [];
      const allowed = new Set((field.options ?? []).map((o) => o.value));
      if (values.some((v) => !allowed.has(v))) return 'گزینه نامعتبر است';
      if (field.minSelected !== undefined && values.length < field.minSelected) {
        return `حداقل ${field.minSelected} گزینه انتخاب کنید`;
      }
      if (field.maxSelected !== undefined && values.length > field.maxSelected) {
        return `حداکثر ${field.maxSelected} گزینه`;
      }
      return null;
    }

    case 'bool':
      return typeof value === 'boolean' ? null : 'مقدار نامعتبر است';

    case 'nationalId':
      return isValidNationalId(String(value)) ? null : 'کد ملی نامعتبر است';

    case 'phone':
      return normalizeIranMobile(String(value)) ? null : 'شماره تماس باید به فرمت ۰۹xxxxxxxxx باشد';

    case 'plate': {
      const digits = (normalizePersianDigits(String(value)).match(/\d/g) ?? []).length;
      return digits >= 5 && digits <= 9 ? null : 'شماره پلاک نامعتبر است';
    }

    default:
      return null;
  }
}

export type FieldErrors = Record<string, string>;

/** Validates every currently-visible field. */
export function validateAll(fields: FieldDef[], answers: Answers): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of visibleFields(fields, answers)) {
    const message = validateField(field, answers[field.name]);
    if (message) errors[field.name] = message;
  }
  return errors;
}

/**
 * Strips answers to visible fields only, and coerces numbers.
 *
 * Without the strip, changing «مورد بیمه» from «هر دو» to «فقط بنا» would leave
 * the contents value behind in state and send it — an answer to a question the
 * form stopped asking. The server discards it either way; not sending it keeps
 * the two in agreement about what was actually asked.
 */
export function buildPayload(fields: FieldDef[], answers: Answers): Answers {
  const payload: Answers = {};

  for (const field of visibleFields(fields, answers)) {
    const value = answers[field.name];
    if (isEmpty(value)) continue;

    if (field.type === 'number' || field.type === 'currency') {
      payload[field.name] = Number(normalizePersianDigits(String(value)).replace(/[,\s]/g, ''));
    } else if (typeof value === 'string') {
      payload[field.name] = value.trim();
    } else {
      payload[field.name] = value;
    }
  }

  return payload;
}

/**
 * Splits the form into steps.
 *
 * A fourteen-field wall is where people leave. The contact block always forms
 * the last step — it is the same on every product and it is the part someone is
 * most willing to fill in once they have already invested effort in the rest.
 */
export const CONTACT_FIELD_NAMES = [
  'fullName',
  'organizationName',
  'role',
  'province',
  'city',
  'preferredContactTime',
  'notes',
];

export interface FormStep {
  key: 'details' | 'contact';
  fields: FieldDef[];
}

export function splitIntoSteps(fields: FieldDef[]): FormStep[] {
  const contactNames = new Set(CONTACT_FIELD_NAMES);
  const details = fields.filter((f) => !contactNames.has(f.name));
  const contact = fields.filter((f) => contactNames.has(f.name));

  const steps: FormStep[] = [];
  // A callback-first product can have very few product questions; do not show a
  // step indicator for a single-step form.
  if (details.length > 0) steps.push({ key: 'details', fields: details });
  steps.push({ key: 'contact', fields: contact });
  return steps;
}
