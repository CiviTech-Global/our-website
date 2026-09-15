import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { DashboardShell, type SidebarEntry } from './DashboardShell';

vi.mock('@/contexts/AuthProvider', () => ({
  useAuth: () => ({ user: { firstName: 'A', lastName: 'B' }, logout: vi.fn() }),
}));
vi.mock('@/contexts/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('@/i18n/LocaleProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/LocaleProvider')>()),
  useLocale: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: { nav: { logout: 'Log out', viewSite: 'View site' } },
  }),
}));

const items: SidebarEntry[] = [
  { to: '/admin', label: 'Dashboard', icon: null, end: true },
  {
    id: 'intake',
    label: 'Incoming',
    icon: null,
    items: [
      { to: '/admin/projects', label: 'Projects', icon: null },
      { to: '/admin/resumes', label: 'CVs', icon: null },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: null,
    items: [{ to: '/admin/users', label: 'Users', icon: null }],
  },
];

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardShell title="Admin" items={items}>
        <div>content</div>
      </DashboardShell>
    </MemoryRouter>
  );
}

/** The collapsed region stays mounted, so "hidden" means inert, not absent. */
function region(name: string) {
  const header = screen.getByRole('button', { name });
  const id = header.getAttribute('aria-controls');
  const el = id ? document.getElementById(id) : null;
  if (!el) throw new Error(`no region for ${name}`);
  return { header, inner: el.firstElementChild as HTMLElement };
}

beforeEach(() => {
  localStorage.clear();
});

describe('DashboardShell grouping', () => {
  it('renders flat items alongside groups', () => {
    renderAt('/admin');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Incoming' })).toBeInTheDocument();
  });

  it('starts expanded so a new group is never hidden behind an unset preference', () => {
    renderAt('/admin');
    expect(screen.getByRole('button', { name: 'Incoming' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(region('Incoming').inner.hasAttribute('inert')).toBe(false);
  });

  it('collapses on click and takes its links out of the tab order', async () => {
    const user = userEvent.setup();
    renderAt('/admin');

    await user.click(screen.getByRole('button', { name: 'Incoming' }));

    expect(screen.getByRole('button', { name: 'Incoming' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(region('Incoming').inner.hasAttribute('inert')).toBe(true);
    // Collapsing one group leaves the others alone.
    expect(screen.getByRole('button', { name: 'Administration' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('remembers a collapse across renders', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/admin');
    await user.click(screen.getByRole('button', { name: 'Administration' }));
    unmount();

    renderAt('/admin');
    expect(screen.getByRole('button', { name: 'Administration' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('opens the group holding the current page even when it was collapsed', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/admin');
    await user.click(screen.getByRole('button', { name: 'Incoming' }));
    unmount();

    // Hiding where you are is never right, whatever the stored preference says.
    renderAt('/admin/resumes');
    expect(screen.getByRole('button', { name: 'Incoming' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('treats a detail route as being inside its section', () => {
    localStorage.setItem('ct-nav-collapsed', JSON.stringify(['intake']));
    renderAt('/admin/projects/abc123');
    expect(screen.getByRole('button', { name: 'Incoming' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('ignores an unreadable stored preference rather than throwing', () => {
    localStorage.setItem('ct-nav-collapsed', 'not json');
    renderAt('/admin');
    expect(screen.getByRole('button', { name: 'Incoming' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});
