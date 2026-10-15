import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { LANGUAGE_CHOICE_KEY } from '@/i18n/languageChoice';
import { LanguageChoiceDialog } from './LanguageChoiceDialog';

/** Where the dialog tried to send the browser; jsdom will not navigate. */
const assigned: string[] = [];

vi.mock('@/i18n/localePath', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/localePath')>()),
  navigateToLocale: (next: string) => {
    assigned.push(next);
  },
}));

function detects(locale: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { locale } }) }))
  );
}

function renderDialog(locale: 'fa' | 'en' = 'fa') {
  return render(
    <LocaleProvider locale={locale}>
      <LanguageChoiceDialog />
    </LocaleProvider>
  );
}

beforeEach(() => {
  assigned.length = 0;
  window.localStorage.clear();
  detects('fa');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('LanguageChoiceDialog', () => {
  it('asks a first-time visitor, in English and Persian, with all six languages', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Choose your language');
    expect(dialog).toHaveTextContent('زبان خود را انتخاب کنید');
    for (const name of ['فارسی', 'English', 'Türkçe', 'Deutsch', 'Français', 'Español']) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it('cannot be dismissed without choosing', () => {
    renderDialog();

    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('remembers the choice and moves to that language', async () => {
    renderDialog('fa');

    fireEvent.click(screen.getByRole('button', { name: /Deutsch/ }));

    expect(window.localStorage.getItem(LANGUAGE_CHOICE_KEY)).toBe('de');
    expect(assigned).toEqual(['de']);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('remembers picking the language already showing, and stays', async () => {
    renderDialog('fa');

    fireEvent.click(screen.getByRole('button', { name: /فارسی/ }));

    expect(window.localStorage.getItem(LANGUAGE_CHOICE_KEY)).toBe('fa');
    expect(assigned).toEqual([]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('is not asked again once a language is chosen', () => {
    window.localStorage.setItem(LANGUAGE_CHOICE_KEY, 'en');
    renderDialog();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('marks the language the server suggests', async () => {
    detects('tr');
    renderDialog();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Türkçe/ })).toHaveTextContent('Suggested')
    );
  });

  it('never appears for a crawler', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    );
    renderDialog();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
