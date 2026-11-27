import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './HomePage';
import fa from '@/i18n/fa';

// The real Persian dictionary exercises the actual copy (including the
// ZWNJ-safe KineticWords split) instead of a hand-maintained stub.
vi.mock('@/i18n/LocaleProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/LocaleProvider')>()),
  useLocale: () => ({ locale: 'fa', setLocale: vi.fn(), t: fa }),
}));

// No server in tests: the hooks resolve to empty lists and the data-driven
// sections (trust bar, selected work) correctly render nothing.
vi.mock('@/api/showcase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/showcase')>()),
  usePublicOrganizations: () => ({ data: undefined }),
  usePublicProjects: () => ({ data: undefined }),
}));

vi.mock('@/api/capabilities', () => ({
  useAppDownloads: () => undefined,
}));

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const normalise = (text: string | null) => (text ?? '').replace(/\s+/g, ' ').trim();

describe('HomePage (2026 rebrand)', () => {
  it('leads with custom software design and development', () => {
    renderHome();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(fa.home.heroTitle);
    // The hero's primary action is project intake, not a generic services link.
    const primary = screen.getAllByRole('link', { name: fa.home.heroCtaPrimary })[0];
    expect(primary).toHaveAttribute('href', '/start-project');
    expect(screen.getByRole('link', { name: fa.home.heroCtaSecondary })).toHaveAttribute(
      'href',
      '/contact'
    );
  });

  it('follows the conversion-blueprint section order', () => {
    renderHome();
    const headings = screen.getAllByRole('heading').map((h) => normalise(h.textContent));
    // SelectedWork renders nothing without API data, so its title cannot be
    // asserted here; its slot between bento and process is structural.
    const spine = [
      fa.home.heroTitle,
      fa.home.industriesEyebrow, // the marquee's visually-hidden h2
      fa.home.painTitle,
      fa.home.whyTitle,
      fa.home.servicesTitle,
      fa.home.processTitle,
      fa.home.packagesTitle,
      fa.home.faqTitle,
      fa.home.ecosystemTitle, // demoted, but still before the closer
      fa.home.finalCtaTitle,
    ];
    const indices = spine.map((title) => headings.findIndex((h) => h.includes(normalise(title))));
    for (const index of indices) expect(index).toBeGreaterThanOrEqual(0);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it('lists the industries statically for screen readers', () => {
    renderHome();
    // The animated track is aria-hidden; the accessible copy is the static
    // list, so every industry must appear at least once as plain text.
    for (const industry of fa.home.industries) {
      expect(screen.getAllByText(industry).length).toBeGreaterThan(0);
    }
  });

  it('renders every FAQ as a closed native details accordion', () => {
    renderHome();
    const accordions = document.querySelectorAll('details');
    expect(accordions).toHaveLength(fa.home.faq.length);
    for (const item of fa.home.faq) {
      expect(screen.getByText(item.q)).toBeInTheDocument();
      expect(screen.getByText(item.a)).toBeInTheDocument();
    }
    for (const accordion of accordions) {
      expect(accordion).not.toHaveAttribute('open');
      expect(accordion.querySelector('summary')).not.toBeNull();
    }
  });

  it('links each fixed-price package to the intake form with its preselect', () => {
    renderHome();
    const ctas = screen.getAllByRole('link', { name: fa.home.packagesCta });
    expect(ctas).toHaveLength(3);
    expect(ctas.map((cta) => cta.getAttribute('href'))).toEqual([
      '/start-project?package=shop-website',
      '/start-project?package=ordering-inventory',
      '/start-project?package=custom-integration',
    ]);
    // The middle path is the recommended one and says so.
    expect(screen.getByText(fa.home.pkgPopular)).toBeInTheDocument();
  });

  it('closes on the deep band with one primary ask and a ghost beside it', () => {
    renderHome();
    expect(screen.getByRole('link', { name: fa.home.finalCtaPrimary })).toHaveAttribute(
      'href',
      '/start-project'
    );
    expect(screen.getByRole('link', { name: fa.home.consultCta })).toHaveAttribute(
      'href',
      '/contact'
    );
  });

  it('keeps the ecosystem secondary: tiles, not a live marketplace block', () => {
    renderHome();
    expect(screen.getByRole('link', { name: fa.nav.localMarket })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: fa.nav.insurance })).toBeInTheDocument();
  });

  it('has one h1 and no skipped heading levels in the static spine', () => {
    renderHome();
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName[1]));
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeLessThanOrEqual(levels[i - 1] + 1);
    }
  });
});
