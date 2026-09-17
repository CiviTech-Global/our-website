import { useState } from 'react';
import { CalendarClock, Star, StarOff } from 'lucide-react';
import { useExtendDeadline, useFeatureListing } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { apiMessage } from '@/lib/apiMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ListingOpsPanelProps {
  kind: 'job' | 'project';
  id: string;
  featured: boolean;
}

/**
 * The marketplace-operations controls for one listing: featuring and
 * deadline extension. Rendered inside the review queues so the person
 * judging a listing can act on it without a second screen. Every action is
 * audited server-side; the panel just asks.
 */
export function ListingOpsPanel({ kind, id, featured }: ListingOpsPanelProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();
  const feature = useFeatureListing();
  const extend = useExtendDeadline();

  const [extending, setExtending] = useState(false);
  const [closesAt, setClosesAt] = useState('');

  const canOps = user?.role === 'SUPER_ADMIN' || user?.permissions.includes('marketplace-ops');
  if (!canOps) return null;

  async function toggleFeature() {
    try {
      await feature.mutateAsync({ kind, id, featured: !featured });
      showToast(featured ? t.ops.unfeatured : t.ops.featured, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function handleExtend() {
    if (!closesAt) return;
    try {
      await extend.mutateAsync({ kind, id, closesAt });
      setExtending(false);
      setClosesAt('');
      showToast(t.ops.extended, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-dashed border-app-border p-2 text-label">
      <Button size="sm" variant="outline" isLoading={feature.isPending} onClick={toggleFeature}>
        {featured ? <StarOff className="size-3.5" aria-hidden /> : <Star className="size-3.5" aria-hidden />}
        {featured ? t.ops.unfeature : t.ops.feature}
      </Button>

      {extending ? (
        <span className="inline-flex items-center gap-1.5">
          <Input
            type="date"
            dir="ltr"
            className="w-36 ltr"
            value={closesAt}
            aria-label={t.ops.extendLabel}
            onChange={(e) => setClosesAt(e.target.value)}
          />
          <Button size="sm" isLoading={extend.isPending} disabled={!closesAt} onClick={handleExtend}>
            {t.ops.extendSubmit}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setExtending(false)}>
            {t.common.cancel}
          </Button>
        </span>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setExtending(true)}>
          <CalendarClock className="size-3.5" aria-hidden />
          {t.ops.extendLabel}
        </Button>
      )}
    </div>
  );
}
