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
      className="flex h-full w-14 shrink-0 flex-col items-center gap-1 bg-gradient-to-b from-app-rail to-app-rail-2 py-3"
    >
      <Link
        to={homeTo}
        onClick={onNavigate}
        className="mb-3 flex size-9 items-center justify-center rounded focus-visible:outline-white/70"
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
                  'relative flex size-9 items-center justify-center rounded [&_svg]:size-[18px]',
                  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/70',
                  active
                    ? 'bg-app-primary text-white'
                    : 'text-white/55 hover:bg-white/10 hover:text-white/90'
                )}
              >
                {module.icon}
                {waiting > 0 && (
                  <span
                    className={cn(
                      'absolute end-1 top-1 size-2 rounded-full ring-2',
                      active ? 'bg-white ring-app-primary' : 'bg-brand-amber-400 ring-app-rail'
                    )}
                    aria-hidden="true"
                  />
                )}
              </Link>

              {/* A tooltip, not a title attribute: title waits a second and
                  never appears for keyboard focus. */}
              <span
                role="tooltip"
                className="pointer-events-none absolute start-full top-1/2 z-50 ms-2 hidden -translate-y-1/2 whitespace-nowrap rounded bg-[#101828] px-2 py-1 text-label font-medium text-white shadow-app-float group-hover:block group-focus-within:block"
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
