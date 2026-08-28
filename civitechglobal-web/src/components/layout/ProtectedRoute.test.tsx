import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '@/contexts/AuthProvider';
import type { AuthUser } from '@/types/auth';

vi.mock('@/contexts/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: '1',
    email: 'user@example.com',
    firstName: 'A',
    lastName: 'B',
    role: 'USER',
    permissions: [],
    ...overrides,
  };
}

function renderAtAdmin(children: React.ReactNode, roles?: AuthUser['role'][]) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={<ProtectedRoute roles={roles}>{children}</ProtectedRoute>}
        />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows a loading spinner while auth state is resolving', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    } as ReturnType<typeof useAuth>);

    renderAtAdmin(<div>Secret Content</div>);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    renderAtAdmin(<div>Secret Content</div>);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('redirects an authenticated user without a required role away from the route', () => {
    mockedUseAuth.mockReturnValue({
      user: makeUser({ role: 'USER' }),
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    renderAtAdmin(<div>Secret Content</div>, ['ADMIN', 'SUPER_ADMIN']);

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('renders the protected content for an authenticated user with a required role', () => {
    mockedUseAuth.mockReturnValue({
      user: makeUser({ role: 'ADMIN' }),
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    renderAtAdmin(<div>Secret Content</div>, ['ADMIN', 'SUPER_ADMIN']);

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('renders the protected content for an authenticated user when no roles are required', () => {
    mockedUseAuth.mockReturnValue({
      user: makeUser({ role: 'USER' }),
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    renderAtAdmin(<div>Secret Content</div>);

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });
});
