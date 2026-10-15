import { useEffect, useState } from 'react';
import { Check, Languages } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { isAutomatedVisitor, storedLanguageChoice } from '@/i18n/languageChoice';
import { LOCALES, LOCALE_NAMES, LOCALE_TAGS, isLocale, type Locale } from '@/i18n/locales';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

/**
 * The first-visit language question.
 *
 * Shown once per device until the visitor picks a language. The pick is kept
 * in localStorage, so it is asked again only after the visitor clears their
 * browser's site data; changing it later is the language menu's job.
 *
 * Built on the shared Modal, so it is the same plaster panel, backdrop, motion
 * and focus trap as every other dialog on the site — only `dismissible` is
 * off: there is no close button, and Escape and the backdrop do nothing. One
 * press answers it, and a dismissed question would only come back next visit.
 *
 * The question is written in English and Persian side by side rather than
 * through the dictionaries: until the visitor answers, the site does not know
 * which language they read. Each option names its language in its own script,
 * with the same bordered selection idiom the forms use.
 *
 * Crawlers and the prerender step never see it (isAutomatedVisitor): a search
 * engine has to index the page, not a dialog over it.
 */
export function LanguageChoiceDialog() {
  const { locale, setLocale } = useLocale();
  // Decided at mount with a lazy initialiser rather than an effect, so the
  // first paint already has the answer.
  const [open, setOpen] = useState(() => !isAutomatedVisitor() && storedLanguageChoice() === null);
  const [suggested, setSuggested] = useState<Locale | null>(null);

  // The server sees the IP and Accept-Language, which the browser does not
  // hand to JavaScript. Its guess marks one option and changes nothing else.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const base = import.meta.env.VITE_API_URL ?? '/api';
    (async () => {
      try {
        const response = await fetch(`${base}/v1/i18n/detect`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = (await response.json()) as { data?: { locale?: string } };
        const detected = body.data?.locale;
        if (isLocale(detected)) setSuggested(detected);
      } catch {
        // Offline or aborted: the question stands without a suggestion.
      }
    })();
    return () => controller.abort();
  }, [open]);

  // Modal focuses its first button; start on the language already showing
  // instead, so the focus ring and the selection mark name the same option.
  // This effect runs after Modal's, its child's, so it has the last word.
  useEffect(() => {
    if (!open) return;
    document
      .querySelector<HTMLButtonElement>('[data-language-choice][aria-pressed="true"]')
      ?.focus();
  }, [open]);

  const choose = (next: Locale) => {
    // Remembers the choice, and moves to the chosen language's address when
    // it is not the one showing.
    setLocale(next);
    setOpen(false);
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => undefined}
      dismissible={false}
      labelledBy="language-choice-title"
      className="max-w-md"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="bagh-chip">
          <Languages className="size-3.5" aria-hidden="true" />
          <span lang="en">Language</span>
          <span aria-hidden="true">·</span>
          <span lang="fa-IR">زبان</span>
        </span>
        <h2
          id="language-choice-title"
          className="flex flex-col gap-1 text-xl font-bold text-text-primary"
        >
          <span lang="en" dir="ltr">
            Choose your language
          </span>
          <span lang="fa-IR" dir="rtl">
            زبان خود را انتخاب کنید
          </span>
        </h2>
        <p className="flex flex-col gap-0.5 text-sm leading-6 text-text-secondary">
          <span lang="en" dir="ltr">
            You can change it any time from the language menu.
          </span>
          <span lang="fa-IR" dir="rtl">
            هر زمان بخواهید می‌توانید آن را از منوی زبان تغییر دهید.
          </span>
        </p>
      </div>

      <div
        className="mt-6 grid grid-cols-2 gap-2.5"
        role="group"
        aria-labelledby="language-choice-title"
      >
        {LOCALES.map((option) => {
          const current = option === locale;
          return (
            <button
              key={option}
              data-language-choice
              type="button"
              lang={LOCALE_TAGS[option]}
              aria-pressed={current}
              onClick={() => choose(option)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2.5 text-base font-semibold transition-colors',
                current
                  ? 'border-brand-green-500 bg-brand-green-500/10 text-text-primary'
                  : 'border-border-default text-text-secondary hover:border-brand-green-500/40 hover:text-text-primary'
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {current && (
                  <Check
                    className="size-4 text-brand-green-600 dark:text-brand-green-400"
                    aria-hidden="true"
                  />
                )}
                {LOCALE_NAMES[option]}
              </span>
              {suggested === option && !current && (
                <Badge variant="success" className="text-[11px]">
                  <span lang="en">Suggested</span>
                  <span aria-hidden="true">·</span>
                  <span lang="fa-IR">پیشنهادی</span>
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
