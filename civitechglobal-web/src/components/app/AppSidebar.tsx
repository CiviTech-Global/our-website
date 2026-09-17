import { NavLink } from 'react-router';
import { PanelLeftClose, X } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { toPersianDigits } from '@/i18n/utils';
import { cn } from '@/lib/utils';
import { formatCount, type NavItem, type NavModule } from './navigation';
import { UserMenu } from './UserMenu';

/**
 * The screens inside the active module.
 *
 * 32px rows at 13px: dense enough that a module with a dozen screens fits
 * without scrolling, and the active screen is marked by a quiet filled row with
 * a brand-coloured icon rather than a block of colour — the page, not the
 * sidebar, is where the eye should go.
 */
export function AppSidebar({
  panel,
  panelTitle,
  module,
  onNavigate,
  onHide,
  onCloseDrawer,
}: {
  panel: 'user' | 'admin';
  panelTitle: string;
  module: NavModule | undefined;
  onNavigate: () => void;
  onHide: () => void;
  /** Present only while the sidebar is the mobile drawer. */
  onCloseDrawer?: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-e border-app-border bg-app-panel">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-app-border-light ps-4 pe-2">
        <div className="min-w-0">
          <p className="truncate text-caption font-medium uppercase tracking-wide text-app-text-4">{panelTitle}</p>
          <p className="truncate text-body-lg font-semibold leading-tight text-app-text">{module?.label}</p>
        </div>
        {onCloseDrawer ? (
          <button
            type="button"
            onClick={onCloseDrawer}
            aria-label={t.app.closeMenu}
            className="flex size-8 items-center justify-center rounded text-app-icon hover:bg-app-fill hover:text-app-text"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onHide}
            aria-label={t.app.collapseSidebar}
            title={t.app.collapseSidebar}
            className="flex size-8 items-center justify-center rounded text-app-icon hover:bg-app-fill hover:text-app-text"
          >
            <PanelLeftClose className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label={t.app.sectionNavigation} className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {module?.sections.map((section, index) => (
          <div key={section.id} className={cn(index > 0 && 'mt-5')}>
            {section.label && (
              <p className="mb-1 px-2 text-caption font-medium uppercase tracking-wide text-app-text-4">
                {section.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <SidebarLink item={item} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-app-border-light p-2">
        <UserMenu panel={panel} />
      </div>
    </div>
  );
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const { locale } = useLocale();
  const localize = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex h-8 items-center gap-2 rounded border px-2 text-body [&_svg]:size-4 [&_svg]:shrink-0',
          isActive
            ? 'border-app-border-light bg-app-fill font-semibold text-app-text [&_svg]:text-app-primary'
            : 'border-transparent text-app-text-2 hover:bg-app-hover hover:text-app-text [&_svg]:text-app-icon hover:[&_svg]:text-app-primary'
        )
      }
    >
      {item.icon}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.count !== undefined && item.count > 0 && (
        <span className="ms-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-app-fill px-1.5 text-caption font-medium text-app-text-3 group-aria-[current=page]:bg-app-panel">
          {formatCount(item.count, localize)}
        </span>
      )}
    </NavLink>
  );
}
