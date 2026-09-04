import { Link } from 'react-router';
import { Code2, ShieldCheck, MessageCircle, LineChart, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useInsuranceCatalog } from '@/api/insurance';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Spinner } from '@/components/ui/Spinner';
import { HeroMotif } from '@/components/home/HeroMotif';

const TELEGRAM_URL = import.meta.env.VITE_TELEGRAM_BOT_URL ?? 'https://t.me/';

export default function HomePage() {
  const { t, locale } = useLocale();
  const { data: categories, isLoading, isError } = useInsuranceCatalog();
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;

  const features = [
    { icon: Code2, title: t.home.feature0Title, desc: t.home.feature0Desc, glow: 'red' as const },
    { icon: ShieldCheck, title: t.home.feature1Title, desc: t.home.feature1Desc, glow: 'green' as const },
    { icon: MessageCircle, title: t.home.feature2Title, desc: t.home.feature2Desc, glow: 'amber' as const },
    { icon: LineChart, title: t.home.feature3Title, desc: t.home.feature3Desc, glow: 'red' as const },
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
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
              <Button size="lg">
                {t.home.heroCtaPrimary}
                <ArrowIcon className="size-4" aria-hidden="true" />
              </Button>
            </a>
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

      {/* Categories teaser */}
      <section className="py-12">
        <AnimatedSection className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t.home.categoriesTitle}</h2>
          <p className="mt-2 text-text-secondary">{t.home.categoriesSubtitle}</p>
        </AnimatedSection>

        {isLoading && (
          <div className="flex justify-center py-10">
            <Spinner label={t.common.loading} />
          </div>
        )}

        {(isError || (categories && categories.length === 0)) && !isLoading && (
          <p className="text-center text-text-muted">{t.home.categoriesEmpty}</p>
        )}

        {!isLoading && categories && categories.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 8).map((category, i) => (
              <AnimatedSection key={category.id} delay={i * 0.05}>
                <GlowCard glow="amber" className="flex h-full flex-col items-center gap-2 text-center">
                  <span className="text-3xl" aria-hidden="true">
                    {category.emoji}
                  </span>
                  <span className="text-sm font-medium text-text-primary">{category.title}</span>
                </GlowCard>
              </AnimatedSection>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <AnimatedSection>
        <section className="glow-border rounded-2xl bg-surface-50 p-6 text-center shadow-soft sm:p-10">
          <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t.home.ctaTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-text-secondary">{t.home.ctaSubtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
              <Button size="lg">{t.home.heroCtaPrimary}</Button>
            </a>
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
