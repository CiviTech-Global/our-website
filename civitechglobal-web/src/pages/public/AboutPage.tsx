import { ArrowLeft, ArrowRight, Target, Eye, Sparkles, HandHeart, Users, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeHref } from '@/i18n/localePath';
import { CANONICAL_ORIGIN, useDocumentTitle } from '@/lib/documentTitle';
import { breadcrumbSchema } from '@/lib/structuredData';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { BandCta } from '@/components/marketing/BandCta';
import { CompanyStats } from '@/components/marketing/CompanyStats';

export default function AboutPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.about.seoTitle, {
    description: t.seo.about,
    jsonLd: CANONICAL_ORIGIN
      ? breadcrumbSchema(CANONICAL_ORIGIN, [
          { name: t.nav.home, path: localeHref(locale, '/') },
          { name: t.nav.about, path: localeHref(locale, '/about') },
        ])
      : undefined,
  });
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;

  const values = [
    { icon: Sparkles, title: t.about.value1Title, desc: t.about.value1Desc },
    { icon: HandHeart, title: t.about.value2Title, desc: t.about.value2Desc },
    { icon: Users, title: t.about.value3Title, desc: t.about.value3Desc },
    { icon: Target, title: t.about.value4Title, desc: t.about.value4Desc },
  ];

  // The rest of the company, one click away: an about page that ends in a
  // dead end loses the reader who came to decide whether to work with us.
  const more = [
    { to: '/team', label: t.nav.team },
    { to: '/portfolio', label: t.nav.portfolio },
    { to: '/customers', label: t.nav.customers },
    { to: '/partners', label: t.nav.partners },
    { to: '/blog', label: t.nav.blog },
  ];

  return (
    <div className="page-frame !pt-0">
      <AnimatedSection className="hero-canvas bagh-ground -mx-4 mb-12 px-4 pb-14 pt-12 text-center sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <p className="eyebrow justify-center">{t.nav.about}</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-snug text-text-primary sm:text-5xl">
          {t.about.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-loose text-text-secondary">
          {t.about.subtitle}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-xs text-text-muted">{t.about.legalNote}</p>
      </AnimatedSection>

      {/* The stability signals, straight from the showcase data: how much has
          been delivered, for how many organisations, and what is still under
          maintenance. Renders nothing until the API answers. */}
      <CompanyStats />

      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <AnimatedSection>
          <div className="card-edge h-full rounded-3xl p-7">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-700 dark:bg-brand-green-400/10 dark:text-brand-green-300">
              <Target className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-text-primary">{t.about.missionTitle}</h2>
            <p className="mt-2 text-sm leading-loose text-text-secondary">{t.about.missionBody}</p>
          </div>
        </AnimatedSection>
        <AnimatedSection delay={0.08}>
          <div className="card-edge h-full rounded-3xl p-7">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-700 dark:bg-brand-green-400/10 dark:text-brand-green-300">
              <Eye className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-text-primary">{t.about.visionTitle}</h2>
            <p className="mt-2 text-sm leading-loose text-text-secondary">{t.about.visionBody}</p>
          </div>
        </AnimatedSection>
      </div>

      {/* What we do, in one paragraph, with the way to the detail. */}
      <AnimatedSection className="mb-14">
        <h2 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
          {t.about.whatWeDoTitle}
        </h2>
        <hr className="neon-line mt-4 w-40 [mask-image:none]" />
        <p className="mt-5 max-w-3xl leading-loose text-text-secondary">{t.about.whatWeDoBody}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/start-project" className="primary-pill !min-h-11 px-6 text-sm">
            {t.nav.startProject}
            <ArrowIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
          <Link to="/services" className="glass-pill !min-h-11 px-6 text-sm">
            {t.home.heroCtaPrimary}
          </Link>
        </div>
      </AnimatedSection>

      <AnimatedSection className="mb-8 text-center">
        <h2 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
          {t.about.valuesTitle}
        </h2>
      </AnimatedSection>
      <div className="mb-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {values.map((value, i) => (
          <AnimatedSection key={value.title} delay={i * 0.06} className="h-full">
            <div className="glass ct-lift h-full rounded-3xl p-6 text-center shadow-soft">
              <value.icon className="mx-auto mb-3 size-7 text-brand-green-600 dark:text-brand-green-300" aria-hidden="true" />
              <h3 className="mb-1.5 font-bold text-text-primary">{value.title}</h3>
              <p className="text-sm leading-6 text-text-secondary">{value.desc}</p>
            </div>
          </AnimatedSection>
        ))}
      </div>

      {/* Get to know us: the people, the work, who it was for. */}
      <AnimatedSection className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-text-primary">{t.about.moreTitle}</h2>
        <ul className="flex flex-wrap gap-3">
          {more.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-default px-4 py-2 text-sm text-text-secondary transition-colors duration-(--dur-feedback) hover:border-brand-green-500/60 hover:text-text-primary"
              >
                {item.label}
                <ArrowIcon className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </AnimatedSection>

      {/* The same invitation the home page ends with. */}
      <AnimatedSection>
        <div className="card-edge flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <UserPlus className="mt-0.5 size-6 shrink-0 text-brand-green-600 dark:text-brand-green-300" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-bold text-text-primary">{t.join.homeTitle}</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-text-secondary">{t.join.homeBody}</p>
            </div>
          </div>
          <Link to="/join" className="glass-pill shrink-0 !min-h-11 px-6 text-sm">
            {t.join.homeCta}
            <ArrowIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </div>
      </AnimatedSection>

      {/* The page closer: the same deep band every public page ends on. */}
      <BandCta
        title={t.home.finalCtaTitle}
        body={t.home.finalCtaBody}
        primaryLabel={t.nav.startProject}
        primaryTo="/start-project"
        secondaryLabel={t.home.heroCtaSecondary}
        secondaryTo="/contact"
      />
    </div>
  );
}
