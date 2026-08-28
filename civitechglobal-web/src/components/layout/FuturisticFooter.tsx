import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import logoSrc from '@/assets/logos/concept logo - no bg - white.png';

const TELEGRAM_URL = import.meta.env.VITE_TELEGRAM_BOT_URL ?? 'https://t.me/';

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
              <p className="mt-1 text-xs text-text-muted">{t.common.legalName}</p>
              <div className="mt-4 flex items-center gap-3">
                <SocialLink href={TELEGRAM_URL} label="Telegram">
                  <TelegramIcon />
                </SocialLink>
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

          <div className="mt-8 border-t border-border-subtle pt-4 text-center text-xs text-text-muted">
            © {year} {t.common.brand} ({t.common.legalName}). {t.footer.rights}
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

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M21.94 3.29a1.5 1.5 0 0 0-1.56-.22L2.7 10.4a1.4 1.4 0 0 0 .1 2.63l4.55 1.47 1.76 5.6a1.4 1.4 0 0 0 2.31.55l2.55-2.4 4.47 3.3a1.4 1.4 0 0 0 2.23-.86l3.05-15.1a1.5 1.5 0 0 0-.78-1.3ZM9.6 14.7l-1.2-3.9L17 6.4l-7.4 8.3Z" />
    </svg>
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
