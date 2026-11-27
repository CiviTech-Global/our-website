import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { FuturisticFooter } from './FuturisticFooter';

vi.mock('@/i18n/LocaleProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/LocaleProvider')>()),
  useLocale: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: {
      common: { brand: 'Brand', legalName: 'Brand Ltd' },
      help: { centreTitle: 'Help centre' },
      footer: {
        tagline: 'Software, made properly.',
        links: 'Links',
        legal: 'Legal',
        privacy: 'Privacy',
        rights: 'All rights reserved',
        credit: 'Made with care',
      },
      nav: {
        services: 'What we do',
        startProject: 'Start a project',
        portfolio: 'Our projects',
        pricing: 'Plans and pricing',
        about: 'About',
        blog: 'Blog',
        team: 'Team',
        contact: 'Contact',
        groupEcosystem: 'Ecosystem',
        jobs: 'Jobs',
        freelance: 'Freelance',
        books: 'Books',
        localMarket: 'Local market',
        insurance: 'Insurance',
        consult: 'Consult',
        volunteer: 'Volunteer',
      },
    },
  }),
}));

function renderFooter() {
  return render(
    <MemoryRouter>
      <FuturisticFooter />
    </MemoryRouter>
  );
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-motion');
});

describe('FuturisticFooter', () => {
  it('keeps the copyright and credit lines', () => {
    renderFooter();
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    expect(screen.getByText('Made with care')).toBeInTheDocument();
  });

  it('pauses animations via data-motion on <html> and persists the choice', async () => {
    const user = userEvent.setup();
    renderFooter();

    const toggle = screen.getByRole('button', { name: 'Pause animations' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    expect(document.documentElement).toHaveAttribute('data-motion', 'paused');
    expect(window.localStorage.getItem('rtjg-motion')).toBe('paused');

    const resume = screen.getByRole('button', { name: 'Play animations' });
    expect(resume).toHaveAttribute('aria-pressed', 'true');

    await user.click(resume);

    expect(document.documentElement).not.toHaveAttribute('data-motion');
    expect(window.localStorage.getItem('rtjg-motion')).toBe('play');
  });

  it('applies a saved paused preference on load', () => {
    window.localStorage.setItem('rtjg-motion', 'paused');
    renderFooter();
    expect(document.documentElement).toHaveAttribute('data-motion', 'paused');
  });
});
