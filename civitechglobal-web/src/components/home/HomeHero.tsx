import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Store } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { BAZAAR_APP_URL, bazaarLink } from '@/lib/storeLinks';
import { useAppDownloads } from '@/api/capabilities';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { KineticWords } from '@/components/ui/KineticWords';
import { cn } from '@/lib/utils';
import logoSrc from '@/assets/logos/concept logo - no bg - white.png';

/**
 * The hero: a full-bleed garden stage. The headline is solid high-contrast
 * gradient-clipped and rises word by word (Persian-safe). The visual is an
 * orbital girih motif — concentric dashed rings, a turning star ring, the logo
 * at the centre — all SVG in theme tokens, so both themes cost nothing extra.
 */
export function HomeHero() {
  const { t, locale } = useLocale();
  const ArrowIcon = locale === 'fa' ? ArrowLeft : ArrowRight;

  // The server's store link once it answers; the known one until then, so the
  // prerendered hero carries it. A server with no Bazaar link hides it.
  const downloads = useAppDownloads();
  const bazaar = downloads ? downloads.bazaar : BAZAAR_APP_URL;

  return (
    <section className="hero-canvas bagh-ground relative -mx-4 overflow-hidden rounded-b-[var(--radius-feature)] px-4 pb-24 pt-14 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:pb-28 lg:pt-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <AnimatedSection>
          <p className="bagh-chip mb-6">{t.home.heroEyebrow}</p>
          <KineticWords
            text={t.home.heroTitle}
            className={cn(
              'max-w-3xl text-[clamp(2.4rem,1.5rem+3.4vw,4.2rem)] font-bold leading-[1.3] text-text-primary'
            )}
          />
          <p className="mt-6 max-w-xl text-lg leading-loose text-text-secondary">
            {t.home.heroSubtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/start-project" className="primary-pill">
              {t.home.heroCtaPrimary}
              <ArrowIcon className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <Link to="/contact" className="glass-pill">
              {t.home.heroCtaSecondary}
            </Link>
          </div>
          {bazaar && (
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={bazaarLink(bazaar, locale)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-surface-950 px-4 py-2 text-sm font-medium text-surface-50 transition hover:opacity-90 dark:bg-surface-50 dark:text-surface-950"
              >
                <Store className="size-4" aria-hidden="true" />
                {t.appDownload.bazaar}
              </a>
              <Link
                to="/app"
                className="text-sm font-semibold text-brand-green-700 underline-offset-4 hover:underline dark:text-brand-green-300"
              >
                {t.appDownload.title}
              </Link>
            </div>
          )}
        </AnimatedSection>

        <AnimatedSection delay={0.12} className="relative">
          <OrbitalMotif />
        </AnimatedSection>
      </div>

      {/* The stage dissolves into the page below: stacked blur strips. */}
      <div className="progressive-blur" aria-hidden="true" />
    </section>
  );
}

/** The points of a regular octagon, flat side up, around the plan's centre. */
function octagon(radius: number): string {
  return Array.from({ length: 8 }, (_, i) => {
    const angle = ((22.5 + i * 45) * Math.PI) / 180;
    return `${(200 + radius * Math.cos(angle)).toFixed(1)},${(200 + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
}

/**
 * Concentric dashed rings around the logo, a slowly turning ring of
 * eight-point stars, and two orbiting lights — the garden geometry translated
 * into the studio's orbital language. At the centre, the old hero's idea
 * returns: a deep lapis octagonal pool holds the (white) logo, so the mark
 * has real contrast on the light ground instead of floating white-on-plaster.
 * Pure SVG; the spin stops for reduced motion (index.css kill-switch).
 */
function OrbitalMotif() {
  const star = 'M0,-26 L7,-9 L26,-9 L11,3 L16,22 L0,11 L-16,22 L-11,3 L-26,-9 L-7,-9 Z';

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md lg:max-w-[34rem]">
      <svg viewBox="0 0 400 400" className="size-full" aria-hidden="true">
        <defs>
          <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" className="[stop-color:var(--color-brand-green-400)]" stopOpacity="0.28" />
            <stop offset="100%" className="[stop-color:var(--color-brand-green-400)]" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="196" fill="url(#hero-glow)" />
        <circle cx="200" cy="200" r="186" className="fill-none stroke-border-default" />
        <circle
          cx="200"
          cy="200"
          r="162"
          className="fill-none stroke-brand-green-500/50 dark:stroke-brand-green-400/40"
          strokeDasharray="2 8"
          strokeWidth="1.5"
        />
        <circle cx="200" cy="200" r="118" className="fill-none stroke-border-default" />
        <circle
          cx="200"
          cy="200"
          r="94"
          className="fill-none stroke-brand-green-500/60 dark:stroke-brand-green-400/50"
          strokeDasharray="3 7"
          strokeWidth="1.5"
        />
        {/* Orbiting lights on the outer dashed ring (top and bottom). */}
        <circle cx="200" cy="14" r="5" className="fill-brand-green-500" />
        <circle cx="200" cy="386" r="4" className="fill-brand-green-600 dark:fill-brand-green-300" />
        {/* The turning ring of stars. */}
        <g className="ct-spin-slow" style={{ transformOrigin: '200px 200px' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d={star}
              transform={`rotate(${i * 45 + 22.5} 200 200) translate(200 118) scale(0.32)`}
              className="fill-none stroke-brand-green-500 dark:stroke-brand-green-400"
              strokeWidth="2"
            />
          ))}
        </g>
        {/* The pool: where a Persian garden puts its pavilion, and where the
            eye settles in a symmetric plan — the logo's dark ground. */}
        <polygon points={octagon(96)} className="fill-brand-lapis-600 stroke-brand-lapis-800 dark:fill-brand-lapis-500 dark:stroke-brand-lapis-300" strokeWidth="3" />
        <polygon points={octagon(85)} className="fill-none stroke-white/25" strokeWidth="1.5" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Decorative: the wordmark already sits in the h1 and the navbar. */}
        <img
          src={logoSrc}
          alt=""
          className="ct-pulse-soft w-[34%] object-contain drop-shadow-[0_6px_14px_oklch(20%_0.08_264/0.45)]"
        />
      </div>
    </div>
  );
}
