import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section';
}

/** Fades + slides content up once it scrolls into view. Honors prefers-reduced-motion. */
export function AnimatedSection({ children, className, delay = 0, as = 'div' }: AnimatedSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      className={cn(className)}
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </Component>
  );
}
