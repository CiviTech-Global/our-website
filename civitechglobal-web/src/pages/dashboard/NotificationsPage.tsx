import { PageHeader } from '@/components/app/PageHeader';
import type { Locale } from '@/i18n/locales';
import { Link } from 'react-router';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useClientList } from '@/lib/clientList';
import { useListControls } from '@/lib/useListControls';
import { formatDate } from '@/i18n/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import type { AppNotification } from '@/types/marketplace';

const PAGE_SIZE = 20;

/**
 * The notification centre. Rows are opaque renderings of server-written text:
 * the client does not interpret types beyond read/unread and the optional
 * deep link, so a new notification kind never needs a client release.
 */
export default function NotificationsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.notificationsNav);

  const controls = useListControls();
  const { data, isLoading } = useNotifications(controls.page);

  // Searched within the page the server sent, and said so: the box sits above
  // a pager, and a reader is entitled to know the search did not look behind
  // it. Notifications are read newest-first rather than hunted through, so
  // this is the honest amount of searching to offer.
  const shown = useClientList(data?.items, controls, {
    searchFields: (notification) => [notification.title, notification.body],
    pageSize: Number.MAX_SAFE_INTEGER,
  });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.market.notificationsNav}
        description={t.app.memberDescriptions.notifications}
        className="mb-2"
        actions={
          data &&
          data.unreadCount > 0 && (
            <Button variant="outline" isLoading={markAll.isPending} onClick={() => markAll.mutate()}>
              {t.market.markAllRead}
            </Button>
          )
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {(data?.items.length ?? 0) > 0 && (
        <ListToolbar
          controls={controls}
          searchPlaceholder={t.market.searchNotificationsPage}
          total={shown.total}
          isLoading={isLoading}
        />
      )}

      {!isLoading && data?.items.length === 0 && <EmptyState title={t.market.noNotifications} />}

      {!isLoading && shown.total === 0 && (data?.items.length ?? 0) > 0 && (
        <EmptyState title={t.list.noResults} description={t.list.noResultsBody} />
      )}

      <ul className="flex flex-col gap-2">
        {shown.items.map((notification) => (
          <li key={notification.id}>
            <NotificationRow
              notification={notification}
              locale={locale}
              onMarkRead={() => markRead.mutate(notification.id)}
            />
          </li>
        ))}
      </ul>

      {data && data.total > PAGE_SIZE && (
        <Pagination
          page={controls.page}
          totalPages={data.totalPages}
          onPageChange={controls.setPage}
        />
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  locale,
  onMarkRead,
}: {
  notification: AppNotification;
  locale: Locale;
  onMarkRead: () => void;
}) {
  const { t } = useLocale();

  const inner = (
    <Card
      className={cn(
        'transition',
        notification.readAt ? 'opacity-70' : 'border-app-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-app-text">{notification.title}</p>
          <p className="mt-0.5 text-body text-app-text-3">{notification.body}</p>
          <p className="mt-1 text-label text-app-text-4">
            {formatDate(notification.createdAt, locale)}
          </p>
        </div>
        {!notification.readAt && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMarkRead();
            }}
            className="shrink-0 rounded-full border border-app-primary/30 bg-app-primary-soft px-2.5 py-1 text-label font-medium text-app-primary hover:border-app-primary/60"
          >
            {t.market.markRead}
          </button>
        )}
      </div>
    </Card>
  );

  return notification.link ? (
    <Link to={notification.link} onClick={() => !notification.readAt && onMarkRead()}>
      {inner}
    </Link>
  ) : (
    inner
  );
}
