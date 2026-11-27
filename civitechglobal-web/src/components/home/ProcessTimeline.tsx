import { useEffect, useRef } from 'react';
import { BadgeCheck, CalendarCheck, ClipboardCheck } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

/**
 * The process timeline: four numbered steps beside a rail whose turquoise fill
 * draws downward as the section scrolls through the viewport — the reference
 * studio's signature, rebuilt with the site's own motion discipline
 * (transform only, passive listener, rAF-throttled, reduced-motion safe).
 *
 * The fill height is written straight to the element as --spine (0..1) rather
 * than lifted into React state: a scroll handler that re-rended the tree on
 * every frame would jank on the mid-range phones much of the audience uses.
 */
export function ProcessTimeline() {
  const { t, locale } = useLocale();
  const listRef = useRef<HTMLOListElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const fill = fillRef.current;
    if (!list || !fill) return;

    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = list.getBoundingClientRect();
      const viewport = window.innerHeight || document.documentElement.clientHeight;
      // Starts drawing when the list enters the lower three quarters of the
      // viewport; completes as its middle passes the upper quarter.
      const progress = (viewport * 0.78 - rect.top) / (rect.height * 0.9);
      fill.style.setProperty('--spine', String(Math.min(1, Math.max(0, progress))));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const steps = [
    { title: t.home.step1Title, desc: t.home.step1Desc },
    { title: t.home.step2Title, desc: t.home.step2Desc },
    { title: t.home.step3Title, desc: t.home.step3Desc },
    { title: t.home.step4Title, desc: t.home.step4Desc },
  ];

  const promises = [
    { icon: ClipboardCheck, title: t.home.promise1Title, desc: t.home.promise1Desc },
    { icon: CalendarCheck, title: t.home.promise2Title, desc: t.home.promise2Desc },
    { icon: BadgeCheck, title: t.home.promise3Title, desc: t.home.promise3Desc },
  ];

  return (
    <section className="py-12">
      <AnimatedSection className="mb-12">
        <p className="eyebrow">{t.home.processEyebrow}</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-extrabold text-text-primary sm:text-4xl">
          {t.home.processTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">{t.home.processSubtitle}</p>
      </AnimatedSection>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative">
          {/* The rail: a hairline with the gradient fill growing inside it. */}
          <div className="timeline-rail" aria-hidden="true">
            <div ref={fillRef} className="timeline-fill" />
          </div>
          <ol ref={listRef} className="flex flex-col gap-10">
            {steps.map((step, i) => (
              <li key={step.title} className="relative ps-12">
                <span className="absolute start-0 top-0 flex size-9 -translate-x-0 items-center justify-center rounded-full border border-brand-green-200 bg-brand-green-50 text-sm font-bold text-brand-green-700 dark:border-brand-green-400/40 dark:bg-surface-100 dark:text-brand-green-300">
                  {locale === 'fa' ? toPersianDigits(i + 1) : i + 1}
                </span>
                <AnimatedSection delay={i * 0.05}>
                  <h3 className="text-xl font-bold text-text-primary">{step.title}</h3>
                  <p className="mt-2 max-w-xl leading-7 text-text-secondary">{step.desc}</p>
                </AnimatedSection>
              </li>
            ))}
          </ol>
        </div>

        {/* The collaboration promises, stacked beside the rail. */}
        <div className="flex flex-col justify-center gap-4">
          {promises.map((promise, i) => (
            <AnimatedSection key={promise.title} delay={i * 0.08}>
              <div className="glass rounded-2xl p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-700 dark:bg-brand-green-400/10 dark:text-brand-green-300">
                    <promise.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-bold text-text-primary">{promise.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{promise.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
