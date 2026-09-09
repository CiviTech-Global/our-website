import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { FuturisticNavbar } from './FuturisticNavbar';

vi.mock('@/contexts/AuthProvider', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));
vi.mock('@/contexts/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('@/i18n/LocaleProvider', () => ({
  useLocale: () => ({
    locale: 'en',
    toggleLocale: vi.fn(),
    t: {
      common: { brand: 'Brand' },
      locale: { fa: 'FA', en: 'EN' },
      theme: { light: 'Light', dark: 'Dark' },
      nav: {
        servicesMenu: 'Services menu',
        companyMenu: 'Company',
        services: 'What we do',
        startProject: 'Start a project',
        insurance: 'Insurance',
        about: 'About',
        joinUs: 'Send your CV',
        contact: 'Contact',
        track: 'Track request',
        login: 'Login',
        register: 'Register',
        logout: 'Log out',
        admin: 'Admin',
        dashboard: 'Dashboard',
      },
    },
  }),
}));

function renderAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FuturisticNavbar />
    </MemoryRouter>
  );
}

describe('FuturisticNavbar', () => {
  it('collapses the link list into two menus plus tracking', () => {
    renderAt();
    expect(screen.getByRole('button', { name: /Services menu/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Company/ })).toBeInTheDocument();
    // The one link that stayed top level.
    expect(screen.getAllByRole('link', { name: 'Track request' }).length).toBeGreaterThan(0);
  });

  it('hides menu links until the menu is opened', async () => {
    const user = userEvent.setup();
    renderAt();

    expect(screen.queryByRole('link', { name: 'Start a project' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Services menu/ }));

    expect(screen.getByRole('link', { name: 'Start a project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Services menu/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('opens only one menu at a time', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('button', { name: /Services menu/ }));
    await user.click(screen.getByRole('button', { name: /Company/ }));

    expect(screen.getByRole('button', { name: /Services menu/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByRole('link', { name: 'Start a project' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Send your CV' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('button', { name: /Company/ }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('link', { name: 'Send your CV' })).not.toBeInTheDocument();
  });

  it('marks the menu holding the current page, including detail routes', () => {
    renderAt('/insurance/third-party');
    expect(screen.getByRole('button', { name: /Services menu/ })).toHaveClass(
      'text-brand-green-600'
    );
    expect(screen.getByRole('button', { name: /Company/ })).not.toHaveClass(
      'text-brand-green-600'
    );
  });

  it('shows every link at once in the mobile drawer', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('button', { name: 'Toggle menu' }));

    // Flattened into sections, so nothing needs a second tap to reach.
    expect(screen.getByRole('link', { name: 'Start a project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Send your CV' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact' })).toBeInTheDocument();
  });
});
