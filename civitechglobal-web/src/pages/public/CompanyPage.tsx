import { Link, useParams } from 'react-router';
import { ArrowLeft, BadgeCheck, Building2, Calendar, Globe, MapPin, Users } from 'lucide-react';
import { useCompany } from '@/api/jobs';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeHref } from '@/i18n/localePath';
import { apiAssetSrc } from '@/lib/apiAsset';
import { CANONICAL_ORIGIN, useDocumentTitle } from '@/lib/documentTitle';
import { fill, formatNumber, placeText } from '@/lib/jobFormat';
import { breadcrumbSchema } from '@/lib/structuredData';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { CompanyLogo, JobRow } from '@/components/jobs/JobUi';

/**
 * One employer's page: who they are, how they answer, and every role they
 * have open. The roles are the same rows as on the board, so a reader moves
 * between the two without learning a second layout.
 */
export default function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale } = useLocale();
  const { data: company, isLoading, isError } = useCompany(slug);

  useDocumentTitle(company?.name ?? t.jobs.companiesTitle, {
    description: company?.tagline ?? company?.about?.replace(/\s+/g, ' ').trim().slice(0, 155) ?? t.jobs.companiesSubtitle,
    jsonLd: company
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: company.name,
            ...(company.website ? { sameAs: company.website } : {}),
            ...(company.logoUrl ? { logo: `${CANONICAL_ORIGIN}/api${company.logoUrl}` } : {}),
            ...(company.foundedYear ? { foundingDate: String(company.foundedYear) } : {}),
          },
          breadcrumbSchema(CANONICAL_ORIGIN, [
            { name: t.nav.home, path: localeHref(locale, '/') },
            { name: t.jobs.companiesTitle, path: localeHref(locale, '/companies') },
            { name: company.name, path: localeHref(locale, `/companies/${encodeURIComponent(company.slug)}`) },
          ]),
        ]
      : undefined,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">{t.errors.notFoundBody}</p>
        <Link to="/companies" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.jobs.companiesTitle}
        </Link>
      </div>
    );
  }

  const where = placeText(company, locale);
  const facts: Array<[typeof Building2, string, string]> = [];
  if (company.industry) facts.push([Building2, t.jobs.industry, t.jobs.industries[company.industry]]);
  if (company.size) facts.push([Users, t.jobs.companySize, t.jobs.companySizes[company.size]]);
  if (company.foundedYear) facts.push([Calendar, t.jobs.founded, formatNumber(company.foundedYear, locale).replace(/[,٬]/g, '')]);
  if (where) facts.push([MapPin, t.jobs.location, where]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/companies"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
        {t.jobs.companiesTitle}
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border-default bg-surface-default">
        <div className="h-32 bg-surface-muted sm:h-44">
          {company.coverUrl && (
            <img src={apiAssetSrc(company.coverUrl)} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-4 px-5 pb-6 sm:px-8">
          <CompanyLogo
            name={company.name}
            logoUrl={company.logoUrl}
            size="lg"
            className="-mt-10 border-4 border-surface-default shadow"
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{company.name}</h1>
              {company.tagline && <p className="mt-1 text-text-secondary">{company.tagline}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {company.responsiveness.responsive && (
                <Badge variant="success">
                  <BadgeCheck className="size-3" aria-hidden="true" />
                  {t.jobs.responsiveEmployer}
                </Badge>
              )}
              {company.hiredCount > 0 && (
                <Badge variant="info">{fill(t.jobs.hiredCount, { count: formatNumber(company.hiredCount, locale) })}</Badge>
              )}
            </div>
          </div>

          {facts.length > 0 && (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map(([Icon, label, value]) => (
                <div key={label} className="rounded-xl bg-surface-muted p-3">
                  <dt className="flex items-center gap-1 text-xs text-text-tertiary">
                    <Icon className="size-3" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex w-fit items-center gap-1.5 text-sm text-brand-green-600 hover:underline"
            >
              <Globe className="size-4" aria-hidden="true" />
              <span className="ltr">{company.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}

          {company.about && (
            <section>
              <h2 className="mb-2 text-lg font-semibold text-text-primary">{t.jobs.about}</h2>
              <p className="whitespace-pre-line leading-7 text-text-secondary">{company.about}</p>
            </section>
          )}
        </div>
      </div>

      <section className="mt-8" aria-labelledby="roles-heading">
        <h2 id="roles-heading" className="mb-4 text-xl font-semibold text-text-primary">
          {t.jobs.openRoles} ({formatNumber(company.jobs.length, locale)})
        </h2>
        {company.jobs.length === 0 ? (
          <EmptyState title={t.jobs.noOpenRoles} />
        ) : (
          <ul className="flex flex-col gap-3">
            {company.jobs.map((job) => (
              <JobRow
                key={job.id}
                job={{
                  ...job,
                  companyName: job.companyName ?? company.name,
                  company: job.company ?? { slug: company.slug, name: company.name, logoUrl: company.logoUrl },
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
