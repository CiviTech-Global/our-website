import type { ReactNode } from 'react';
import { useInView } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useSurface } from './surface';

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
  const app = useSurface() === 'app';

  // Inside the dashboards content appears, it does not perform. A reveal on
  // every card is delight on a landing page and delay in a tool opened fifty
  // times a day.
  if (app) {
    return <Component className={className}>{children}</Component>;
  }

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
