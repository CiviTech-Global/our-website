import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type GlowColor = 'green' | 'red' | 'amber' | 'default';

export interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glow?: GlowColor;
}

/* A drop on the overhead light, tinted by the tile it belongs to, and an
   edge in the same colour. No glow: a glow has no light source. */
const GLOW_SHADOW: Record<GlowColor, string> = {
  green: '0 18px 36px -20px oklch(35% 0.064 182 / 0.55)',
  red: '0 18px 36px -20px oklch(35% 0.143 25 / 0.5)',
  amber: '0 18px 36px -20px oklch(35% 0.076 72 / 0.5)',
  default: '0 18px 36px -20px oklch(22% 0.03 75 / 0.4)',
};
const GLOW_EDGE: Record<GlowColor, string> = {
  green: 'var(--color-brand-green-400)',
  red: 'var(--color-brand-red-300)',
  amber: 'var(--color-brand-amber-300)',
  default: 'var(--color-border-strong)',
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
      style={{ '--ct-glow': GLOW_SHADOW[glow], '--ct-edge': GLOW_EDGE[glow] } as React.CSSProperties}
      className={cn(
        'ct-lift rounded-2xl border border-border-default bg-surface-50 p-6 shadow-soft',
        'hover:[box-shadow:var(--ct-glow)] hover:[border-color:var(--ct-edge)]',
        className
      )}
    >
      {children}
    </div>
  );
}
