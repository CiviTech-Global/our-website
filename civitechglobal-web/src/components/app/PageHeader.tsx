import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { usePageCrumb } from './shell-context';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Right-aligned (left in RTL). One primary action at most. */
  actions?: ReactNode;
  /** A small element beside the title — a status chip on a detail page. */
  titleAdornment?: ReactNode;
  /** Summary figures under the title, usually a row of StatCards. */
  summary?: ReactNode;
  className?: string;
}

/**
 * The top of every dashboard screen: the public site's section head at
 * working size — a bold title, a line saying what the screen is for, a kashi
 * strip, on a band of the faint girih ground — then the actions that act on
 * the whole screen and, optionally, the figures that summarise it.
 *
 * The same structure on every screen is the point. A reader who has learned
 * where one screen keeps its "add" button has learned all of them.
 *
 * The title also becomes the last breadcrumb when the screen is below a
 * navigation link — a detail page — so the trail names the record being read.
 */
export function PageHeader({ title, description, actions, titleAdornment, summary, className }: PageHeaderProps) {
  usePageCrumb(title);

  return (
    <header className={cn('mb-6 flex flex-col gap-4', className)}>
      <div className="bagh-ground flex flex-wrap items-start justify-between gap-x-6 gap-y-3 rounded-[var(--radius-card)] border border-app-border bg-app-panel px-5 py-5 sm:px-6">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-page font-extrabold text-app-text">{title}</h1>
            {titleAdornment}
          </div>
          {description && <p className="mt-1.5 text-body text-app-text-3">{description}</p>}
          <hr className="neon-line mt-3 w-28 [mask-image:none]" aria-hidden="true" />
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {summary}
    </header>
  );
}
