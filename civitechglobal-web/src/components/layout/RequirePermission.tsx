import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface RequirePermissionProps {
  children: ReactNode;
  /** The module key this screen needs, as named in the server's PERMISSIONS. */
  permission?: string;
  /** Set when the screen is super-admin-only rather than permission-gated. */
  superAdminOnly?: boolean;
}

/**
 * The per-screen half of the access model.
 *
 * ProtectedRoute answers "is this person staff", which is the same answer for
 * every admin screen. It is not the same question as "may this person see the
 * user list", and the sidebar already knows the difference — it hides links a
 * person cannot use.
 *
 * Without this, that hiding was the only thing standing between a scoped admin
 * and a screen they had no business on. Typing the URL still got them the page
 * shell, which then fired a request the API correctly refused — so the outcome
 * was a broken-looking screen rather than an answer. The data was never at
 * risk; the explanation was.
 *
 * It refuses in place rather than redirecting: sending somebody to /admin when
 * they followed a link leaves them wondering whether they mistyped it.
 */
export function RequirePermission({ children, permission, superAdminOnly }: RequirePermissionProps) {
  const { user } = useAuth();
  const { t } = useLocale();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  // A super admin bypasses the permission check, exactly as requirePermission
  // does on the server. Keeping the two rules the same shape is what stops the
  // UI and the API disagreeing about who may do what.
  const allowed = superAdminOnly
    ? isSuperAdmin
    : isSuperAdmin || !permission || (user?.permissions ?? []).includes(permission);

  if (allowed) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md text-center">
        <div className="flex flex-col items-center gap-3 py-6">
          <ShieldAlert className="size-10 text-brand-amber-500" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-text-primary">{t.admin.noAccessTitle}</h1>
          <p className="text-sm text-text-secondary">
            {superAdminOnly ? t.admin.noAccessSuperAdmin : t.admin.noAccessBody}
          </p>
          <Link to="/admin">
            <Button variant="outline" size="sm">
              {t.admin.dashboard}
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
