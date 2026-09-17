import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fieldClasses } from './Input';
import { useSurface } from './surface';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => {
    const app = useSurface() === 'app';
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            fieldClasses(app, invalid),
            'appearance-none',
            app ? 'h-[34px] ps-3 pe-8' : 'h-11 ps-3.5 pe-10',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className={cn(
            'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2',
            app ? 'end-2.5 text-app-icon' : 'end-3 text-text-muted'
          )}
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = 'Select';
