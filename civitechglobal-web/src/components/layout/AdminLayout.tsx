import { Outlet } from 'react-router';
import {
  ClipboardList,
  Code2,
  Inbox,
  LayoutDashboard,
  Mail,
  Settings,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { DashboardShell, type SidebarEntry } from './DashboardShell';

export function AdminLayout() {
  const { t } = useLocale();
  const { user } = useAuth();

  // Grouped rather than listed flat: with five intakes and two administration
  // screens a single rail scrolled, and everything read as equally important.
  const items: SidebarEntry[] = [
    { to: '/admin', label: t.admin.dashboard, icon: <LayoutDashboard className="size-4" />, end: true },
    {
      id: 'intake',
      label: t.admin.groupIntake,
      icon: <Inbox className="size-4" />,
      items: [
        { to: '/admin/projects', label: t.proposal.adminTitle, icon: <Code2 className="size-4" /> },
        { to: '/admin/resumes', label: t.join.adminTitle, icon: <UserPlus className="size-4" /> },
        { to: '/admin/requests', label: t.admin.requests, icon: <ClipboardList className="size-4" /> },
        { to: '/admin/messages', label: t.contact.inboxTitle, icon: <Mail className="size-4" /> },
      ],
    },
    {
      id: 'administration',
      label: t.admin.groupAdministration,
      icon: <Settings className="size-4" />,
      items: [
        { to: '/admin/users', label: t.admin.users, icon: <Users className="size-4" /> },
        // Role management is restricted to SUPER_ADMIN in the old app's
        // convention; keep it visible to both here since permissions are
        // backend-enforced anyway.
        ...(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
          ? [{ to: '/admin/roles', label: t.admin.roles, icon: <Shield className="size-4" /> }]
          : []),
      ],
    },
  ];

  return (
    <DashboardShell title={t.nav.admin} items={items}>
      <Outlet />
    </DashboardShell>
  );
}
