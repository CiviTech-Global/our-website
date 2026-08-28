import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-green-500 text-white hover:bg-brand-green-600 shadow-soft hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] focus-visible:outline-brand-green-500',
  secondary:
    'bg-surface-200 text-text-primary hover:bg-surface-300 dark:bg-surface-300 dark:hover:bg-surface-400',
  outline:
    'border border-border-strong bg-transparent text-text-primary hover:bg-surface-200 dark:hover:bg-surface-300',
  ghost: 'bg-transparent text-text-primary hover:bg-surface-200 dark:hover:bg-surface-300',
  danger:
    'bg-brand-red-500 text-white hover:bg-brand-red-600 shadow-soft hover:shadow-[0_0_20px_rgba(239,68,68,0.35)]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200',
          'disabled:opacity-50 disabled:pointer-events-none',
          'active:scale-[0.98]',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
