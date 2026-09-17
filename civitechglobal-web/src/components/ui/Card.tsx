import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSurface } from './surface';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glass?: boolean;
}

/**
 * A bordered container.
 *
 * On the application surface a card is defined by its border, not a shadow:
 * a dashboard shows dozens at once, and dozens of soft shadows stack into a
 * page that looks smudged. Shadows are kept for things that genuinely float —
 * menus, dialogs, toasts.
 */
export function Card({ className, children, glass = false, ...props }: CardProps) {
  const app = useSurface() === 'app';
  return (
    <div
      className={cn(
        app
          ? 'rounded border border-app-border bg-app-panel p-4 text-body text-app-text-2'
          : ['rounded-xl border border-border-default bg-surface-50 p-6 shadow-soft', glass && 'glass'],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const app = useSurface() === 'app';
  return (
    <div className={cn(app ? 'mb-3 flex flex-col gap-0.5' : 'mb-4 flex flex-col gap-1', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  const app = useSurface() === 'app';
  return (
    <h3
      className={cn(
        app ? 'text-body-lg font-semibold text-app-text' : 'text-lg font-semibold text-text-primary',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const app = useSurface() === 'app';
  return (
    <p className={cn(app ? 'text-body text-app-text-3' : 'text-sm text-text-secondary', className)} {...props}>
      {children}
    </p>
  );
}
