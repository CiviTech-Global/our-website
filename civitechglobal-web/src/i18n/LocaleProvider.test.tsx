import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocaleProvider, useLocale } from './LocaleProvider';
import en from './en';

const STORAGE_KEY = 'civitech-locale';

/**
 * Where the provider tried to send the browser.
 *
 * jsdom will not perform a navigation and will not let location.assign be
 * replaced, so the one function that navigates is mocked and its argument
 * recorded. What it builds from that argument is covered in localePath.test.ts.
 */
const assigned: string[] = [];

vi.mock('./localePath', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./localePath')>()),
  navigateToLocale: (next: string) => {
    assigned.push(next);
  },
}));

function Probe() {
  const { locale, dir, t, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="greeting">{t.common.loading}</span>
      <span data-testid="deep">{t.market.title}</span>
      <button type="button" onClick={() => setLocale('en')}>
        set-en
      </button>
      <button type="button" onClick={() => setLocale('tr')}>
        set-tr
      </button>
    </div>
  );
}

function offline() {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
}

/** The detector answering with a country's language. */
function detects(locale: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { locale } }) }))
  );
}

beforeEach(() => {
  assigned.length = 0;
  // Each test says what the detector does; an unstubbed fetch would make every
  // assertion here depend on whatever the network did.
  offline();
  window.history.replaceState({}, '', '/');
  window.localStorage.clear();
  document.documentElement.dir = '';
  document.documentElement.lang = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('LocaleProvider RTL/i18n', () => {
  it('defaults to Persian (fa) with rtl direction', () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('fa');
    expect(screen.getByTestId('dir')).toHaveTextContent('rtl');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('fa-IR');
  });

  it('renders the language the URL declared, with its direction and lang tag', () => {
    render(
      <LocaleProvider locale="en">
        <Probe />
      </LocaleProvider>
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('dir')).toHaveTextContent('ltr');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('fills an untranslated key from English rather than rendering nothing', () => {
    render(
      <LocaleProvider locale="tr">
        <Probe />
      </LocaleProvider>
    );

    // "common.loading" is translated into Turkish; "market.title" is not, and
    // must arrive as the English sentence — an empty node here would be a
    // blank heading on a live page.
    expect(screen.getByTestId('greeting')).toHaveTextContent('Yükleniyor');
    expect(screen.getByTestId('deep')).toHaveTextContent(en.market.title);
  });

  it('picking a language moves to that language address and remembers the choice', () => {
    window.history.replaceState({}, '', '/services');
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-en' }));

    expect(assigned).toEqual(['en']);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  it('keeps the route when switching out of a prefixed address', () => {
    window.history.replaceState({}, '', '/en/services');
    render(
      <LocaleProvider locale="en">
        <Probe />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-tr' }));

    expect(assigned).toEqual(['tr']);
  });

  it('sends a first-time visitor to the language their location implies', async () => {
    detects('de');
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    await waitFor(() => expect(assigned).toEqual(['de']));
  });

  it('does not redirect a visitor who has already chosen', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'fa');
    detects('de');
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    // A site that keeps overriding your pick is worse than one that guessed
    // wrong once.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(assigned).toEqual([]);
  });

  it('does not second-guess an address that already names a language', async () => {
    window.history.replaceState({}, '', '/fr/about');
    detects('de');
    render(
      <LocaleProvider locale="fr">
        <Probe />
      </LocaleProvider>
    );

    // Someone arriving from a search result or a shared link is at an explicit
    // address; redirecting would make one link mean different things.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(assigned).toEqual([]);
  });

  it('stays put when the detector agrees with the default', async () => {
    detects('fa');
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(assigned).toEqual([]);
  });
});
