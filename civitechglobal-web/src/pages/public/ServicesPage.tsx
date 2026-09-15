import {
  Activity,
  BarChart3,
  ClipboardList,
  Code2,
  Headset,
  Landmark,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export default function ServicesPage() {
  const { t } = useLocale();
  useDocumentTitle(t.nav.services, { description: t.seo.services });

  const softwareServices = [
    { icon: Code2, title: t.services.software1Title, desc: t.services.software1Desc, glow: 'green' as const },
    { icon: Smartphone, title: t.services.software2Title, desc: t.services.software2Desc, glow: 'amber' as const },
    { icon: Landmark, title: t.services.software3Title, desc: t.services.software3Desc, glow: 'red' as const },
    { icon: BarChart3, title: t.services.software4Title, desc: t.services.software4Desc, glow: 'green' as const },
  ];

  const insuranceServices = [
    { icon: UserCheck, title: t.services.service1Title, desc: t.services.service1Desc, glow: 'green' as const },
    { icon: ClipboardList, title: t.services.service2Title, desc: t.services.service2Desc, glow: 'amber' as const },
    { icon: Activity, title: t.services.service3Title, desc: t.services.service3Desc, glow: 'red' as const },
    { icon: Headset, title: t.services.service4Title, desc: t.services.service4Desc, glow: 'green' as const },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <AnimatedSection className="mb-10 text-center sm:mb-12">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.services.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">{t.services.subtitle}</p>
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

      {/* Insurance services */}
      <section>
        <AnimatedSection className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
            {t.services.groupInsuranceTitle}
          </h2>
          <p className="mt-1 text-text-secondary">{t.services.groupInsuranceSubtitle}</p>
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
    </div>
  );
}
