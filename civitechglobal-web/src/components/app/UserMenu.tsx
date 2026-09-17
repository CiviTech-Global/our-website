import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeftRight, ChevronsUpDown, ExternalLink, LogOut, Moon, Sun, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useTheme } from '@/contexts/ThemeProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { LocalePicker } from '@/components/layout/LocalePicker';
import { cn } from '@/lib/utils';

/**
 * Who is signed in, and everything that is about the account rather than about
 * a screen: profile, the other panel, the public site, theme, language, sign
 * out.
 *
 * Gathered here, at the foot of the sidebar, so the top bar is free for the
 * breadcrumb trail and the few actions that belong to the current page.
 */
export function UserMenu({ panel }: { panel: 'user' | 'admin' }) {
  const { t } = useLocale();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Dismissed by a press elsewhere or Escape — never by the pointer leaving.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const isStaff = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/login');
  }

  const row =
    'flex h-8 w-full items-center gap-2 rounded px-2 text-body text-app-text-2 hover:bg-app-fill hover:text-app-text [&_svg]:size-4 [&_svg]:text-app-icon';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={t.app.userMenu}
        className="flex w-full items-center gap-2.5 rounded border border-transparent p-2 text-start hover:border-app-border-light hover:bg-app-subtle"
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-app-primary-soft text-label font-semibold text-app-primary"
          aria-hidden="true"
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium text-app-text">
            {user.firstName} {user.lastName}
          </span>
          <span className="block truncate text-caption text-app-text-3">{t.app.roles[user.role]}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-app-icon" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute inset-x-0 bottom-full z-50 mb-1.5 rounded border border-app-border bg-app-panel p-1.5 shadow-app-float"
        >
          <p className="truncate px-2 pb-1.5 pt-1 text-caption text-app-text-3" dir="ltr">
            {user.email}
          </p>
          <div className="my-1 h-px bg-app-border-light" />

          <Link to="/dashboard/profile" onClick={() => setOpen(false)} className={row}>
            <UserCircle aria-hidden="true" />
            {t.nav.profile}
          </Link>
          {isStaff && (
            <Link
              to={panel === 'admin' ? '/dashboard' : '/admin'}
              onClick={() => setOpen(false)}
              className={row}
            >
              <ArrowLeftRight aria-hidden="true" />
              {panel === 'admin' ? t.app.switchToAccount : t.app.switchToAdmin}
            </Link>
          )}
          <a href="/" target="_blank" rel="noopener noreferrer" className={row}>
            <ExternalLink aria-hidden="true" />
            {t.nav.viewSite}
          </a>
          <button type="button" onClick={toggleTheme} className={row}>
            {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            {theme === 'dark' ? t.theme.light : t.theme.dark}
          </button>

          <div className="my-1 h-px bg-app-border-light" />
          <p className="px-2 pb-1 pt-1 text-caption font-medium uppercase tracking-wide text-app-text-3">
            {t.app.language}
          </p>
          <LocalePicker variant="inline" className="px-1 pb-1 [&_button]:px-2 [&_button]:py-1 [&_button]:text-label" />

          <div className="my-1 h-px bg-app-border-light" />
          <button
            type="button"
            onClick={handleLogout}
            className={cn(row, 'text-status-error hover:text-status-error [&_svg]:text-status-error')}
          >
            <LogOut aria-hidden="true" />
            {t.nav.logout}
          </button>
        </div>
      )}
    </div>
  );
}
