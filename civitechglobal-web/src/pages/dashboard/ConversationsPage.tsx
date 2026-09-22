import { PageHeader } from '@/components/app/PageHeader';
import { Link } from 'react-router';
import type { Locale } from '@/i18n/locales';
import { useConversations } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useClientList } from '@/lib/clientList';
import { useListControls } from '@/lib/useListControls';
import { formatDate } from '@/i18n/utils';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Spinner } from '@/components/ui/Spinner';
import { VerifiedBadge } from '@/components/marketplace/VerifiedBadge';
import type { ConversationSummary } from '@/types/marketplace';

/**
 * The message inbox: one row per thread that has something in it, ordered by
 * the last thing said. Threads open only after moderation approves the
 * application or bid underneath them, so nothing here is cold contact.
 */
export default function ConversationsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.messagesNav);

  const { data, isLoading } = useConversations();

  const controls = useListControls({ pageSize: Number.MAX_SAFE_INTEGER });
  const shown = useClientList(data, controls, {
    searchFields: (thread) => [thread.listingTitle, thread.listingCode, thread.counterpartName],
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.market.messagesNav} description={t.app.memberDescriptions.messages} className="mb-2" />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {(data?.length ?? 0) > 0 && (
        <ListToolbar
          controls={controls}
          searchPlaceholder={t.market.searchConversations}
          total={shown.total}
          isLoading={isLoading}
        />
      )}

      {!isLoading && data?.length === 0 && <EmptyState title={t.market.noConversations} />}

      {!isLoading && shown.total === 0 && (data?.length ?? 0) > 0 && (
        <EmptyState title={t.list.noResults} description={t.list.noResultsBody} />
      )}

      <ul className="flex flex-col gap-3">
        {shown.items.map((thread) => (
          <li key={thread.threadId}>
            <ConversationRow thread={thread} locale={locale} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConversationRow({ thread, locale }: { thread: ConversationSummary; locale: Locale }) {
  const { t } = useLocale();

  return (
    <Link to={`/dashboard/messages/${thread.kind === 'application' ? 'a' : 'b'}/${thread.threadId}`}>
      <Card
        className={
          thread.unreadCount > 0
            ? 'border-app-primary/40 transition hover:border-app-primary'
            : 'transition hover:border-brand-400'
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-app-text">
                {thread.counterpartName ?? t.market.noProfileLabel}
              </span>
              {thread.counterpart?.verified && <VerifiedBadge />}
              <span className="text-label text-app-text-4">
                {thread.kind === 'application' ? t.market.awardKindJob : t.market.awardKindProject}:{' '}
                {thread.listingTitle}
              </span>
            </div>
            {thread.lastMessage && (
              <p className="mt-1 truncate text-body text-app-text-3">
                {thread.lastMessage.mine ? `${t.market.youPrefix}: ` : ''}
                {thread.lastMessage.body}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {thread.lastMessage && (
              <span className="text-label text-app-text-4">
                {formatDate(thread.lastMessage.createdAt, locale)}
              </span>
            )}
            {thread.unreadCount > 0 && (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-app-primary px-1.5 text-label font-semibold text-white">
                {thread.unreadCount}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}