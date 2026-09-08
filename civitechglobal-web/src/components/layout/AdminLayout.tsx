import { Outlet } from 'react-router';
import { LayoutDashboard, Users, Shield, ClipboardList, Code2 } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { DashboardShell, type SidebarItem } from './DashboardShell';

export function AdminLayout() {
  const { t } = useLocale();
  const { user } = useAuth();

  const items: SidebarItem[] = [
    { to: '/admin', label: t.admin.dashboard, icon: <LayoutDashboard className="size-4" />, end: true },
    { to: '/admin/projects', label: t.proposal.adminTitle, icon: <Code2 className="size-4" /> },
    { to: '/admin/requests', label: t.admin.requests, icon: <ClipboardList className="size-4" /> },
    { to: '/admin/users', label: t.admin.users, icon: <Users className="size-4" /> },
    // Role management is restricted to SUPER_ADMIN in the old app's convention; keep it
    // visible to both ADMIN/SUPER_ADMIN here since permissions are backend-enforced anyway.
    ...(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
      ? [{ to: '/admin/roles', label: t.admin.roles, icon: <Shield className="size-4" /> }]
      : []),
  ];

  return (
    <DashboardShell title={t.nav.admin} items={items}>
      <Outlet />
    </DashboardShell>
  );
}
