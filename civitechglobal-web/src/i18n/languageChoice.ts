import { isLocale, type Locale } from './locales';

/**
 * The visitor's own choice of language, kept on this device.
 *
 * Asked once, on the first visit, by the language dialog; changed later from
 * the language menu. Lives in localStorage, so it lasts until the visitor
 * clears their browser's site data — at which point they are asked again.
 */
export const LANGUAGE_CHOICE_KEY = 'civitech-locale';

export function storedLanguageChoice(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_CHOICE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    // A browser refusing storage is not a reason to fail to render.
    return null;
  }
}

export function rememberLanguageChoice(locale: Locale): void {
  try {
    window.localStorage.setItem(LANGUAGE_CHOICE_KEY, locale);
  } catch {
    // Storage refused: the choice still applies to this visit.
  }
}

/** Search and preview crawlers, which must see each address as it is. */
const CRAWLER = /bot|crawler|spider|crawling|slurp|mediapartners|lighthouse|headless/i;

/**
 * A crawler, or a browser driven by a script — the prerender step among them.
 *
 * Neither should be asked anything: a search engine has to index the page,
 * not a dialog over it, and a prerendered page with the dialog baked into its
 * HTML would show it to every visitor before the app had even started.
 */
export function isAutomatedVisitor(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.webdriver === true || CRAWLER.test(navigator.userAgent);
}
