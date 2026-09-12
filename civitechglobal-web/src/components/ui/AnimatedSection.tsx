import type { ReactNode } from 'react';
import { useInView } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section';
}

/**
 * Fades and slides content up once it scrolls into view.
 *
 * The trigger is an IntersectionObserver that disconnects after it fires; the
 * animation itself is a CSS keyframe. `prefers-reduced-motion` is honoured
 * globally in index.css rather than checked here.
 */
export function AnimatedSection({
  children,
  className,
  delay = 0,
  as: Component = 'div',
}: AnimatedSectionProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <Component
      ref={ref}
      className={cn('ct-reveal', inView && 'ct-reveal-in', className)}
      style={delay ? ({ '--ct-delay': `${delay}s` } as React.CSSProperties) : undefined}
    >
      {children}
    </Component>
  );
}
