import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSurface } from './surface';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const MARKETING_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-green-500 text-white shadow-[0_2px_0_var(--color-brand-green-800)] hover:bg-brand-green-600 dark:bg-brand-green-400 dark:text-surface-50 dark:shadow-[0_2px_0_var(--color-brand-green-800)] dark:hover:bg-brand-green-300',
  secondary:
    'border border-border-default bg-surface-200 text-text-primary hover:border-border-strong hover:bg-surface-300',
  outline:
    'border border-border-strong bg-transparent text-text-primary hover:border-brand-green-500 hover:bg-brand-green-50 hover:text-brand-green-700 dark:hover:border-brand-green-400 dark:hover:bg-brand-green-400/10 dark:hover:text-brand-green-300',
  ghost: 'bg-transparent text-text-primary hover:bg-surface-200 dark:hover:bg-surface-300',
  danger:
    'bg-brand-red-500 text-white shadow-[0_2px_0_var(--color-brand-red-800)] hover:bg-brand-red-600 dark:bg-brand-red-400 dark:text-surface-50 dark:hover:bg-brand-red-300',
};

const MARKETING_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2',
};

/**
 * The dashboards' buttons: keys.
 *
 * A flat face on a tile lip, with a short real travel when pressed, so what
 * can be pressed looks pressable without a tooltip saying so. The motion is
 * 70ms and only on press: enough to confirm the click, not enough to slow
 * somebody who clicks all day. One height for the ordinary case (36px,
 * matching fields so a button beside a field lines up). `secondary` and
 * `outline` are the same key here.
 */
const APP_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'app-key app-key-primary',
  secondary: 'app-key',
  outline: 'app-key',
  ghost: 'app-key-flat',
  danger: 'app-key app-key-danger',
};

const APP_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-label gap-1.5',
  md: 'h-9 px-3.5 text-body gap-1.5',
  lg: 'h-11 px-5 text-body-lg gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const app = useSurface() === 'app';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap font-medium',
          'disabled:opacity-50 disabled:pointer-events-none',
          app
            ? ['[&_svg]:size-4', APP_VARIANTS[variant], APP_SIZES[size]]
            : [
                'rounded-xl font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-(--dur-feedback) ease-(--ease) active:translate-y-px active:shadow-none',
                MARKETING_VARIANTS[variant],
                MARKETING_SIZES[size],
              ],
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
