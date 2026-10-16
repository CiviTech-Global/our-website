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
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

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

  const softwareServices = [
    { icon: Code2, title: t.services.software1Title, desc: t.services.software1Desc, glow: 'green' as const },
    { icon: Smartphone, title: t.services.software2Title, desc: t.services.software2Desc, glow: 'amber' as const },
    { icon: Landmark, title: t.services.software3Title, desc: t.services.software3Desc, glow: 'red' as const },
    { icon: BarChart3, title: t.services.software4Title, desc: t.services.software4Desc, glow: 'green' as const },
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
    { icon: UserCheck, title: t.services.service1Title, desc: t.services.service1Desc, glow: 'green' as const },
    { icon: ClipboardList, title: t.services.service2Title, desc: t.services.service2Desc, glow: 'amber' as const },
    { icon: Activity, title: t.services.service3Title, desc: t.services.service3Desc, glow: 'red' as const },
    { icon: Headset, title: t.services.service4Title, desc: t.services.service4Desc, glow: 'green' as const },
  ];

  return (
    <div className="page-frame">
      <AnimatedSection className="mb-10 text-center sm:mb-12">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.services.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl leading-loose text-text-secondary">{t.services.subtitle}</p>
      </AnimatedSection>

      {/* Software development */}
      <section className="mb-16">
        <AnimatedSection className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
            {t.services.groupSoftwareTitle}
          </h2>
          <p className="mt-1 text-text-secondary">{t.services.groupSoftwareSubtitle}</p>
          <Link to="/start-project" className="mt-4 inline-block">
            <Button>{t.nav.startProject}</Button>
          </Link>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {softwareServices.map((service, i) => (
            <AnimatedSection key={service.title} delay={i * 0.06}>
              <GlowCard glow={service.glow} className="h-full">
                <service.icon className="mb-4 size-8 text-brand-green-500" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-semibold text-text-primary">{service.title}</h3>
                <p className="text-sm text-text-secondary">{service.desc}</p>
              </GlowCard>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* How a project runs: idea to maintenance, in order. */}
      <section className="mb-16">
        <AnimatedSection className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">{t.services.processTitle}</h2>
          <p className="mt-1 text-text-secondary">{t.services.processSubtitle}</p>
        </AnimatedSection>
        {/* One animation for the list: an <ol> may hold only <li> children. */}
        <AnimatedSection>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((step, index) => (
              <li
                key={step.title}
                className="relative flex h-full flex-col gap-2 rounded-2xl border border-border-default bg-surface-50 p-5"
              >
                <span className="absolute top-4 text-3xl font-bold text-brand-green-500/20 ltr:right-4 rtl:left-4">
                  {locale === 'fa' ? toPersianDigits(index + 1) : index + 1}
                </span>
                <step.icon className="size-6 text-brand-green-500" aria-hidden="true" />
                <h3 className="mt-1 font-semibold text-text-primary">{step.title}</h3>
                <p className="text-sm text-text-secondary">{step.desc}</p>
              </li>
            ))}
          </ol>
        </AnimatedSection>
      </section>

      {/* Why us */}
      <section className="mb-16">
        <AnimatedSection className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">{t.services.whyTitle}</h2>
        </AnimatedSection>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason, i) => (
            <AnimatedSection key={reason.title} delay={i * 0.06}>
              <div className="flex h-full items-start gap-3">
                <reason.icon className="mt-0.5 size-6 shrink-0 text-brand-amber-600 dark:text-brand-amber-300" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-text-primary">{reason.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{reason.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Insurance services */}
      <section className="mb-16">
        <AnimatedSection className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
            {t.services.groupInsuranceTitle}
          </h2>
          <p className="mt-1 text-text-secondary">{t.services.groupInsuranceSubtitle}</p>
          <Link to="/insurance" className="mt-4 inline-block">
            <Button variant="outline">
              {t.home.alsoInsuranceCta}
              <ArrowIcon className="size-4" aria-hidden="true" />
            </Button>
          </Link>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {insuranceServices.map((service, i) => (
            <AnimatedSection key={service.title} delay={i * 0.06}>
              <GlowCard glow={service.glow} className="h-full">
                <service.icon className="mb-4 size-8 text-brand-green-500" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-semibold text-text-primary">{service.title}</h3>
                <p className="text-sm text-text-secondary">{service.desc}</p>
              </GlowCard>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* CTA */}
      <AnimatedSection>
        <section className="bagh-ground glow-border rounded-[var(--radius-feature)] bg-surface-50 p-8 text-center shadow-soft sm:p-12">
          <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t.services.ctaTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-text-secondary">{t.services.ctaSubtitle}</p>
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
