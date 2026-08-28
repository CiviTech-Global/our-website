import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { Menu, X, Sun, Moon, Languages, LogOut, ExternalLink } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

export interface DashboardShellProps {
  title: string;
  items: SidebarItem[];
  children: ReactNode;
}

/** Shared shell for the user and admin dashboards: RTL-aware sidebar + topbar. */
export function DashboardShell({ title, items, children }: DashboardShellProps) {
  const { t, locale, toggleLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400'
                    : 'text-text-secondary hover:bg-surface-200 hover:text-text-primary'
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
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
