import { Outlet } from 'react-router';
import {
  Briefcase,
  ClipboardList,
  Code2,
  Inbox,
  LayoutDashboard,
  Mail,
  FileText,
  FolderKanban,
  Gavel,
  Settings,
  Shield,
  ShieldCheck,
  Store,
  UserPlus,
  Users,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { DashboardShell, type SidebarEntry } from './DashboardShell';

export function AdminLayout() {
  const { t } = useLocale();
  const { user } = useAuth();

  /**
   * A super admin reaches everything; an admin reaches what it was granted.
   *
   * Without this the sidebar advertised every module to every admin, and the
   * links that were not theirs answered 403 — which reads as the site being
   * broken rather than as access it does not have.
   */
  const can = (permission: string) =>
    user?.role === 'SUPER_ADMIN' || (user?.permissions ?? []).includes(permission);

  // Grouped rather than listed flat: with five intakes and two administration
  // screens a single rail scrolled, and everything read as equally important.
  const items: SidebarEntry[] = [
    { to: '/admin', label: t.admin.dashboard, icon: <LayoutDashboard className="size-4" />, end: true },
    {
      id: 'intake',
      label: t.admin.groupIntake,
      icon: <Inbox className="size-4" />,
      items: [
        ...(can('projects')
          ? [{ to: '/admin/projects', label: t.proposal.adminTitle, icon: <Code2 className="size-4" /> }]
          : []),
        ...(can('resumes')
          ? [{ to: '/admin/resumes', label: t.join.adminTitle, icon: <UserPlus className="size-4" /> }]
          : []),
        ...(can('insurance')
          ? [{ to: '/admin/requests', label: t.admin.requests, icon: <ClipboardList className="size-4" /> }]
          : []),
        ...(can('messages')
          ? [{ to: '/admin/messages', label: t.contact.inboxTitle, icon: <Mail className="size-4" /> }]
          : []),
      ],
    },
    {
      id: 'marketplace',
      label: t.market.groupMarketplace,
      icon: <Store className="size-4" />,
      items: [
        ...(can('verification')
          ? [
              {
                to: '/admin/verifications',
                label: t.market.queueVerifications,
                icon: <ShieldCheck className="size-4" />,
              },
            ]
          : []),
        // Postings and the applications answering them are one desk: whoever
        // decides a role belongs on the board is who judges the replies to it.
        ...(can('jobs')
          ? [
              {
                to: '/admin/job-postings',
                label: t.market.queueJobs,
                icon: <Briefcase className="size-4" />,
              },
              {
                to: '/admin/applications',
                label: t.market.queueApplications,
                icon: <FileText className="size-4" />,
              },
            ]
          : []),
        ...(can('freelance')
          ? [
              {
                to: '/admin/freelance-projects',
                label: t.market.queueProjects,
                icon: <FolderKanban className="size-4" />,
              },
              {
                to: '/admin/bids',
                label: t.market.queueBids,
                icon: <Gavel className="size-4" />,
              },
            ]
          : []),
      ],
    },
    {
      id: 'administration',
      label: t.admin.groupAdministration,
      icon: <Settings className="size-4" />,
      items: [
        ...(can('users')
          ? [{ to: '/admin/users', label: t.admin.users, icon: <Users className="size-4" /> }]
          : []),
        ...(can('users')
          ? [{ to: '/admin/roles', label: t.admin.roles, icon: <Shield className="size-4" /> }]
          : []),
      ],
    },
  ];

  // A group with nothing left in it is noise, not structure — an admin granted
  // only one module should see one link, not two empty headings.
  const visible = items.filter((entry) => !('items' in entry) || entry.items.length > 0);

  return (
    <DashboardShell title={t.nav.admin} items={visible}>
      <Outlet />
    </DashboardShell>
  );
}
