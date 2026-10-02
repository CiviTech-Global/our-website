import { toLatinDigits } from '@/i18n/utils';
import type { ListingKind } from '@/types/trademaster';

/**
 * The shop and listing forms' rules, checked in the browser.
 *
 * The server checks all of these again and is the authority. They are here so
 * the seller finds out which box is wrong, next to that box, before anything is
 * sent — rather than from one toast naming the first problem the server hit.
 * The limits match `validators/trademaster.schema.ts` on the server, field for
 * field; a mismatch would let the form accept what the server then refuses.
 *
 * Errors are message KEYS (into `trademaster.hub`), not sentences, so the
 * checks stay free of the dictionary and can be tested on their own.
 */

export type FieldErrorKey =
  | 'errRequired'
  | 'errNameLength'
  | 'errSummaryLength'
  | 'errTitleLength'
  | 'errTooLong'
  | 'errEmail'
  | 'errUrl'
  | 'errPhone'
  | 'errLatitude'
  | 'errLongitude'
  | 'errLocationHalf'
  | 'errPrice'
  | 'errStock'
  | 'errKind';

export type FieldErrors<K extends string> = Partial<Record<K, FieldErrorKey>>;

/** Trimmed text, with Persian and Arabic-Indic digits made ASCII. */
export function clean(value: string): string {
  return toLatinDigits(value).trim();
}

/** A whole-number count from a box, or null when it is not one. */
export function parseCount(value: string): number | null {
  const digits = clean(value);
  if (!/^\d+$/.test(digits)) return null;
  const count = Number(digits);
  return count <= 1_000_000 ? count : null;
}

/**
 * A price from a box, as the digit string the server takes, or null.
 *
 * Separators are what people type into a price box — 1,200,000 or ۱٬۲۰۰٬۰۰۰ —
 * and the number they meant is unambiguous without them. Zero is not a price.
 */
export function parsePrice(value: string): string | null {
  const digits = clean(value).replace(/[,،٬\s]/g, '');
  if (!/^\d{1,15}$/.test(digits)) return null;
  const trimmed = digits.replace(/^0+(?=\d)/, '');
  return BigInt(trimmed) > 0n ? trimmed : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9\s-]{5,24}$/;

function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** A coordinate box: a finite number in range, or null. */
export function parseCoordinate(value: string, limit: 90 | 180): number | null {
  // The Persian decimal mark (٫) is a decimal point to whoever typed it.
  const text = clean(value).replace(/٫/g, '.');
  if (!text || !/^-?\d+(\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

// ---------------------------------------------------------------------------
// Shops
// ---------------------------------------------------------------------------

export const EMPTY_SHOP = {
  name: '',
  summary: '',
  description: '',
  industry: '',
  province: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  latitude: '',
  longitude: '',
};

export type ShopDraft = typeof EMPTY_SHOP;

export function validateShop(draft: ShopDraft): FieldErrors<keyof ShopDraft> {
  const errors: FieldErrors<keyof ShopDraft> = {};
  const name = draft.name.trim();
  const summary = draft.summary.trim();

  if (!name) errors.name = 'errRequired';
  else if (name.length < 2 || name.length > 120) errors.name = 'errNameLength';

  if (!summary) errors.summary = 'errRequired';
  else if (summary.length < 10 || summary.length > 300) errors.summary = 'errSummaryLength';

  if (draft.description.trim().length > 5000) errors.description = 'errTooLong';
  if (draft.industry.trim().length > 80) errors.industry = 'errTooLong';
  if (draft.province.trim().length > 60) errors.province = 'errTooLong';
  if (draft.city.trim().length > 60) errors.city = 'errTooLong';
  if (draft.address.trim().length > 300) errors.address = 'errTooLong';

  const phone = clean(draft.phone);
  if (phone && !PHONE.test(phone)) errors.phone = 'errPhone';

  const email = draft.email.trim();
  if (email && (!EMAIL.test(email) || email.length > 160)) errors.email = 'errEmail';

  const website = draft.website.trim();
  if (website && (!isWebUrl(website) || website.length > 200)) errors.website = 'errUrl';

  const hasLat = Boolean(clean(draft.latitude));
  const hasLng = Boolean(clean(draft.longitude));
  if (hasLat && parseCoordinate(draft.latitude, 90) === null) errors.latitude = 'errLatitude';
  if (hasLng && parseCoordinate(draft.longitude, 180) === null) errors.longitude = 'errLongitude';
  // Half a coordinate puts a pin at (0, 0), in the Gulf of Guinea.
  if (hasLat !== hasLng) errors[hasLat ? 'longitude' : 'latitude'] = 'errLocationHalf';

  return errors;
}

/**
 * The request body for a shop.
 *
 * On an edit, every optional field is sent — its value, or null when the box
 * is empty — because that is the only way an emptied field is actually
 * removed. On a new shop an empty box is simply left out.
 */
export function shopPayload(draft: ShopDraft, editing: boolean) {
  const optional = (value: string) => {
    const next = value.trim();
    return next ? next : editing ? null : undefined;
  };
  const lat = parseCoordinate(draft.latitude, 90);
  const lng = parseCoordinate(draft.longitude, 180);
  const location =
    lat !== null && lng !== null
      ? { latitude: lat, longitude: lng }
      : editing
        ? { latitude: null, longitude: null }
        : {};

  return {
    name: draft.name.trim(),
    summary: draft.summary.trim(),
    description: optional(draft.description),
    industry: optional(draft.industry),
    province: optional(draft.province),
    city: optional(draft.city),
    address: optional(draft.address),
    phone: optional(clean(draft.phone)),
    email: optional(draft.email),
    website: optional(draft.website),
    ...location,
  };
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export const EMPTY_LISTING = {
  kind: 'PRODUCT' as ListingKind,
  title: '',
  summary: '',
  description: '',
  categoryId: '',
  price: '',
  stock: '',
  negotiable: false,
};

export type ListingDraft = typeof EMPTY_LISTING;

export function validateListing(draft: ListingDraft): FieldErrors<keyof ListingDraft> {
  const errors: FieldErrors<keyof ListingDraft> = {};
  const title = draft.title.trim();
  const summary = draft.summary.trim();

  if (draft.kind !== 'PRODUCT' && draft.kind !== 'SERVICE') errors.kind = 'errKind';

  if (!title) errors.title = 'errRequired';
  else if (title.length < 2 || title.length > 160) errors.title = 'errTitleLength';

  if (!summary) errors.summary = 'errRequired';
  else if (summary.length < 10 || summary.length > 300) errors.summary = 'errSummaryLength';

  if (draft.description.trim().length > 5000) errors.description = 'errTooLong';

  if (!clean(draft.price)) errors.price = 'errRequired';
  else if (parsePrice(draft.price) === null) errors.price = 'errPrice';

  // Stock only means something for goods. Empty is "none in stock", which is a
  // legitimate answer for a product being listed ahead of a delivery.
  if (draft.kind === 'PRODUCT' && clean(draft.stock) && parseCount(draft.stock) === null) {
    errors.stock = 'errStock';
  }

  return errors;
}

export function listingPayload(draft: ListingDraft, editing: boolean) {
  const description = draft.description.trim();
  return {
    kind: draft.kind,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    // On an edit an emptied description or category is removed; on a new
    // listing it is simply not sent.
    description: description ? description : editing ? null : undefined,
    categoryId: draft.categoryId ? draft.categoryId : editing ? null : undefined,
    price: parsePrice(draft.price) ?? '',
    ...(draft.kind === 'PRODUCT' ? { stock: parseCount(draft.stock) ?? 0 } : {}),
    negotiable: draft.negotiable,
  };
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const EMPTY_OPTION = { label: '', sku: '', price: '', stock: '' };
export type OptionDraft = typeof EMPTY_OPTION;

export function validateOption(draft: OptionDraft, kind: ListingKind): FieldErrors<keyof OptionDraft> {
  const errors: FieldErrors<keyof OptionDraft> = {};
  const label = draft.label.trim();
  if (!label) errors.label = 'errRequired';
  else if (label.length > 60) errors.label = 'errTooLong';
  if (draft.sku.trim().length > 60) errors.sku = 'errTooLong';
  // Empty is "same as the listing"; anything typed must be a real price.
  if (clean(draft.price) && parsePrice(draft.price) === null) errors.price = 'errPrice';
  if (kind === 'PRODUCT' && clean(draft.stock) && parseCount(draft.stock) === null) {
    errors.stock = 'errStock';
  }
  return errors;
}

export function optionPayload(draft: OptionDraft, kind: ListingKind) {
  const sku = draft.sku.trim();
  return {
    label: draft.label.trim(),
    sku: sku ? sku : null,
    // Empty means "same as the listing", which is not the same as zero — and
    // null rather than absent, so emptying the box on an edit actually removes
    // the override instead of leaving the old one.
    price: parsePrice(draft.price),
    ...(kind === 'PRODUCT' ? { stock: parseCount(draft.stock) ?? 0 } : {}),
  };
}
