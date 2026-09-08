/**
 * Mirrors `civitechglobal-server/src/insurance/catalog/types.ts`.
 *
 * These shapes describe JSON the API sends, so they are not a second definition
 * of the catalog — the server remains the only place a product or a field is
 * declared. What lives here is the reader's view of that payload.
 */

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
  value: string;
  label: string;
  labelEn: string;
}

export interface FieldDef {
  name: string;
  label: string;
  labelEn: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  helpEn?: string;
  showWhen?: { field: string; equals: string[] };

  // text / textarea
  minLength?: number;
  maxLength?: number;

  // number / currency
  min?: number | string;
  max?: number | string;
  unit?: string;
  unitEn?: string;

  // select / multiselect
  options?: FieldOption[];
  minSelected?: number;
  maxSelected?: number;
}

export type IntakeMode = 'SELF_SERVE' | 'CALLBACK';
export type Audience = 'INDIVIDUAL' | 'CORPORATE';

/** Summary shape, as returned inside the catalog and the product list. */
export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  summary: string;
  summaryEn: string;
  intakeMode: IntakeMode;
  audience: Audience;
  icon: string | null;
  displayOrder: number;
}

export interface CategoryWithProducts {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  emoji: string | null;
  icon: string | null;
  displayOrder: number;
  products: ProductSummary[];
}

/** Full detail, from GET /insurance/products/:slug. */
export interface ProductDetail extends ProductSummary {
  description: string;
  descriptionEn: string;
  coverages: string[];
  optionalCoverages: string[];
  notes: string[];
  exclusions: string[];
  requiredDocuments: string[];
  premiumFactors: string[];
  faq: { question: string; answer: string }[];
  keyFacts: { label: string; value: string }[];
  claimSteps: string[];
  formSchema: FieldDef[];
  catalogVersion: number;
  category: {
    id: string;
    slug: string;
    title: string;
    titleEn: string;
    emoji: string | null;
  };
}

export interface OtpSendResult {
  expiresInSeconds: number;
  /** Present only outside production, so the form can prefill in development. */
  devCode?: string;
}

export interface OtpVerifyResult {
  phoneToken: string;
  expiresInSeconds: number;
}

export interface SubmitResult {
  id: string;
  trackingCode: string;
  productTitle: string;
  intakeMode: IntakeMode;
}

export interface TrackedRequest {
  trackingCode: string;
  status: string;
  productTitle: string | null;
  productTitleEn: string | null;
  submittedAt: string;
  updatedAt: string;
  callbackScheduledAt: string | null;
}

export type AnswerValue = string | number | boolean | string[] | undefined;
export type Answers = Record<string, AnswerValue>;
