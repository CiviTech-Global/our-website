import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ExternalLink, EyeOff } from 'lucide-react';
import { useOwnVerification } from '@/api/marketplace';
import { useOwnCompany, useSaveCompany } from '@/api/jobs';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { toLatinDigits } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useUploadFeedback } from '@/lib/useUploadFeedback';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { CoverField } from '@/components/marketplace/CoverField';
import { COMPANY_INDUSTRIES, COMPANY_SIZES, type CompanyPayload } from '@/types/jobs';
import { CountrySelect, RegionField } from '@/components/jobs/GeoFields';

const EMPTY = {
  name: '',
  tagline: '',
  about: '',
  industry: '',
  size: '',
  foundedYear: '',
  website: '',
  country: 'IR',
  province: '',
  city: '',
};

/**
 * The employer's company page, written from the dashboard.
 *
 * One form whether the page exists yet or not: there is one page per account,
 * and the first save creates it and links every posting already published.
 */
export default function MyCompanyPage() {
  const { t } = useLocale();
  useDocumentTitle(t.jobs.myCompany);
  const { showToast } = useToast();
  const { data: verification } = useOwnVerification();
  const { data: company, isLoading } = useOwnCompany();
  const save = useSaveCompany();
  const upload = useUploadFeedback('company-images');

  const [draft, setDraft] = useState(EMPTY);
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  // Fill the form once the saved page arrives; an empty page stays empty.
  useEffect(() => {
    if (!company) return;
    setDraft({
      name: company.name,
      tagline: company.tagline ?? '',
      about: company.about ?? '',
      industry: company.industry ?? '',
      size: company.size ?? '',
      foundedYear: company.foundedYear ? String(company.foundedYear) : '',
      website: company.website ?? '',
      country: company.country ?? 'IR',
      province: company.province ?? '',
      city: company.city ?? '',
    });
  }, [company]);

  const set = (name: keyof typeof EMPTY) => (value: string) => setDraft((prev) => ({ ...prev, [name]: value }));
  const isVerified = verification?.status === 'APPROVED';

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    upload.start(logo ?? cover);
    // Blank means "remove it" — the server clears a field sent empty.
    const payload: CompanyPayload = {
      name: draft.name.trim(),
      tagline: draft.tagline.trim() || null,
      about: draft.about.trim() || null,
      industry: (draft.industry || null) as CompanyPayload['industry'],
      size: (draft.size || null) as CompanyPayload['size'],
      foundedYear: toLatinDigits(draft.foundedYear).trim() || null,
      website: draft.website.trim() || null,
      country: draft.country,
      province: draft.province.trim() || null,
      city: draft.city.trim() || null,
    };
    try {
      await save.mutateAsync({ payload, logo, cover, onProgress: upload.onProgress });
      upload.done();
      setLogo(null);
      setCover(null);
      showToast(t.jobs.companySaved, 'success');
    } catch (error) {
      showToast(upload.fail(error).message, 'error');
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.jobs.myCompany}
        description={t.jobs.myCompanyIntro}
        className="mb-2"
        actions={
          company &&
          !company.hidden && (
            <Link to={`/companies/${encodeURIComponent(company.slug)}`} target="_blank">
              <Button variant="outline">
                <ExternalLink className="size-4" aria-hidden="true" />
                {t.jobs.viewPublicPage}
              </Button>
            </Link>
          )
        }
      />

      {!isVerified && (
        <Card>
          <p className="text-body text-app-text-3">{t.jobs.companyNeedsVerification}</p>
          <Link to="/dashboard/verification" className="mt-3 inline-block">
            <Button variant="outline">{t.market.goToVerification}</Button>
          </Link>
        </Card>
      )}

      {company?.hidden && (
        <Card>
          <p className="flex items-center gap-2 text-body text-app-text-3">
            <EyeOff className="size-4" aria-hidden="true" />
            {t.jobs.companyHiddenNotice}
          </p>
        </Card>
      )}

      {isVerified && (
        <Card>
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t.jobs.logo} htmlFor="company-logo">
                <CoverField
                  value={logo}
                  previewPath={company?.logoUrl ? '/jobs/me/company/logo' : null}
                  onChange={setLogo}
                />
              </FormField>
              <FormField label={t.jobs.cover} htmlFor="company-cover">
                <CoverField
                  value={cover}
                  previewPath={company?.coverUrl ? '/jobs/me/company/cover' : null}
                  onChange={setCover}
                />
              </FormField>
            </div>

            <FormField label={t.jobs.companyName} htmlFor="company-name">
              <Input
                id="company-name"
                required
                minLength={2}
                maxLength={120}
                value={draft.name}
                onChange={(e) => set('name')(e.target.value)}
              />
            </FormField>
            <FormField label={t.jobs.tagline} htmlFor="company-tagline">
              <Input id="company-tagline" maxLength={160} value={draft.tagline} onChange={(e) => set('tagline')(e.target.value)} />
            </FormField>
            <FormField label={t.jobs.about} htmlFor="company-about">
              <TextArea
                id="company-about"
                rows={6}
                maxLength={5000}
                value={draft.about}
                onChange={(e) => set('about')(e.target.value)}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t.jobs.industry} htmlFor="company-industry">
                <Select id="company-industry" value={draft.industry} onChange={(e) => set('industry')(e.target.value)}>
                  <option value="">—</option>
                  {COMPANY_INDUSTRIES.map((key) => (
                    <option key={key} value={key}>
                      {t.jobs.industries[key]}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label={t.jobs.companySize} htmlFor="company-size">
                <Select id="company-size" value={draft.size} onChange={(e) => set('size')(e.target.value)}>
                  <option value="">—</option>
                  {COMPANY_SIZES.map((key) => (
                    <option key={key} value={key}>
                      {t.jobs.companySizes[key]}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label={t.jobs.founded} htmlFor="company-founded">
                <Input
                  id="company-founded"
                  inputMode="numeric"
                  className="ltr"
                  maxLength={4}
                  value={draft.foundedYear}
                  onChange={(e) => set('foundedYear')(e.target.value)}
                />
              </FormField>
              <FormField label={t.jobs.website} htmlFor="company-website">
                <Input
                  id="company-website"
                  type="url"
                  className="ltr"
                  placeholder="https://"
                  value={draft.website}
                  onChange={(e) => set('website')(e.target.value)}
                />
              </FormField>
              <FormField label={t.jobs.country} htmlFor="company-country">
                <CountrySelect
                  id="company-country"
                  value={draft.country}
                  onChange={(value) => setDraft((prev) => ({ ...prev, country: value, province: '' }))}
                />
              </FormField>
              <FormField label={draft.country === 'IR' ? t.market.province : t.jobs.region} htmlFor="company-province">
                <RegionField
                  id="company-province"
                  country={draft.country}
                  value={draft.province}
                  onChange={(value) => set('province')(value)}
                />
              </FormField>
              <FormField label={t.market.city} htmlFor="company-city">
                <Input id="company-city" maxLength={80} value={draft.city} onChange={(e) => set('city')(e.target.value)} />
              </FormField>
            </div>

            <div>
              <Button type="submit" isLoading={save.isPending}>
                {t.jobs.saveCompany}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
