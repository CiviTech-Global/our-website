import { useState } from 'react';
import type { Locale } from '@/i18n/locales';
import { Link } from 'react-router';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
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

  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page font-semibold text-app-text">{t.market.notificationsNav}</h1>
        {data && data.unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            isLoading={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            {t.market.markAllRead}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && <EmptyState title={t.market.noNotifications} />}

      <ul className="flex flex-col gap-2">
        {data?.items.map((notification) => (
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
          page={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
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
