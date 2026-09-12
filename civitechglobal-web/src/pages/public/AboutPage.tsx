import { Target, Eye, Sparkles, HandHeart, Users } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { GlowCard } from '@/components/ui/GlowCard';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export default function AboutPage() {
  const { t } = useLocale();
  useDocumentTitle(t.nav.about);

  const values = [
    { icon: Sparkles, title: t.about.value1Title, desc: t.about.value1Desc },
    { icon: HandHeart, title: t.about.value2Title, desc: t.about.value2Desc },
    { icon: Users, title: t.about.value3Title, desc: t.about.value3Desc },
    { icon: Target, title: t.about.value4Title, desc: t.about.value4Desc },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <AnimatedSection className="mb-10 text-center sm:mb-12">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.about.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">{t.about.subtitle}</p>
        <p className="mx-auto mt-2 max-w-xl text-xs text-text-muted">{t.about.legalNote}</p>
      </AnimatedSection>

      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <AnimatedSection>
          <GlowCard glow="green" className="h-full">
            <Target className="mb-4 size-8 text-brand-green-500" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold text-text-primary">{t.about.missionTitle}</h2>
            <p className="text-sm text-text-secondary">{t.about.missionBody}</p>
          </GlowCard>
        </AnimatedSection>
        <AnimatedSection delay={0.08}>
          <GlowCard glow="amber" className="h-full">
            <Eye className="mb-4 size-8 text-brand-amber-500" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold text-text-primary">{t.about.visionTitle}</h2>
            <p className="text-sm text-text-secondary">{t.about.visionBody}</p>
          </GlowCard>
        </AnimatedSection>
      </div>

      <AnimatedSection className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-text-primary">{t.about.valuesTitle}</h2>
      </AnimatedSection>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
