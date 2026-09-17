import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSurface } from './surface';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** A label above its field, with an error or a hint below — never a floating label. */
export function FormField({ label, htmlFor, error, hint, children, className }: FormFieldProps) {
  const app = useSurface() === 'app';
  return (
    <div className={cn(app ? 'flex flex-col gap-1' : 'flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className={app ? 'text-body font-medium text-app-text-2' : 'text-sm font-medium text-text-primary'}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className={app ? 'text-caption text-status-error' : 'text-xs text-brand-red-500'} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={app ? 'text-caption text-app-text-3' : 'text-xs text-text-muted'}>{hint}</p>
      ) : null}
    </div>
  );
}
