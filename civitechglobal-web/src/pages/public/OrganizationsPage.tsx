import { Link } from 'react-router';
import { Building2, ExternalLink, Handshake, Quote, Star } from 'lucide-react';
import {
  showcaseImageSrc,
  usePublicOrganizations,
  type OrganizationKind,
  type ShowcaseOrganization,
} from '@/api/showcase';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { useDocumentTitle } from '@/lib/documentTitle';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

/**
 * The customers club (باشگاه مشتریان) and the partners page.
 *
 * One page for both, because they answer the same question for a visitor —
 * "who already trusts these people?" — and differ only in their words.
 *
 * Laid out in the order a sceptical visitor reads: the best-known names large
 * at the top, then everyone current as a denser wall, then former
 * relationships quietly at the end, then what they said. Former customers are
 * kept rather than hidden; "we built this for them" stays true, and a list
 * that only ever grows is not believable.
 */
export default function OrganizationsPage({ kind }: { kind: OrganizationKind }) {
  const { t } = useLocale();
  const isCustomer = kind === 'CUSTOMER';

  const title = isCustomer ? t.showcase.customersTitle : t.showcase.partnersTitle;
  useDocumentTitle(title, { description: isCustomer ? t.seo.customers : t.seo.partners });

  const { data, isLoading } = usePublicOrganizations(kind);
  const all = data ?? [];

  const featured = all.filter((org) => org.featured && org.active);
  const current = all.filter((org) => !org.featured && org.active);
  const former = all.filter((org) => !org.active);
  const testimonials = all.filter((org) => org.testimonialQuote);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        {isCustomer ? (
          <Building2 className="mx-auto mb-3 size-10 text-brand-green-500" aria-hidden="true" />
        ) : (
          <Handshake className="mx-auto mb-3 size-10 text-brand-green-500" aria-hidden="true" />
        )}
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
          {isCustomer ? t.showcase.customersSubtitle : t.showcase.partnersSubtitle}
        </p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && all.length === 0 && (
        <EmptyState title={isCustomer ? t.showcase.customersEmpty : t.showcase.partnersEmpty} />
      )}

      {featured.length > 0 && (
        <Group title={isCustomer ? t.showcase.bestCustomers : t.showcase.keyPartners}>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {featured.map((org) => (
              <li key={org.id}>
                <OrganizationCard org={org} size="large" />
              </li>
            ))}
          </ul>
        </Group>
      )}

      {current.length > 0 && (
        <Group
          // Untitled when it is the only group: the page heading already says it.
          title={
            featured.length > 0 || former.length > 0
              ? isCustomer
                ? t.showcase.currentCustomers
                : t.showcase.currentPartners
              : undefined
          }
        >
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {current.map((org) => (
              <li key={org.id}>
                <OrganizationCard org={org} />
              </li>
            ))}
          </ul>
        </Group>
      )}

      {former.length > 0 && (
        <Group title={isCustomer ? t.showcase.formerCustomers : t.showcase.formerPartners}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {former.map((org) => (
              <li key={org.id}>
                <OrganizationCard org={org} size="compact" />
              </li>
            ))}
          </ul>
        </Group>
      )}

      {testimonials.length > 0 && (
        <Group title={t.showcase.testimonialsTitle}>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {testimonials.map((org) => (
              <li key={org.id}>
                <Card className="h-full">
                  <Quote className="size-6 text-brand-green-500 rtl:-scale-x-100" aria-hidden="true" />
                  <blockquote className="mt-3 whitespace-pre-line text-text-primary">
                    {org.testimonialQuote}
                  </blockquote>
                  <p className="mt-4 text-sm text-text-secondary">
                    {[org.testimonialAuthor, org.testimonialRole, org.name].filter(Boolean).join(' · ')}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </Group>
      )}

      {!isLoading && (
        <AnimatedSection className="mt-4">
          <Card className="flex flex-col items-center gap-4 border-brand-green-500/30 bg-brand-green-500/5 py-10 text-center">
            <h2 className="text-xl font-semibold text-text-primary">{t.showcase.ctaTitle}</h2>
            <p className="max-w-xl text-text-secondary">{t.showcase.ctaBody}</p>
            <Link to={isCustomer ? '/start-project' : '/contact'}>
              <Button size="lg">{isCustomer ? t.nav.startProject : t.nav.contact}</Button>
            </Link>
          </Card>
        </AnimatedSection>
      )}
    </div>
  );
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <AnimatedSection className="mb-12">
      <section>
        {title && <h2 className="mb-5 text-xl font-semibold text-text-primary">{title}</h2>}
        {children}
      </section>
    </AnimatedSection>
  );
}

function OrganizationCard({
  org,
  size = 'regular',
}: {
  org: ShowcaseOrganization;
  size?: 'large' | 'regular' | 'compact';
}) {
  const { t, locale } = useLocale();
  const src = showcaseImageSrc(org.logoUrl);
  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  const logo = (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-white p-2',
        size === 'large' ? 'size-20' : size === 'compact' ? 'size-12' : 'size-16'
      )}
    >
      {src ? (
        // Logos are wordmarks on their own backgrounds, so they sit on white
        // in both themes rather than being inverted into something the owner
        // would not recognise.
        <img src={src} alt={org.name} loading="lazy" className="max-h-full max-w-full object-contain" />
      ) : (
        <Building2 className="size-1/2 text-text-muted" aria-hidden="true" />
      )}
    </div>
  );

  if (size === 'compact') {
    return (
      <Card className="flex h-full flex-col items-center gap-2 py-4 text-center opacity-80">
        {logo}
        <p className="text-sm font-medium text-text-primary">{org.name}</p>
        {org.sinceYear && (
          <p className="text-xs text-text-muted">
            {t.showcase.since} {number(org.sinceYear)}
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col gap-4 transition hover:border-brand-green-500/50">
      <div className="flex items-start gap-4">
        {logo}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={cn('font-semibold text-text-primary', size === 'large' && 'text-lg')}>
              {org.name}
            </h3>
            {org.featured && (
              <Badge variant="success">
                <Star className="size-3" aria-hidden="true" />
                {t.showcase.featured}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {[
              org.partnershipType ? t.showcase.partnershipTypes[org.partnershipType] : null,
              org.industry,
              org.sinceYear ? `${t.showcase.since} ${number(org.sinceYear)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {org.description && (
        <p className="whitespace-pre-line text-sm leading-6 text-text-secondary">{org.description}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        {org.projectCount > 0 ? (
          <Link to="/portfolio" className="text-xs text-text-muted hover:text-text-primary">
            {number(org.projectCount)} {t.showcase.projectsWithUs}
          </Link>
        ) : (
          <span />
        )}
        {org.website && (
          <a
            href={org.website}
            target="_blank"
            // An outbound link to somebody else's site: no opener, and no
            // referrer telling them where their visitors came from.
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-green-600 hover:underline dark:text-brand-green-400"
          >
            {t.showcase.visitWebsite}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </Card>
  );
}
