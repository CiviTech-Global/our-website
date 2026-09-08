import type { ReactNode } from 'react';
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

/**
 * A card that lifts and glows softly on hover.
 *
 * Pure CSS now: a `:hover` transition on transform and box-shadow, which the
 * compositor handles without React re-rendering or a JavaScript frame loop.
 * The glow colour rides in as a custom property so the whole thing stays one
 * static rule rather than four.
 */
export function GlowCard({ children, className, glow = 'green' }: GlowCardProps) {
  return (
    <div
      style={{ '--ct-glow': GLOW_SHADOW[glow] } as React.CSSProperties}
      className={cn(
        'ct-lift rounded-xl border border-border-default bg-surface-50 p-6 shadow-soft',
        'hover:[box-shadow:var(--ct-glow)]',
        className
      )}
    >
      {children}
    </div>
  );
}
