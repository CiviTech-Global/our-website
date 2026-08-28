import { Outlet } from 'react-router';
import { LayoutDashboard, UserCircle } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { DashboardShell, type SidebarItem } from './DashboardShell';

export function UserLayout() {
  const { t } = useLocale();

  const items: SidebarItem[] = [
    { to: '/dashboard', label: t.dashboard.overview, icon: <LayoutDashboard className="size-4" />, end: true },
    { to: '/dashboard/profile', label: t.dashboard.profile, icon: <UserCircle className="size-4" /> },
  ];

  return (
    <DashboardShell title={t.common.brand} items={items}>
      <Outlet />
    </DashboardShell>
  );
}
