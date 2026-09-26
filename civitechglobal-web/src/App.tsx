import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { UserLayout } from '@/components/layout/UserLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { RequirePermission } from '@/components/layout/RequirePermission';
import { Spinner } from '@/components/ui/Spinner';
import { features } from '@/lib/features';

// HomePage stays eager: it is the landing route, and lazy-loading the first
// thing a visitor sees would trade bundle size for a blank frame and an extra
// round trip on the one page where speed is most visible.
import HomePage from '@/pages/public/HomePage';

// Everything else is reached by a click, which is ample time to fetch a few
// kilobytes. Keeping these eager put all of them — plus their forms and
// validation — into the chunk the landing page had to download first.
const AboutPage = lazy(() => import('@/pages/public/AboutPage'));
const ServicesPage = lazy(() => import('@/pages/public/ServicesPage'));
const ContactPage = lazy(() => import('@/pages/public/ContactPage'));
const LoginPage = lazy(() => import('@/pages/public/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/public/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/public/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/public/VerifyEmailPage'));
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'));
const PublicProfilePage = lazy(() => import('@/pages/public/ProfilePage'));

// Route-split: the insurance section carries the catalog, the dynamic form and
// the OTP step, none of which the landing page needs in its bundle.
const InsurancePage = lazy(() => import('@/pages/public/InsurancePage'));
// Static intent landing for the "third-party insurance price" query. The
// static segment outranks /insurance/:slug in the router, so no conflict.
const ThirdPartyLandingPage = lazy(() => import('@/pages/public/ThirdPartyLandingPage'));
// The main service line, and a heavy form: split out so the home page does
// not carry it.
const StartProjectPage = lazy(() => import('./pages/public/StartProjectPage'));
const ProposalDocumentPage = lazy(() => import('@/pages/public/ProposalDocumentPage'));
const JoinUsPage = lazy(() => import('@/pages/public/JoinUsPage'));
const ProjectsPage = lazy(() => import('@/pages/admin/ProjectsPage'));
const AdminResumesPage = lazy(() => import('@/pages/admin/ResumesPage'));
const AdminResumeDetailPage = lazy(() => import('@/pages/admin/ResumeDetailPage'));
const MessagesPage = lazy(() => import('@/pages/admin/MessagesPage'));
const ProjectDetailPage = lazy(() => import('@/pages/admin/ProjectDetailPage'));
const InsuranceProductPage = lazy(() => import('@/pages/public/InsuranceProductPage'));
const TrackRequestPage = lazy(() => import('@/pages/public/TrackRequestPage'));

// The marketplace. Split out as its own set: the boards carry their own
// filters, forms and money formatting, and none of it belongs in the bundle a
// visitor downloads to read the landing page.
const TeamPage = lazy(() => import('@/pages/public/TeamPage'));
// The blog: index and posts, both fed by the Markdown files in src/content/blog.
const BlogIndexPage = lazy(() => import('@/pages/public/BlogIndexPage'));
const BlogPostPage = lazy(() => import('@/pages/public/BlogPostPage'));
const OrganizationsPage = lazy(() => import('@/pages/public/OrganizationsPage'));
const PortfolioPage = lazy(() => import('@/pages/public/PortfolioPage'));
const VolunteerPage = lazy(() => import('@/pages/public/VolunteerPage'));
const ConsultPage = lazy(() => import('@/pages/public/ConsultPage'));
const ExpertsPage = lazy(() => import('@/pages/public/ExpertsPage'));
const ExpertProfilePage = lazy(() => import('@/pages/public/ExpertProfilePage'));
const BooksPage = lazy(() => import('@/pages/public/BooksPage'));
const ShopsPage = lazy(() => import('@/pages/public/ShopsPage'));
const ShopDetailPage = lazy(() => import('@/pages/public/ShopDetailPage'));
const MarketProductsPage = lazy(() => import('@/pages/public/MarketProductsPage'));
const MarketProductDetailPage = lazy(() => import('@/pages/public/MarketProductDetailPage'));
const BookDetailPage = lazy(() => import('@/pages/public/BookDetailPage'));
const JobsPage = lazy(() => import('@/pages/public/JobsPage'));
const JobDetailPage = lazy(() => import('@/pages/public/JobDetailPage'));
const FreelanceProjectsPage = lazy(() => import('@/pages/public/FreelanceProjectsPage'));
const FreelanceProjectDetailPage = lazy(
  () => import('@/pages/public/FreelanceProjectDetailPage')
);

const UserDashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));
const VerificationPage = lazy(() => import('@/pages/dashboard/VerificationPage'));
const MyBooksPage = lazy(() => import('@/pages/dashboard/MyBooksPage'));
const MyJobsPage = lazy(() => import('@/pages/dashboard/MyJobsPage'));
const MyApplicationsPage = lazy(() => import('@/pages/dashboard/MyApplicationsPage'));
const MyProjectsPage = lazy(() => import('@/pages/dashboard/MyProjectsPage'));
const MyBidsPage = lazy(() => import('@/pages/dashboard/MyBidsPage'));
const MyAwardsPage = lazy(() => import('@/pages/dashboard/MyAwardsPage'));
const ConversationsPage = lazy(() => import('@/pages/dashboard/ConversationsPage'));
const ConversationThreadPage = lazy(() => import('@/pages/dashboard/ConversationThreadPage'));
const NotificationsPage = lazy(() => import('@/pages/dashboard/NotificationsPage'));

const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const RequestsPage = lazy(() => import('@/pages/admin/RequestsPage'));
const RequestDetailPage = lazy(() => import('@/pages/admin/RequestDetailPage'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'));
const AdminTeamPage = lazy(() => import('@/pages/admin/TeamPage'));
const ShowcaseOrganizationsPage = lazy(() => import('@/pages/admin/ShowcaseOrganizationsPage'));
const ShowcaseProjectsPage = lazy(() => import('@/pages/admin/ShowcaseProjectsPage'));
const VerificationQueuePage = lazy(() => import('@/pages/admin/VerificationQueuePage'));
const AdminExpertsPage = lazy(() => import('@/pages/admin/ExpertsPage'));
const ConsultationQueuePage = lazy(() => import('@/pages/admin/ConsultationQueuePage'));
const BookQueuePage = lazy(() => import('@/pages/admin/BookQueuePage'));
const JobQueuePage = lazy(() => import('@/pages/admin/JobQueuePage'));
const MarketplaceAnalyticsPage = lazy(() => import('@/pages/admin/MarketplaceAnalyticsPage'));
const AuditLogPage = lazy(() => import('@/pages/admin/AuditLogPage'));
const ApplicationQueuePage = lazy(() => import('@/pages/admin/ApplicationQueuePage'));
const ProjectQueuePage = lazy(() => import('@/pages/admin/ProjectQueuePage'));
const BidQueuePage = lazy(() => import('@/pages/admin/BidQueuePage'));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={32} label="Loading..." />
    </div>
  );
}

export default function App() {
  return (
    // One boundary around the whole tree, so a lazy route does not need its own
    // wrapper to be safe. The per-route boundaries below stay because they keep
    // an already-rendered layout on screen while only the panel swaps.
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
      <Route
        path="/proposal/:code"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <ProposalDocumentPage />
          </Suspense>
        }
      />

      {/* Staff preview of a proposal before it is sent. Outside AdminLayout for
          the same reason the public one is outside PublicLayout: the page is
          the document, and there is no chrome to strip when printing. */}
      <Route
        path="/proposal/preview/:proposalId"
        element={
          <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
            <Suspense fallback={<RouteLoadingFallback />}>
              <ProposalDocumentPage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/join" element={<JoinUsPage />} />
        <Route
          path="/start-project"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <StartProjectPage />
            </Suspense>
          }
        />
        <Route
          path="/insurance"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <InsurancePage />
            </Suspense>
          }
        />
        <Route
          path="/insurance/third-party"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ThirdPartyLandingPage />
            </Suspense>
          }
        />
        <Route
          path="/insurance/:slug"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <InsuranceProductPage />
            </Suspense>
          }
        />
        <Route
          path="/track"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <TrackRequestPage />
            </Suspense>
          }
        />
        <Route
          path="/consult"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ConsultPage />
            </Suspense>
          }
        />
        <Route
          path="/experts"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ExpertsPage />
            </Suspense>
          }
        />
        <Route
          path="/experts/:slug"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ExpertProfilePage />
            </Suspense>
          }
        />
        {features.tradeMaster && (
          <>
            <Route
              path="/marketplace/shops"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ShopsPage />
                </Suspense>
              }
            />
            <Route
              path="/marketplace/shops/:slug"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ShopDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/marketplace/products"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <MarketProductsPage />
                </Suspense>
              }
            />
            <Route
              path="/marketplace/products/:shopSlug/:productSlug"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <MarketProductDetailPage />
                </Suspense>
              }
            />
          </>
        )}
        <Route
          path="/books"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <BooksPage />
            </Suspense>
          }
        />
        <Route
          path="/books/:code"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <BookDetailPage />
            </Suspense>
          }
        />
        <Route
          path="/jobs"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <JobsPage />
            </Suspense>
          }
        />
        {/* The code, not the id: it is what somebody can quote, and it does not
            leak how many postings there have ever been. */}
        <Route
          path="/jobs/:code"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <JobDetailPage />
            </Suspense>
          }
        />
        <Route
          path="/projects"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <FreelanceProjectsPage />
            </Suspense>
          }
        />
        <Route
          path="/projects/:code"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <FreelanceProjectDetailPage />
            </Suspense>
          }
        />
        <Route path="/profiles/:username" element={<PublicProfilePage />} />
        <Route
          path="/team"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <TeamPage />
            </Suspense>
          }
        />
        <Route
          path="/customers"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <OrganizationsPage kind="CUSTOMER" />
            </Suspense>
          }
        />
        <Route
          path="/partners"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <OrganizationsPage kind="PARTNER" />
            </Suspense>
          }
        />
        <Route
          path="/portfolio"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <PortfolioPage />
            </Suspense>
          }
        />
        <Route
          path="/volunteer"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <VolunteerPage />
            </Suspense>
          }
        />
        <Route
          path="/blog"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <BlogIndexPage />
            </Suspense>
          }
        />
        <Route
          path="/blog/:slug"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <BlogPostPage />
            </Suspense>
          }
        />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        {/* Both reached from a link in an email, and both read their token from
            the query string rather than the path — a token in a path segment
            ends up in referrer headers and server access logs. */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <UserDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ProfilePage />
            </Suspense>
          }
        />
        <Route
          path="verification"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <VerificationPage />
            </Suspense>
          }
        />
        <Route
          path="books"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <MyBooksPage />
            </Suspense>
          }
        />
        <Route
          path="jobs"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <MyJobsPage />
            </Suspense>
          }
        />
        <Route
          path="applications"
          element={
            <RequirePermission permission="jobs">
              <Suspense fallback={<RouteLoadingFallback />}>
                <MyApplicationsPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="projects"
          element={
            <RequirePermission permission="projects">
              <Suspense fallback={<RouteLoadingFallback />}>
                <MyProjectsPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="bids"
          element={
            <RequirePermission permission="freelance">
              <Suspense fallback={<RouteLoadingFallback />}>
                <MyBidsPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="awards"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <MyAwardsPage />
            </Suspense>
          }
        />
        <Route
          path="messages"
          element={
            <RequirePermission permission="messages">
              <Suspense fallback={<RouteLoadingFallback />}>
                <ConversationsPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="messages/:kind/:threadId"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ConversationThreadPage />
            </Suspense>
          }
        />
        <Route
          path="notifications"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <NotificationsPage />
            </Suspense>
          }
        />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <AdminDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="requests"
          element={
            <RequirePermission permission="insurance">
              <Suspense fallback={<RouteLoadingFallback />}>
                <RequestsPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="projects"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ProjectsPage />
            </Suspense>
          }
        />
        <Route
          path="resumes"
          element={
            <RequirePermission permission="resumes">
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminResumesPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="programme"
          element={
            <RequirePermission permission="resumes">
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminResumesPage programme />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="resumes/:id"
          element={
            <RequirePermission permission="resumes">
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminResumeDetailPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="messages"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <MessagesPage />
            </Suspense>
          }
        />
        <Route
          path="projects/:id"
          element={
            <RequirePermission permission="projects">
              <Suspense fallback={<RouteLoadingFallback />}>
                <ProjectDetailPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="requests/:id"
          element={
            <RequirePermission permission="insurance">
              <Suspense fallback={<RouteLoadingFallback />}>
                <RequestDetailPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="users"
          element={
            <RequirePermission permission="users">
              <Suspense fallback={<RouteLoadingFallback />}>
                <UsersPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="roles"
          element={
            <RequirePermission permission="users">
              <Suspense fallback={<RouteLoadingFallback />}>
                <RolesPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="team"
          element={
            <RequirePermission superAdminOnly>
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminTeamPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="customers"
          element={
            <RequirePermission permission="showcase">
              <Suspense fallback={<RouteLoadingFallback />}>
                <ShowcaseOrganizationsPage kind="CUSTOMER" />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="partners"
          element={
            <RequirePermission permission="showcase">
              <Suspense fallback={<RouteLoadingFallback />}>
                <ShowcaseOrganizationsPage kind="PARTNER" />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="portfolio"
          element={
            <RequirePermission permission="showcase">
              <Suspense fallback={<RouteLoadingFallback />}>
                <ShowcaseProjectsPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="verifications"
          element={
            <RequirePermission permission="verification">
              <Suspense fallback={<RouteLoadingFallback />}>
                <VerificationQueuePage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="experts"
          element={
            <RequirePermission permission="experts">
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminExpertsPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="consultations"
          element={
            <RequirePermission permission="consultations">
              <Suspense fallback={<RouteLoadingFallback />}>
                <ConsultationQueuePage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="books"
          element={
            <RequirePermission permission="books">
              <Suspense fallback={<RouteLoadingFallback />}>
                <BookQueuePage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="job-postings"
          element={
            <RequirePermission permission="jobs">
              <Suspense fallback={<RouteLoadingFallback />}>
                <JobQueuePage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="applications"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ApplicationQueuePage />
            </Suspense>
          }
        />
        <Route
          path="freelance-projects"
          element={
            <RequirePermission permission="freelance">
              <Suspense fallback={<RouteLoadingFallback />}>
                <ProjectQueuePage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="bids"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <BidQueuePage />
            </Suspense>
          }
        />
        <Route
          path="marketplace"
          element={
            <RequirePermission permission="analytics">
              <Suspense fallback={<RouteLoadingFallback />}>
                <MarketplaceAnalyticsPage />
              </Suspense>
            </RequirePermission>
          }
        />
        <Route
          path="audit"
          element={
            <RequirePermission superAdminOnly>
              <Suspense fallback={<RouteLoadingFallback />}>
                <AuditLogPage />
              </Suspense>
            </RequirePermission>
          }
        />
      </Route>
      </Routes>
    </Suspense>
  );
}
