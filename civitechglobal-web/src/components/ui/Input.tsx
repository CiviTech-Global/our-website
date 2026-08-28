import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-11 w-full rounded-xl border bg-surface-50 px-3.5 text-sm text-text-primary placeholder:text-text-muted',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-500/50',
          invalid ? 'border-brand-red-500' : 'border-border-default',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
