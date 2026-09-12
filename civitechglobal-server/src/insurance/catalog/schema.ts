import { z } from 'zod';
import {
  isPlausiblePlate,
  isValidNationalId,
  normalizeIranMobile,
  normalizePersianDigits,
  normalizePersianText,
  stripZeroWidth,
} from '../../utils/persian.js';
import type { ChoiceField, FieldDef, ResolvedProduct } from './index.js';

export interface FieldError {
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; answers: Record<string, unknown> }
  | { ok: false; errors: FieldError[] };

/**
 * Is this field currently shown, given what has been answered so far?
 *
 * The client hides a field whose `showWhen` is unsatisfied; the server must
 * reach the same conclusion, or a required-but-hidden field would reject every
 * legitimate submission. Evaluating it here — rather than compiling one static
 * Zod object per product — is what keeps the two in step.
 */
function isVisible(field: FieldDef, values: Record<string, unknown>): boolean {
  if (!field.showWhen) return true;
  const current = values[field.showWhen.field];
  if (Array.isArray(current)) {
    return current.some((v) => field.showWhen!.equals.includes(String(v)));
  }
  return current !== undefined && field.showWhen.equals.includes(String(current));
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function optionValues(field: ChoiceField): Set<string> {
  return new Set(field.options.map((o) => o.value));
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates and normalises one field's raw value.
 * Returns the stored value, or a message describing why it was rejected.
 */
function coerceField(field: FieldDef, raw: unknown): { value: unknown } | { error: string } {
  switch (field.type) {
    case 'text':
    case 'textarea': {
      if (typeof raw !== 'string') return { error: 'باید متن باشد' };
      const value = normalizePersianText(stripZeroWidth(raw));
      if (field.minLength !== undefined && value.length < field.minLength) {
        return { error: `حداقل ${field.minLength} کاراکتر` };
      }
      if (field.maxLength !== undefined && value.length > field.maxLength) {
        return { error: `حداکثر ${field.maxLength} کاراکتر` };
      }
      return { value };
    }

    case 'number':
    case 'currency': {
      const asString = typeof raw === 'string' ? normalizePersianDigits(raw).replace(/[,\s]/g, '') : raw;
      const parsed = z.coerce.number().finite().safeParse(asString);
      if (!parsed.success) return { error: 'باید عدد باشد' };
      const value = parsed.data;
      if (field.type === 'currency' && !Number.isInteger(value)) {
        return { error: 'مبلغ باید عدد صحیح باشد' };
      }
      if (field.min !== undefined && value < field.min) return { error: `حداقل ${field.min}` };
      if (field.max !== undefined && value > field.max) return { error: `حداکثر ${field.max}` };
      return { value };
    }

    case 'date': {
      if (typeof raw !== 'string' || !ISO_DATE.test(raw)) return { error: 'تاریخ نامعتبر است' };
      const time = Date.parse(raw);
      if (Number.isNaN(time)) return { error: 'تاریخ نامعتبر است' };
      const min = field.min === 'today' ? todayIso() : field.min;
      const max = field.max === 'today' ? todayIso() : field.max;
      if (min && raw < min) return { error: 'تاریخ نمی‌تواند در گذشته باشد' };
      if (max && raw > max) return { error: 'تاریخ خارج از محدوده مجاز است' };
      return { value: raw };
    }

    case 'select': {
      const value = typeof raw === 'string' ? raw : String(raw);
      if (!optionValues(field).has(value)) return { error: 'گزینه نامعتبر است' };
      return { value };
    }

    case 'multiselect': {
      if (!Array.isArray(raw)) return { error: 'باید فهرستی از گزینه‌ها باشد' };
      const allowed = optionValues(field);
      const values = raw.map((v) => String(v));
      // De-duplicate: a repeated value would inflate a count the underwriter reads.
      const unique = [...new Set(values)];
      for (const value of unique) {
        if (!allowed.has(value)) return { error: `گزینه نامعتبر: ${value}` };
      }
      if (field.minSelected !== undefined && unique.length < field.minSelected) {
        return { error: `حداقل ${field.minSelected} گزینه انتخاب کنید` };
      }
      if (field.maxSelected !== undefined && unique.length > field.maxSelected) {
        return { error: `حداکثر ${field.maxSelected} گزینه` };
      }
      return { value: unique };
    }

    case 'bool': {
      if (typeof raw === 'boolean') return { value: raw };
      if (raw === 'true') return { value: true };
      if (raw === 'false') return { value: false };
      return { error: 'مقدار نامعتبر است' };
    }

    case 'nationalId': {
      if (typeof raw !== 'string') return { error: 'کد ملی نامعتبر است' };
      const digits = normalizePersianDigits(raw).replace(/\D/g, '');
      // Two different mistakes deserve two different messages. A bare
      // «invalid» leaves someone who typed nine digits hunting through the
      // ten they believe they typed, and leaves someone who invented a
      // number convinced the field itself is broken.
      if (digits.length !== 10) return { error: 'کد ملی باید دقیقاً ۱۰ رقم باشد' };
      if (!isValidNationalId(digits)) {
        return { error: 'رقم کنترلی کد ملی با بقیهٔ ارقام هم‌خوانی ندارد؛ کد ملی واقعی را وارد کنید' };
      }
      return { value: digits };
    }

    case 'phone': {
      if (typeof raw !== 'string') return { error: 'شماره تماس نامعتبر است' };
      const normalized = normalizeIranMobile(raw);
      if (!normalized) return { error: 'شماره تماس باید به فرمت ۰۹xxxxxxxxx باشد' };
      return { value: normalized };
    }

    case 'plate': {
      if (typeof raw !== 'string') return { error: 'شماره پلاک نامعتبر است' };
      const normalized = normalizePersianDigits(stripZeroWidth(raw)).trim();
      if (!isPlausiblePlate(normalized)) return { error: 'شماره پلاک نامعتبر است' };
      return { value: normalized };
    }

    default: {
      // Exhaustiveness: adding a FieldType without a branch fails to compile.
      const never: never = field;
      throw new Error(`Unhandled field type: ${JSON.stringify(never)}`);
    }
  }
}

/**
 * Validates a submitted answer set against a product's resolved field list.
 *
 * Fields are walked in declaration order so that a `showWhen` can depend on a
 * field declared before it — which is why the catalog's integrity check refuses
 * a forward reference.
 *
 * Keys in `raw` that no field claims are dropped rather than rejected. A
 * stale client sending a field we have since removed should still be able to
 * submit; storing junk it sent would be worse than ignoring it.
 */
export function validateAnswers(product: ResolvedProduct, raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: [{ path: '', message: 'پاسخ‌ها باید یک شیء باشند' }] };
  }

  const input = raw as Record<string, unknown>;
  const answers: Record<string, unknown> = {};
  const errors: FieldError[] = [];

  for (const field of product.allFields) {
    if (!isVisible(field, answers)) continue;

    const value = input[field.name];

    if (isEmpty(value)) {
      if (field.required) errors.push({ path: field.name, message: 'این فیلد الزامی است' });
      continue;
    }

    const result = coerceField(field, value);
    if ('error' in result) {
      errors.push({ path: field.name, message: result.error });
      continue;
    }
    answers[field.name] = result.value;
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, answers };
}

// --- Rendering stored answers back into something readable ----------------

export interface DescribedAnswer {
  name: string;
  label: string;
  labelEn: string;
  /** Option values resolved to their labels; arrays joined. */
  display: string;
  displayEn: string;
  /** True when the answer has no matching field in the current catalog. */
  orphaned?: boolean;
}

function displayValue(field: FieldDef, value: unknown, locale: 'fa' | 'en'): string {
  if (field.type === 'select' || field.type === 'multiselect') {
    const byValue = new Map(field.options.map((o) => [o.value, locale === 'fa' ? o.label : o.labelEn]));
    const values = Array.isArray(value) ? value : [value];
    return values.map((v) => byValue.get(String(v)) ?? String(v)).join('، ');
  }
  if (field.type === 'bool') {
    if (locale === 'fa') return value ? 'بله' : 'خیر';
    return value ? 'Yes' : 'No';
  }
  if (field.type === 'currency' && typeof value === 'number') {
    const formatted = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(value);
    return locale === 'fa' ? `${formatted} تومان` : `${formatted} IRT`;
  }
  if (Array.isArray(value)) return value.join('، ');
  return String(value);
}

/**
 * Turns a stored `answers` blob into labelled rows for the admin panel and the
 * notification message.
 *
 * Answers whose field no longer exists are returned marked `orphaned` rather
 * than dropped. A request submitted under an older catalog is still a real
 * request someone is waiting on a call about; showing its raw key is worse than
 * a label but far better than showing nothing.
 */
export function describeAnswers(
  product: ResolvedProduct,
  answers: Record<string, unknown>,
): DescribedAnswer[] {
  const byName = new Map(product.allFields.map((f) => [f.name, f]));
  const described: DescribedAnswer[] = [];

  // Catalog order first, so the admin reads the questions in the order asked.
  for (const field of product.allFields) {
    if (!(field.name in answers)) continue;
    const value = answers[field.name];
    described.push({
      name: field.name,
      label: field.label,
      labelEn: field.labelEn,
      display: displayValue(field, value, 'fa'),
      displayEn: displayValue(field, value, 'en'),
    });
  }

  for (const [name, value] of Object.entries(answers)) {
    if (byName.has(name)) continue;
    described.push({
      name,
      label: name,
      labelEn: name,
      display: Array.isArray(value) ? value.join('، ') : String(value),
      displayEn: Array.isArray(value) ? value.join(', ') : String(value),
      orphaned: true,
    });
  }

  return described;
}
