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

const UserDashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));

const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const LeadsPage = lazy(() => import('@/pages/admin/LeadsPage'));
const LeadDetailPage = lazy(() => import('@/pages/admin/LeadDetailPage'));
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
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
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
          path="leads"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LeadsPage />
            </Suspense>
          }
        />
        <Route
          path="leads/:id"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LeadDetailPage />
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
