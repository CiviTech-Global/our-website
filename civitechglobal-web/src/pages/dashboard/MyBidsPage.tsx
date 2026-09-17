import { useState, type FormEvent } from 'react';
import { Lightbulb } from 'lucide-react';
import { useOwnBids, useReviseBid } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { formatMoney, moderationVariant, outcomeVariant } from '@/lib/marketplace';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type { OwnBid } from '@/types/marketplace';

/**
 * The bidder's side.
 *
 * When a reviewer thinks a price is unfair for the scope they say so and may
 * suggest a number. That suggestion is shown as advice with the reason it is
 * advice — the bid is never rewritten on the bidder's behalf, and saying so
 * plainly is what keeps the suggestion from reading as an instruction.
 */
export default function MyBidsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.market.myBids);

  const { data, isLoading } = useOwnBids();
  const [revising, setRevising] = useState<OwnBid | null>(null);

  const days = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-page font-semibold text-app-text">{t.market.myBids}</h1>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.length === 0 && <EmptyState title={t.common.noResults} />}

      <ul className="flex flex-col gap-3">
        {data?.map((bid) => (
          <li key={bid.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-app-text">{bid.project.title}</p>
                  <p className="mt-0.5 text-label text-app-text-4">
                    <span className="ltr font-mono">{bid.project.code}</span>
                    {' · '}
                    {formatDate(bid.createdAt, locale)}
                  </p>
                  <p className="mt-1 text-body text-app-text-3">
                    {formatMoney(bid.amount, locale)} {t.market.currency}
                    {bid.deliveryDays ? ` · ${days(bid.deliveryDays)} ${t.market.deliveryDays}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={moderationVariant(bid.moderationStatus)}>
                    {t.market[bid.moderationStatus]}
                  </Badge>
                  {bid.moderationStatus === 'APPROVED' && (
                    <Badge variant={outcomeVariant(bid.outcome)}>{t.market[bid.outcome]}</Badge>
                  )}
                </div>
              </div>

              {bid.reviewNote && (
                <div className="mt-3 rounded border border-app-border-light bg-app-fill p-3">
                  <p className="text-label font-medium text-app-text-3">{t.market.reviewNote}</p>
                  <p className="mt-1 text-body text-app-text">{bid.reviewNote}</p>
                </div>
              )}

              {bid.suggestedAmount && (
                <div className="mt-3 rounded border border-status-warning-border bg-status-warning-bg p-3">
                  <p className="flex items-center gap-1.5 text-label font-medium text-app-text-3">
                    <Lightbulb className="size-3.5" aria-hidden="true" />
                    {t.market.suggestedAmount}
                  </p>
                  <p className="mt-1 text-body font-medium text-app-text">
                    {formatMoney(bid.suggestedAmount, locale)} {t.market.currency}
                  </p>
                  <p className="mt-1 text-label text-app-text-4">{t.market.suggestedAmountHint}</p>
                </div>
              )}

              {bid.moderationStatus === 'CHANGES_REQUESTED' && (
                <div className="mt-3">
                  <Button size="sm" onClick={() => setRevising(bid)}>
                    {t.market.revise}
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {revising && <ReviseBidModal bid={revising} onClose={() => setRevising(null)} />}
    </div>
  );
}

function ReviseBidModal({ bid, onClose }: { bid: OwnBid; onClose: () => void }) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const revise = useReviseBid();

  const [amount, setAmount] = useState(bid.amount);
  const [deliveryDays, setDeliveryDays] = useState(bid.deliveryDays?.toString() ?? '');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await revise.mutateAsync({
        id: bid.id,
        payload: {
          amount: amount.replace(/[^0-9]/g, ''),
          deliveryDays: deliveryDays ? Number(deliveryDays) : undefined,
          message: message.trim(),
        },
      });
      showToast(t.market.revised, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={t.market.revise}>
      {bid.reviewNote && (
        <div className="mb-4 rounded border border-app-border-light bg-app-fill p-3">
          <p className="text-label font-medium text-app-text-3">{t.market.reviewNote}</p>
          <p className="mt-1 text-body text-app-text">{bid.reviewNote}</p>
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={`${t.market.amount} (${t.market.currency})`}
            htmlFor="reviseAmount"
            hint={
              bid.suggestedAmount
                ? `${t.market.suggestedAmount}: ${formatMoney(bid.suggestedAmount, locale)}`
                : undefined
            }
          >
            <Input
              id="reviseAmount"
              required
              inputMode="numeric"
              className="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormField>

          <FormField label={t.market.deliveryDays} htmlFor="reviseDeliveryDays">
            <Input
              id="reviseDeliveryDays"
              type="number"
              min={1}
              className="ltr"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label={t.market.bidMessage} htmlFor="reviseMessage">
          <TextArea
            id="reviseMessage"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </FormField>

        <div className="flex gap-2">
          <Button type="submit" isLoading={revise.isPending}>
            {t.market.revise}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
