import { useMemo } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { CURRENCIES, countryOptions, currencyName } from '@/lib/geo';
import { IRAN_PROVINCES, provinceLabel } from '@/lib/iranProvinces';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

/**
 * The pickers for where and in what money: a country, the region inside it,
 * and a currency.
 *
 * Countries come popular-first (where Iranian job-seekers most often look),
 * then every other one alphabetically in the reader's own language — names
 * from the browser, so all six languages get every country.
 */

export function CountrySelect({
  value,
  onChange,
  id,
  className,
  placeholder,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  className?: string;
  /** Offered as the empty choice — "All countries" on a filter. Omitted, a country must be chosen. */
  placeholder?: string;
  'aria-label'?: string;
}) {
  const { t, locale } = useLocale();
  const options = useMemo(() => countryOptions(locale), [locale]);
  return (
    <Select id={id} className={className} value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      <optgroup label={t.jobs.popularCountries}>
        {options
          .filter((option) => option.popular)
          .map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
      </optgroup>
      <optgroup label={t.jobs.otherCountries}>
        {options
          .filter((option) => !option.popular)
          .map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
      </optgroup>
    </Select>
  );
}

/**
 * The region inside a country: one of the 31 provinces for Iran, where the
 * board filters and builds pages on them; the employer's own words anywhere
 * else, where no fixed list would be right.
 */
export function RegionField({
  country,
  value,
  onChange,
  id,
  placeholder = '—',
}: {
  country: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}) {
  const { locale } = useLocale();
  if (country === 'IR') {
    return (
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {/* A value from before the fixed list keeps showing rather than vanishing on save. */}
        {value && !IRAN_PROVINCES.some((province) => province.fa === value) && <option value={value}>{value}</option>}
        {IRAN_PROVINCES.map((province) => (
          <option key={province.slug} value={province.fa}>
            {provinceLabel(province, locale)}
          </option>
        ))}
      </Select>
    );
  }
  return <Input id={id} maxLength={80} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function CurrencySelect({
  value,
  onChange,
  id,
  className,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const { t, locale } = useLocale();
  return (
    <Select id={id} className={className} value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
      {CURRENCIES.map((code) => (
        <option key={code} value={code}>
          {currencyName(code, locale, t.market.currency)}
        </option>
      ))}
    </Select>
  );
}
