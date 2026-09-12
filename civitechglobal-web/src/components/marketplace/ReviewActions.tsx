import { useState, type ReactNode } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { apiMessage } from '@/lib/apiMessage';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { TextArea } from '@/components/ui/TextArea';
import type { ReviewDecision } from '@/types/marketplace';

export interface ReviewActionsProps {
  onReview: (input: {
    decision: ReviewDecision;
    reviewNote?: string;
    internalNote?: string;
  }) => Promise<unknown>;
  isPending?: boolean;
  /** Extra fields a particular queue needs — the bid queue's suggested price. */
  children?: ReactNode;
}

/**
 * The decision control, shared by all five queues.
 *
 * One place decides that refusing or asking for changes requires a note, which
 * is the rule the server enforces anyway — doing it here as well means the
 * reviewer is told before they lose the click, rather than after. Approving
 * needs no note, so demanding one there would only teach people to type "ok".
 *
 * The two notes are deliberately far apart on the page and labelled for who
 * reads them. They are easy to confuse and expensive to confuse: one is
 * addressed to the person, the other is about them.
 */
export function ReviewActions({ onReview, isPending, children }: ReviewActionsProps) {
  const { t } = useLocale();
  const { showToast } = useToast();

  const [reviewNote, setReviewNote] = useState('');
  const [internalNote, setInternalNote] = useState('');

  async function decide(decision: ReviewDecision) {
    if (decision !== 'APPROVED' && !reviewNote.trim()) {
      showToast(t.market.reviewNoteRequired, 'error');
      return;
    }

    try {
      await onReview({
        decision,
        reviewNote: reviewNote.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
      });
      showToast(t.market.reviewed, 'success');
      setReviewNote('');
      setInternalNote('');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border-default pt-4">
      {children}

      <FormField label={t.market.reviewNoteLabel}>
        <TextArea
          rows={2}
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          placeholder={t.market.reviewNoteRequired}
        />
      </FormField>

      <FormField label={t.market.internalNote} hint={t.market.internalNoteHint}>
        <TextArea rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
      </FormField>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" isLoading={isPending} onClick={() => void decide('APPROVED')}>
          {t.market.approve}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void decide('CHANGES_REQUESTED')}>
          {t.market.requestChanges}
        </Button>
        <Button size="sm" variant="danger" onClick={() => void decide('REJECTED')}>
          {t.market.reject}
        </Button>
      </div>
    </div>
  );
}
