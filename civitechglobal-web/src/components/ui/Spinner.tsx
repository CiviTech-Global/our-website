import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  className?: string;
  size?: number;
  label?: string;
}

export function Spinner({ className, size = 24, label }: SpinnerProps) {
  return (
    <div className="inline-flex items-center gap-2 text-text-secondary" role="status" aria-live="polite">
      <Loader2 className={cn('animate-spin text-brand-green-500', className)} width={size} height={size} aria-hidden="true" />
      {label && <span className="text-sm">{label}</span>}
      {!label && <span className="sr-only">Loading</span>}
    </div>
  );
}
