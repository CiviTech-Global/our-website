import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Copy, Mail, MessageSquare, Search, Send } from 'lucide-react';
import { api } from '@/config/api';
import { apiMessage } from '@/lib/apiMessage';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { resolveI18nKey, formatDate } from '@/i18n/utils';
import { normalizePersianDigits } from '@/lib/persian';
import { useToast } from '@/contexts/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

const contactSchema = z.object({
  name: z.string().min(1, 'auth.required'),
  email: z.string().min(1, 'auth.required').email('auth.invalidEmail'),
  subject: z.string().optional(),
  message: z.string().min(1, 'auth.required'),
});
type ContactFormValues = z.infer<typeof contactSchema>;

type TicketStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

interface Ticket {
  trackingCode: string;
  status: TicketStatus;
  name: string;
  subject: string | null;
  message: string;
  createdAt: string;
  replies: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: { firstName: string; lastName: string } | null;
  }>;
}

const STATUS_VARIANT: Record<TicketStatus, 'default' | 'success' | 'info'> = {
  OPEN: 'info',
  ANSWERED: 'success',
  CLOSED: 'default',
};

/**
 * Contact, as a ticket.
 *
 * There is no outbound email in this deployment, so nobody can be told their
 * message was answered — they have to come back and look. Everything on this
 * page follows from that: the tracking code is presented as something to keep
 * rather than a receipt to glance at, and the lookup sits beside the form
 * rather than on a page somebody has to find.
 */
export default function ContactPage() {
  const { t } = useLocale();
  useDocumentTitle(t.nav.contact, { description: t.seo.contact });
  const { showToast } = useToast();

  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema) });

  async function onSubmit(values: ContactFormValues) {
    try {
      const res = await api.post<{ trackingCode: string }>('/contact', values);
      setIssuedCode(res.data.trackingCode);
      showToast(t.contact.formSuccess, 'success');
      reset();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">{t.contact.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">{t.contact.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <AnimatedSection className="lg:col-span-3">
          {issuedCode ? (
            <IssuedCodeCard code={issuedCode} onAnother={() => setIssuedCode(null)} />
          ) : (
            <Card>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <FormField
                  label={t.contact.formName}
                  htmlFor="name"
                  error={resolveI18nKey(t, errors.name?.message)}
                >
                  <Input id="name" {...register('name')} invalid={!!errors.name} />
                </FormField>

                <FormField
                  label={t.contact.formEmail}
                  htmlFor="email"
                  error={resolveI18nKey(t, errors.email?.message)}
                  hint={t.contact.formEmailHint}
                >
                  <Input id="email" type="email" className="ltr" {...register('email')} invalid={!!errors.email} />
                </FormField>

                <FormField label={t.contact.formSubject} htmlFor="subject">
                  <Input id="subject" {...register('subject')} />
                </FormField>

                <FormField
                  label={t.contact.formMessage}
                  htmlFor="message"
                  error={resolveI18nKey(t, errors.message?.message)}
                >
                  <TextArea id="message" rows={6} {...register('message')} invalid={!!errors.message} />
                </FormField>

                <p className="text-xs text-text-muted">{t.contact.formNote}</p>

                <Button type="submit" isLoading={isSubmitting} className="w-fit">
                  <Send className="size-4" aria-hidden="true" />
                  {t.contact.formSubmit}
                </Button>
              </form>
            </Card>
          )}
        </AnimatedSection>

        <AnimatedSection delay={0.08} className="lg:col-span-2">
          <div className="flex h-full flex-col gap-6">
            <TrackTicket />

            {/* No address is published, because none would be read. The form
                and the tracking code are the whole channel, and saying so is
                more honest than an inbox nobody empties. */}
            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text-primary">
                <Mail className="size-5 text-brand-green-500" aria-hidden="true" />
                {t.contact.infoTitle}
              </h2>
              <p className="text-sm text-text-secondary">{t.contact.infoBody}</p>
            </Card>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}

/**
 * The code, shown once.
 *
 * Given its own card rather than a toast on purpose: a toast disappears, and
 * with no email there is no second chance to learn this number. Copying it is
 * one click because retyping ten characters from a screen is where people make
 * the mistake that loses them their own message.
 */
function IssuedCodeCard({ code, onAnother }: { code: string; onAnother: () => void }) {
  const { t } = useLocale();
  const { showToast } = useToast();

  return (
    <Card className="border-brand-green-500/40">
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <CheckCircle2 className="size-10 text-brand-green-500" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-text-primary">{t.contact.issuedTitle}</h2>
        <p className="max-w-sm text-sm text-text-secondary">{t.contact.issuedBody}</p>

        <div className="flex items-center gap-2 rounded-xl border border-border-strong bg-surface-200 px-5 py-3">
          {/* Shown verbatim, never with Persian digits. This is an identifier
              the visitor has to type back, not a quantity to read — rendering
              it as ۲۳۴ would have them typing characters the lookup does not
              accept, and losing their own message to a cosmetic choice. */}
          <code className="ltr font-mono text-2xl font-bold tracking-widest text-text-primary">
            {code}
          </code>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t.contact.copyCode}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                showToast(t.contact.codeCopied, 'success');
              } catch {
                // A browser that refuses clipboard access is not a failure
                // worth an error toast — the code is on screen to be read.
              }
            }}
          >
            <Copy className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <p className="text-xs text-text-muted">{t.contact.issuedWarning}</p>

        <Button variant="outline" size="sm" onClick={onAnother}>
          {t.contact.sendAnother}
        </Button>
      </div>
    </Card>
  );
}

/** Looking up your own ticket. No account, no session — the code is the key. */
function TrackTicket() {
  const { t, locale } = useLocale();
  const [code, setCode] = useState('');
  const [state, setState] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string } | { status: 'found'; ticket: Ticket }
  >({ status: 'idle' });

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;

    setState({ status: 'loading' });
    try {
      // Persian digits normalised on the way in: a Persian keyboard produces
      // ۲۳۴ for the numeric half of the code, and refusing those would reject
      // a correctly-copied code for looking different.
      const normalised = normalizePersianDigits(code).trim().toUpperCase();
      const res = await api.get<Ticket>(`/contact/track/${normalised}`);
      setState({ status: 'found', ticket: res.data });
    } catch (error) {
      setState({ status: 'error', message: apiMessage(error, t.contact.trackNotFound) });
    }
  }

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-text-primary">
        <MessageSquare className="size-5 text-brand-green-500" aria-hidden="true" />
        {t.contact.trackTitle}
      </h2>
      <p className="mb-3 text-sm text-text-secondary">{t.contact.trackBody}</p>

      <form className="flex gap-2" onSubmit={lookup}>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t.contact.trackPlaceholder}
          aria-label={t.contact.trackTitle}
          className="ltr text-start font-mono uppercase"
          maxLength={10}
        />
        <Button type="submit" size="md" isLoading={state.status === 'loading'}>
          <Search className="size-4" aria-hidden="true" />
        </Button>
      </form>

      {state.status === 'error' && (
        <p className="mt-3 text-sm text-brand-red-600">{state.message}</p>
      )}

      {state.status === 'loading' && (
        <div className="flex justify-center py-6">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {state.status === 'found' && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border-default pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-text-primary">
              {state.ticket.subject || t.contact.noSubject}
            </span>
            <Badge variant={STATUS_VARIANT[state.ticket.status]}>
              {t.contact.statuses[state.ticket.status]}
            </Badge>
          </div>

          <p className="whitespace-pre-line rounded-lg bg-surface-200 p-3 text-sm text-text-secondary">
            {state.ticket.message}
          </p>
          <p className="text-xs text-text-muted">
            {formatDate(state.ticket.createdAt, locale)}
          </p>

          {state.ticket.replies.length === 0 ? (
            <p className="text-sm text-text-muted">{t.contact.noReplyYet}</p>
          ) : (
            state.ticket.replies.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-brand-green-500/40 bg-brand-green-50/40 p-3 dark:bg-brand-green-900/10"
              >
                <p className="whitespace-pre-line text-sm text-text-primary">{r.body}</p>
                <p className="mt-2 text-xs text-text-muted">
                  {r.author ? `${r.author.firstName} ${r.author.lastName}` : t.contact.staffReply}
                  {' · '}
                  {formatDate(r.createdAt, locale)}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}
