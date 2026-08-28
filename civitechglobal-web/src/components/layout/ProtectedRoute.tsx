import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/contexts/AuthProvider';
import type { UserRole } from '@/types/auth';
import { Spinner } from '@/components/ui/Spinner';

export interface ProtectedRouteProps {
  children: ReactNode;
  roles?: UserRole[];
}

/** Redirects to /login (preserving `from`) if unauthenticated, or to a safe home if role-mismatched. */
export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const fallback = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
