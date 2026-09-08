import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { UserLayout } from '@/components/layout/UserLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Spinner } from '@/components/ui/Spinner';

import HomePage from '@/pages/public/HomePage';
import AboutPage from '@/pages/public/AboutPage';
import ServicesPage from '@/pages/public/ServicesPage';
import ContactPage from '@/pages/public/ContactPage';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import NotFoundPage from '@/pages/public/NotFoundPage';

// Route-split: the insurance section carries the catalog, the dynamic form and
// the OTP step, none of which the landing page needs in its bundle.
const InsurancePage = lazy(() => import('@/pages/public/InsurancePage'));
// The main service line, and a heavy form: split out so the home page does
// not carry it.
const StartProjectPage = lazy(() => import('./pages/public/StartProjectPage'));
const ProposalDocumentPage = lazy(() => import('@/pages/public/ProposalDocumentPage'));
const ProjectsPage = lazy(() => import('@/pages/admin/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/admin/ProjectDetailPage'));
const InsuranceProductPage = lazy(() => import('@/pages/public/InsuranceProductPage'));
const TrackRequestPage = lazy(() => import('@/pages/public/TrackRequestPage'));

const UserDashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));

const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const RequestsPage = lazy(() => import('@/pages/admin/RequestsPage'));
const RequestDetailPage = lazy(() => import('@/pages/admin/RequestDetailPage'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={32} label="Loading..." />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/proposal/:code"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <ProposalDocumentPage />
          </Suspense>
        }
      />

      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
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
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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
            <Suspense fallback={<RouteLoadingFallback />}>
              <RequestsPage />
            </Suspense>
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
          path="projects/:id"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ProjectDetailPage />
            </Suspense>
          }
        />
        <Route
          path="requests/:id"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <RequestDetailPage />
            </Suspense>
          }
        />
        <Route
          path="users"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <UsersPage />
            </Suspense>
          }
        />
        <Route
          path="roles"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <RolesPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
