import { Link } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Code2,
  GitBranch,
  Landmark,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Sprout,
  Users,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { CANONICAL_ORIGIN, SITE_NAME, useDocumentTitle } from '@/lib/documentTitle';
import { organizationSchema, websiteSchema } from '@/lib/structuredData';
import { LOCALE_TAGS } from '@/i18n/locales';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { KineticWords } from '@/components/ui/KineticWords';
import { HeroMotif } from '@/components/home/HeroMotif';
import { MarketplaceShowcase } from '@/components/home/MarketplaceShowcase';

export default function HomePage() {
  const { t, locale } = useLocale();
  const siteName = locale === 'fa' ? SITE_NAME.fa : SITE_NAME.en;

  // The organisation's verified profiles. Search engines use these to tie the
  // site to its social presence and build the knowledge panel; each one is
  // set in the deployment environment, and only present links are claimed.
  const socialProfiles = [
    import.meta.env.VITE_SOCIAL_INSTAGRAM,
    import.meta.env.VITE_SOCIAL_LINKEDIN,
    import.meta.env.VITE_SOCIAL_GITHUB,
    import.meta.env.VITE_SOCIAL_X,
  ].filter((url): url is string => typeof url === 'string' && url.length > 0);

  useDocumentTitle(undefined, {
    description: t.seo.home,
    // Stated once, on the one page that is unambiguously about the company
    // rather than about something it published. Repeating an Organization
    // block on every page does not strengthen it.
    jsonLd: [
      organizationSchema({
        name: siteName,
        legalName: t.common.legalName,
        description: t.seo.home,
        origin: CANONICAL_ORIGIN,
        logo: '/favicon.png',
        sameAs: socialProfiles,
      }),
      websiteSchema({ name: siteName, origin: CANONICAL_ORIGIN, locale: LOCALE_TAGS[locale] }),
    ],
  });
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;

  const features = [
    { icon: Code2, title: t.home.feature0Title, desc: t.home.feature0Desc, glow: 'red' as const },
    { icon: Smartphone, title: t.home.feature1Title, desc: t.home.feature1Desc, glow: 'green' as const },
    { icon: Landmark, title: t.home.feature2Title, desc: t.home.feature2Desc, glow: 'amber' as const },
    { icon: BarChart3, title: t.home.feature3Title, desc: t.home.feature3Desc, glow: 'red' as const },
  ];

  const howWeWork = [
    { icon: GitBranch, title: t.home.work0Title, desc: t.home.work0Desc },
    { icon: Users, title: t.home.work1Title, desc: t.home.work1Desc },
    { icon: Sprout, title: t.home.work2Title, desc: t.home.work2Desc },
  ];

  return (
    <div className="page-frame !pt-0">
      {/* Hero */}
      {/* The garden ground runs edge to edge behind the hero, under the plan. */}
      <section className="bagh-ground relative -mx-4 grid grid-cols-1 items-center gap-10 rounded-b-[var(--radius-feature)] px-4 py-14 sm:-mx-6 sm:px-6 lg:-mx-8 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:py-20">
        <AnimatedSection>
          <p className="bagh-chip mb-5">{t.home.heroEyebrow}</p>
          <KineticWords
            text={t.home.heroTitle}
            className="text-[clamp(2.25rem,1.6rem+2.6vw,3.6rem)] font-extrabold leading-[1.25] text-text-primary"
          />
          <p className="mt-5 max-w-lg text-lg leading-loose text-text-secondary">{t.home.heroSubtitle}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/services">
              <Button size="lg" className="bagh-clay">
                {t.home.heroCtaPrimary}
                <ArrowIcon className="size-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline">
                {t.home.heroCtaSecondary}
              </Button>
            </Link>
          </div>
        </AnimatedSection>
        <AnimatedSection delay={0.1}>
          <HeroMotif />
        </AnimatedSection>
      </section>

      {/* What we do */}
      <section className="py-12">
        <AnimatedSection className="mb-10">
          <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">{t.home.whatWeDoTitle}</h2>
          <p className="mt-2 max-w-2xl text-text-secondary">{t.home.whatWeDoSubtitle}</p>
          <hr className="neon-line mt-5 w-40 [mask-image:none]" />
        </AnimatedSection>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 0.08}>
              <GlowCard glow={feature.glow} className="h-full">
                <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-600 ring-1 ring-brand-green-200 dark:bg-brand-green-400/10 dark:text-brand-green-300 dark:ring-brand-green-400/25">
                  <feature.icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mb-2 text-lg font-semibold text-text-primary">{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.desc}</p>
              </GlowCard>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* How we work */}
      <section className="py-12">
        <AnimatedSection className="mb-10">
          <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">{t.home.howWeWorkTitle}</h2>
          <p className="mt-2 max-w-2xl text-text-secondary">{t.home.howWeWorkSubtitle}</p>
          <hr className="neon-line mt-5 w-40 [mask-image:none]" />
        </AnimatedSection>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {howWeWork.map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 0.08}>
              <GlowCard glow="green" className="h-full">
                <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-brand-amber-50 text-brand-amber-700 ring-1 ring-brand-amber-200 dark:bg-brand-amber-400/10 dark:text-brand-amber-300 dark:ring-brand-amber-400/25">
                  <item.icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mb-2 text-lg font-semibold text-text-primary">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.desc}</p>
              </GlowCard>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Marketplace: live boards, featured listings, and how it works. */}
      <MarketplaceShowcase />

      {/* Insurance: one service, stated once, and easy to find. */}
      <section className="py-12">
        <AnimatedSection className="mb-6">
          <h2 className="text-lg font-bold text-text-primary">{t.home.alsoTitle}</h2>
        </AnimatedSection>
        <AnimatedSection delay={0.06}>
          <div className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <ShieldCheck className="mt-0.5 size-6 shrink-0 text-brand-green-500" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-text-primary">{t.home.alsoInsuranceTitle}</h3>
                <p className="mt-1 max-w-xl text-sm text-text-secondary">{t.home.alsoInsuranceDesc}</p>
              </div>
            </div>
            <Link to="/insurance" className="shrink-0">
              <Button variant="outline">
                {t.home.alsoInsuranceCta}
                <ArrowIcon className="size-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.12}>
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-border-default bg-surface-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <UserPlus className="mt-0.5 size-6 shrink-0 text-brand-green-500" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-text-primary">{t.join.homeTitle}</h3>
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
      </section>

      {/* CTA */}
      <AnimatedSection>
        <section className="bagh-ground glow-border rounded-[var(--radius-feature)] bg-surface-50 p-8 text-center shadow-soft sm:p-12">
          <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t.home.ctaTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-text-secondary">{t.home.ctaSubtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/start-project">
              <Button size="lg">{t.nav.startProject}</Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline">
                {t.home.heroCtaSecondary}
              </Button>
            </Link>
          </div>
        </section>
      </AnimatedSection>
    </div>
  );
}
