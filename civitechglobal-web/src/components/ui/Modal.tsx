import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '@/lib/motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSurface } from './surface';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  // Holds the dialog in the tree while it animates out; `state` picks the
  // enter or leave keyframe.
  const { mounted, state } = usePresence(isOpen);
  const app = useSurface() === 'app';

  // Held in a ref so the trap below depends on `isOpen` alone. Callers write
  // `onClose={() => setEditing(null)}`, which is a new function on every
  // parent render; an effect that listed it as a dependency tore the trap
  // down and rebuilt it after every keystroke, and rebuilding it moves focus
  // back to the dialog's first element. A form inside a modal then accepted
  // exactly one character per click — the rest went to the Close button.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      (previousActiveElement.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          app ? 'absolute inset-0 bg-[#0c111d]/45' : 'absolute inset-0 bg-surface-950/60 backdrop-blur-sm',
          state === 'entering' ? 'ct-fade-in' : 'ct-fade-out'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          app
            ? // A dialog is the one place a dashboard uses a shadow: it floats.
              // Scrolls inside itself, so a long form never runs off the screen.
              'app-raised relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden text-body text-app-text-2 shadow-app-float'
            : 'glass relative z-10 w-full max-w-lg rounded-xl p-6 shadow-soft-lg',
          state === 'entering' ? 'ct-pop-in' : 'ct-pop-out',
          className
        )}
      >
            <div
              className={cn(
                'flex items-center justify-between',
                app ? 'app-window-bar shrink-0 gap-3 border-b border-app-border px-3' : 'mb-4'
              )}
            >
              {title && (
                <h2
                  id="modal-title"
                  className={
                    app
                      ? 'min-w-0 truncate bg-app-subtle px-2 text-body-lg font-semibold text-app-text'
                      : 'text-lg font-semibold text-text-primary'
                  }
                >
                  {title}
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={
                  app
                    ? 'app-key ms-auto flex size-7 shrink-0 items-center justify-center text-app-icon'
                    : 'ms-auto rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-200 dark:hover:bg-surface-300'
                }
              >
                <X className={app ? 'size-4' : 'size-5'} aria-hidden="true" />
              </button>
            </div>
        {app ? <div className="min-h-0 overflow-y-auto px-6 py-5">{children}</div> : children}
      </div>
    </div>,
    document.body
  );
}
