import { Outlet } from 'react-router';
import {
  Bell,
  BookOpen,
  Briefcase,
  FileText,
  FolderKanban,
  Gavel,
  Handshake,
  Inbox,
  LayoutDashboard,
  MessagesSquare,
  ShieldCheck,
  Store,
  UserCircle,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useUnreadCounts } from '@/api/marketplace';
import { AppShell } from '@/components/app/AppShell';
import type { NavModule } from '@/components/app/navigation';

/**
 * The account holder's panel.
 *
 * Three modules: the account itself, the marketplace activity it carries, and
 * the conversations that activity produces. Verification sits with the account
 * rather than the marketplace because it is a fact about the person — it only
 * happens to be the door into posting and bidding.
 */
export function UserLayout() {
  const { t } = useLocale();
  const { data: unread } = useUnreadCounts();

  const modules: NavModule[] = [
    {
      id: 'home',
      label: t.app.home,
      icon: <LayoutDashboard />,
      sections: [
        {
          id: 'main',
          items: [
            { to: '/dashboard', label: t.dashboard.overview, icon: <LayoutDashboard />, end: true },
            { to: '/dashboard/profile', label: t.dashboard.profile, icon: <UserCircle /> },
            { to: '/dashboard/verification', label: t.market.verificationTitle, icon: <ShieldCheck /> },
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
          id: 'main',
          items: [
            { to: '/dashboard/books', label: t.books.myBooks, icon: <BookOpen /> },
            { to: '/dashboard/jobs', label: t.market.myJobs, icon: <Briefcase /> },
            { to: '/dashboard/applications', label: t.market.myApplications, icon: <FileText /> },
            { to: '/dashboard/projects', label: t.market.myProjects, icon: <FolderKanban /> },
            { to: '/dashboard/bids', label: t.market.myBids, icon: <Gavel /> },
            { to: '/dashboard/awards', label: t.market.myAwards, icon: <Handshake /> },
          ],
        },
      ],
    },
    {
      id: 'inbox',
      label: t.app.inbox,
      icon: <Inbox />,
      sections: [
        {
          id: 'main',
          items: [
            {
              to: '/dashboard/messages',
              label: t.market.messagesNav,
              icon: <MessagesSquare />,
              count: unread?.messages,
            },
            {
              to: '/dashboard/notifications',
              label: t.market.notificationsNav,
              icon: <Bell />,
              count: unread?.notifications,
            },
          ],
        },
      ],
    },
  ];

  return (
    <AppShell panel="user" modules={modules} notificationsLink="/dashboard/notifications">
      <Outlet />
    </AppShell>
  );
}
