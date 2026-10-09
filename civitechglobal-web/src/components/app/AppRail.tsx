import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { cn } from '@/lib/utils';
import logoSrc from '@/assets/logos/concept logo - no bg - white.png';
import { formatCount, moduleCount, moduleHome, type NavModule } from './navigation';

/**
 * The module switcher: one icon per area of work.
 *
 * Lapis and narrow on purpose, so it reads as the frame of the application —
 * the garden's wall — rather than as part of any one screen. The module in
 * use carries a turquoise bar on its inner edge. A dot on a module says something is
 * waiting inside it without the reader having to open it to find out.
 *
 * Each icon names itself in a tooltip on hover and on keyboard focus — a rail
 * of unlabelled icons is only navigable by people who already know it.
 */
export function AppRail({
  modules,
  activeId,
  homeTo,
  onNavigate,
}: {
  modules: NavModule[];
  activeId: string | undefined;
  homeTo: string;
  onNavigate: () => void;
}) {
  const { t, locale } = useLocale();
  const localize = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  return (
    <nav
      aria-label={t.app.modules}
      // On lapis the dark saffron ring would vanish; the rail's own subtree
      // gets the lighter saffron (7:1) through the token the ring reads.
      className="app-rail flex h-full w-16 shrink-0 flex-col items-center gap-1.5 py-3 [--color-app-accent:var(--color-brand-amber-400)]"
    >
      <Link
        to={homeTo}
        onClick={onNavigate}
        className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white/[0.07] ring-1 ring-white/10 transition-colors duration-(--dur-feedback) hover:bg-white/[0.12]"
        aria-label={t.common.brand}
      >
        <img src={logoSrc} alt="" className="size-7 object-contain" />
      </Link>

      <ul className="flex flex-col items-center gap-1">
        {modules.map((module) => {
          const to = moduleHome(module);
          const active = module.id === activeId;
          const waiting = moduleCount(module);
          if (!to) return null;

          return (
            <li key={module.id} className="group relative">
              <Link
                to={to}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                aria-label={waiting > 0 ? `${module.label} (${formatCount(waiting, localize)})` : module.label}
                className={cn(
                  'relative flex size-10 items-center justify-center rounded-xl transition-[background-color,color] duration-(--dur-feedback) ease-(--ease) [&_svg]:size-[19px]',
                  // The turquoise bar on the inner edge marks the module in use.
                  'before:absolute before:-end-3 before:top-2 before:bottom-2 before:w-[3px] before:rounded-s-full before:bg-brand-green-400 before:opacity-0 before:transition-opacity',
                  active
                    ? 'bg-brand-green-400/15 text-brand-green-200 before:opacity-100'
                    : 'text-white/65 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]'
                )}
              >
                {module.icon}
                {waiting > 0 && <span className="app-led app-led-wait absolute end-1 top-1" aria-hidden="true" />}
              </Link>

              {/* A tooltip, not a title attribute: title waits a second and
                  never appears for keyboard focus. */}
              <span
                role="tooltip"
                className="pointer-events-none absolute start-full top-1/2 z-50 ms-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-app-rail px-2.5 py-1.5 text-label font-medium text-white shadow-app-float ring-1 ring-white/10 group-hover:block group-focus-within:block"
              >
                {module.label}
                {waiting > 0 && <span className="ms-1.5 text-white/60">{formatCount(waiting, localize)}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
