import { createContext, useContext } from 'react';

/**
 * Which visual language a shared primitive should speak.
 *
 * `marketing` is the public site: glass, soft glow, generous rounding, large
 * touch targets. `app` is every dashboard: 34px controls, 4px radius, borders
 * instead of shadows, a 13px body — a dense, calm work tool.
 *
 * One Button, one Input, one Card for both, switched by where they are rendered
 * rather than by a prop on every call site. The alternative — a second set of
 * components for the dashboards — is two hundred imports to change today and a
 * permanent chance of a dashboard screen reaching for the marketing one.
 */
export type Surface = 'marketing' | 'app';

export const SurfaceContext = createContext<Surface>('marketing');

export function useSurface(): Surface {
  return useContext(SurfaceContext);
}
