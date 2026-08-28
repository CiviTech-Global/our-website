import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { useLocale } from '@/i18n/LocaleProvider';
import { Card } from '@/components/ui/Card';

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="relative flex min-h-[calc(100vh-6rem)] items-center justify-center overflow-hidden px-4 py-10 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(600px circle at 20% 20%, rgba(16,185,129,0.12), transparent 60%), radial-gradient(600px circle at 80% 80%, rgba(245,158,11,0.1), transparent 60%)',
        }}
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card glass className="shadow-soft-lg">
          <div className="mb-6 text-center">
            <Link to="/" className="mb-4 inline-flex items-center gap-2 font-semibold text-text-primary">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-green-500 text-white">
                CT
              </span>
              <span className="gradient-text">{t.common.brand}</span>
            </Link>
            <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
            <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
          </div>
          {children}
        </Card>
      </motion.div>
    </div>
  );
}
