import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { motion } from 'framer-motion';
import { Menu, X, Sun, Moon, Languages, LayoutDashboard, ShieldCheck, LogOut } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import logoSrc from '@/assets/logos/concept logo - no bg - white.png';

const NAV_ITEMS = [
  { to: '/', key: 'home' as const },
  { to: '/services', key: 'services' as const },
  { to: '/start-project', key: 'startProject' as const },
  { to: '/about', key: 'about' as const },
  { to: '/insurance', key: 'insurance' as const },
  { to: '/track', key: 'track' as const },
  { to: '/contact', key: 'contact' as const },
];

export function FuturisticNavbar() {
  const { t, locale, toggleLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const homeUrl = isAdmin ? '/admin' : '/dashboard';

  return (
    <header className="sticky top-3 z-40 px-3 sm:top-4 sm:px-4">
      <nav className="glass mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-2xl px-4 py-2.5 shadow-soft lg:gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-text-primary">
          <img
            src={logoSrc}
            alt={t.common.brand}
            className="size-8 object-contain invert dark:invert-0"
          />
          <span className="gradient-text hidden sm:inline">{t.common.brand}</span>
        </Link>

        <ul className="hidden items-center gap-0.5 md:flex lg:gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors lg:px-3',
                    isActive
                      ? 'text-brand-green-600 dark:text-brand-green-400'
                      : 'text-text-secondary hover:text-text-primary'
                  )
                }
              >
                {t.nav[item.key]}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-1 md:flex lg:gap-1.5">
          <IconToggle onClick={toggleLocale} label={t.locale[locale === 'fa' ? 'en' : 'fa']}>
            <Languages className="size-4" aria-hidden="true" />
          </IconToggle>
          <IconToggle onClick={toggleTheme} label={theme === 'dark' ? t.theme.light : t.theme.dark}>
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconToggle>

          {isAuthenticated ? (
            <>
              <Link to={homeUrl}>
                <Button variant="ghost" size="sm">
                  {isAdmin ? <ShieldCheck className="size-4" /> : <LayoutDashboard className="size-4" />}
                  {isAdmin ? t.nav.admin : t.nav.dashboard}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                <LogOut className="size-4" />
                {t.nav.logout}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  {t.nav.login}
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  {t.nav.register}
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-text-primary md:hidden"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass mx-auto mt-2 max-w-6xl rounded-2xl p-4 shadow-soft md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-lg px-3 py-3 text-sm font-medium text-text-primary hover:bg-surface-200"
                >
                  {t.nav[item.key]}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
            <Button variant="ghost" size="md" onClick={toggleLocale}>
              <Languages className="size-4" />
              {t.locale[locale === 'fa' ? 'en' : 'fa']}
            </Button>
            <Button variant="ghost" size="md" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {theme === 'dark' ? t.theme.light : t.theme.dark}
            </Button>
            {isAuthenticated ? (
              <>
                <Link to={homeUrl} onClick={() => setIsOpen(false)}>
                  <Button variant="secondary" size="md">
                    {isAdmin ? t.nav.admin : t.nav.dashboard}
                  </Button>
                </Link>
                <Button variant="outline" size="md" onClick={() => logout()}>
                  {t.nav.logout}
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="secondary" size="md">
                    {t.nav.login}
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsOpen(false)}>
                  <Button variant="primary" size="md">
                    {t.nav.register}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </header>
  );
}

function IconToggle({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-200 hover:text-text-primary dark:hover:bg-surface-300"
    >
      {children}
    </button>
  );
}
