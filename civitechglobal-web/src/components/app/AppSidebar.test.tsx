import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppShell } from './AppShell';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import type { NavModule } from './navigation';

vi.mock('@/contexts/AuthProvider', () => ({
  useAuth: () => ({
    user: { firstName: 'Sara', lastName: 'Ahmadi', email: 'sara@example.com', role: 'ADMIN', permissions: [] },
    logout: vi.fn(),
  }),
}));
vi.mock('@/contexts/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

const modules: NavModule[] = [
  {
    id: 'market',
    label: 'Marketplace',
    icon: null,
    sections: [
      {
        id: 'jobs',
        label: 'Jobs',
        items: [
          { to: '/admin/job-postings', label: 'Job postings', icon: null, count: 3 },
          { to: '/admin/applications', label: 'Applications', icon: null },
        ],
      },
      {
        id: 'books',
        label: 'Book market',
        items: [{ to: '/admin/books', label: 'Book offers', icon: null }],
      },
    ],
  },
];

function renderAt(path: string) {
  return render(
    <LocaleProvider locale="en">
      <MemoryRouter initialEntries={[path]}>
        <AppShell panel="admin" modules={modules}>
          <span />
        </AppShell>
      </MemoryRouter>
    </LocaleProvider>
  );
}

/** The desktop sidebar's section navigation (the drawer copy is not mounted until opened). */
function sidebar() {
  return screen.getAllByRole('navigation', { name: /./ }).find((nav) => within(nav).queryByText('Jobs'))!;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('civitech-locale', 'en');
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
});

describe('AppSidebar sections', () => {
  it('folds a section away and remembers it', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/admin/books');

    const toggle = within(sidebar()).getByRole('button', { name: /Jobs/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(sidebar()).queryByRole('link', { name: /Job postings/ })).not.toBeInTheDocument();
    // Folded, the heading still says three are waiting inside.
    expect(within(toggle).getByText('3')).toBeInTheDocument();

    unmount();
    renderAt('/admin/books');
    expect(within(sidebar()).getByRole('button', { name: /Jobs/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('never folds the section holding the page on screen', async () => {
    const user = userEvent.setup();
    renderAt('/admin/applications');

    const toggle = within(sidebar()).getByRole('button', { name: /Jobs/ });
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(sidebar()).getByRole('link', { name: /Applications/ })).toBeInTheDocument();
  });
});
