import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useSurface } from './surface';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/**
 * Field chrome, shared by Input, Select and TextArea so the three cannot drift.
 *
 * On the application surface a field is 34px — the height of a button, so a
 * search box and the button beside it share a baseline — with a 4px radius and
 * a thin focus ring in the brand colour rather than a thick glow.
 */
export function fieldClasses(app: boolean, invalid: boolean | undefined): string {
  return app
    ? cn(
        'w-full rounded border bg-app-panel text-body text-app-text placeholder:text-app-text-4',
        'focus-visible:border-app-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-app-primary/15',
        invalid ? 'border-status-error' : 'border-app-border',
        'disabled:cursor-not-allowed disabled:bg-app-fill disabled:opacity-70'
      )
    : cn(
        'w-full rounded-xl border bg-surface-50 text-sm text-text-primary placeholder:text-text-muted',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-500/50',
        invalid ? 'border-brand-red-500' : 'border-border-default',
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
          app ? 'h-[34px] px-3' : 'h-11 px-3.5',
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
