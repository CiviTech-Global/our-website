import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppShell } from './AppShell';
import { usePageCrumb } from './shell-context';
import { useSurface } from '@/components/ui/surface';
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
    id: 'home',
    label: 'Home',
    icon: null,
    sections: [{ id: 'main', items: [{ to: '/admin', label: 'Overview', icon: null, end: true }] }],
  },
  {
    id: 'intake',
    label: 'Intake',
    icon: null,
    sections: [
      {
        id: 'main',
        items: [
          { to: '/admin/projects', label: 'Project briefs', icon: null, count: 4 },
          { to: '/admin/resumes', label: 'CVs', icon: null },
        ],
      },
    ],
  },
  {
    id: 'locked',
    label: 'Nothing granted',
    icon: null,
    sections: [{ id: 'main', items: [] }],
  },
];

function SurfaceProbe() {
  return <span data-testid="surface">{useSurface()}</span>;
}

function DetailPage({ title }: { title: string }) {
  usePageCrumb(title);
  return null;
}

function renderAt(path: string, children: React.ReactNode = <SurfaceProbe />) {
  return render(
    <LocaleProvider locale="en">
      <MemoryRouter initialEntries={[path]}>
        <AppShell panel="admin" modules={modules}>
          {children}
        </AppShell>
      </MemoryRouter>
    </LocaleProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  // The locale provider asks the server where a first-time visitor is; these
  // tests are about the shell, not about that.
  localStorage.setItem('civitech-locale', 'en');
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
});

describe('AppShell', () => {
  it('renders its content on the application surface', () => {
    renderAt('/admin');
    expect(screen.getByTestId('surface')).toHaveTextContent('app');
  });

  it('shows the screens of the module the reader is in', () => {
    renderAt('/admin/resumes');
    const sidebar = screen.getByRole('navigation', { name: 'Section navigation' });

    expect(within(sidebar).getByRole('link', { name: /Project briefs/ })).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: 'CVs' })).toHaveAttribute('aria-current', 'page');
    expect(within(sidebar).queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument();
  });

  it('marks the active module on the rail and hides modules with nothing to open', () => {
    renderAt('/admin/projects');
    const rail = screen.getByRole('navigation', { name: 'Sections' });

    expect(within(rail).getByRole('link', { name: /Intake/ })).toHaveAttribute('aria-current', 'page');
    expect(within(rail).queryByRole('link', { name: /Nothing granted/ })).not.toBeInTheDocument();
  });

  it('tells the rail how much is waiting inside a module', () => {
    renderAt('/admin');
    const rail = screen.getByRole('navigation', { name: 'Sections' });
    expect(within(rail).getByRole('link', { name: 'Intake (4)' })).toBeInTheDocument();
  });

  it('builds the breadcrumb trail from the navigation', () => {
    renderAt('/admin/resumes');
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });

    expect(within(trail).getByRole('link', { name: 'Admin panel' })).toHaveAttribute('href', '/admin');
    expect(within(trail).getByRole('link', { name: 'Intake' })).toBeInTheDocument();
    expect(within(trail).getByText('CVs')).toHaveAttribute('aria-current', 'page');
  });

  it('adds the record a detail page is showing to the trail', () => {
    renderAt('/admin/resumes/abc', <DetailPage title="Sara Ahmadi" />);
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });

    expect(within(trail).getByRole('link', { name: 'CVs' })).toBeInTheDocument();
    expect(within(trail).getByText('Sara Ahmadi')).toHaveAttribute('aria-current', 'page');
  });

  it('does not repeat a page title that is already the last crumb', () => {
    renderAt('/admin/resumes', <DetailPage title="CVs" />);
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(trail).getAllByText('CVs')).toHaveLength(1);
  });

  it('remembers a hidden sidebar across visits', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/admin');

    await user.click(screen.getByRole('button', { name: 'Hide sidebar' }));
    expect(screen.queryByRole('navigation', { name: 'Section navigation' })).not.toBeInTheDocument();
    unmount();

    renderAt('/admin');
    expect(screen.queryByRole('navigation', { name: 'Section navigation' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show sidebar' }));
    expect(screen.getByRole('navigation', { name: 'Section navigation' })).toBeInTheDocument();
  });

  it('opens the account menu with the actions that belong to the account', async () => {
    const user = userEvent.setup();
    renderAt('/admin');

    await user.click(screen.getByRole('button', { name: 'Account menu' }));

    expect(screen.getByRole('link', { name: 'Go to my account' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('button', { name: /Logout/ })).toBeInTheDocument();
  });

  it('opens the navigation as a drawer on a small screen and closes it on Escape', async () => {
    const user = userEvent.setup();
    renderAt('/admin');

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('dialog', { name: 'Main navigation' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Main navigation' })).not.toBeInTheDocument();
  });
});
