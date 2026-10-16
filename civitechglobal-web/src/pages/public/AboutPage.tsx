import { ArrowLeft, ArrowRight, Target, Eye, Sparkles, HandHeart, Users, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeHref } from '@/i18n/localePath';
import { CANONICAL_ORIGIN, useDocumentTitle } from '@/lib/documentTitle';
import { breadcrumbSchema } from '@/lib/structuredData';
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

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
    <div className="page-frame">
      <AnimatedSection className="mb-10 text-center sm:mb-12">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.about.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl leading-loose text-text-secondary">{t.about.subtitle}</p>
        <p className="mx-auto mt-2 max-w-xl text-xs text-text-muted">{t.about.legalNote}</p>
      </AnimatedSection>

      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <AnimatedSection>
          <GlowCard glow="green" className="h-full">
            <Target className="mb-4 size-8 text-brand-green-500" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold text-text-primary">{t.about.missionTitle}</h2>
            <p className="text-sm leading-loose text-text-secondary">{t.about.missionBody}</p>
          </GlowCard>
        </AnimatedSection>
        <AnimatedSection delay={0.08}>
          <GlowCard glow="amber" className="h-full">
            <Eye className="mb-4 size-8 text-brand-amber-500" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold text-text-primary">{t.about.visionTitle}</h2>
            <p className="text-sm leading-loose text-text-secondary">{t.about.visionBody}</p>
          </GlowCard>
        </AnimatedSection>
      </div>

      {/* What we do, in one paragraph, with the way to the detail. */}
      <AnimatedSection className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary">{t.about.whatWeDoTitle}</h2>
        <hr className="neon-line mt-4 w-40 [mask-image:none]" />
        <p className="mt-5 max-w-3xl leading-loose text-text-secondary">{t.about.whatWeDoBody}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/services">
            <Button variant="outline">
              {t.home.heroCtaPrimary}
              <ArrowIcon className="size-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link to="/start-project">
            <Button>{t.nav.startProject}</Button>
          </Link>
        </div>
      </AnimatedSection>

      <AnimatedSection className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-text-primary">{t.about.valuesTitle}</h2>
      </AnimatedSection>
      <div className="mb-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {values.map((value, i) => (
          <AnimatedSection key={value.title} delay={i * 0.06}>
            <GlowCard className="h-full text-center">
              <value.icon className="mx-auto mb-3 size-7 text-brand-green-500" aria-hidden="true" />
              <h3 className="mb-1.5 font-semibold text-text-primary">{value.title}</h3>
              <p className="text-sm text-text-secondary">{value.desc}</p>
            </GlowCard>
          </AnimatedSection>
        ))}
      </div>

      {/* Get to know us: the people, the work, who it was for. */}
      <AnimatedSection className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">{t.about.moreTitle}</h2>
        <ul className="flex flex-wrap gap-3">
          {more.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-default px-4 py-2 text-sm text-text-secondary transition-colors hover:border-brand-green-500/60 hover:text-text-primary"
              >
                {item.label}
                <ArrowIcon className="size-3.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </AnimatedSection>

      {/* The same invitation the home page ends with. */}
      <AnimatedSection>
        <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <UserPlus className="mt-0.5 size-6 shrink-0 text-brand-green-500" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{t.join.homeTitle}</h2>
              <p className="mt-1 max-w-xl text-sm text-text-secondary">{t.join.homeBody}</p>
            </div>
          </div>
          <Link to="/join" className="shrink-0">
            <Button variant="outline">
              {t.join.homeCta}
              <ArrowIcon className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </AnimatedSection>
    </div>
  );
}
