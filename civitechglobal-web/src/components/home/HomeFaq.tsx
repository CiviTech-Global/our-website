import { ChevronDown } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

/**
 * The FAQ: the six objections every prospective client raises — timeline,
 * pricing, ownership, working with an existing team, maintenance, and how to
 * start — as native <details>/<summary> accordions. No JavaScript library:
 * the disclosure, the keyboard behaviour and the semantics come from the
 * platform, so the section works in the prerendered HTML too. The same copy
 * feeds the FAQPage JSON-LD on the home route (see HomePage).
 */
export function HomeFaq() {
  const { t } = useLocale();
  return (
    <section className="py-12">
      <AnimatedSection className="mb-10 text-center">
        <p className="eyebrow justify-center">{t.home.faqEyebrow}</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold text-text-primary sm:text-4xl">
          {t.home.faqTitle}
        </h2>
      </AnimatedSection>
      <div className="mx-auto max-w-3xl space-y-4">
        {t.home.faq.map((item, i) => (
          <AnimatedSection key={item.q} delay={i * 0.05}>
            <details className="group rounded-2xl border border-border-default bg-surface-50 shadow-soft">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-bold text-text-primary [&::-webkit-details-marker]:hidden sm:text-base">
                {item.q}
                <ChevronDown
                  className="size-5 shrink-0 text-brand-green-600 transition-transform group-open:rotate-180 dark:text-brand-green-300"
                  aria-hidden="true"
                />
              </summary>
              <p className="px-5 pb-5 text-sm leading-7 text-text-secondary">{item.a}</p>
            </details>
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
