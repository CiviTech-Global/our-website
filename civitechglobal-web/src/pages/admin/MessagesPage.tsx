import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Mail, MailOpen } from 'lucide-react';
import { api } from '@/config/api';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  readAt: string | null;
  handledAt: string | null;
  createdAt: string;
}

interface Inbox {
  items: ContactMessage[];
  page: number;
  pageSize: number;
  total: number;
  unread: number;
}

const PAGE_SIZE = 20;

/**
 * The contact-form inbox.
 *
 * Messages used to go nowhere — the form opened a `mailto:` link — so this is
 * the other half of making that form real: somewhere for a message to be read,
 * and a record that it was.
 */
export default function MessagesPage() {
  const { t, locale } = useLocale();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['contact', 'inbox', page, unreadOnly],
    queryFn: async () => {
      const res = await api.get<Inbox>('/contact', {
        params: { page, pageSize: PAGE_SIZE, unread: unreadOnly ? 'true' : undefined },
      });
      return res.data;
    },
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; read?: boolean; handled?: boolean }) => {
      const { id, ...body } = input;
      await api.patch(`/contact/${id}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact', 'inbox'] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t.contact.inboxTitle}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {t.contact.inboxSubtitle}
            {data && data.unread > 0 && ` · ${data.unread} ${t.contact.inboxUnread}`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              setPage(1);
            }}
            className="size-4 accent-[var(--color-brand-green-500)]"
          />
          {t.contact.inboxUnreadOnly}
        </label>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <EmptyState title={t.contact.inboxEmpty} />
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((message) => (
          <li key={message.id}>
            <Card className={message.readAt ? undefined : 'border-brand-green-500/40'}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">
                    {message.name}{' '}
                    <span className="ltr text-sm font-normal text-text-muted">{message.email}</span>
                  </p>
                  {message.subject && (
                    <p className="mt-0.5 text-sm text-text-secondary">{message.subject}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!message.readAt && <Badge variant="info">{t.contact.inboxUnread}</Badge>}
                  {message.handledAt && <Badge variant="success">{t.contact.inboxHandled}</Badge>}
                  <span className="text-xs text-text-muted">
                    {formatDate(message.createdAt, locale)}
                  </span>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                {message.message}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => update.mutate({ id: message.id, read: !message.readAt })}
                >
                  {message.readAt ? (
                    <Mail className="size-4" />
                  ) : (
                    <MailOpen className="size-4" />
                  )}
                  {message.readAt ? t.contact.inboxMarkUnread : t.contact.inboxMarkRead}
                </Button>
                {!message.handledAt && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => update.mutate({ id: message.id, handled: true, read: true })}
                  >
                    <CheckCheck className="size-4" />
                    {t.contact.inboxMarkHandled}
                  </Button>
                )}
                {/* Replying happens in a mail client: there is no outbound mail
                    service configured, and pretending otherwise would lose
                    replies the same way the form used to lose messages. */}
                <a href={`mailto:${message.email}`} className="ms-auto">
                  <Button type="button" variant="secondary">
                    {t.contact.infoEmail}
                  </Button>
                </a>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {data && data.total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={Math.ceil(data.total / PAGE_SIZE)}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
