import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { LocalePicker } from '@/components/layout/LocalePicker';
import { HelpButton } from '@/components/help/HelpButton';
import { useTheme } from '@/contexts/ThemeProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import logoSrc from '@/assets/logos/concept logo - no bg - white.png';
import { features } from '@/lib/features';

type NavKey =
  | 'cart'
  | 'pricing'
  | 'localMarket'
  | 'services'
  | 'startProject'
  | 'joinUs'
  | 'about'
  | 'insurance'
  | 'track'
  | 'jobs'
  | 'freelance'
  | 'freelanceServices'
  | 'freelancers'
  | 'books'
  | 'consult'
  | 'experts'
  | 'team'
  | 'customers'
  | 'partners'
  | 'portfolio'
  | 'volunteer'
  | 'contact'
  | 'blog';

interface NavLinkItem {
  to: string;
  key: NavKey;
}

/**
 * The 2026 rebrand navigation: a floating glass capsule with the four pages a
 * first-time visitor needs, one primary action, and a calm grouped menu for
 * everything else. On desktop the menu is a compact dropdown panel anchored
 * under the capsule; on small screens it becomes a full-screen sheet with
 * plain, readable type — no display-size links, no theatrical stagger.
 *
 * Home is not listed — the logo has always been that link. About is not in
 * the bar either; it lives in the menu's main group.
 */
const DIRECT_LINKS: NavLinkItem[] = [
  { to: '/services', key: 'services' },
  { to: '/portfolio', key: 'portfolio' },
  { to: '/pricing', key: 'pricing' },
  { to: '/blog', key: 'blog' },
];

/** The menu's two groups: what we sell and who we are, then the ecosystem. */
const MAIN_LINKS: NavLinkItem[] = [
  { to: '/services', key: 'services' },
  { to: '/start-project', key: 'startProject' },
  { to: '/portfolio', key: 'portfolio' },
  { to: '/pricing', key: 'pricing' },
  { to: '/about', key: 'about' },
  { to: '/team', key: 'team' },
  { to: '/experts', key: 'experts' },
  { to: '/customers', key: 'customers' },
  { to: '/partners', key: 'partners' },
  { to: '/contact', key: 'contact' },
  { to: '/blog', key: 'blog' },
  { to: '/track', key: 'track' },
];

const ECOSYSTEM_LINKS: NavLinkItem[] = [
  { to: '/jobs', key: 'jobs' },
  { to: '/projects', key: 'freelance' },
  ...(features.projectsV2
    ? ([
        { to: '/freelance-services', key: 'freelanceServices' },
        { to: '/freelancers', key: 'freelancers' },
      ] as const)
    : []),
  { to: '/books', key: 'books' },
  // Absent rather than disabled while the module is off: a menu item that
  // leads to a route that does not resolve is worse than no item.
  ...(features.tradeMaster
    ? ([
        { to: '/marketplace', key: 'localMarket' },
        ...(features.tradeMasterOrders ? ([{ to: '/marketplace/cart', key: 'cart' }] as const) : []),
      ] as const)
    : []),
  { to: '/insurance', key: 'insurance' },
  { to: '/consult', key: 'consult' },
  { to: '/join', key: 'joinUs' },
  { to: '/volunteer', key: 'volunteer' },
];

/** display:none chrome (sheet-only or panel-only controls) cannot take focus. */
function isVisible(el: HTMLElement) {
  return el.offsetParent !== null || getComputedStyle(el).display !== 'none';
}

export function FuturisticNavbar() {
  const { t } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const homeUrl = isAdmin ? '/admin' : '/dashboard';

  // Navigating ends the menu, whether the click came from inside it or from
  // the browser's back button.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Hide on scroll down, return on scroll up — the reference studio's
  // behaviour. Passive listener; state only changes past a threshold so the
  // bar does not flicker at the top of the page.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 8);
        if (isOpen) {
          setHidden(false);
        } else if (y > lastY && y > 220) {
          setHidden(true);
        } else {
          setHidden(false);
        }
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isOpen]);

  // Escape closes from anywhere inside the menu.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // A press outside the panel (and outside its trigger) dismisses it. On
  // mobile the sheet covers the viewport, so every press lands inside it and
  // this never fires there.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (overlayRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  // Focus moves into the menu on open and returns to the trigger on close,
  // so a keyboard user is never stranded. The page behind may only scroll
  // freely on desktop, where the menu is a panel — the mobile sheet replaces
  // the page, so the page behind it must not scroll.
  useEffect(() => {
    if (!isOpen) return;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const previousOverflow = document.body.style.overflow;
    if (!isDesktop) document.body.style.overflow = 'hidden';
    const trigger = triggerRef.current;
    const root = overlayRef.current;
    const first = root
      ? Array.from(root.querySelectorAll<HTMLElement>('a, button')).find(isVisible)
      : undefined;
    first?.focus();
    return () => {
      if (!isDesktop) document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isOpen]);

  // A minimal focus trap, bound on the document while the menu is open: Tab
  // and Shift+Tab cycle between the menu's own controls, so focus can never
  // fall through to the page behind. Keydown rather than a React prop,
  // because jsx-a11y flags a listener on the dialog element itself.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const root = overlayRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      ).filter(isVisible);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault();
        last.focus();
        // Clicking outside can leave focus on <body>; a plain Tab must not
        // fall through to the page behind the menu.
      } else if (!event.shiftKey && (active === last || !root.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const closeOverlay = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {/* The page frame's gutters, and an inner width of the frame less its
          gutters (76rem), so the capsule's edges line up with every page's
          content. Hidden by sliding up, never unmounted, so focus is safe.
          The transform is dropped while the menu is open: a transformed
          ancestor would become the containing block for the fixed mobile
          sheet. */}
      <header
        className={cn(
          'sticky top-3 z-40 px-4 transition-transform duration-(--dur-reveal) motion-reduce:transition-none sm:top-4 sm:px-6 lg:px-8',
          hidden && !isOpen && '-translate-y-[140%]'
        )}
      >
        <nav
          aria-label={t.common.brand}
          className={cn(
            'glass mx-auto flex max-w-[76rem] items-center justify-between gap-2 rounded-full py-2 ps-4 pe-2 shadow-soft transition-all duration-(--dur-reveal) motion-reduce:transition-none lg:gap-3',
            scrolled && 'shadow-soft-lg'
          )}
        >
          <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold text-text-primary">
            <img
              src={logoSrc}
              alt={t.common.brand}
              className="size-8 object-contain invert dark:invert-0"
            />
            <span className="gradient-text hidden sm:inline">{t.common.brand}</span>
          </Link>

          {/* Inline links only where the bar has room for them; below xl the
              same destinations are one tap away in the menu. */}
          <ul className="hidden items-center xl:flex">
            {DIRECT_LINKS.map((entry) => (
              <li key={entry.to}>
                <NavLink
                  to={entry.to}
                  className={({ isActive }) =>
                    cn(
                      'whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-(--dur-feedback)',
                      isActive
                        ? 'text-brand-green-700 dark:text-brand-green-300'
                        : 'text-text-secondary hover:bg-surface-200/70 hover:text-text-primary'
                    )
                  }
                >
                  {t.nav[entry.key]}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <HelpButton className="hidden sm:inline-flex" />
            <LocalePicker />
            <IconToggle
              onClick={toggleTheme}
              label={theme === 'dark' ? t.theme.light : t.theme.dark}
              className="hidden md:inline-flex"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </IconToggle>

            {/* Fixed height, never wraps: the one action the bar exists for. */}
            <Link
              to="/start-project"
              className="primary-pill ms-1 !h-10 !min-h-10 hidden shrink-0 whitespace-nowrap px-5 text-sm md:inline-flex"
            >
              {t.nav.startProject}
            </Link>

            {isAuthenticated ? (
              <span className="hidden items-center md:flex">
                <Link to={homeUrl}>
                  <Button variant="ghost" size="sm">
                    {isAdmin ? <ShieldCheck className="size-4" /> : <LayoutDashboard className="size-4" />}
                    {isAdmin ? t.nav.admin : t.nav.dashboard}
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => logout()}>
                  <LogOut className="size-4" />
                  <span className="hidden xl:inline">{t.nav.logout}</span>
                </Button>
              </span>
            ) : (
              <span className="hidden items-center md:flex">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="whitespace-nowrap">
                    {t.nav.login}
                  </Button>
                </Link>
              </span>
            )}

            <button
              ref={triggerRef}
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label={t.nav.all}
              aria-controls="nav-overlay"
              aria-expanded={isOpen}
              className="ms-1 inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-950 px-3.5 text-sm font-bold text-surface-50 transition-colors duration-(--dur-feedback) hover:bg-brand-green-700 dark:bg-brand-green-400 dark:text-surface-950 dark:hover:bg-brand-green-300"
            >
              {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              <span className="hidden sm:inline">{t.nav.all}</span>
            </button>
          </div>
        </nav>

        {isOpen && (
          <div
            ref={overlayRef}
            id="nav-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nav-overlay-title"
            className={cn(
              'ct-fade-in z-50 text-text-primary',
              // Mobile: a full-screen sheet that replaces the page.
              'max-lg:fixed max-lg:inset-0 max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:bg-surface-50/95 max-lg:backdrop-blur-xl max-lg:dark:bg-surface-950/95',
              // Desktop: a dropdown panel anchored under the capsule, its
              // gutters matching the header's so it stays inside the frame.
              'lg:absolute lg:inset-x-0 lg:top-full lg:px-8 lg:pt-3'
            )}
          >
            <div className="mx-auto w-full max-w-[76rem]">
              <div
                className={cn(
                  'px-5 pb-10 pt-5 sm:px-8',
                  'lg:ms-auto lg:max-h-[70dvh] lg:w-full lg:max-w-[40rem] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-border-subtle lg:bg-surface-50 lg:p-5 lg:shadow-soft-lg lg:dark:bg-surface-900'
                )}
              >
                {/* Sheet-only chrome: the panel on desktop is dismissed by
                    the trigger, Escape, or a press outside it. */}
                <div className="flex items-center justify-between lg:hidden">
                  <Link to="/" onClick={closeOverlay} className="flex items-center gap-2 font-semibold">
                    <img src={logoSrc} alt={t.common.brand} className="size-9 object-contain invert dark:invert-0" />
                    <span className="gradient-text">{t.common.brand}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={closeOverlay}
                    aria-label={t.common.close}
                    className="glass-pill !min-h-10 !px-4 text-sm"
                  >
                    <X className="size-4" />
                    {t.common.close}
                  </button>
                </div>

                <div className="mt-8 grid gap-8 lg:mt-0 lg:grid-cols-2 lg:gap-6">
                  <MenuGroup
                    title={t.nav.groupMain}
                    links={MAIN_LINKS}
                    onNavigate={closeOverlay}
                    titleId="nav-overlay-title"
                  />
                  <MenuGroup
                    title={t.nav.groupEcosystem}
                    links={ECOSYSTEM_LINKS}
                    onNavigate={closeOverlay}
                  />
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-5">
                  <LocalePicker variant="inline" />
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={toggleTheme}
                    className="md:hidden"
                  >
                    {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    {theme === 'dark' ? t.theme.light : t.theme.dark}
                  </Button>
                  {isAuthenticated ? (
                    <>
                      <Link to={homeUrl} onClick={closeOverlay}>
                        <Button variant="secondary" size="md">
                          {isAdmin ? t.nav.admin : t.nav.dashboard}
                        </Button>
                      </Link>
                      <Button variant="outline" size="md" onClick={() => logout()}>
                        {t.nav.logout}
                      </Button>
                    </>
                  ) : (
                    // One way in; the login page carries the register link.
                    <Link to="/login" onClick={closeOverlay}>
                      <Button variant="secondary" size="md">
                        {t.nav.login}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

function MenuGroup({
  title,
  links,
  onNavigate,
  titleId,
}: {
  title: string;
  links: readonly NavLinkItem[];
  onNavigate: () => void;
  titleId?: string;
}) {
  const { t } = useLocale();
  return (
    <section>
      <p id={titleId} className="eyebrow">
        {title}
      </p>
      <ul className="mt-3 flex flex-col">
        {links.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-base transition-colors duration-(--dur-feedback) lg:text-sm',
                  isActive
                    ? 'bg-brand-green-500/10 text-brand-green-700 dark:text-brand-green-300'
                    : 'text-text-secondary hover:bg-surface-200/70 hover:text-text-primary'
                )
              }
            >
              {t.nav[item.key]}
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 shrink-0 opacity-0 transition-opacity duration-(--dur-feedback) group-hover:opacity-100 motion-reduce:transition-none rtl:-scale-x-100"
              />
            </NavLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function IconToggle({
  onClick,
  label,
  children,
  className,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-full p-2 text-text-secondary transition-colors hover:bg-surface-200/70 hover:text-text-primary',
        className
      )}
    >
      {children}
    </button>
  );
}
