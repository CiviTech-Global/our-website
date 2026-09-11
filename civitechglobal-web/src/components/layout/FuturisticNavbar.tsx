import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import {
  ChevronDown,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import logoSrc from '@/assets/logos/concept logo - no bg - white.png';

type NavKey =
  | 'services'
  | 'startProject'
  | 'joinUs'
  | 'about'
  | 'insurance'
  | 'track'
  | 'contact';

interface NavLinkItem {
  to: string;
  key: NavKey;
}

interface NavMenu {
  id: string;
  key: 'servicesMenu' | 'companyMenu';
  items: NavLinkItem[];
}

type NavEntry = NavLinkItem | NavMenu;

const isMenu = (entry: NavEntry): entry is NavMenu => 'items' in entry;

/**
 * Eight top-level links did not fit a laptop without wrapping, and reading one
 * meant reading all eight. Two menus and a link is what is left: what we sell,
 * who we are, and the one utility people arrive specifically to use.
 *
 * Home is not listed — the logo has always been that link.
 */
const NAV_ENTRIES: NavEntry[] = [
  {
    id: 'services',
    key: 'servicesMenu',
    items: [
      { to: '/services', key: 'services' },
      { to: '/start-project', key: 'startProject' },
      { to: '/insurance', key: 'insurance' },
    ],
  },
  {
    id: 'company',
    key: 'companyMenu',
    items: [
      { to: '/about', key: 'about' },
      { to: '/join', key: 'joinUs' },
      { to: '/contact', key: 'contact' },
    ],
  },
  { to: '/track', key: 'track' },
];

export function FuturisticNavbar() {
  const { t, locale, toggleLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { pathname } = useLocation();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const homeUrl = isAdmin ? '/admin' : '/dashboard';

  // Stable, so the dismissal listener is not torn down and rebound every render.
  const closeMenu = useCallback(() => setOpenMenu(null), []);

  // Navigating ends a menu, whether the click came from inside it or from the
  // browser's back button.
  useEffect(() => {
    setOpenMenu(null);
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openMenu]);

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
          {NAV_ENTRIES.map((entry) =>
            isMenu(entry) ? (
              <li key={entry.id}>
                <NavMenuButton
                  menu={entry}
                  open={openMenu === entry.id}
                  onToggle={() => setOpenMenu((prev) => (prev === entry.id ? null : entry.id))}
                  onClose={closeMenu}
                />
              </li>
            ) : (
              <li key={entry.to}>
                <NavLink
                  to={entry.to}
                  className={({ isActive }) =>
                    cn(
                      'whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors lg:px-3',
                      isActive
                        ? 'text-brand-green-600 dark:text-brand-green-400'
                        : 'text-text-secondary hover:text-text-primary'
                    )
                  }
                >
                  {t.nav[entry.key]}
                </NavLink>
              </li>
            )
          )}
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
                  {isAdmin ? (
                    <ShieldCheck className="size-4" />
                  ) : (
                    <LayoutDashboard className="size-4" />
                  )}
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
        <div className="ct-drop-in glass mx-auto mt-2 max-w-6xl rounded-2xl p-4 shadow-soft md:hidden">
          {/* The drawer has room for every link at once, so the menus flatten
              into labelled sections rather than becoming a second thing to open. */}
          <ul className="flex flex-col gap-1">
            {NAV_ENTRIES.map((entry) =>
              isMenu(entry) ? (
                <li key={entry.id}>
                  <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {t.nav[entry.key]}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {entry.items.map((item) => (
                      <li key={item.to}>
                        <MobileLink to={item.to} label={t.nav[item.key]} />
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={entry.to} className="pt-3">
                  <MobileLink to={entry.to} label={t.nav[entry.key]} />
                </li>
              )
            )}
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
                <Link to={homeUrl}>
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
                <Link to="/login">
                  <Button variant="secondary" size="md">
                    {t.nav.login}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="md">
                    {t.nav.register}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MobileLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'block rounded-lg px-3 py-3 text-sm font-medium hover:bg-surface-200',
          isActive ? 'text-brand-green-600 dark:text-brand-green-400' : 'text-text-primary'
        )
      }
    >
      {label}
    </NavLink>
  );
}

function NavMenuButton({
  menu,
  open,
  onToggle,
  onClose,
}: {
  menu: NavMenu;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const containsCurrent = menu.items.some(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`)
  );

  /**
   * Dismissal is a click elsewhere, not the pointer leaving.
   *
   * This closed on mouseleave, which made the menu unusable. The panel is
   * absolutely positioned, so the container's box is only the button; moving
   * from the trigger towards the panel left that box and closed the menu
   * before the pointer ever arrived. A menu opened with a click should stay
   * open until it is dismissed.
   *
   * pointerdown rather than click, so it dismisses on press like every other
   * overlay and covers touch without waiting for a synthetic click.
   */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onClose]);

  /** The panel's links in document order, for arrow-key movement. */
  function items(): HTMLAnchorElement[] {
    return Array.from(containerRef.current?.querySelectorAll('a') ?? []);
  }

  function focusItem(index: number) {
    const all = items();
    // Wraps, so ArrowUp from the first item lands on the last rather than
    // nowhere at all.
    if (all.length > 0) all[(index + all.length) % all.length]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      onClose();
      // Focus would otherwise drop to <body>, stranding a keyboard user at the
      // top of the document with no idea where they had been.
      buttonRef.current?.focus();
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    // While closed, only ArrowDown means anything; the rest should still
    // scroll the page.
    if (!open) {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      onToggle();
      return;
    }

    event.preventDefault();
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);

    if (event.key === 'Home') focusItem(0);
    else if (event.key === 'End') focusItem(all.length - 1);
    else if (event.key === 'ArrowDown') focusItem(at + 1);
    else focusItem(at - 1);
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      // Covers tabbing away, which a pointer listener never sees.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onClose();
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        // On the button and the links rather than their container: keydown
        // bubbles from whichever is focused, and both are natively focusable,
        // so nothing here needs a synthetic role or tabIndex.
        onKeyDown={onKeyDown}
        aria-expanded={open}
        aria-controls={id}
        className={cn(
          'flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors lg:px-3',
          containsCurrent
            ? 'text-brand-green-600 dark:text-brand-green-400'
            : 'text-text-secondary hover:text-text-primary'
        )}
      >
        {t.nav[menu.key]}
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform duration-200 motion-reduce:transition-none',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {/* The offset is padding on an outer wrapper rather than a margin on the
          panel, so it belongs to the subtree. The pointer travelling from the
          trigger to the first item never crosses ground that is part of
          neither — which is what made this menu impossible to use. */}
      {open && (
        <div id={id} className="absolute top-full z-50 pt-2 start-0">
          <div className="ct-drop-in glass min-w-48 rounded-xl border border-border-subtle p-1.5 shadow-soft">
            <ul className="flex flex-col">
              {menu.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onKeyDown={onKeyDown}
                    className={({ isActive }) =>
                      cn(
                        'block whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400'
                          : 'text-text-secondary hover:bg-surface-200 hover:text-text-primary'
                      )
                    }
                  >
                    {t.nav[item.key]}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function IconToggle({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
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
