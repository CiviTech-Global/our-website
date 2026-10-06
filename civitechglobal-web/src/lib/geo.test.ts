import { describe, expect, it } from 'vitest';
import en from '@/i18n/en';
import fa from '@/i18n/fa';
import { countryName, countryOptions, formatMoneyIn } from './geo';
import { placeText, salaryText } from './jobFormat';
import { jobPostingSchema } from './structuredData';
import type { PublicJobDetail } from '@/types/marketplace';

describe('countries', () => {
  it('names a country in the reader’s language', () => {
    expect(countryName('DE', 'en')).toBe('Germany');
    expect(countryName('DE', 'fa')).toBe('آلمان');
  });

  it('offers the popular countries first, Iran at the top', () => {
    const options = countryOptions('en');
    expect(options[0].code).toBe('IR');
    expect(options.filter((option) => option.popular).length).toBeGreaterThan(5);
    expect(new Set(options.map((option) => option.code)).size).toBe(options.length);
  });
});

describe('money abroad', () => {
  it('formats an ISO currency the way the reader’s language does', () => {
    expect(formatMoneyIn('4500', 'EUR', 'en', 'IRT')).toBe('€4,500');
  });

  it('keeps the toman as the dictionary says it', () => {
    expect(formatMoneyIn('60000000', 'IRT', 'en', 'IRT')).toBe('60,000,000 IRT');
  });

  it('says the period for anything but toman per month', () => {
    const base = { salaryMin: '65000', salaryMax: '80000', salaryUndisclosed: false };
    expect(salaryText({ ...base, currency: 'EUR', salaryPeriod: 'YEAR' }, 'en', en as never)).toBe(
      '€65,000 to €80,000 / year',
    );
    // An Iranian posting reads exactly as it always has.
    expect(salaryText({ ...base, currency: 'IRT', salaryPeriod: 'MONTH' }, 'en', en as never)).not.toContain('/');
  });
});

describe('places abroad', () => {
  it('adds the country abroad, and leaves it out at home', () => {
    expect(placeText({ city: 'Munich', province: 'Bavaria', country: 'DE' }, 'en')).toBe('Munich, Bavaria, Germany');
    expect(placeText({ city: 'Karaj', province: 'البرز', country: 'IR' }, 'en')).toBe('Karaj, Alborz');
    expect(placeText({ city: 'Dubai', province: null, country: 'AE' }, 'fa')).toContain('امارات');
  });
});

describe('jobPostingSchema', () => {
  const job = {
    code: 'J1',
    title: 'Developer',
    description: 'x',
    companyName: 'Acme',
    publishedAt: '2026-10-01',
    employmentType: 'FULL_TIME',
    workArrangement: 'REMOTE',
    province: null,
    city: null,
    skills: [],
    salaryMin: '60000000',
    salaryMax: null,
    salaryUndisclosed: false,
    currency: 'IRT',
  } as unknown as PublicJobDetail;
  const options = { origin: 'https://x', url: 'https://x/jobs/J1', locale: 'fa-IR', siteName: 'X' };

  it('gives toman as rials, since schema.org needs an ISO code', () => {
    const schema = jobPostingSchema(job, options) as { baseSalary: { currency: string; value: { minValue: number } } };
    expect(schema.baseSalary.currency).toBe('IRR');
    expect(schema.baseSalary.value.minValue).toBe(600_000_000);
  });

  it('names the posting’s country, and no applicant country for a worldwide remote role', () => {
    const abroad = jobPostingSchema({ ...job, country: 'DE', remoteWorldwide: true, currency: 'EUR' }, options) as Record<
      string,
      unknown
    > & { jobLocation: { address: { addressCountry: string } } };
    expect(abroad.jobLocation.address.addressCountry).toBe('DE');
    expect(abroad).not.toHaveProperty('applicantLocationRequirements');
    expect(abroad.jobLocationType).toBe('TELECOMMUTE');
  });
});

// The dictionaries must carry the new labels in every language.
describe('labels', () => {
  it('names each pay period', () => {
    expect(Object.keys(fa.jobs.periods)).toEqual(['HOUR', 'MONTH', 'YEAR']);
  });
});
