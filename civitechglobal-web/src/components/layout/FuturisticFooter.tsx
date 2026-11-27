import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, LifeBuoy, Pause, Play } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import logoSrc from '@/assets/logos/concept logo - no bg - white.png';

const MOTION_STORAGE_KEY = 'rtjg-motion';

/** Reads the saved motion preference; safe under prerender and private mode. */
function readMotionPaused(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === 'paused';
  } catch {
    return false;
  }
}

/* Links on the band: fog at rest, the 10% accent on hover — lemon on indigo
   (9.3:1) by day, aqua on navy at night. The accent is allowed as text on
   the band only, never on light surfaces. */
const BAND_LINK =
  'text-band-fg underline-offset-4 transition-colors duration-(--dur-feedback) hover:text-brand-amber-300 hover:underline';

/**
 * The site footer: the deep band that carries the palette's 30% — indigo by
 * day, a darker navy at night — closing every page the same way. Brand and
 * tagline, two action pills, then the crawler's plain-link surface and the
 * legal column, all in fog on the band. The ENAMAD seal is not here; it
 * follows #root in index.html and the redesign leaves it untouched.
 */
export function FuturisticFooter() {
  const { t } = useLocale();
  const year = new Date().getFullYear();
  const [motionPaused, setMotionPaused] = useState(readMotionPaused);

  // Apply on load and on every toggle; the choice survives the visit. The
  // attribute drives one CSS rule in index.css that freezes every animation.
  useEffect(() => {
    const root = document.documentElement;
    if (motionPaused) {
      root.setAttribute('data-motion', 'paused');
    } else {
      root.removeAttribute('data-motion');
    }
    try {
      window.localStorage.setItem(MOTION_STORAGE_KEY, motionPaused ? 'paused' : 'play');
    } catch {
      // Private mode: the toggle still works for this visit.
    }
  }, [motionPaused]);

  // TODO(i18n): move to dictionary — no footer key exists for this yet (the
  // `mobile.reduceMotion` strings belong to the mobile app's settings screen).
  const motionLabel = motionPaused ? 'Play animations' : 'Pause animations';

  return (
    // Same edges as the page frame and the navbar.
    <footer className="mt-8 px-4 pb-6 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-band text-band-fg shadow-soft">
        <div className="px-6 py-10 sm:px-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2 font-semibold text-white">
                {/* The white wordmark, as-is: it is made for dark grounds. */}
                <img src={logoSrc} alt={t.common.brand} className="size-9 object-contain" />
                <span className="text-lg font-bold">{t.common.brand}</span>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-7 text-band-fg">
                {t.footer.tagline}
              </p>
              {!t.common.brand.includes(t.common.legalName) && (
                <p className="mt-2 text-xs text-band-fg/70">{t.common.legalName}</p>
              )}
              {/* A route, not an address. There is no mailbox behind any
                  address we could print, and one that bounces reads as being
                  ignored — the contact form is the actual channel. */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link to="/contact" className="primary-pill !min-h-11 px-6 text-sm">
                  {t.nav.contact}
                  <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
                <Link
                  to="/help"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 px-5 text-sm font-semibold text-white transition-colors duration-(--dur-feedback) hover:border-brand-amber-300 hover:text-brand-amber-300"
                >
                  <LifeBuoy className="size-4" aria-hidden="true" />
                  {t.help.centreTitle}
                </Link>
              </div>
            </div>

            <nav aria-label={t.footer.links}>
              <p className="eyebrow">{t.footer.links}</p>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                {(
                  [
                    ['/services', t.nav.services],
                    ['/start-project', t.nav.startProject],
                    ['/portfolio', t.nav.portfolio],
                    ['/pricing', t.nav.pricing],
                    ['/about', t.nav.about],
                    ['/blog', t.nav.blog],
                    ['/team', t.nav.team],
                    ['/contact', t.nav.contact],
                  ] as const
                ).map(([to, label]) => (
                  <li key={to}>
                    <Link to={to} className={BAND_LINK}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={t.nav.groupEcosystem}>
              <p className="eyebrow">{t.nav.groupEcosystem}</p>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                {(
                  [
                    ['/jobs', t.nav.jobs],
                    ['/projects', t.nav.freelance],
                    ['/books', t.nav.books],
                    ['/marketplace', t.nav.localMarket],
                    ['/insurance', t.nav.insurance],
                    ['/consult', t.nav.consult],
                    ['/volunteer', t.nav.volunteer],
                  ] as const
                ).map(([to, label]) => (
                  <li key={to}>
                    <Link to={to} className={BAND_LINK}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={t.footer.legal}>
              <p className="eyebrow">{t.footer.legal}</p>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                <li>
                  <Link to="/privacy" className={BAND_LINK}>
                    {t.footer.privacy}
                  </Link>
                </li>
                <li>
                  <Link to="/help" className={BAND_LINK}>
                    {t.help.centreTitle}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-col items-center gap-1 border-t border-white/15 pt-5 text-center text-xs text-band-fg/70">
            <p>
              © {year}{' '}
              {t.common.brand.includes(t.common.legalName)
                ? t.common.brand
                : `${t.common.brand} (${t.common.legalName})`}
              . {t.footer.rights}
            </p>
            {/* Its own line rather than appended to the copyright: the two say
                different things — one is a legal notice about the company, the
                other is attribution for the work. Run together they read as a
                single sentence that is neither. */}
            <p>{t.footer.credit}</p>
            <button
              type="button"
              onClick={() => setMotionPaused((prev) => !prev)}
              aria-pressed={motionPaused}
              aria-label={motionLabel}
              title={motionLabel}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-band-fg transition-colors duration-(--dur-feedback) hover:border-brand-amber-300 hover:text-brand-amber-300"
            >
              {motionPaused ? (
                <Play className="size-3.5" aria-hidden="true" />
              ) : (
                <Pause className="size-3.5" aria-hidden="true" />
              )}
              {motionLabel}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
