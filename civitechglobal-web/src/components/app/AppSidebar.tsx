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
 * 36px rows at 14px: dense enough that a module with a dozen screens fits
 * without scrolling, and the active screen is marked by a soft turquoise row
 * and a bar on its inner edge rather than a block of colour — the page, not
 * the sidebar, is where the eye should go.
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
    <div className="flex h-full w-64 shrink-0 flex-col border-e border-app-border bg-app-panel">
      <div className="app-faceplate flex h-12 shrink-0 items-center justify-between gap-2 ps-4 pe-2">
        <div className="min-w-0">
          <p className="app-label truncate !text-app-text-4">{panelTitle}</p>
          <p className="truncate text-body-lg font-semibold leading-tight text-app-text">{module?.label}</p>
        </div>
        {onCloseDrawer ? (
          <button
            type="button"
            onClick={onCloseDrawer}
            aria-label={t.app.closeMenu}
            className="app-key flex size-8 items-center justify-center text-app-icon"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onHide}
            aria-label={t.app.collapseSidebar}
            title={t.app.collapseSidebar}
            className="app-key-flat flex size-8 items-center justify-center text-app-icon"
          >
            <PanelLeftClose className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label={t.app.sectionNavigation} className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {module?.sections.map((section, index) => (
          <div key={section.id} className={cn(index > 0 && 'mt-5')}>
            {section.label && (
              <p className="app-label mb-1.5 px-2">
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
          'group relative flex h-9 items-center gap-2.5 rounded-lg ps-3 pe-2 text-body transition-[background-color,color] duration-(--dur-feedback) ease-(--ease) [&_svg]:size-4 [&_svg]:shrink-0',
          'before:absolute before:start-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-app-primary before:opacity-0',
          isActive
            ? 'bg-app-primary-soft font-semibold text-app-text before:opacity-100 [&_svg]:text-app-primary'
            : 'text-app-text-2 hover:bg-app-hover hover:text-app-text [&_svg]:text-app-icon hover:[&_svg]:text-app-primary'
        )
      }
    >
      {item.icon}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.count !== undefined && item.count > 0 && (
        <span className="app-readout ms-auto inline-flex h-[20px] min-w-[22px] items-center justify-center px-1.5 text-caption font-semibold">
          {formatCount(item.count, localize)}
        </span>
      )}
    </NavLink>
  );
}
