import { Outlet } from 'react-router';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  ClipboardList,
  Code2,
  FileText,
  FolderGit2,
  FolderKanban,
  Gavel,
  GraduationCap,
  Handshake,
  Inbox,
  LayoutDashboard,
  Mail,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { useWorkload } from '@/api/admin';
import { AppShell } from '@/components/app/AppShell';
import type { NavItem, NavModule } from '@/components/app/navigation';
import type { QueueKey } from '@/types/admin';

/**
 * The admin panel's navigation, as modules on the rail and screens in the
 * sidebar.
 *
 * A super admin reaches everything; an admin reaches what it was granted. A
 * screen the reader cannot open is not listed, and a module left with nothing
 * in it is not shown — otherwise the links that are not theirs answer 403,
 * which reads as the site being broken rather than as access they do not have.
 */
export function AdminLayout() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { data: workload } = useWorkload(Boolean(user));

  const isSuper = user?.role === 'SUPER_ADMIN';
  const can = (permission: string) => isSuper || (user?.permissions ?? []).includes(permission);
  const open = (key: QueueKey) => workload?.queues[key]?.open;

  /** One entry per queue, used both in its own module and in "waiting on you". */
  const queue = {
    projects: { to: '/admin/projects', label: t.proposal.adminTitle, icon: <Code2 />, count: open('projects') },
    resumes: { to: '/admin/resumes', label: t.join.adminTitle, icon: <UserPlus />, count: open('resumes') },
    programme: {
      to: '/admin/programme',
      label: t.volunteer.adminTitle,
      icon: <GraduationCap />,
      count: open('programme'),
    },
    insurance: { to: '/admin/requests', label: t.admin.requests, icon: <ClipboardList />, count: open('insurance') },
    messages: { to: '/admin/messages', label: t.contact.inboxTitle, icon: <Mail />, count: open('messages') },
    verification: {
      to: '/admin/verifications',
      label: t.market.queueVerifications,
      icon: <ShieldCheck />,
      count: open('verification'),
    },
    jobPosts: { to: '/admin/job-postings', label: t.market.queueJobs, icon: <Briefcase />, count: open('jobPosts') },
    applications: {
      to: '/admin/applications',
      label: t.market.queueApplications,
      icon: <FileText />,
      count: open('applications'),
    },
    freelanceProjects: {
      to: '/admin/freelance-projects',
      label: t.market.queueProjects,
      icon: <FolderKanban />,
      count: open('freelanceProjects'),
    },
    bids: { to: '/admin/bids', label: t.market.queueBids, icon: <Gavel />, count: open('bids') },
    books: { to: '/admin/books', label: t.books.queueTitle, icon: <BookOpen />, count: open('books') },
  } satisfies Partial<Record<QueueKey, NavItem>>;

  const when = (condition: boolean, ...items: NavItem[]) => (condition ? items : []);

  // Everything with work waiting, busiest first — the overview module's
  // sidebar doubles as a to-do list across every desk the reader holds.
  const waiting = Object.values(queue)
    .filter((item) => (item.count ?? 0) > 0)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .map((item) => ({ ...item, shortcut: true }));

  const modules: NavModule[] = [
    {
      id: 'home',
      label: t.app.home,
      icon: <LayoutDashboard />,
      sections: [
        { id: 'main', items: [{ to: '/admin', label: t.admin.dashboard, icon: <LayoutDashboard />, end: true }] },
        { id: 'waiting', label: t.app.waitingOnYou, items: waiting },
      ],
    },
    {
      id: 'intake',
      label: t.admin.groupIntake,
      icon: <Inbox />,
      sections: [
        {
          id: 'main',
          items: [
            ...when(can('projects'), queue.projects),
            ...when(can('resumes'), queue.resumes, queue.programme),
            ...when(can('insurance'), queue.insurance),
            ...when(can('messages'), queue.messages),
          ],
        },
      ],
    },
    {
      id: 'marketplace',
      label: t.market.groupMarketplace,
      icon: <Store />,
      sections: [
        {
          id: 'moderation',
          items: [
            ...when(can('verification'), queue.verification),
            // Postings and the applications answering them are one desk: whoever
            // decides a role belongs on the board judges the replies to it.
            ...when(can('jobs'), queue.jobPosts, queue.applications),
            ...when(can('freelance'), queue.freelanceProjects, queue.bids),
            ...when(can('books'), queue.books),
          ],
        },
        {
          id: 'insights',
          label: t.analytics.title,
          items: when(can('analytics'), {
            to: '/admin/marketplace',
            label: t.analytics.title,
            icon: <BarChart3 />,
          }),
        },
      ],
    },
    {
      id: 'showcase',
      label: t.showcase.groupAdmin,
      icon: <Sparkles />,
      sections: [
        {
          id: 'main',
          items: [
            ...when(
              can('showcase'),
              { to: '/admin/customers', label: t.showcase.adminCustomersTitle, icon: <Building2 /> },
              { to: '/admin/partners', label: t.showcase.adminPartnersTitle, icon: <Handshake /> },
              { to: '/admin/portfolio', label: t.showcase.adminProjectsTitle, icon: <FolderGit2 /> }
            ),
            // Super admin only, and not a grantable permission: who represents
            // the company on its own page is not a module of work to delegate.
            ...when(isSuper, { to: '/admin/team', label: t.team.adminTitle, icon: <UsersRound /> }),
          ],
        },
      ],
    },
    {
      id: 'administration',
      label: t.admin.groupAdministration,
      icon: <Settings />,
      sections: [
        {
          id: 'main',
          items: [
            ...when(
              can('users'),
              { to: '/admin/users', label: t.admin.users, icon: <Users /> },
              { to: '/admin/roles', label: t.admin.roles, icon: <Shield /> }
            ),
            ...when(isSuper, { to: '/admin/audit', label: t.audit.title, icon: <ScrollText /> }),
          ],
        },
      ],
    },
  ];

  return (
    <AppShell panel="admin" modules={modules}>
      <Outlet />
    </AppShell>
  );
}
