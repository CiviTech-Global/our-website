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

  it('stays open when the pointer leaves the trigger', async () => {
    // The bug this replaces: the panel is absolutely positioned, so the
    // container's box is only the button. Closing on mouseleave meant moving
    // from the trigger towards the panel — the one thing anybody does — shut
    // the menu before the pointer arrived.
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('button', { name: /Services menu/ }));
    await user.unhover(screen.getByRole('button', { name: /Services menu/ }));

    expect(screen.getByRole('link', { name: 'Start a project' })).toBeInTheDocument();
  });

  it('stays open while the pointer moves across the page', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('button', { name: /Services menu/ }));
    // Somewhere else entirely, without pressing anything.
    await user.hover(screen.getByRole('link', { name: 'Track request' }));

    expect(screen.getByRole('link', { name: 'Start a project' })).toBeInTheDocument();
  });

  it('closes when something else is clicked', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('button', { name: /Services menu/ }));
    await user.click(screen.getByRole('link', { name: 'Track request' }));

    expect(screen.queryByRole('link', { name: 'Start a project' })).not.toBeInTheDocument();
  });

  it('opens on ArrowDown and puts focus on the first item', async () => {
    const user = userEvent.setup();
    renderAt();

    const trigger = screen.getByRole('button', { name: /Services menu/ });
    trigger.focus();
    await user.keyboard('{ArrowDown}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: 'What we do' })).toHaveFocus();
  });

  it('moves through items with the arrow keys, and wraps', async () => {
    const user = userEvent.setup();
    renderAt();

    const trigger = screen.getByRole('button', { name: /Services menu/ });
    trigger.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('link', { name: 'What we do' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: 'Start a project' })).toHaveFocus();

    // Back past the top lands on the last item rather than nowhere.
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('link', { name: 'Insurance' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('link', { name: 'What we do' })).toHaveFocus();

    await user.keyboard('{End}');
    expect(screen.getByRole('link', { name: 'Insurance' })).toHaveFocus();
  });

  it('returns focus to the trigger when Escape closes it', async () => {
    // Otherwise focus drops to <body> and a keyboard user is stranded at the
    // top of the document with no idea where they had been.
    const user = userEvent.setup();
    renderAt();

    const trigger = screen.getByRole('button', { name: /Services menu/ });
    await user.click(trigger);
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('link', { name: 'Start a project' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
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
