/**
 * The shape of the insurance product catalog.
 *
 * This module is the single source of truth for what an insurance product is
 * and what it asks the applicant. Three things are derived from it, and none of
 * them may disagree:
 *
 *   1. the Zod schema the API validates a submission against (`schema.ts`),
 *   2. the JSON the web app renders a form from (seeded into `formSchema`),
 *   3. the labels the admin panel shows next to a stored answer.
 *
 * That is the whole reason the definitions live in typed source rather than in
 * the database: a field cannot exist on the client but not the validator, or
 * carry one label in the form and another in the admin table, because there is
 * only one place it is written down.
 */

/** Field kinds. Each maps to one input on the web and one Zod branch. */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'bool'
  | 'nationalId'
  | 'phone'
  | 'plate';

export interface FieldOption {
  /** Stored in `answers`. Never change one after launch — stored rows keep it. */
  value: string;
  label: string;
  labelEn: string;
}

interface FieldBase {
  /** Stable key inside the request's `answers` JSON. Treat as permanent. */
  name: string;
  label: string;
  labelEn: string;
  required?: boolean;
  help?: string;
  helpEn?: string;
  /**
   * Conditional display. The field is rendered — and validated — only when the
   * named field currently holds one of these values. Server and client apply
   * the same rule, so a hidden field can never be smuggled in as required.
   */
  showWhen?: { field: string; equals: string[] };
}

export interface TextField extends FieldBase {
  type: 'text' | 'textarea';
  minLength?: number;
  maxLength?: number;
}

export interface NumberField extends FieldBase {
  type: 'number' | 'currency';
  min?: number;
  max?: number;
  /** Rendered as a suffix: «متر مربع», «تومان», «روز». */
  unit?: string;
  unitEn?: string;
}

export interface DateField extends FieldBase {
  type: 'date';
  /** ISO date, or the literal 'today' resolved at validation time. */
  min?: string;
  max?: string;
}

export interface ChoiceField extends FieldBase {
  type: 'select' | 'multiselect';
  options: FieldOption[];
  /** multiselect only. */
  minSelected?: number;
  maxSelected?: number;
}

export interface BoolField extends FieldBase {
  type: 'bool';
}

export interface SimpleField extends FieldBase {
  type: 'nationalId' | 'phone' | 'plate';
}

export type FieldDef =
  | TextField
  | NumberField
  | DateField
  | ChoiceField
  | BoolField
  | SimpleField;

/**
 * How a product is sold.
 *
 * SELF_SERVE — the source publishes a real field list, so we can collect enough
 * to route the request to an underwriter without talking first. Full form.
 *
 * CALLBACK — the source publishes no fields, because in reality a human prices
 * these by hand. Asking twelve invented questions would collect data nobody
 * reads and lose the applicant halfway down the page. Contact details, a
 * structured brief, and a scheduled call instead.
 */
export type IntakeMode = 'SELF_SERVE' | 'CALLBACK';

export type Audience = 'INDIVIDUAL' | 'CORPORATE';

export interface ProductDef {
  /** URL segment and stable identity: /insurance/<slug>. Permanent. */
  slug: string;
  categorySlug: string;
  title: string;
  titleEn: string;
  /** One line, for cards and list rows. */
  summary: string;
  summaryEn: string;
  /** Two to four sentences, for the product page. */
  description: string;
  descriptionEn: string;
  coverages: string[];
  optionalCoverages?: string[];
  /** Conditions worth stating before someone fills the form. */
  notes?: string[];
  /**
   * What the policy does NOT pay for. Stated as plainly as the coverages,
   * because the difference between the two lists is where disappointment
   * lives — someone who learns about an exclusion at claim time learns it in
   * the worst possible circumstances.
   */
  exclusions?: string[];
  /** Documents an applicant should have to hand before the call. */
  requiredDocuments?: string[];
  /**
   * What moves the premium. We quote nothing on this site, so this is the
   * honest substitute for a price: the variables a specialist will ask about.
   */
  premiumFactors?: string[];
  /** Questions worth answering before someone has to ask them. */
  faq?: { question: string; answer: string }[];
  intake: IntakeMode;
  audience: Audience;
  /** lucide-react icon name. */
  icon: string;
  order: number;
  /**
   * Product-specific questions only. The contact block (name, phone, city,
   * preferred call time, notes — plus organisation for CORPORATE) is appended
   * by `resolve()` in `index.ts` (via `contactFields()`), so it stays
   * identical across all 34 products.
   */
  fields: FieldDef[];
}

export interface CategoryDef {
  slug: string;
  title: string;
  titleEn: string;
  emoji: string;
  icon: string;
  order: number;
}
