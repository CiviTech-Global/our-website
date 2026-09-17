import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { fieldClasses } from './Input';
import { useSurface } from './surface';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, invalid, rows = 4, ...props }, ref) => {
    const app = useSurface() === 'app';
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(fieldClasses(app, invalid), app ? 'px-3 py-2' : 'px-3.5 py-2.5', className)}
        {...props}
      />
    );
  }
);
TextArea.displayName = 'TextArea';
