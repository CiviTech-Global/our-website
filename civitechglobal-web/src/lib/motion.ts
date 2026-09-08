import { useEffect, useRef, useState } from 'react';

/**
 * The two pieces of animation that genuinely need JavaScript.
 *
 * Everything else the interface does — fades, slides, hover lifts, the hero's
 * pulse — is a CSS keyframe or a transition, declared in index.css. That is not
 * a downgrade from the animation library this replaces: CSS animations run on
 * the compositor, off the main thread, where a JS-driven library has to wake
 * up every frame. The library cost 129 kB (42 kB compressed) on every page
 * load to do what two dozen lines and a stylesheet do here.
 *
 * `prefers-reduced-motion` is not handled in either hook. It is honoured once,
 * globally, in the stylesheet — which covers CSS-only animations too, and
 * cannot be forgotten at a call site.
 */

/**
 * True once the element has scrolled into view, and true forever after.
 *
 * One observer per element, disconnected the moment it fires: a reveal that
 * only happens once has no reason to keep watching, and the previous
 * implementation kept a scroll listener alive for the life of the page.
 */
export function useInView<T extends HTMLElement>(rootMargin = '-80px'): {
  ref: React.RefObject<T | null>;
  inView: boolean;
} {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Without IntersectionObserver (or in a test environment that lacks it)
    // the content must still be visible — never hide something behind a
    // capability check.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

/**
 * Keeps a child mounted long enough to play its exit animation.
 *
 * This is the one thing a plain conditional render cannot do: `{open && <X/>}`
 * removes the node immediately, so there is nothing left to animate out. The
 * hook holds the node for `duration` after `open` goes false, and reports
 * which phase to render.
 */
export function usePresence(
  open: boolean,
  duration = 200
): { mounted: boolean; state: 'entering' | 'leaving' } {
  const [leaving, setLeaving] = useState(false);
  const wasOpen = useRef(open);

  useEffect(() => {
    const closing = wasOpen.current && !open;
    wasOpen.current = open;
    if (!closing) return;

    setLeaving(true);
    const timer = window.setTimeout(() => setLeaving(false), duration);
    return () => window.clearTimeout(timer);
  }, [open, duration]);

  // Derived, not stored: `open` must mount the child on the SAME commit that
  // set it. Waiting for an effect to flip a state flag costs an extra render
  // in which the child does not exist — long enough for a caller that focuses
  // the dialog on open to find nothing there.
  return { mounted: open || leaving, state: open ? 'entering' : 'leaving' };
}
