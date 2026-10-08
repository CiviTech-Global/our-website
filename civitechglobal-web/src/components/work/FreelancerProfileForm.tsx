import { useEffect, useState, type FormEvent } from 'react';
import { useFreelancerProfile, useUpdateFreelancerProfile } from '@/api/work';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { toLatinDigits } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { languageName } from '@/lib/workFormat';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CountrySelect, CurrencySelect } from '@/components/jobs/GeoFields';
import { AVAILABILITY, WORK_LANGUAGES, type Availability } from '@/types/work';

/** What a freelancer's talent card says beyond the public profile: languages, rate, availability, country. */
export function FreelancerProfileForm() {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const { data } = useFreelancerProfile();
  const save = useUpdateFreelancerProfile();
  const [languages, setLanguages] = useState<string[]>([]);
  const [rate, setRate] = useState('');
  const [currency, setCurrency] = useState('IRT');
  const [availability, setAvailability] = useState<Availability>('AVAILABLE');
  const [country, setCountry] = useState('IR');

  useEffect(() => {
    if (!data) return;
    setLanguages(data.languages);
    setRate(data.hourlyRate ?? '');
    setCurrency(data.hourlyCurrency);
    setAvailability(data.availability);
    setCountry(data.country);
  }, [data]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await save.mutateAsync({
        languages,
        hourlyRate: toLatinDigits(rate).replace(/[^0-9]/g, '') || null,
        hourlyCurrency: currency,
        availability,
        country,
      });
      showToast(t.work.profileSaved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Card>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div>
          <h2 className="font-semibold text-text-primary">{t.work.freelancerProfileTitle}</h2>
          <p className="text-sm text-text-tertiary">{t.work.freelancerProfileIntro}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.work.hourlyRateLabel} htmlFor="fp-rate">
            <div className="flex gap-2">
              <Input id="fp-rate" inputMode="numeric" className="ltr min-w-0 flex-1" value={rate} onChange={(e) => setRate(e.target.value)} />
              <CurrencySelect className="w-28" aria-label={t.work.currencyLabel} value={currency} onChange={setCurrency} />
            </div>
          </FormField>
          <FormField label={t.work.availabilityLabel} htmlFor="fp-availability">
            <Select id="fp-availability" value={availability} onChange={(e) => setAvailability(e.target.value as Availability)}>
              {AVAILABILITY.map((value) => (
                <option key={value} value={value}>
                  {t.work.availability[value]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t.work.countryLabel} htmlFor="fp-country">
            <CountrySelect id="fp-country" value={country} onChange={setCountry} />
          </FormField>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text-primary">{t.work.languagesLabel}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WORK_LANGUAGES.map((code) => (
              <label key={code} className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border-default"
                  checked={languages.includes(code)}
                  onChange={() => setLanguages(languages.includes(code) ? languages.filter((item) => item !== code) : [...languages, code])}
                />
                {languageName(code, locale)}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" className="self-start" isLoading={save.isPending}>
          {t.common.save}
        </Button>
      </form>
    </Card>
  );
}
