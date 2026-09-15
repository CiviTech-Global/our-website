import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocaleProvider, useLocale } from './LocaleProvider';
import en from './en';

const STORAGE_KEY = 'civitech-locale';

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

beforeEach(() => {
  // No detection in unit tests: the provider calls /i18n/detect on a first
  // visit, and a real request would make every assertion here depend on
  // whatever the network did.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
  window.localStorage.clear();
  document.documentElement.dir = '';
  document.documentElement.lang = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it('flips document direction and lang when switching to English', () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-en' }));

    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('dir')).toHaveTextContent('ltr');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches to a language that is only partly translated', () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-tr' }));

    expect(screen.getByTestId('locale')).toHaveTextContent('tr');
    expect(screen.getByTestId('dir')).toHaveTextContent('ltr');
    expect(document.documentElement.lang).toBe('tr-TR');
  });

  it('fills an untranslated key from English rather than rendering nothing', () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-tr' }));

    // "common.loading" is translated into Turkish; "market.title" is not, and
    // must arrive as the English sentence — an empty node here would be a
    // blank heading on a live page.
    expect(screen.getByTestId('greeting')).toHaveTextContent('Yükleniyor');
    expect(screen.getByTestId('deep')).toHaveTextContent(en.market.title);
  });

  it('persists the chosen locale to localStorage and restores it on next mount', () => {
    const { unmount } = render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'set-en' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');
    unmount();

    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('dictionaries for fa and en expose the same keys (translation parity)', () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    const faGreeting = screen.getByTestId('greeting').textContent;
    fireEvent.click(screen.getByRole('button', { name: 'set-en' }));
    const enGreeting = screen.getByTestId('greeting').textContent;

    expect(faGreeting).toBeTruthy();
    expect(enGreeting).toBeTruthy();
    expect(faGreeting).not.toBe(enGreeting);
  });
});
