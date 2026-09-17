import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useSurface } from './surface';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** A leading dot in the status colour — for a status read at a glance in a list. */
  dot?: boolean;
}

const MARKETING_VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-brand-green-100 text-brand-green-700 dark:bg-brand-green-900/40 dark:text-brand-green-300',
  warning: 'bg-brand-amber-100 text-brand-amber-700 dark:bg-brand-amber-900/40 dark:text-brand-amber-300',
  danger: 'bg-brand-red-100 text-brand-red-700 dark:bg-brand-red-900/40 dark:text-brand-red-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  default: 'bg-surface-200 text-text-secondary dark:bg-surface-300',
};

/**
 * Status chips on the application surface: a tinted background, a matching
 * hairline border and text in the status colour. The border is what keeps a
 * pale chip readable on a white table row, where background tint alone washes
 * out.
 */
const APP_VARIANTS: Record<BadgeVariant, string> = {
  success: 'border-status-success-border bg-status-success-bg text-status-success',
  warning: 'border-status-warning-border bg-status-warning-bg text-status-warning',
  danger: 'border-status-error-border bg-status-error-bg text-status-error',
  info: 'border-status-info-border bg-status-info-bg text-status-info',
  default: 'border-status-neutral-border bg-status-neutral-bg text-status-neutral',
};

export function Badge({ className, variant = 'default', dot = false, children, ...props }: BadgeProps) {
  const app = useSurface() === 'app';
  return (
    <span
      className={cn(
        app
          ? 'inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-label font-medium [&_svg]:size-3'
          : 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        app ? APP_VARIANTS[variant] : MARKETING_VARIANTS[variant],
        className
      )}
      {...props}
    >
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
