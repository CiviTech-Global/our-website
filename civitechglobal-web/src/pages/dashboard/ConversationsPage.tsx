import { Link } from 'react-router';
import { useConversations } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text-primary">{t.market.messagesNav}</h1>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.length === 0 && <EmptyState title={t.market.noConversations} />}

      <ul className="flex flex-col gap-3">
        {data?.map((thread) => (
          <li key={thread.threadId}>
            <ConversationRow thread={thread} locale={locale} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConversationRow({ thread, locale }: { thread: ConversationSummary; locale: 'fa' | 'en' }) {
  const { t } = useLocale();

  return (
    <Link to={`/dashboard/messages/${thread.kind === 'application' ? 'a' : 'b'}/${thread.threadId}`}>
      <Card
        className={
          thread.unreadCount > 0
            ? 'border-brand-green-500/50 transition hover:border-brand-green-500'
            : 'transition hover:border-brand-400'
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-text-primary">
                {thread.counterpartName ?? t.market.noProfileLabel}
              </span>
              {thread.counterpart?.verified && <VerifiedBadge />}
              <span className="text-xs text-text-muted">
                {thread.kind === 'application' ? t.market.awardKindJob : t.market.awardKindProject}:{' '}
                {thread.listingTitle}
              </span>
            </div>
            {thread.lastMessage && (
              <p className="mt-1 truncate text-sm text-text-secondary">
                {thread.lastMessage.mine ? `${t.market.youPrefix}: ` : ''}
                {thread.lastMessage.body}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {thread.lastMessage && (
              <span className="text-xs text-text-muted">
                {formatDate(thread.lastMessage.createdAt, locale)}
              </span>
            )}
            {thread.unreadCount > 0 && (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-brand-green-500 px-1.5 text-xs font-semibold text-white">
                {thread.unreadCount}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}