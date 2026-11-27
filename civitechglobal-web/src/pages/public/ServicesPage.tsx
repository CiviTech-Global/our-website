import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ClipboardList,
  Code2,
  Headset,
  Landmark,
  Lightbulb,
  LockOpen,
  PenTool,
  Rocket,
  Smartphone,
  UserCheck,
  Wallet,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { localeHref } from '@/i18n/localePath';
import { toPersianDigits } from '@/i18n/utils';
import { CANONICAL_ORIGIN, useDocumentTitle } from '@/lib/documentTitle';
import { breadcrumbSchema } from '@/lib/structuredData';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { BandCta } from '@/components/marketing/BandCta';

/**
 * Services, in the 2026 rebrand language: software engineering leads, the
 * page-head is a garden-lit stage, cards wear the gradient hairline edge, and
 * insurance is clearly the secondary group it is.
 */
export default function ServicesPage() {
  const { t, locale } = useLocale();
  // The tab and the search result name the service, not just the section.
  useDocumentTitle(t.services.seoTitle, {
    description: t.seo.services,
    jsonLd: CANONICAL_ORIGIN
      ? breadcrumbSchema(CANONICAL_ORIGIN, [
          { name: t.nav.home, path: localeHref(locale, '/') },
          { name: t.services.title, path: localeHref(locale, '/services') },
        ])
      : undefined,
  });
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;

  // The bento anatomy from the home page: the core offer opens large on the
  // gradient edge, the strategy line closes the grid, so no cell sits empty.
  const softwareServices = [
    { icon: Code2, title: t.services.software1Title, desc: t.services.software1Desc, span: true, hero: true },
    { icon: Smartphone, title: t.services.software2Title, desc: t.services.software2Desc, span: false },
    { icon: Landmark, title: t.services.software3Title, desc: t.services.software3Desc, span: false },
    { icon: BarChart3, title: t.services.software4Title, desc: t.services.software4Desc, span: true },
  ];

  const process = [
    { icon: Lightbulb, title: t.services.process1Title, desc: t.services.process1Desc },
    { icon: PenTool, title: t.services.process2Title, desc: t.services.process2Desc },
    { icon: Code2, title: t.services.process3Title, desc: t.services.process3Desc },
    { icon: Rocket, title: t.services.process4Title, desc: t.services.process4Desc },
  ];

  const reasons = [
    { icon: BadgeCheck, title: t.services.why1Title, desc: t.services.why1Desc },
    { icon: Zap, title: t.services.why2Title, desc: t.services.why2Desc },
    { icon: Wallet, title: t.services.why3Title, desc: t.services.why3Desc },
    { icon: LockOpen, title: t.services.why4Title, desc: t.services.why4Desc },
  ];

  const insuranceServices = [
    { icon: UserCheck, title: t.services.service1Title, desc: t.services.service1Desc },
    { icon: ClipboardList, title: t.services.service2Title, desc: t.services.service2Desc },
    { icon: Activity, title: t.services.service3Title, desc: t.services.service3Desc },
    { icon: Headset, title: t.services.service4Title, desc: t.services.service4Desc },
  ];

  return (
    <div className="page-frame !pt-0">
      {/* Page head: the same garden-lit stage the home hero uses, so every core
          page reads as one studio. */}
      <section className="hero-canvas bagh-ground -mx-4 mb-14 px-4 pb-16 pt-14 text-center sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <AnimatedSection>
          <p className="eyebrow justify-center">{t.home.servicesEyebrow}</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold text-text-primary sm:text-5xl">
            {t.services.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-loose text-text-secondary">
            {t.services.subtitle}
          </p>
          <Link to="/start-project" className="primary-pill mt-8">
            {t.nav.startProject}
            <ArrowIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </AnimatedSection>
      </section>

      {/* Software development */}
      <section className="mb-16">
        <AnimatedSection className="mb-8">
          <h2 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
            {t.services.groupSoftwareTitle}
          </h2>
          <p className="mt-2 text-text-secondary">{t.services.groupSoftwareSubtitle}</p>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {softwareServices.map((service, i) => (
            <AnimatedSection
              key={service.title}
              delay={i * 0.08}
              className={`h-full ${service.span ? 'lg:col-span-2' : ''}`}
            >
              <article
                className={`ct-lift flex h-full flex-col rounded-3xl p-7 ${
                  service.hero
                    ? 'card-edge sm:p-9'
                    : 'border border-border-default bg-surface-50 shadow-soft'
                }`}
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-700 dark:bg-brand-green-400/10 dark:text-brand-green-300">
                  <service.icon className="size-6" aria-hidden="true" />
                </span>
                <h3
                  className={`mt-5 font-bold text-text-primary ${
                    service.hero ? 'text-2xl sm:text-3xl' : 'text-xl'
                  }`}
                >
                  {service.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-7 text-text-secondary">{service.desc}</p>
              </article>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* How a project runs: idea to maintenance, in order. */}
      <section className="mb-16">
        <AnimatedSection className="mb-8">
          <h2 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
            {t.services.processTitle}
          </h2>
          <p className="mt-2 text-text-secondary">{t.services.processSubtitle}</p>
        </AnimatedSection>
        {/* One animation for the list: an <ol> may hold only <li> children. */}
        <AnimatedSection>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((step, index) => (
              <li
                key={step.title}
                className="glass relative flex h-full flex-col gap-2 rounded-3xl p-5 shadow-soft"
              >
                {/* The same numbered-circle language as the home timeline. */}
                <span className="absolute top-4 flex size-9 items-center justify-center rounded-full border border-brand-green-200 bg-brand-green-50 text-sm font-bold tabular-nums text-brand-green-700 ltr:right-4 rtl:left-4 dark:border-brand-green-400/40 dark:bg-surface-100 dark:text-brand-green-300">
                  {locale === 'fa' ? toPersianDigits(index + 1) : index + 1}
                </span>
                <step.icon className="size-6 text-brand-green-600 dark:text-brand-green-300" aria-hidden="true" />
                <h3 className="mt-1 font-bold text-text-primary">{step.title}</h3>
                <p className="text-sm leading-6 text-text-secondary">{step.desc}</p>
              </li>
            ))}
          </ol>
        </AnimatedSection>
      </section>

      {/* Why us */}
      <section className="mb-16">
        <AnimatedSection className="mb-8">
          <h2 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
            {t.services.whyTitle}
          </h2>
        </AnimatedSection>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason, i) => (
            <AnimatedSection key={reason.title} delay={i * 0.06} className="h-full">
              <div className="flex h-full items-start gap-3 rounded-3xl border border-border-subtle p-5">
                <reason.icon className="mt-0.5 size-6 shrink-0 text-brand-green-600 dark:text-brand-green-300" aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-text-primary">{reason.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">{reason.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Insurance services: the secondary group, visually quieter. */}
      <section className="mb-16">
        <AnimatedSection className="mb-8">
          <h2 className="text-2xl font-extrabold text-text-primary sm:text-3xl">
            {t.services.groupInsuranceTitle}
          </h2>
          <p className="mt-2 text-text-secondary">{t.services.groupInsuranceSubtitle}</p>
          <Link
            to="/insurance"
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-green-700 underline-offset-4 hover:underline dark:text-brand-green-300"
          >
            {t.home.alsoInsuranceCta}
            <ArrowIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {insuranceServices.map((service, i) => (
            <AnimatedSection key={service.title} delay={i * 0.06} className="h-full">
              <article className="ct-lift h-full rounded-3xl border border-border-subtle bg-surface-50 p-6 dark:bg-surface-100">
                <service.icon className="size-7 text-brand-green-600 dark:text-brand-green-300" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-bold text-text-primary">{service.title}</h3>
                <p className="mt-2 text-sm leading-7 text-text-secondary">{service.desc}</p>
              </article>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* The closer: the same deep band every public page ends on. */}
      <BandCta
        title={t.services.ctaTitle}
        body={t.services.ctaSubtitle}
        primaryLabel={t.nav.startProject}
        primaryTo="/start-project"
        secondaryLabel={t.home.heroCtaSecondary}
        secondaryTo="/contact"
      />
    </div>
  );
}
