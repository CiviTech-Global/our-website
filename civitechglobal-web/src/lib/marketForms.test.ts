import { describe, expect, it } from 'vitest';
import {
  EMPTY_LISTING,
  EMPTY_OPTION,
  EMPTY_SHOP,
  listingPayload,
  optionPayload,
  parseCoordinate,
  parsePrice,
  shopPayload,
  validateListing,
  validateOption,
  validateShop,
} from './marketForms';

const shop = {
  ...EMPTY_SHOP,
  name: 'آرایشگاه نگین',
  summary: 'اصلاح موی آقایان، با نوبت',
  businessCategoryId: 'barber',
};
const listing = { ...EMPTY_LISTING, title: 'پالتو پشمی', summary: 'پشم ۷۰ درصد، آستر ساتن', price: '7900000' };

describe('prices', () => {
  it('reads what people type', () => {
    expect(parsePrice('1,200,000')).toBe('1200000');
    expect(parsePrice('۱٬۲۰۰٬۰۰۰')).toBe('1200000');
    expect(parsePrice(' 0450 ')).toBe('450');
  });

  it('refuses zero, decimals, negatives and words', () => {
    for (const value of ['0', '000', '12.5', '-4', 'free', '']) expect(parsePrice(value)).toBeNull();
  });
});

describe('coordinates', () => {
  it('reads a number in range, in either script', () => {
    expect(parseCoordinate('36.2688', 90)).toBe(36.2688);
    // Persian digits and the Persian decimal mark, as a Persian keyboard types them.
    expect(parseCoordinate('۳۶٫۲', 90)).toBe(36.2);
    expect(parseCoordinate('-179.5', 180)).toBe(-179.5);
  });

  it('refuses what used to become 0', () => {
    for (const value of ['', 'north', '91', '1e2', 'NaN']) expect(parseCoordinate(value, 90)).toBeNull();
  });
});

describe('the shop form', () => {
  it('accepts a minimal shop', () => {
    expect(validateShop(shop)).toEqual({});
  });

  it('names each bad field', () => {
    const errors = validateShop({
      ...shop,
      summary: 'کوتاه',
      email: 'not-an-email',
      website: 'javascript:alert(1)',
      phone: 'call me',
    });
    expect(errors).toEqual({
      summary: 'errSummaryLength',
      email: 'errEmail',
      website: 'errUrl',
      phone: 'errPhone',
    });
  });

  it('requires a business category', () => {
    expect(validateShop({ ...shop, businessCategoryId: '' })).toEqual({ businessCategoryId: 'errRequired' });
  });

  it('refuses half a location, on the missing half', () => {
    expect(validateShop({ ...shop, latitude: '36.2' })).toEqual({ longitude: 'errLocationHalf' });
    expect(validateShop({ ...shop, longitude: '50' })).toEqual({ latitude: 'errLocationHalf' });
  });

  it('accepts a phone number in Persian digits', () => {
    expect(validateShop({ ...shop, phone: '۰۲۸-۳۳۲۲۱۱۰۰' })).toEqual({});
    expect(shopPayload({ ...shop, phone: '۰۲۸-۳۳۲۲۱۱۰۰' }, false).phone).toBe('028-33221100');
  });

  it('sends emptied fields as null on an edit, so they are removed', () => {
    const body = shopPayload(shop, true);
    expect(body).toMatchObject({ phone: null, email: null, website: null, latitude: null, longitude: null });
  });

  it('leaves empty fields out of a new shop', () => {
    const body = shopPayload(shop, false);
    expect(body).not.toHaveProperty('latitude');
    expect(body.phone).toBeUndefined();
  });
});

describe('the listing form', () => {
  it('accepts a minimal product, and a service with no stock', () => {
    expect(validateListing(listing)).toEqual({});
    expect(validateListing({ ...listing, kind: 'SERVICE', stock: 'whatever' })).toEqual({});
  });

  it('requires a price above zero', () => {
    expect(validateListing({ ...listing, price: '' })).toEqual({ price: 'errRequired' });
    expect(validateListing({ ...listing, price: '0' })).toEqual({ price: 'errPrice' });
  });

  it('refuses a stock count that is not a whole number', () => {
    expect(validateListing({ ...listing, stock: '2.5' })).toEqual({ stock: 'errStock' });
  });

  it('keeps "negotiable" as it is rather than switching it off', () => {
    // The old form sent negotiable: false on every edit because it never
    // loaded the real value; the payload now carries whatever the draft holds.
    expect(listingPayload({ ...listing, negotiable: true }, true).negotiable).toBe(true);
  });

  it('removes the description and category when emptied on an edit', () => {
    expect(listingPayload(listing, true)).toMatchObject({ description: null, categoryId: null });
  });

  it('sends no stock for a service', () => {
    expect(listingPayload({ ...listing, kind: 'SERVICE', stock: '9' }, false)).not.toHaveProperty('stock');
  });
});

describe('the option form', () => {
  it('treats an empty price as "same as the listing"', () => {
    const option = { ...EMPTY_OPTION, label: 'سایز ۵۰' };
    expect(validateOption(option, 'PRODUCT')).toEqual({});
    expect(optionPayload(option, 'PRODUCT').price).toBeNull();
  });

  it('refuses a zero price', () => {
    expect(validateOption({ ...EMPTY_OPTION, label: 'L', price: '0' }, 'PRODUCT')).toEqual({ price: 'errPrice' });
  });
});
