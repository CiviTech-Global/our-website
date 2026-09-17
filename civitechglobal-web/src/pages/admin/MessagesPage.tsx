import { PageHeader } from '@/components/app/PageHeader';
import { SegmentedControl, Toolbar } from '@/components/app/SegmentedControl';
import { useState } from 'react';
import type { Paged } from '@/types/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Mail, MailOpen, RotateCcw, Send } from 'lucide-react';
import { api } from '@/config/api';
import { apiMessage } from '@/lib/apiMessage';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useToast } from '@/contexts/ToastContext';
import { formatDate } from '@/i18n/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';

type TicketStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

interface Reply {
  id: string;
  body: string;
  createdAt: string;
  author: { firstName: string; lastName: string } | null;
}

interface ContactMessage {
  id: string;
  trackingCode: string;
  status: TicketStatus;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  readAt: string | null;
  createdAt: string;
  replies: Reply[];
}

/** A page of tickets, plus the two counts the tabs above the list show. */
type Inbox = Paged<ContactMessage> & { unread: number; open: number };

const PAGE_SIZE = 20;
const STATUSES: TicketStatus[] = ['OPEN', 'ANSWERED', 'CLOSED'];

const STATUS_VARIANT: Record<TicketStatus, 'info' | 'success' | 'default'> = {
  OPEN: 'info',
  ANSWERED: 'success',
  CLOSED: 'default',
};

/**
 * The contact inbox, which is now a ticket queue.
 *
 * Replying used to mean opening a mail client, because nothing here could
 * send. It still cannot send — but it no longer needs to: the reply is written
 * here and the sender reads it by quoting their tracking code. That makes this
 * page the only place an answer exists, which is why the reply box is part of
 * every ticket rather than hidden behind a detail view.
 */
export default function MessagesPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.contact.inboxTitle);
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TicketStatus | 'ALL'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['contact', 'inbox', page, status],
    queryFn: async () => {
      const res = await api.get<Inbox>('/contact', {
        params: {
          page,
          pageSize: PAGE_SIZE,
          status: status === 'ALL' ? undefined : status,
        },
      });
      return res.data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contact', 'inbox'] });

  const update = useMutation({
    mutationFn: async (input: { id: string; read?: boolean; status?: TicketStatus }) => {
      const { id, ...body } = input;
      await api.patch(`/contact/${id}`, body);
    },
    onSuccess: invalidate,
    onError: (error) => showToast(apiMessage(error, t.common.error), 'error'),
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.contact.inboxTitle} description={t.contact.inboxSubtitle} className="mb-2" />
      <Toolbar>
        <SegmentedControl<TicketStatus | 'ALL'>
          label={t.app.filterByStatus}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          segments={[
            { value: 'ALL', label: t.contact.filterAll },
            // The open count rides on its own filter, where the reader looks
            // for it, rather than trailing the page description.
            ...STATUSES.map((s) => ({
              value: s,
              label: t.contact.statuses[s],
              count: s === 'OPEN' && data && data.open > 0 ? data.open : undefined,
            })),
          ]}
        />
      </Toolbar>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && <EmptyState title={t.contact.inboxEmpty} />}

      <ul className="flex flex-col gap-3">
        {data?.items.map((message) => (
          <li key={message.id}>
            <Card className={message.readAt ? undefined : 'border-app-primary/40'}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-app-text">
                    {message.name}{' '}
                    <span className="ltr text-body font-normal text-app-text-4">{message.email}</span>
                  </p>
                  {message.subject && (
                    <p className="mt-0.5 text-body text-app-text-3">{message.subject}</p>
                  )}
                  <p className="mt-0.5 text-label text-app-text-4">
                    {t.contact.trackingCode}: <span className="ltr font-mono">{message.trackingCode}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {!message.readAt && <Badge variant="info">{t.contact.inboxUnread}</Badge>}
                  <Badge variant={STATUS_VARIANT[message.status]}>
                    {t.contact.statuses[message.status]}
                  </Badge>
                  <span className="text-label text-app-text-4">
                    {formatDate(message.createdAt, locale)}
                  </span>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-body leading-6 text-app-text-3">
                {message.message}
              </p>

              {message.replies.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {message.replies.map((r) => (
                    <li
                      key={r.id}
                      className="rounded border border-app-primary/40 bg-app-primary-soft p-3"
                    >
                      <p className="whitespace-pre-wrap text-body text-app-text">{r.body}</p>
                      <p className="mt-2 text-label text-app-text-4">
                        {r.author ? `${r.author.firstName} ${r.author.lastName}` : t.contact.staffReply}
                        {' · '}
                        {formatDate(r.createdAt, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <ReplyBox messageId={message.id} onReplied={invalidate} />

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => update.mutate({ id: message.id, read: !message.readAt })}
                >
                  {message.readAt ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                  {message.readAt ? t.contact.inboxMarkUnread : t.contact.inboxMarkRead}
                </Button>

                {message.status === 'CLOSED' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => update.mutate({ id: message.id, status: 'ANSWERED' })}
                  >
                    <RotateCcw className="size-4" />
                    {t.contact.reopen}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => update.mutate({ id: message.id, status: 'CLOSED', read: true })}
                  >
                    <CheckCheck className="size-4" />
                    {t.contact.close}
                  </Button>
                )}
              </div>
            </Card>
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

/** Writing the answer. Posting it is what makes the ticket ANSWERED. */
function ReplyBox({ messageId, onReplied }: { messageId: string; onReplied: () => void }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [body, setBody] = useState('');

  const send = useMutation({
    mutationFn: async () => {
      await api.post(`/contact/${messageId}/reply`, { body: body.trim() });
    },
    onSuccess: () => {
      setBody('');
      showToast(t.contact.replySent, 'success');
      onReplied();
    },
    onError: (error) => showToast(apiMessage(error, t.common.error), 'error'),
  });

  return (
    <div className="mt-4 border-t border-app-border-light pt-3">
      <TextArea
        rows={3}
        value={body}
        placeholder={t.contact.replyPlaceholder}
        aria-label={t.contact.reply}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button
        type="button"
        size="sm"
        className="mt-2"
        // An empty reply would still flip the ticket to ANSWERED, telling the
        // sender to come and read nothing.
        disabled={body.trim().length === 0}
        isLoading={send.isPending}
        onClick={() => send.mutate()}
      >
        <Send className="size-4" aria-hidden="true" />
        {t.contact.sendReply}
      </Button>
    </div>
  );
}
