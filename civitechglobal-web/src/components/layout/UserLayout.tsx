import { Outlet } from 'react-router';
import {
  Bell,
  BellPlus,
  BellRing,
  Bookmark,
  BookmarkPlus,
  BookOpen,
  Briefcase,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  Gavel,
  Handshake,
  LayoutDashboard,
  Layers,
  MailPlus,
  MessagesSquare,
  Package,
  Presentation,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserCircle,
  BriefcaseBusiness,
} from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useUnreadCounts } from '@/api/marketplace';
import { useMemberAreas } from '@/api/workspace';
import { AppShell } from '@/components/app/AppShell';
import type { NavItem, NavModule } from '@/components/app/navigation';
import { features } from '@/lib/features';

/**
 * The account holder's panel.
 *
 * Four areas on the rail, each answering one question:
 *   - Home: what is waiting for me — the overview and the inbox.
 *   - Work: jobs and projects, from either side — hiring, job search, the
 *     projects I post, and freelancing.
 *   - Buy & sell: shops, books, and what I bought.
 *   - Account: who I am here, and my plan.
 *
 * A member is usually one or two of the people the marketplace serves, so the
 * sections they do not use wait under "More" (see `splitSections`). Which ones
 * they use comes from `/market/me/areas`; until it answers, everything shows,
 * which is the safe way to be wrong.
 */
export function UserLayout() {
  const { t } = useLocale();
  const n = t.dashNav;
  const { data: unread } = useUnreadCounts();
  const { data: areas } = useMemberAreas();
  const uses = (area: keyof NonNullable<typeof areas>) => (areas ? areas[area] : undefined);
  const only = (on: boolean, ...items: NavItem[]) => (on ? items : []);

  const modules: NavModule[] = [
    {
      id: 'home',
      label: t.app.home,
      icon: <LayoutDashboard />,
      sections: [
        {
          id: 'main',
          items: [{ to: '/dashboard', label: t.dashboard.overview, icon: <LayoutDashboard />, end: true }],
        },
        {
          id: 'inbox',
          label: t.app.inbox,
          items: [
            { to: '/dashboard/messages', label: t.market.messagesNav, icon: <MessagesSquare />, count: unread?.messages },
            { to: '/dashboard/notifications', label: t.market.notificationsNav, icon: <Bell />, count: unread?.notifications },
          ],
        },
      ],
    },
    {
      id: 'work',
      label: n.work,
      icon: <BriefcaseBusiness />,
      sections: [
        {
          id: 'hiring',
          label: n.hiring,
          hint: n.hiringHint,
          inUse: uses('hiring'),
          items: [
            { to: '/dashboard/jobs', label: t.market.myJobs, icon: <Briefcase /> },
            ...only(features.jobsV2, { to: '/dashboard/company', label: t.jobs.navCompany, icon: <Building2 />, hint: n.hintCompany }),
          ],
        },
        {
          id: 'job-search',
          label: n.jobSearch,
          hint: n.jobSearchHint,
          inUse: uses('jobSearch'),
          items: [
            { to: '/dashboard/applications', label: t.market.myApplications, icon: <FileText /> },
            ...only(
              features.jobsV2,
              { to: '/dashboard/saved-jobs', label: t.jobs.navSavedJobs, icon: <Bookmark /> },
              { to: '/dashboard/job-alerts', label: t.jobs.navAlerts, icon: <BellRing />, hint: n.hintAlerts },
            ),
          ],
        },
        {
          id: 'client',
          label: n.client,
          hint: n.clientHint,
          // Agreed work lives here for both sides, so somebody doing work
          // they were awarded finds it too.
          inUse: areas ? areas.client || areas.collaborations : undefined,
          items: [
            { to: '/dashboard/projects', label: t.market.myProjects, icon: <FolderKanban /> },
            { to: '/dashboard/awards', label: t.market.myAwards, icon: <Handshake />, hint: n.hintAwards },
          ],
        },
        {
          id: 'freelance',
          label: n.freelance,
          hint: n.freelanceHint,
          inUse: uses('freelance'),
          items: [
            { to: '/dashboard/bids', label: features.projectsV2 ? t.work.navProposals : t.market.myBids, icon: <Gavel /> },
            ...only(
              features.projectsV2,
              { to: '/dashboard/invites', label: t.work.navInvites, icon: <MailPlus />, hint: n.hintInvites },
              { to: '/dashboard/saved-projects', label: t.work.navSavedProjects, icon: <BookmarkPlus /> },
              { to: '/dashboard/project-alerts', label: t.work.navProjectAlerts, icon: <BellPlus />, hint: n.hintAlerts },
              { to: '/dashboard/services', label: t.work.navMyServices, icon: <Layers /> },
              { to: '/dashboard/service-orders', label: t.work.navOrders, icon: <ReceiptText />, hint: n.hintServiceOrders },
            ),
          ],
        },
      ],
    },
    {
      id: 'market',
      label: n.market,
      icon: <Store />,
      sections: [
        {
          id: 'shops',
          label: n.shops,
          hint: n.shopsHint,
          inUse: uses('shops'),
          items: only(features.tradeMaster, { to: '/dashboard/shops', label: t.trademaster.myShops, icon: <ShoppingBag /> }),
        },
        {
          id: 'books',
          label: n.books,
          hint: n.booksHint,
          inUse: uses('books'),
          items: [{ to: '/dashboard/books', label: features.booksV2 ? t.bookshop.navMyBooks : t.books.myBooks, icon: <BookOpen /> }],
        },
        {
          id: 'buying',
          label: n.buying,
          hint: n.buyingHint,
          inUse: uses('buying'),
          items: [
            ...only(features.booksV2, { to: '/dashboard/book-purchases', label: t.bookshop.navPurchases, icon: <ShoppingCart /> }),
            ...only(features.tradeMaster && features.tradeMasterOrders, {
              to: '/dashboard/orders',
              label: t.trademaster.myOrders,
              icon: <Package />,
            }),
          ],
        },
      ],
    },
    {
      id: 'account',
      label: n.account,
      icon: <UserCircle />,
      sections: [
        {
          id: 'profile',
          label: n.profile,
          hint: n.profileHint,
          items: [
            { to: '/dashboard/profile', label: t.dashboard.profile, icon: <UserCircle /> },
            { to: '/dashboard/verification', label: t.market.verificationTitle, icon: <ShieldCheck />, hint: n.hintVerification },
          ],
        },
        {
          id: 'plan',
          label: n.planServices,
          hint: n.planServicesHint,
          items: [
            { to: '/dashboard/billing', label: t.plans.navBilling, icon: <CreditCard />, hint: n.hintBilling },
            { to: '/dashboard/expert', label: t.plans.navExpert, icon: <Presentation />, hint: n.hintExpert },
            { to: '/dashboard/requests', label: t.workspace.navRequests, icon: <ClipboardList />, hint: n.hintRequests },
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
