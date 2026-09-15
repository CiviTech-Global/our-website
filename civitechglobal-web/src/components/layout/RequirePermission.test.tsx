import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { RequirePermission } from './RequirePermission';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import type { UserRole } from '@/types/auth';

const mockUser = vi.hoisted(() => ({ current: null as null | { role: UserRole; permissions: string[] } }));

vi.mock('@/contexts/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser.current }),
}));

function renderAs(
  user: { role: UserRole; permissions: string[] } | null,
  props: { permission?: string; superAdminOnly?: boolean },
) {
  mockUser.current = user;
  render(
    <LocaleProvider>
      <MemoryRouter>
        <RequirePermission {...props}>
          <p>the screen</p>
        </RequirePermission>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

const shown = () => screen.queryByText('the screen') !== null;

describe('RequirePermission', () => {
  /**
   * The sidebar already hides links a person cannot use. Before this, that
   * hiding was the only thing between a scoped admin and a screen they had no
   * business on — typing the URL still rendered the page shell, which then
   * fired a request the API refused. The data was never at risk; the
   * explanation was.
   */
  it('shows the screen to an admin who holds the permission', () => {
    renderAs({ role: 'ADMIN', permissions: ['users'] }, { permission: 'users' });

    expect(shown()).toBe(true);
  });

  it('refuses an admin who holds a different permission', () => {
    renderAs({ role: 'ADMIN', permissions: ['jobs'] }, { permission: 'users' });

    expect(shown()).toBe(false);
    expect(screen.getByText(/دسترسی ندارید|do not have access/i)).toBeTruthy();
  });

  it('refuses an admin who holds none', () => {
    renderAs({ role: 'ADMIN', permissions: [] }, { permission: 'users' });

    expect(shown()).toBe(false);
  });

  /** Same bypass the server's requirePermission has; the two must agree. */
  it('lets a super admin through any permission gate', () => {
    renderAs({ role: 'SUPER_ADMIN', permissions: [] }, { permission: 'users' });

    expect(shown()).toBe(true);
  });

  it('keeps a super-admin-only screen from an admin, whatever they hold', () => {
    renderAs({ role: 'ADMIN', permissions: ['users', 'jobs', 'freelance'] }, { superAdminOnly: true });

    expect(shown()).toBe(false);
    expect(screen.getByText(/مدیر ارشد|super admin/i)).toBeTruthy();
  });

  it('opens a super-admin-only screen to a super admin', () => {
    renderAs({ role: 'SUPER_ADMIN', permissions: [] }, { superAdminOnly: true });

    expect(shown()).toBe(true);
  });

  /**
   * Refuses rather than redirecting: sending somebody to /admin when they
   * followed a link leaves them wondering whether they mistyped it.
   */
  it('explains in place instead of navigating away', () => {
    renderAs({ role: 'ADMIN', permissions: [] }, { permission: 'users' });

    expect(screen.getByRole('link')).toBeTruthy();
    expect(screen.getByText(/دسترسی ندارید|do not have access/i)).toBeTruthy();
  });
});
