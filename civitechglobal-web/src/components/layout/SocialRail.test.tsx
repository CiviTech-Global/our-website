import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialRail } from './SocialRail';

/**
 * The rail decorates every public page, so what is pinned here is mostly what
 * it does NOT do: render nothing — no shell, no error — when the setting is
 * off, empty, loading or failed.
 */

const mocks = vi.hoisted(() => ({
  useSocialRail: vi.fn(),
}));

vi.mock('@/api/site', () => ({ useSocialRail: mocks.useSocialRail }));

vi.mock('@/i18n/LocaleProvider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/LocaleProvider')>()),
  useLocale: () => ({
    locale: 'en',
    setLocale: vi.fn(),
    t: {
      socialRail: {
        railLabel: 'Social and contact links',
        collapse: 'Tuck the rail away',
        expand: 'Show the rail',
      },
    },
  }),
}));

const links = [
  { id: 'l1', label: 'Instagram', url: 'https://instagram.com/civitech', icon: 'instagram' },
  { id: 'l2', label: 'Call us', url: 'tel:+9821000000', icon: 'phone' },
  { id: 'l3', label: 'Email us', url: 'mailto:hi@civitech.ir', icon: 'email' },
];

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('SocialRail', () => {
  it('renders one labelled link per entry when enabled', () => {
    mocks.useSocialRail.mockReturnValue({ data: { enabled: true, links } });

    render(<SocialRail />);

    expect(screen.getByRole('navigation', { name: 'Social and contact links' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/civitech');
    expect(screen.getByRole('link', { name: 'Call us' })).toHaveAttribute('href', 'tel:+9821000000');
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('opens web links in a new tab, safely, but not tel:/mailto:', () => {
    mocks.useSocialRail.mockReturnValue({ data: { enabled: true, links } });

    render(<SocialRail />);

    const web = screen.getByRole('link', { name: 'Instagram' });
    expect(web).toHaveAttribute('target', '_blank');
    expect(web).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.getByRole('link', { name: 'Call us' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Email us' })).not.toHaveAttribute('target');
  });

  it('renders nothing when the setting is off', () => {
    mocks.useSocialRail.mockReturnValue({ data: { enabled: false, links } });

    const { container } = render(<SocialRail />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when enabled but empty', () => {
    mocks.useSocialRail.mockReturnValue({ data: { enabled: true, links: [] } });

    const { container } = render(<SocialRail />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while loading or after a failed load', () => {
    mocks.useSocialRail.mockReturnValue({ data: undefined, isLoading: true });
    const loading = render(<SocialRail />);
    expect(loading.container).toBeEmptyDOMElement();
    loading.unmount();

    mocks.useSocialRail.mockReturnValue({ data: undefined, isError: true });
    const failed = render(<SocialRail />);
    expect(failed.container).toBeEmptyDOMElement();
  });
});
