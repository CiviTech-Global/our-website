import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useSurface } from './surface';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/**
 * Field chrome, shared by Input, Select and TextArea so the three cannot drift.
 *
 * On the application surface a field is 36px — the height of a button, so a
 * search box and the button beside it share a baseline. Everywhere, a field's
 * edge is the strong border (3:1, WCAG 1.4.11) and focus is the site's one
 * saffron ring; the border turns turquoise to say where typing will go.
 */
export function fieldClasses(app: boolean, invalid: boolean | undefined): string {
  return app
    ? cn(
        'app-well w-full text-body text-app-text placeholder:text-app-text-4',
        'focus-visible:border-app-primary',
        invalid && 'border-status-error',
        'disabled:cursor-not-allowed disabled:bg-app-fill disabled:opacity-70'
      )
    : cn(
        'w-full rounded-xl border bg-surface-50 text-[15px] text-text-primary placeholder:text-text-muted',
        'transition-colors duration-(--dur-feedback) hover:border-text-secondary focus-visible:border-brand-green-500',
        invalid ? 'border-brand-red-500' : 'border-border-strong',
        'disabled:cursor-not-allowed disabled:opacity-50'
      );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    const app = useSurface() === 'app';
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          fieldClasses(app, invalid),
          app ? 'h-9 px-3' : 'h-12 px-4',
          // A file picker's own button sets its height; forcing 34px on it
          // clips the control rather than aligning it.
          props.type === 'file' && 'h-auto py-1.5',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
