import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Code2, Compass, Layers, Palette } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

/**
 * The services bento: four tiles on a three-column grid (one column on
 * mobile). The large "custom software development" tile spans two columns
 * and carries the gradient card edge — it is the studio's core offer; the
 * three disciplines beside and below it are quiet surface cards. Every tile
 * states its outcome in one line and leads to /services.
 */
export function ServicesBento() {
  const { t, locale } = useLocale();
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;
  const tiles = [
    { icon: Layers, title: t.home.serviceCustomTitle, desc: t.home.serviceCustomDesc, span: true, hero: true },
    { icon: Palette, title: t.home.serviceDesignTitle, desc: t.home.serviceDesignDesc, span: false },
    { icon: Code2, title: t.home.serviceDevTitle, desc: t.home.serviceDevDesc, span: false },
    { icon: Compass, title: t.home.serviceStrategyTitle, desc: t.home.serviceStrategyDesc, span: true },
  ];
  return (
    <section className="py-12">
      <AnimatedSection className="mb-10">
        <p className="eyebrow">{t.home.servicesEyebrow}</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-extrabold text-text-primary sm:text-4xl">
          {t.home.servicesTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-text-secondary">{t.home.servicesSubtitle}</p>
      </AnimatedSection>
      {/* 2+1 / 1+2 on the three-column grid: the hero tile opens the bento and
          the strategy tile closes it, so no cell is left empty. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {tiles.map((tile, i) => (
          <AnimatedSection
            key={tile.title}
            delay={i * 0.08}
            className={`h-full ${tile.span ? 'lg:col-span-2' : ''}`}
          >
            <article
              className={`ct-lift flex h-full flex-col rounded-3xl p-7 ${
                tile.hero
                  ? 'card-edge sm:p-9'
                  : 'border border-border-default bg-surface-50 shadow-soft'
              }`}
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-700 dark:bg-brand-green-400/10 dark:text-brand-green-300">
                <tile.icon className="size-6" aria-hidden="true" />
              </span>
              <h3
                className={`mt-5 font-bold text-text-primary ${
                  tile.hero ? 'text-2xl sm:text-3xl' : 'text-xl'
                }`}
              >
                {tile.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-7 text-text-secondary">{tile.desc}</p>
              <Link
                to="/services"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-green-700 underline-offset-4 hover:underline dark:text-brand-green-300"
              >
                {t.home.servicesCta}
                <ArrowIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </article>
          </AnimatedSection>
        ))}
      </div>
    </section>
  );
}
