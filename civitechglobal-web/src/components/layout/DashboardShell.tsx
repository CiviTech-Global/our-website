import { useCallback, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { ChevronDown, Menu, X, Sun, Moon, Languages, LogOut, ExternalLink } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { NotificationBell } from '@/components/account/NotificationBell';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

/**
 * A named set of links that collapses.
 *
 * The admin nav outgrew a flat list once projects, CVs, enquiries and messages
 * all wanted a place in it. Grouping is not decoration here: it says which of
 * those are the same kind of work.
 */
export interface SidebarGroup {
  id: string;
  label: string;
  icon: ReactNode;
  items: SidebarItem[];
}

export type SidebarEntry = SidebarItem | SidebarGroup;

const isGroup = (entry: SidebarEntry): entry is SidebarGroup => 'items' in entry;

export interface DashboardShellProps {
  title: string;
  items: SidebarEntry[];
  children: ReactNode;
  /**
   * Where the notification bell links to. Only shells with a notifications
   * page pass this — the admin area has none yet, so it gets no bell.
   */
  notificationsLink?: string;
}

/** react-router decides this for a NavLink; a group header has to ask. */
function matches(pathname: string, item: SidebarItem): boolean {
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
}

const COLLAPSED_KEY = 'ct-nav-collapsed';

/**
 * Which groups the person has closed — not which are open.
 *
 * Storing the closures means a group added later shows up expanded rather than
 * hidden behind a preference nobody set, and an unreadable or absent value just
 * means "nothing collapsed".
 */
function readCollapsed(): string[] {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Shared shell for the user and admin dashboards: RTL-aware sidebar + topbar. */
export function DashboardShell({ title, items, children, notificationsLink }: DashboardShellProps) {
  const { t, locale, toggleLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed);

  const toggleGroup = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // A browser refusing storage is not a reason to refuse the click.
      }
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-surface-100">
      {/* Sidebar */}
      <aside
        className={cn(
          'glass fixed inset-y-0 start-0 z-40 flex w-64 shrink-0 flex-col overflow-y-auto border-e border-border-default p-4 transition-transform',
          'lg:static lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : locale === 'fa' ? 'translate-x-full' : '-translate-x-full'
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-text-primary">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-green-500 text-white">
              CT
            </span>
            <span>{title}</span>
          </Link>
          <button
            type="button"
            className="-me-1.5 flex size-11 shrink-0 items-center justify-center rounded-lg text-text-secondary lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto">
          {items.map((entry) =>
            isGroup(entry) ? (
              <NavGroup
                key={entry.id}
                group={entry}
                // A group holding the current page opens regardless of the
                // stored preference: hiding where you are is never right.
                open={!collapsed.includes(entry.id) || entry.items.some((i) => matches(pathname, i))}
                onToggle={() => toggleGroup(entry.id)}
                onNavigate={closeSidebar}
              />
            ) : (
              <NavItem key={entry.to} item={entry} onNavigate={closeSidebar} />
            )
          )}
        </nav>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-red-600 transition-colors hover:bg-brand-red-500/10 dark:text-brand-red-400"
          >
            <LogOut className="size-4" />
            {t.nav.logout}
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-surface-950/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main column */}
      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border-default bg-surface-50/80 px-3 py-2 backdrop-blur sm:gap-3 sm:px-4 sm:py-3">
          <button
            type="button"
            className="-ms-1.5 flex size-11 shrink-0 items-center justify-center rounded-lg text-text-primary lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>

          <div className="hidden min-w-0 truncate text-sm text-text-secondary lg:block">
            {user && `${user.firstName} ${user.lastName}`}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {notificationsLink && <NotificationBell to={notificationsLink} />}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-200 hover:text-text-primary"
            >
              <ExternalLink className="size-4 shrink-0" />
              <span className="hidden sm:inline">{t.nav.viewSite}</span>
            </a>
            <button
              type="button"
              onClick={toggleLocale}
              aria-label="Toggle language"
              className="flex size-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-200 hover:text-text-primary"
            >
              <Languages className="size-4" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex size-11 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-200 hover:text-text-primary"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <span className="ms-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-green-500/15 text-sm font-semibold text-brand-green-600 dark:text-brand-green-400">
              {user?.firstName?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  item,
  nested,
  onNavigate,
}: {
  item: SidebarItem;
  nested?: boolean;
  onNavigate: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-2.5 rounded-lg py-2.5 text-sm font-medium transition-colors',
          // Indented with a padding step rather than a margin so the hover and
          // active backgrounds still span the full width of the rail.
          nested ? 'ps-9 pe-3' : 'px-3',
          isActive
            ? 'bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400'
            : 'text-text-secondary hover:bg-surface-200 hover:text-text-primary'
        )
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  );
}

function NavGroup({
  group,
  open,
  onToggle,
  onNavigate,
}: {
  group: SidebarGroup;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const regionId = `nav-group-${group.id}`;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={regionId}
        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-200 hover:text-text-primary"
      >
        {group.icon}
        <span className="flex-1 text-start">{group.label}</span>
        <ChevronDown
          // Closed, it points at the content it is hiding — which is a
          // different direction in each script, so both are stated explicitly
          // rather than left to cascade order.
          className={cn(
            'size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
            !open && 'ltr:-rotate-90 rtl:rotate-90'
          )}
          aria-hidden="true"
        />
      </button>

      {/* Animating grid rows collapses to the content's own height without
          measuring it, and both keyframes run on the compositor. */}
      <div
        id={regionId}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        {/* `inert` keeps collapsed links out of the tab order; without it the
            focus ring would disappear into a zero-height box. */}
        <div className="overflow-hidden" inert={!open}>
          <div className="flex flex-col gap-1 pt-1">
            {group.items.map((item) => (
              <NavItem key={item.to} item={item} nested onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
