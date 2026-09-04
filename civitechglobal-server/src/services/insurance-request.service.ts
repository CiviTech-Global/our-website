import { randomInt } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { insuranceProductRepository } from '../database/prisma/repositories/insurance-product.repository.js';
import { insuranceRequestRepository } from '../database/prisma/repositories/insurance-request.repository.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { sha256Hex } from '../utils/hash.js';
import { getProduct } from '../insurance/catalog/index.js';
import { CATALOG_VERSION } from '../insurance/catalog/index.js';
import { validateAnswers } from '../insurance/catalog/schema.js';
import { verifyPhoneToken } from './otp.service.js';
import { publishNewRequest } from './notify.service.js';

/**
 * Tracking-code alphabet: digits and uppercase letters, minus the characters
 * that are ambiguous when read down a phone line — 0/O, 1/I/L, U (heard as
 * "you"), and S/5. Applicants quote this code to a person, so legibility aloud
 * matters more than the two bits of entropy dropped.
 */
const CODE_ALPHABET = '2346789ABCDEFGHJKMNPQRTVWXYZ'; // 28 symbols
const CODE_LENGTH = 10;

function generateTrackingCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

/** Prisma's unique-constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

/** Keys the contact block owns, lifted out of `answers` into real columns. */
interface ContactBlock {
  fullName: string;
  organizationName?: string | null;
  province?: string | null;
  city: string;
  preferredContactTime: string;
  notes?: string | null;
}

function extractContact(answers: Record<string, unknown>): ContactBlock {
  const asString = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

  return {
    fullName: asString(answers.fullName) ?? '',
    organizationName: asString(answers.organizationName),
    province: asString(answers.province),
    city: asString(answers.city) ?? '',
    preferredContactTime: asString(answers.preferredContactTime) ?? 'any',
    notes: asString(answers.notes),
  };
}

/**
 * Creates the row, retrying if the generated code happens to be taken.
 *
 * 28^10 makes a collision vanishingly unlikely, but "vanishingly unlikely" and
 * "cannot happen" differ by one very confusing 500 for whoever hits it, and the
 * unique index turns that into a retryable error rather than a duplicate.
 */
async function createWithUniqueTrackingCode(
  build: (trackingCode: string) => Parameters<typeof insuranceRequestRepository.createFromWeb>[0],
) {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await insuranceRequestRepository.createFromWeb(build(generateTrackingCode()));
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === MAX_ATTEMPTS) throw error;
      logger.warn({ attempt }, 'Tracking code collision; regenerating');
    }
  }
  // Unreachable: the loop either returns or throws.
  throw new AppError('ثبت درخواست با خطا مواجه شد.', 500);
}

export interface SubmitRequestInput {
  productSlug: string;
  /** Proof that the applicant controls the phone number — issued by otp.service. */
  phoneToken: string;
  answers: Record<string, unknown>;
  email?: string | null;
}

export interface SubmitRequestResult {
  id: string;
  trackingCode: string;
  productTitle: string;
  intakeMode: 'SELF_SERVE' | 'CALLBACK';
}

/**
 * Accepts a website submission.
 *
 * The phone number is taken from the verified token, never from the request
 * body — otherwise anyone could verify their own number and then submit a
 * hundred requests naming someone else's. That is the entire point of the
 * token, and it is why `phone` is absent from every product's field list.
 */
export async function submitRequest(input: SubmitRequestInput): Promise<SubmitRequestResult> {
  const phone = verifyPhoneToken(input.phoneToken);

  // The catalog module holds the validation rules; the database row holds the
  // id we need for the foreign key. Both must recognise the slug — a product
  // present in one but not the other means the seed has not been run.
  const catalogProduct = getProduct(input.productSlug);
  const productRow = await insuranceProductRepository.findBySlug(input.productSlug);

  if (!catalogProduct || !productRow) {
    throw new AppError('محصول بیمه‌ای یافت نشد.', 404);
  }

  const validation = validateAnswers(catalogProduct, input.answers);
  if (!validation.ok) {
    throw new AppError('اطلاعات فرم کامل یا معتبر نیست.', 400, validation.errors);
  }

  const contact = extractContact(validation.answers);
  if (!contact.fullName || !contact.city) {
    // validateAnswers already enforces these as required, so reaching here
    // means the contact block was edited without updating this extraction.
    throw new AppError('اطلاعات تماس ناقص است.', 400);
  }

  const created = await createWithUniqueTrackingCode((trackingCode) => ({
    trackingCode,
    productId: productRow.id,
    answers: validation.answers as Prisma.InputJsonValue,
    catalogVersion: CATALOG_VERSION,
    fullName: contact.fullName,
    phoneNumber: phone,
    phoneNumberHash: sha256Hex(phone),
    phoneVerified: true,
    email: input.email ?? null,
    organizationName: contact.organizationName,
    province: contact.province,
    city: contact.city,
    preferredContactTime: contact.preferredContactTime,
    notes: contact.notes,
  }));

  logger.info(
    {
      requestId: created.id,
      productSlug: productRow.slug,
      source: 'WEB',
      // No name, phone, city or answers: this log is shipped off-host and an
      // insurance enquiry is sensitive by nature. The id is enough to find the
      // row for anyone with a reason to.
    },
    'Insurance request submitted',
  );

  await publishNewRequest({
    requestId: created.id,
    trackingCode: created.trackingCode,
    productTitle: productRow.title,
    categoryTitle: productRow.category.title,
    createdAt: created.createdAt.toISOString(),
  });

  return {
    id: created.id,
    trackingCode: created.trackingCode,
    productTitle: productRow.title,
    intakeMode: productRow.intakeMode,
  };
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

/**
 * Public status lookup by tracking code.
 *
 * Returns progress and nothing else. The code is not a secret — people paste it
 * into chats and read it aloud — so this endpoint must stay useless to anyone
 * who finds one: no name, no phone number, no answers, nothing that would turn
 * a guessed code into a disclosure.
 */
export async function trackRequest(trackingCode: string): Promise<TrackedRequest> {
  const row = await insuranceRequestRepository.findStatusByTrackingCode(trackingCode.toUpperCase());
  if (!row) throw new AppError('درخواستی با این کد پیگیری یافت نشد.', 404);

  return {
    trackingCode: row.trackingCode,
    status: row.status,
    productTitle: row.product?.title ?? null,
    productTitleEn: row.product?.titleEn ?? null,
    submittedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    callbackScheduledAt: row.callbackScheduledAt?.toISOString() ?? null,
  };
}

export { generateTrackingCode };
