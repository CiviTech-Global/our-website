import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Send } from 'lucide-react';
import { useSendMessage, useThread, type ThreadKind } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { cn } from '@/lib/utils';

/**
 * One thread. Polls on the same 15-second honesty as the hook; sending
 * invalidates immediately so the writer never waits on the poll. The thread
 * only exists because moderation approved the anchor, so the page can assume
 * both sides are verified and accountable.
 */
export default function ConversationThreadPage() {
  const { kind, threadId } = useParams<{ kind: string; threadId: string }>();
  const threadKind = (kind === 'a' || kind === 'b' ? kind : undefined) as ThreadKind | undefined;
  const { t } = useLocale();
  const { showToast } = useToast();

  const { data, isLoading, isError } = useThread(threadKind, threadId);
  const send = useSendMessage(threadKind);

  const [body, setBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useDocumentTitle(data?.anchor.listingTitle ?? t.market.messagesNav);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [data?.messages.length]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || !threadId) return;

    try {
      await send.mutateAsync({ threadId, body: body.trim() });
      setBody('');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-4 py-16 text-center">
        <p className="text-app-text-3">{t.market.threadUnavailable}</p>
        <Link to="/dashboard/messages" className="text-brand-600 hover:underline">
          {t.market.backToMessages}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/dashboard/messages"
          className="inline-flex items-center gap-1.5 text-body text-app-text-3 hover:text-app-text"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t.market.backToMessages}
        </Link>
        <Link to={data.anchor.path} className="text-body text-brand-600 hover:underline">
          {data.anchor.listingTitle}
        </Link>
      </div>

      <Card className="flex flex-col gap-3">
        {data.messages.length === 0 && (
          <p className="py-8 text-center text-body text-app-text-4">{t.market.emptyThread}</p>
        )}
        {data.messages.map((message) => (
          <div
            key={message.id}
            className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[80%] whitespace-pre-line rounded px-4 py-2 text-body sm:max-w-[65%]',
                message.mine
                  ? 'rounded-br-sm bg-app-primary text-white'
                  : 'rounded-bl-sm bg-app-fill text-app-text',
              )}
            >
              {message.body}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </Card>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <TextArea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.market.messagePlaceholder}
          aria-label={t.market.messagePlaceholder}
          className="flex-1"
        />
        <Button type="submit" disabled={!body.trim()} isLoading={send.isPending}>
          <Send className="size-4 rtl:rotate-180" aria-hidden />
          {t.market.sendMessage}
        </Button>
      </form>
    </div>
  );
}
