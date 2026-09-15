import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import logoSrc from '@/assets/logos/concept logo - no bg - white.png';


export function FuturisticFooter() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 px-3 pb-6 sm:px-4">
      <div className="mx-auto max-w-6xl">
        <hr className="neon-line mb-8" />
        <div className="glass rounded-2xl px-6 py-8 shadow-soft">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center gap-2 font-semibold text-text-primary">
                <img
                  src={logoSrc}
                  alt={t.common.brand}
                  className="size-8 object-contain invert dark:invert-0"
                />
                <span className="gradient-text">{t.common.brand}</span>
              </div>
              <p className="text-sm text-text-secondary">{t.footer.tagline}</p>
              {!t.common.brand.includes(t.common.legalName) && (
                <p className="mt-1 text-xs text-text-muted">{t.common.legalName}</p>
              )}
              <div className="mt-4 flex items-center gap-3">
                <SocialLink href="mailto:info@civitechglobal.com" label="Email">
                  <MailIcon />
                </SocialLink>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-text-primary">{t.footer.links}</h4>
              <ul className="flex flex-col gap-2 text-sm text-text-secondary">
                <li>
                  <Link to="/about" className="hover:text-brand-green-500">
                    {t.nav.about}
                  </Link>
                </li>
                <li>
                  <Link to="/services" className="hover:text-brand-green-500">
                    {t.nav.services}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-brand-green-500">
                    {t.nav.contact}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-text-primary">{t.footer.legal}</h4>
              <ul className="flex flex-col gap-2 text-sm text-text-secondary">
                <li>
                  <span className="cursor-default opacity-70">{t.footer.privacy}</span>
                </li>
                <li>
                  <span className="cursor-default opacity-70">{t.footer.terms}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-1 border-t border-border-subtle pt-4 text-center text-xs text-text-muted">
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
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg border border-border-default text-text-secondary transition-colors hover:border-brand-green-500/50 hover:text-brand-green-500"
    >
      {children}
    </a>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
