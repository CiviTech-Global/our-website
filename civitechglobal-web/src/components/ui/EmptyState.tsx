import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSurface } from './surface';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** The next step — usually the button that creates the first item. */
  action?: ReactNode;
  className?: string;
}

/**
 * Nothing here yet.
 *
 * On the application surface an empty list says what would appear and offers
 * the step that would put it there, because an empty table with no way forward
 * reads as a broken page rather than a new one.
 */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  const app = useSurface() === 'app';

  if (app) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded border border-app-border bg-app-panel px-6 py-12 text-center',
          className
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full border border-app-border-light bg-app-subtle text-app-icon [&_svg]:size-5">
          {icon ?? <Inbox aria-hidden="true" />}
        </span>
        <p className="mt-4 text-title-sm font-semibold text-app-text">{title}</p>
        {description && <p className="mt-1 max-w-sm text-body text-app-text-3">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong px-6 py-12 text-center',
        className
      )}
    >
      <div className="text-text-muted">{icon ?? <Inbox className="size-8" aria-hidden="true" />}</div>
      <p className="font-medium text-text-primary">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
