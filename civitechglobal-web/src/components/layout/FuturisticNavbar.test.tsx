import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { FuturisticNavbar } from './FuturisticNavbar';

vi.mock('@/contexts/AuthProvider', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, logout: vi.fn() }),
}));
vi.mock('@/contexts/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('@/i18n/LocaleProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/LocaleProvider')>()),
  useLocale: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: {
      common: { brand: 'Brand', close: 'Close' },
      theme: { light: 'Light', dark: 'Dark' },
      help: { openGuide: 'Guide', openGuideLabel: 'Guide to this page' },
      nav: {
        all: 'All sections',
        groupMain: 'Main sections',
        groupEcosystem: 'Ecosystem',
        services: 'What we do',
        startProject: 'Start a project',
        insurance: 'Insurance',
        about: 'About',
        portfolio: 'Our projects',
        pricing: 'Plans and pricing',
        blog: 'Blog',
        contact: 'Contact',
        track: 'Track request',
        jobs: 'Jobs',
        joinUs: 'Send your CV',
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

const triggerName = /All sections/;

describe('FuturisticNavbar', () => {
  it('keeps the four destination links and the primary project CTA at the top level', () => {
    renderAt();
    for (const name of ['What we do', 'Our projects', 'Plans and pricing', 'Blog']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
    // About left the bar for the menu.
    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Start a project' }).length).toBeGreaterThan(0);
  });

  it('keeps the CTA and the menu trigger on one line at any width', () => {
    renderAt();
    const cta = screen.getByRole('link', { name: 'Start a project' });
    expect(cta.className).toContain('whitespace-nowrap');
    expect(cta.className).toContain('shrink-0');

    const trigger = screen.getByRole('button', { name: triggerName });
    expect(trigger.className).toContain('whitespace-nowrap');
    expect(trigger.className).toContain('shrink-0');
  });

  it('hides the full link list until the menu is opened', async () => {
    const user = userEvent.setup();
    renderAt();

    expect(screen.queryByRole('link', { name: 'Track request' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: triggerName }));

    expect(screen.getByRole('link', { name: 'Track request' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: triggerName })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('opens as a labelled dialog with grouped links', async () => {
    const user = userEvent.setup();
    renderAt();

    const trigger = screen.getByRole('button', { name: triggerName });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: /Main sections/ });
    expect(trigger).toHaveAttribute('aria-controls', dialog.id);
    // Both groups are present with their headings.
    expect(screen.getByText('Main sections')).toBeInTheDocument();
    expect(screen.getByText('Ecosystem')).toBeInTheDocument();
    // An ecosystem link that used to be buried in a dropdown.
    expect(screen.getByRole('link', { name: 'Jobs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Insurance' })).toBeInTheDocument();
  });

  it('offers a close control inside the menu', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('button', { name: triggerName }));
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: triggerName })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('closes when clicking outside the panel', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('button', { name: triggerName }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: triggerName })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('returns focus to the trigger when Escape closes it', async () => {
    const user = userEvent.setup();
    renderAt();

    const trigger = screen.getByRole('button', { name: triggerName });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('marks the current page with aria-current', () => {
    renderAt('/services');
    expect(screen.getByRole('link', { name: 'What we do' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('closes the menu when a link is followed', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.click(screen.getByRole('button', { name: triggerName }));
    const dialog = screen.getByRole('dialog', { name: /Main sections/ });
    // 'About' lives only in the menu now, so this is the menu's own link.
    await user.click(within(dialog).getByRole('link', { name: 'About' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
