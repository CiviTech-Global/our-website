import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToast, type ToastVariant } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-brand-green-500/30 text-brand-green-700 dark:text-brand-green-300',
  error: 'border-brand-red-500/30 text-brand-red-700 dark:text-brand-red-300',
  info: 'border-border-default text-text-primary',
};

/** Renders the active toast queue. Mount once near the app root, inside ToastProvider. */
export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return createPortal(
    <div
      className="fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:end-4 sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.variant];
          return (
            <motion.div
              key={toast.id}
              role="status"
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'glass shadow-soft-lg flex w-full max-w-sm items-start gap-3 rounded-xl border p-4',
                VARIANT_CLASSES[toast.variant]
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-text-muted transition-colors hover:text-text-primary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}
