import { Outlet } from 'react-router';
import {
  Bell,
  BellRing,
  Bookmark,
  BookOpen,
  Building2,
  ClipboardList,
  Briefcase,
  FileText,
  FolderKanban,
  Gavel,
  Handshake,
  Inbox,
  LayoutDashboard,
  MessagesSquare,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCircle,
  MailPlus,
  BookmarkPlus,
  BellPlus,
  Layers,
  ReceiptText,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useUnreadCounts } from '@/api/marketplace';
import { AppShell } from '@/components/app/AppShell';
import type { NavModule } from '@/components/app/navigation';
import { features } from '@/lib/features';

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
            { to: '/dashboard/requests', label: t.workspace.navRequests, icon: <ClipboardList /> },
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
            { to: '/dashboard/books', label: features.booksV2 ? t.bookshop.navMyBooks : t.books.myBooks, icon: <BookOpen /> },
            ...(features.booksV2 ? [{ to: '/dashboard/book-purchases', label: t.bookshop.navPurchases, icon: <ShoppingBag /> }] : []),
            ...(features.tradeMaster
              ? [
                  { to: '/dashboard/shops', label: t.trademaster.myShops, icon: <ShoppingBag /> },
                  ...(features.tradeMasterOrders
                    ? [{ to: '/dashboard/orders', label: t.trademaster.myOrders, icon: <Package /> }]
                    : []),
                ]
              : []),
            { to: '/dashboard/jobs', label: t.market.myJobs, icon: <Briefcase /> },
            ...(features.jobsV2 ? [{ to: '/dashboard/company', label: t.jobs.navCompany, icon: <Building2 /> }] : []),
            { to: '/dashboard/applications', label: t.market.myApplications, icon: <FileText /> },
            ...(features.jobsV2
              ? [
                  { to: '/dashboard/saved-jobs', label: t.jobs.navSavedJobs, icon: <Bookmark /> },
                  { to: '/dashboard/job-alerts', label: t.jobs.navAlerts, icon: <BellRing /> },
                ]
              : []),
            { to: '/dashboard/projects', label: t.market.myProjects, icon: <FolderKanban /> },
            { to: '/dashboard/bids', label: features.projectsV2 ? t.work.navProposals : t.market.myBids, icon: <Gavel /> },
            ...(features.projectsV2
              ? [
                  { to: '/dashboard/invites', label: t.work.navInvites, icon: <MailPlus /> },
                  { to: '/dashboard/saved-projects', label: t.work.navSavedProjects, icon: <BookmarkPlus /> },
                  { to: '/dashboard/project-alerts', label: t.work.navProjectAlerts, icon: <BellPlus /> },
                  { to: '/dashboard/services', label: t.work.navMyServices, icon: <Layers /> },
                  { to: '/dashboard/service-orders', label: t.work.navOrders, icon: <ReceiptText /> },
                ]
              : []),
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
