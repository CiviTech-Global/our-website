import { useState } from 'react';
import { usePauseUser } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { apiMessage } from '@/lib/apiMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface UserPauseControlProps {
  userId: string;
  paused: boolean;
}

/**
 * The ops-desk circuit breaker for one account. Lives on the verification
 * queue because that is where a problematic account is seen; the same control
 * would fit any screen that names an account. Requires the marketplace-ops
 * grant; invisible otherwise.
 */
export function UserPauseControl({ userId, paused }: UserPauseControlProps) {
  const { t } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();
  const pause = usePauseUser();

  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  const canOps = user?.role === 'SUPER_ADMIN' || user?.permissions.includes('marketplace-ops');
  if (!canOps) return null;

  async function handleToggle() {
    try {
      await pause.mutateAsync({ userId, paused: !paused, reason: reason.trim() || undefined });
      setConfirming(false);
      setReason('');
      showToast(paused ? t.ops.unpausedToast : t.ops.pausedToast, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  if (paused) {
    return (
      <Button size="sm" variant="outline" isLoading={pause.isPending} onClick={handleToggle}>
        {t.ops.unpauseUser}
      </Button>
    );
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
        {t.ops.pauseUser}
      </Button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Input
        className="w-52"
        value={reason}
        placeholder={t.ops.pauseReasonLabel}
        aria-label={t.ops.pauseReasonLabel}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button size="sm" variant="outline" isLoading={pause.isPending} disabled={!reason.trim()} onClick={handleToggle}>
        {t.ops.pauseUser}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        {t.common.cancel}
      </Button>
    </span>
  );
}
