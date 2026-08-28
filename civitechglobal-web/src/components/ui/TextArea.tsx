import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, invalid, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full rounded-xl border bg-surface-50 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted',
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
TextArea.displayName = 'TextArea';
