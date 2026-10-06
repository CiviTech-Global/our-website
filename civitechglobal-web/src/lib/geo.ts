import { LOCALE_TAGS, type Locale } from '@/i18n/locales';

/**
 * Countries and currencies, by code, named in the reader's language.
 *
 * Codes only are stored (ISO 3166-1 alpha-2, ISO 4217 — and IRT, the toman,
 * which Iranian postings quote though it has no ISO code). Names come from
 * Intl.DisplayNames, which every supported browser carries in all six of our
 * languages, so there is no list of country names to translate and keep up to
 * date. The code list matches the server's catalog/geo.ts.
 */

export const HOME_COUNTRY = 'IR';

export const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS',
  'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE',
  'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM',
  'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC',
  'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG',
  'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS',
  'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO',
  'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

/** Where Iranian job-seekers most often look, offered first in every picker. */
export const POPULAR_COUNTRIES: CountryCode[] = ['IR', 'AE', 'TR', 'DE', 'CA', 'GB', 'US', 'NL', 'AU', 'QA', 'OM', 'IQ'];

export const CURRENCIES = [
  'IRT', 'IRR', 'USD', 'EUR', 'GBP', 'AED', 'TRY', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK', 'JPY',
  'CNY', 'INR', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD', 'IQD', 'AFN', 'AMD', 'AZN', 'GEL', 'RUB', 'MYR',
  'SGD', 'NZD',
] as const;

export type Currency = (typeof CURRENCIES)[number];
export type SalaryPeriod = 'HOUR' | 'MONTH' | 'YEAR';

/** The currency a posting in this country most likely pays in. */
export const DEFAULT_CURRENCY: Partial<Record<string, Currency>> = {
  IR: 'IRT', AE: 'AED', TR: 'TRY', DE: 'EUR', NL: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', AT: 'EUR',
  BE: 'EUR', FI: 'EUR', IE: 'EUR', PT: 'EUR', GR: 'EUR', US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', JP: 'JPY', CN: 'CNY', IN: 'INR', SA: 'SAR', QA: 'QAR',
  KW: 'KWD', OM: 'OMR', BH: 'BHD', IQ: 'IQD', AF: 'AFN', AM: 'AMD', AZ: 'AZN', GE: 'GEL', RU: 'RUB',
  MY: 'MYR', SG: 'SGD', NZ: 'NZD',
};

const regionNames = new Map<Locale, Intl.DisplayNames | null>();
const currencyNames = new Map<Locale, Intl.DisplayNames | null>();

function displayNames(cache: Map<Locale, Intl.DisplayNames | null>, locale: Locale, type: 'region' | 'currency') {
  if (!cache.has(locale)) {
    try {
      cache.set(locale, new Intl.DisplayNames([LOCALE_TAGS[locale]], { type }));
    } catch {
      // A browser without DisplayNames gets codes, which are still unambiguous.
      cache.set(locale, null);
    }
  }
  return cache.get(locale) ?? null;
}

/** "Germany", «آلمان», "Almanya" — or the code, if the browser cannot name it. */
export function countryName(code: string | null | undefined, locale: Locale): string {
  if (!code) return '';
  try {
    return displayNames(regionNames, locale, 'region')?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** The countries for a picker: the popular ones first, then the rest by name in the reader's language. */
export function countryOptions(locale: Locale): Array<{ code: CountryCode; name: string; popular: boolean }> {
  const collator = new Intl.Collator(LOCALE_TAGS[locale]);
  const popular = POPULAR_COUNTRIES.map((code) => ({ code, name: countryName(code, locale), popular: true }));
  const rest = COUNTRY_CODES.filter((code) => !POPULAR_COUNTRIES.includes(code))
    .map((code) => ({ code, name: countryName(code, locale), popular: false }))
    .sort((a, b) => collator.compare(a.name, b.name));
  return [...popular, ...rest];
}

/** A currency's name for a picker: "Euro (EUR)". The toman is named by the dictionary. */
export function currencyName(code: string, locale: Locale, tomanLabel: string): string {
  if (code === 'IRT') return tomanLabel;
  try {
    const name = displayNames(currencyNames, locale, 'currency')?.of(code);
    return name ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

/**
 * A pay figure in its own currency: "€4,500", "4.500 €", «۶۰٬۰۰۰٬۰۰۰ تومان».
 * The toman goes through the dictionary's word for it; every ISO currency
 * through Intl, which places the symbol the way the reader's language does.
 */
export function formatMoneyIn(value: string | null | undefined, currency: string, locale: Locale, tomanLabel: string) {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const amount = Number(digits);
  if (currency === 'IRT') {
    return `${new Intl.NumberFormat(LOCALE_TAGS[locale]).format(amount)} ${tomanLabel}`;
  }
  try {
    return new Intl.NumberFormat(LOCALE_TAGS[locale], {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat(LOCALE_TAGS[locale]).format(amount)} ${currency}`;
  }
}
