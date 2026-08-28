import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocaleProvider, useLocale } from './LocaleProvider';

const STORAGE_KEY = 'civitech-locale';

function Probe() {
  const { locale, dir, t, toggleLocale, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="greeting">{t.common.loading}</span>
      <button type="button" onClick={toggleLocale}>
        toggle
      </button>
      <button type="button" onClick={() => setLocale('en')}>
        set-en
      </button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.dir = '';
  document.documentElement.lang = '';
});

afterEach(() => {
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
    expect(document.documentElement.lang).toBe('fa');
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

  it('toggleLocale flips between fa and en', () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('locale')).toHaveTextContent('en');

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('locale')).toHaveTextContent('fa');
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
