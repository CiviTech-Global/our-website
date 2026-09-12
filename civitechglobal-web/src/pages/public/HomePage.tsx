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
import { useDocumentTitle } from '@/lib/documentTitle';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { HeroMotif } from '@/components/home/HeroMotif';

export default function HomePage() {
  const { t, locale } = useLocale();
  useDocumentTitle(undefined);
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
    <div className="mx-auto max-w-6xl px-4 pb-24">
      {/* Hero */}
      <section className="grid grid-cols-1 items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
        <AnimatedSection>
          <p className="mb-3 inline-block rounded-full border border-brand-green-500/30 bg-brand-green-500/10 px-3 py-1 text-xs font-medium text-brand-green-600 dark:text-brand-green-400">
            {t.home.heroEyebrow}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-text-primary sm:text-5xl">
            {t.home.heroTitle}
          </h1>
          <p className="mt-4 max-w-lg text-lg text-text-secondary">{t.home.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/services">
              <Button size="lg">
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
        <AnimatedSection className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t.home.whatWeDoTitle}</h2>
          <p className="mt-2 text-text-secondary">{t.home.whatWeDoSubtitle}</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 0.08}>
              <GlowCard glow={feature.glow} className="h-full">
                <feature.icon className="mb-4 size-8 text-brand-green-500" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-semibold text-text-primary">{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.desc}</p>
              </GlowCard>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* How we work */}
      <section className="py-12">
        <AnimatedSection className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t.home.howWeWorkTitle}</h2>
          <p className="mt-2 text-text-secondary">{t.home.howWeWorkSubtitle}</p>
        </AnimatedSection>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {howWeWork.map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 0.08}>
              <GlowCard glow="green" className="h-full">
                <item.icon className="mb-4 size-8 text-brand-green-500" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-semibold text-text-primary">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.desc}</p>
              </GlowCard>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Insurance: one service, stated once, and easy to find. */}
      <section className="py-12">
        <AnimatedSection className="mb-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-muted">
            {t.home.alsoTitle}
          </h2>
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
        <section className="glow-border rounded-2xl bg-surface-50 p-6 text-center shadow-soft sm:p-10">
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
