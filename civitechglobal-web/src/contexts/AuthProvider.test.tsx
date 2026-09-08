import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthProvider';
import { api, refreshAccessToken } from '@/config/api';

vi.mock('@/config/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
  // Bootstrap goes through the shared single-flight refresh now, not a bare
  // POST /auth/refresh — which is what stops two concurrent refreshes from
  // each rotating the token.
  refreshAccessToken: vi.fn(),
}));

const mockedApi = vi.mocked(api, true);
const mockedRefresh = vi.mocked(refreshAccessToken);

function Probe() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="loading">{String(isLoading)}</p>
      <p data-testid="authed">{String(isAuthenticated)}</p>
      <p data-testid="email">{user?.email ?? 'none'}</p>
      <button
        onClick={() => login({ email: 'a@b.com', password: 'pw' })}
      >
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthProvider / useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts unauthenticated when the silent refresh fails (no session cookie)', async () => {
    mockedRefresh.mockRejectedValueOnce(new Error('no refresh cookie'));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('authed').textContent).toBe('false');
    expect(screen.getByTestId('email').textContent).toBe('none');
  });

  it('becomes authenticated after a successful login', async () => {
    mockedRefresh.mockRejectedValueOnce(new Error('no refresh cookie')); // bootstrap refresh fails
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    mockedApi.post.mockResolvedValueOnce({
      data: {
        accessToken: 'token-123',
        user: { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'USER', permissions: [] },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(screen.getByTestId('authed').textContent).toBe('true'));
    expect(screen.getByTestId('email').textContent).toBe('a@b.com');
  });
});
