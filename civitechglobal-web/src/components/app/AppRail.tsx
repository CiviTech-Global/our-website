import { Link } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { cn } from '@/lib/utils';
import logoSrc from '@/assets/logos/concept logo - no bg - white.png';
import { formatCount, moduleCount, moduleHome, type NavModule } from './navigation';

/**
 * The module switcher: one icon per area of work.
 *
 * Dark and narrow on purpose, so it reads as the frame of the application
 * rather than as part of any one screen. A dot on a module says something is
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
      className="app-rail flex h-full w-16 shrink-0 flex-col items-center gap-1.5 py-3"
    >
      <Link
        to={homeTo}
        onClick={onNavigate}
        className="mb-3 flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_0_rgba(0,0,0,0.5)] focus-visible:outline-white/70"
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
                  'relative flex size-10 items-center justify-center rounded-lg border transition-[transform,box-shadow] duration-100 [&_svg]:size-[18px]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent',
                  active
                    ? 'translate-y-px border-black/60 bg-black/35 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)]'
                    : 'border-white/10 bg-gradient-to-b from-white/[0.09] to-white/[0.02] text-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_0_rgba(0,0,0,0.55)] hover:text-white active:translate-y-px active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.7)]'
                )}
              >
                {module.icon}
                <span
                  className={cn('app-led absolute start-1 top-1 !size-[5px]', !active && 'app-led-off opacity-60')}
                  aria-hidden="true"
                />
                {waiting > 0 && <span className="app-led app-led-wait absolute end-1 top-1" aria-hidden="true" />}
              </Link>

              {/* A tooltip, not a title attribute: title waits a second and
                  never appears for keyboard focus. */}
              <span
                role="tooltip"
                className="pointer-events-none absolute start-full top-1/2 z-50 ms-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-black/40 bg-app-rail px-2 py-1 text-label font-medium text-white shadow-app-float group-hover:block group-focus-within:block"
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
