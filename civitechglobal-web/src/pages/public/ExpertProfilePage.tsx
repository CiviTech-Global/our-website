import { Link, useParams } from 'react-router';
import { Github, Globe, Linkedin, MessageCircle, UserRound } from 'lucide-react';
import { expertPhotoSrc, usePublicExpert } from '@/api/consult';
import { useLocale } from '@/i18n/LocaleProvider';
import { CANONICAL_ORIGIN, useDocumentTitle } from '@/lib/documentTitle';
import { breadcrumbSchema } from '@/lib/structuredData';
import { localeHref } from '@/i18n/localePath';
import { toPersianDigits } from '@/i18n/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

/**
 * One expert.
 *
 * The page a link from the club lands on, and the one somebody reads before
 * deciding who to ask for. Person markup, so a search result can show who
 * they are rather than a bare title.
 */
export default function ExpertProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale } = useLocale();
  const { data: expert, isLoading, isError } = usePublicExpert(slug);

  const jsonLd = expert
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: expert.fullName,
          jobTitle: expert.headline,
          ...(expert.bio ? { description: expert.bio } : {}),
          ...(expert.specialities.length ? { knowsAbout: expert.specialities } : {}),
          ...(expert.languages.length ? { knowsLanguage: expert.languages } : {}),
          url: `${CANONICAL_ORIGIN}${localeHref(locale, `/experts/${expert.slug}`)}`,
          ...(expert.linkedinUrl || expert.githubUrl || expert.websiteUrl
            ? {
                sameAs: [expert.linkedinUrl, expert.githubUrl, expert.websiteUrl].filter(Boolean),
              }
            : {}),
        },
        breadcrumbSchema(CANONICAL_ORIGIN, [
          { name: t.nav.home, path: localeHref(locale, '/') },
          { name: t.experts.title, path: localeHref(locale, '/experts') },
          { name: expert.fullName, path: localeHref(locale, `/experts/${expert.slug}`) },
        ]),
      ].filter((entry): entry is object => entry !== null)
    : undefined;

  useDocumentTitle(expert?.fullName ?? t.experts.title, {
    description: expert ? `${expert.headline} — ${expert.specialities.slice(0, 3).join('، ')}` : t.experts.metaDescription,
    // 'profile' is an og type the head manager does not model; a person's
    // page is an article about them for these purposes.
    type: 'article',
    jsonLd,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !expert) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <p className="text-text-secondary">{t.experts.notFound}</p>
        <Link to="/experts" className="mt-4 inline-block text-brand-green-600 hover:underline">
          {t.experts.backToClub}
        </Link>
      </div>
    );
  }

  const years = expert.yearsExperience;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to="/experts" className="mb-6 inline-block text-sm text-text-secondary hover:text-text-primary">
        {t.experts.backToClub}
      </Link>

      <div className="flex flex-wrap items-start gap-6">
        <div className="size-28 shrink-0 overflow-hidden rounded-full border border-border bg-surface-muted">
          {expert.photoUrl ? (
            <img src={expertPhotoSrc(expert.photoUrl)} alt={expert.fullName} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-text-muted">
              <UserRound className="size-12" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-text-primary">{expert.fullName}</h1>
          <p className="mt-1 text-text-secondary">{expert.headline}</p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {expert.acceptsConsultations ? (
              <Badge variant="success">{t.experts.takesConsultations}</Badge>
            ) : (
              <Badge>{t.experts.listedOnly}</Badge>
            )}
            {years !== null && years > 0 && (
              <Badge>
                {t.experts.experience.replace(
                  '{years}',
                  locale === 'fa' ? toPersianDigits(years) : String(years),
                )}
              </Badge>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {expert.acceptsConsultations && (
              <Link to={`/consult?expert=${expert.slug}`}>
                <Button>
                  <MessageCircle className="size-4" aria-hidden="true" />
                  {t.experts.consultWith.replace('{name}', expert.fullName)}
                </Button>
              </Link>
            )}
            {expert.linkedinUrl && <IconLink href={expert.linkedinUrl} label="LinkedIn" icon={<Linkedin />} />}
            {expert.githubUrl && <IconLink href={expert.githubUrl} label="GitHub" icon={<Github />} />}
            {expert.websiteUrl && <IconLink href={expert.websiteUrl} label="Website" icon={<Globe />} />}
          </div>
        </div>
      </div>

      {expert.bio && (
        <Card className="mt-8">
          <p className="whitespace-pre-line text-text-secondary">{expert.bio}</p>
        </Card>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {expert.specialities.length > 0 && (
          <Card>
            <h2 className="text-sm font-semibold text-text-primary">{t.experts.specialities}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expert.specialities.map((speciality) => (
                <Badge key={speciality}>{speciality}</Badge>
              ))}
            </div>
          </Card>
        )}

        {expert.languages.length > 0 && (
          <Card>
            <h2 className="text-sm font-semibold text-text-primary">{t.experts.languages}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expert.languages.map((language) => (
                <Badge key={language}>{language}</Badge>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function IconLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg border border-border-default text-text-secondary transition-colors hover:border-brand-green-500/50 hover:text-brand-green-500 [&_svg]:size-4"
    >
      {icon}
    </a>
  );
}
