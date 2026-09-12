import { Outlet } from 'react-router';
import {
  Briefcase,
  FileText,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  ShieldCheck,
  Store,
  UserCircle,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { DashboardShell, type SidebarEntry } from './DashboardShell';

export function UserLayout() {
  const { t } = useLocale();

  // Grouped once the marketplace arrived: six links in a flat rail read as six
  // equally important places, when in fact four of them are one activity and
  // verification is the door into it.
  const items: SidebarEntry[] = [
    { to: '/dashboard', label: t.dashboard.overview, icon: <LayoutDashboard className="size-4" />, end: true },
    { to: '/dashboard/profile', label: t.dashboard.profile, icon: <UserCircle className="size-4" /> },
    {
      to: '/dashboard/verification',
      label: t.market.verificationTitle,
      icon: <ShieldCheck className="size-4" />,
    },
    {
      id: 'marketplace',
      label: t.market.groupMarketplace,
      icon: <Store className="size-4" />,
      items: [
        { to: '/dashboard/jobs', label: t.market.myJobs, icon: <Briefcase className="size-4" /> },
        {
          to: '/dashboard/applications',
          label: t.market.myApplications,
          icon: <FileText className="size-4" />,
        },
        {
          to: '/dashboard/projects',
          label: t.market.myProjects,
          icon: <FolderKanban className="size-4" />,
        },
        { to: '/dashboard/bids', label: t.market.myBids, icon: <Gavel className="size-4" /> },
      ],
    },
  ];

  return (
    <DashboardShell title={t.common.brand} items={items}>
      <Outlet />
    </DashboardShell>
  );
}
