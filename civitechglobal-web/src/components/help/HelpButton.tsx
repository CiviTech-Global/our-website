import { CircleHelp } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';
import { useHelp } from './HelpContext';

/**
 * "Guide for this page", in the navbar and the dashboard top bar.
 *
 * Always present, even on a page with no guide written yet: the panel then
 * says so and points to the help centre, which is still the right answer to
 * "where do I find help?".
 */
export function HelpButton({ variant = 'public', className }: { variant?: 'public' | 'app'; className?: string }) {
  const { t } = useLocale();
  const { open, isOpen } = useHelp();

  return (
    <button
      type="button"
      onClick={() => open()}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      title={`${t.help.openGuideLabel} (?)`}
      className={cn(
        variant === 'app'
          ? 'app-key-flat flex h-8 items-center gap-1.5 px-2 text-app-icon'
          : 'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-100 hover:text-text-primary',
        className
      )}
    >
      <CircleHelp className="size-4" aria-hidden="true" />
      <span className={variant === 'app' ? 'hidden text-sm sm:inline' : 'hidden lg:inline'}>{t.help.openGuide}</span>
      <span className="sr-only">{t.help.openGuideLabel}</span>
    </button>
  );
}
