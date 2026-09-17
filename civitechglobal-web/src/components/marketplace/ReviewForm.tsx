import { useState, type FormEvent } from 'react';
import { Star } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useReviewAward } from '@/api/marketplace';
import { apiMessage } from '@/lib/apiMessage';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { TextArea } from '@/components/ui/TextArea';
import { cn } from '@/lib/utils';

interface ReviewFormProps {
  awardId: string;
}

/**
 * The one-direction-per-award rating. Stars are the input; the text is the
 * evidence. Submits once — the server enforces the rule again, but the form
 * hides itself after a successful write so nobody tries.
 */
export function ReviewForm({ awardId }: ReviewFormProps) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const reviewAward = useReviewAward();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (rating === 0) return;

    try {
      await reviewAward.mutateAsync({ awardId, rating, text: text.trim() || undefined });
      setDone(true);
      showToast(t.market.reviewSubmitted, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  if (done) {
    return <p className="text-body text-app-primary">{t.market.reviewSubmitted}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FormField label={t.market.ratingLabel} htmlFor="rating">
        <div id="rating" className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, index) => {
            const value = index + 1;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`${value}`}
                aria-pressed={rating === value}
                className="rounded p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <Star
                  className={cn(
                    'size-6',
                    value <= rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-transparent text-app-border',
                  )}
                />
              </button>
            );
          })}
        </div>
      </FormField>

      <FormField label={t.market.reviewTextLabel} htmlFor="reviewText">
        <TextArea id="reviewText" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </FormField>

      <Button type="submit" disabled={rating === 0} isLoading={reviewAward.isPending} className="w-fit">
        {t.market.reviewAward}
      </Button>
    </form>
  );
}
