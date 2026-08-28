import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            'h-11 w-full appearance-none rounded-xl border bg-surface-50 ps-3.5 pe-10 text-sm text-text-primary',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-500/50',
            invalid ? 'border-brand-red-500' : 'border-border-default',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = 'Select';
