import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronRight, ExternalLink, Menu, PanelLeftOpen } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { NotificationBell } from '@/components/account/NotificationBell';
import { SurfaceContext } from '@/components/ui/surface';
import { cn } from '@/lib/utils';
import { AppRail } from './AppRail';
import { AppSidebar } from './AppSidebar';
import { itemMatches, moduleHome, resolveActive, visibleModules, type NavModule } from './navigation';
import { ShellContext } from './shell-context';

export interface AppShellProps {
  panel: 'user' | 'admin';
  modules: NavModule[];
  children: ReactNode;
  /** Where the bell leads. Only panels with a notifications screen pass one. */
  notificationsLink?: string;
}

const HIDDEN_KEY = 'ct-sidebar-hidden';

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * The frame every dashboard screen sits in: icon rail, context sidebar, top bar
 * with the breadcrumb trail, and a scrolling canvas.
 *
 * Everything inside renders on the `app` surface, so the shared buttons, fields
 * and cards take their dashboard form here and their marketing form everywhere
 * else without a single call site knowing the difference.
 *
 * Below the large breakpoint the rail and the sidebar become one drawer. Only
 * the canvas scrolls — the frame stays put — so the navigation is where it was
 * no matter how far down a long queue somebody has read.
 */
export function AppShell({ panel, modules, children, notificationsLink }: AppShellProps) {
  const { t, locale } = useLocale();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(readHidden);
  const [pageCrumb, setPageCrumb] = useState<string | null>(null);

  const shown = useMemo(() => visibleModules(modules), [modules]);
  const active = resolveActive(pathname, shown);
  const panelTitle = panel === 'admin' ? t.app.adminPanel : t.app.userPanel;
  const homeTo = (shown[0] && moduleHome(shown[0])) ?? (panel === 'admin' ? '/admin' : '/dashboard');

  // A navigation closes the drawer, whether it came from a link inside it or
  // from the browser's back button.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // The drawer is modal on a phone: Escape closes it, and the page behind does
  // not scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const setHidden = useCallback((hidden: boolean) => {
    setSidebarHidden(hidden);
    try {
      localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0');
    } catch {
      // A browser refusing storage still gets the toggle for this visit.
    }
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const shellValue = useMemo(() => ({ setPageCrumb }), []);

  // The trail: panel › module › screen › this record.
  const crumbs: Array<{ label: string; to?: string }> = [{ label: panelTitle, to: homeTo }];
  if (active && active.module !== shown[0]) {
    const to = moduleHome(active.module);
    crumbs.push({ label: active.module.label, to: to ?? undefined });
  }
  if (active?.item && active.item.to !== homeTo) {
    crumbs.push({ label: active.item.label, to: active.item.to });
  }
  // A page's own title is added only below a navigation link — on the link's
  // own screen it would repeat the crumb before it.
  const onItemItself = active?.item ? itemMatches(pathname, { ...active.item, end: true }) : false;
  if (pageCrumb && !onItemItself) crumbs.push({ label: pageCrumb });

  const rail = (
    <AppRail modules={shown} activeId={active?.module.id} homeTo={homeTo} onNavigate={closeDrawer} />
  );

  return (
    <SurfaceContext.Provider value="app">
      <ShellContext.Provider value={shellValue}>
        <div className="flex h-dvh overflow-hidden bg-app-canvas text-body text-app-text-2">
          {/* Desktop frame */}
          <div className="hidden h-full lg:flex">
            {rail}
            {!sidebarHidden && (
              <AppSidebar
                panel={panel}
                panelTitle={panelTitle}
                module={active?.module}
                onNavigate={closeDrawer}
                onHide={() => setHidden(true)}
              />
            )}
          </div>

          {/* Mobile drawer: the same two columns, off-canvas. */}
          {drawerOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="absolute inset-0 bg-[#0c111d]/45" onClick={closeDrawer} aria-hidden="true" />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t.app.mainNavigation}
                className={cn(
                  'absolute inset-y-0 start-0 flex max-w-[calc(100vw-3rem)] shadow-app-float',
                  locale === 'fa' ? 'ct-slide-in-right' : 'ct-slide-in-left'
                )}
              >
                {rail}
                <AppSidebar
                  panel={panel}
                  panelTitle={panelTitle}
                  module={active?.module}
                  onNavigate={closeDrawer}
                  onHide={closeDrawer}
                  onCloseDrawer={closeDrawer}
                />
              </div>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-app-border bg-app-panel px-3 sm:px-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={t.app.openMenu}
                className="flex size-8 shrink-0 items-center justify-center rounded text-app-icon hover:bg-app-fill hover:text-app-text lg:hidden"
              >
                <Menu className="size-[18px]" aria-hidden="true" />
              </button>
              {sidebarHidden && (
                <button
                  type="button"
                  onClick={() => setHidden(false)}
                  aria-label={t.app.expandSidebar}
                  title={t.app.expandSidebar}
                  className="hidden size-8 shrink-0 items-center justify-center rounded text-app-icon hover:bg-app-fill hover:text-app-text lg:flex"
                >
                  <PanelLeftOpen className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                </button>
              )}

              <nav aria-label={t.app.breadcrumb} className="min-w-0 flex-1">
                <ol className="flex min-w-0 items-center gap-1 text-body">
                  {crumbs.map((crumb, index) => {
                    const last = index === crumbs.length - 1;
                    return (
                      <li
                        key={`${crumb.label}-${index}`}
                        className={cn(
                          'flex min-w-0 items-center gap-1',
                          // On a phone only the current page fits; the drawer
                          // already shows where it sits.
                          !last && 'hidden sm:flex'
                        )}
                      >
                        {index > 0 && (
                          <ChevronRight
                            className="hidden size-3.5 shrink-0 text-app-text-4 sm:block rtl:rotate-180"
                            aria-hidden="true"
                          />
                        )}
                        {last || !crumb.to ? (
                          <span
                            aria-current={last ? 'page' : undefined}
                            className={cn('truncate', last ? 'font-medium text-app-text' : 'text-app-text-3')}
                          >
                            {crumb.label}
                          </span>
                        ) : (
                          <Link to={crumb.to} className="truncate text-app-text-3 hover:text-app-text">
                            {crumb.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>

              <div className="flex shrink-0 items-center gap-0.5">
                {notificationsLink && <NotificationBell to={notificationsLink} />}
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.nav.viewSite}
                  title={t.nav.viewSite}
                  className="flex size-8 items-center justify-center rounded text-app-icon hover:bg-app-fill hover:text-app-text"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                </a>
              </div>
            </header>

            <main id="main-content" className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</div>
            </main>
          </div>
        </div>
      </ShellContext.Provider>
    </SurfaceContext.Provider>
  );
}
