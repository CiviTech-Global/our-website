import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-brand-green-100 text-brand-green-700 dark:bg-brand-green-900/40 dark:text-brand-green-300',
  warning: 'bg-brand-amber-100 text-brand-amber-700 dark:bg-brand-amber-900/40 dark:text-brand-amber-300',
  danger: 'bg-brand-red-100 text-brand-red-700 dark:bg-brand-red-900/40 dark:text-brand-red-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  default: 'bg-surface-200 text-text-secondary dark:bg-surface-300',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}
