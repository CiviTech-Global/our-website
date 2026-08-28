import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type GlowColor = 'green' | 'red' | 'amber' | 'default';

export interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glow?: GlowColor;
}

const GLOW_SHADOW: Record<GlowColor, string> = {
  green: '0 0 32px rgba(16,185,129,0.22), 0 12px 32px -10px rgba(15,23,42,0.25)',
  red: '0 0 32px rgba(239,68,68,0.2), 0 12px 32px -10px rgba(15,23,42,0.25)',
  amber: '0 0 32px rgba(245,158,11,0.2), 0 12px 32px -10px rgba(15,23,42,0.25)',
  default: '0 0 28px rgba(148,163,184,0.18), 0 12px 32px -10px rgba(15,23,42,0.25)',
};

/** A card that lifts and glows softly on hover — framer-motion powered, restrained. */
export function GlowCard({ children, className, glow = 'green' }: GlowCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: GLOW_SHADOW[glow] }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'rounded-xl border border-border-default bg-surface-50 p-6 shadow-soft',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
