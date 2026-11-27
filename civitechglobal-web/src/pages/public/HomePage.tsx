import { Link } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  FolderKanban,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { CANONICAL_ORIGIN, SITE_NAME, useDocumentTitle } from '@/lib/documentTitle';
import { faqPageSchema, organizationSchema, websiteSchema } from '@/lib/structuredData';
import { LOCALE_TAGS } from '@/i18n/locales';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { BandCta } from '@/components/marketing/BandCta';
import { EngagementTiers } from '@/components/marketing/EngagementTiers';
import { HomeHero } from '@/components/home/HomeHero';
import { TrustBar } from '@/components/home/TrustBar';
import { IndustryMarquee } from '@/components/home/IndustryMarquee';
import { ServicesBento } from '@/components/home/ServicesBento';
import { HomeFaq } from '@/components/home/HomeFaq';
import { SelectedWork } from '@/components/home/SelectedWork';
import { ProcessTimeline } from '@/components/home/ProcessTimeline';

/**
 * The 2026 rebrand home page, on the conversion-blueprint spine: hero →
 * trust → industries → problem → why us → services bento → work → process →
 * packages → FAQ → ecosystem → final band CTA. Custom software design and
 * development is the hero and the spine of every fold; the marketplace and
 * insurance — real businesses, but secondary ones — stay in a single
 * ecosystem strip near the end instead of competing with the studio
 * narrative, and the page closes on the deep band like the footer does.
 */
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

  // The FAQ section's questions, stated for rich results. The schema is built
  // from the same copy the section renders, so the markup can never claim
  // more than the page shows.
  const faqSchema = faqPageSchema(
    t.home.faq.map((item) => ({ question: item.q, answer: item.a })),
    LOCALE_TAGS[locale]
  );

  // The tab and the search result lead with what the company does, not only
  // its name: nobody searches for the name before they know it.
  useDocumentTitle(t.home.seoTitle, {
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
      ...(faqSchema ? [faqSchema] : []),
    ],
  });

  return (
    <div className="page-frame !pt-0">
      <HomeHero />
      <TrustBar />
      <IndustryMarquee />
      <PainPoint />
      <WhyUs />
      <ServicesBento />
      <SelectedWork />
      <ProcessTimeline />
      <EngagementTiers />
      <HomeFaq />
      <Ecosystem />
      {/* The page closer: the free-consult offer restated on the deep indigo
          band, so the page ends with one decisive ask. */}
      <BandCta
        eyebrow={t.home.consultEyebrow}
        title={t.home.finalCtaTitle}
        body={t.home.finalCtaBody}
        primaryLabel={t.home.finalCtaPrimary}
        primaryTo="/start-project"
        secondaryLabel={t.home.consultCta}
        secondaryTo="/contact"
      />
    </div>
  );
}

function PainPoint() {
  const { t, locale } = useLocale();
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;
  return (
    <section className="py-14 text-center">
      <AnimatedSection>
        <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-snug text-text-primary sm:text-4xl">
          {t.home.painTitle}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-loose text-text-secondary">
          {t.home.painBody}
        </p>
        <Link
          to="/services"
          className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-brand-green-700 underline-offset-4 hover:underline dark:text-brand-green-300"
        >
          {t.home.painCta}
          <ArrowIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </AnimatedSection>
    </section>
  );
}

function WhyUs() {
  const { t, locale } = useLocale();
  const reasons = [
    { title: t.home.why1Title, desc: t.home.why1Desc },
    { title: t.home.why2Title, desc: t.home.why2Desc },
    { title: t.home.why3Title, desc: t.home.why3Desc },
    { title: t.home.why4Title, desc: t.home.why4Desc },
  ];
  return (
    <section className="py-12">
      <AnimatedSection className="mb-10">
        <p className="eyebrow">{t.home.whyEyebrow}</p>
        <h2 className="mt-3 text-3xl font-extrabold text-text-primary sm:text-4xl">
          {t.home.whyTitle}
        </h2>
      </AnimatedSection>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {reasons.map((reason, i) => (
          <AnimatedSection key={reason.title} delay={i * 0.06}>
            <div className="glass rounded-3xl p-7 shadow-soft">
              <span className="text-3xl font-bold tabular-nums text-brand-green-600 dark:text-brand-green-300">
                {locale === 'fa' ? toPersianDigits(i + 1) : `0${i + 1}`}
              </span>
              <h3 className="mt-3 text-lg font-bold text-text-primary">{reason.title}</h3>
              <p className="mt-2 text-sm leading-7 text-text-secondary">{reason.desc}</p>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}

function Ecosystem() {
  const { t, locale } = useLocale();
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;
  const tiles = [
    { icon: Store, title: t.nav.localMarket, to: '/marketplace' },
    { icon: ShieldCheck, title: t.nav.insurance, to: '/insurance' },
    { icon: Briefcase, title: t.nav.jobs, to: '/jobs' },
    { icon: FolderKanban, title: t.nav.freelance, to: '/projects' },
  ];
  return (
    <section className="py-12">
      <AnimatedSection className="mb-10 text-center">
        <p className="eyebrow justify-center">{t.home.ecosystemEyebrow}</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold text-text-primary sm:text-4xl">
          {t.home.ecosystemTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl leading-loose text-text-secondary">
          {t.home.ecosystemBody}
        </p>
      </AnimatedSection>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <AnimatedSection key={tile.to} delay={i * 0.05}>
            <Link
              to={tile.to}
              className="glass ct-lift flex h-full flex-col items-center gap-3 rounded-3xl px-4 py-8 text-center shadow-soft"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-700 dark:bg-brand-green-400/10 dark:text-brand-green-300">
                <tile.icon className="size-6" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-text-primary">{tile.title}</span>
              <ArrowIcon className="size-4 text-brand-green-600 rtl:-scale-x-100 dark:text-brand-green-300" aria-hidden="true" />
            </Link>
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}

