import { ShieldCheck, ShieldX } from 'lucide-react';
import { useSetIdentityStanding } from '@/api/identities';
import { apiMessage } from '@/lib/apiMessage';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import type { IdentityStanding } from '@/types/resume';

const STANDINGS: IdentityStanding[] = ['normal', 'trusted', 'blocked'];

/**
 * Reads and sets the standing of one client identity.
 *
 * Shown wherever an identity is — the project brief and the CV — because the
 * decision is about the person, not about the document you happen to be
 * looking at when you make it.
 *
 * The control is only rendered for SUPER_ADMIN, matching the endpoint. An
 * ADMIN still sees the current standing, since knowing a client is blocked
 * explains why their submissions stopped.
 */
export function IdentityStandingControl({
  identityId,
  standing,
  requestCount,
}: {
  identityId: string;
  standing: IdentityStanding;
  requestCount?: number;
}) {
  const { t } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();
  const setStanding = useSetIdentityStanding();

  const canChange = user?.role === 'SUPER_ADMIN';

  const variant = standing === 'blocked' ? 'danger' : standing === 'trusted' ? 'success' : 'default';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={variant}>
        {standing === 'blocked' && <ShieldX className="size-3.5" aria-hidden="true" />}
        {standing === 'trusted' && <ShieldCheck className="size-3.5" aria-hidden="true" />}
        {t.identity.standings[standing]}
      </Badge>

      {typeof requestCount === 'number' && (
        <span className="text-xs text-text-muted">
          {t.identity.requestCount.replace('{n}', String(requestCount))}
        </span>
      )}

      {canChange && (
        <Select
          value={standing}
          className="w-auto"
          aria-label={t.identity.changeStanding}
          disabled={setStanding.isPending}
          onChange={async (event) => {
            const next = event.target.value as IdentityStanding;
            try {
              await setStanding.mutateAsync({ id: identityId, standing: next });
              showToast(t.identity.standingUpdated, 'success');
            } catch (error) {
              showToast(apiMessage(error, t.common.error), 'error');
            }
          }}
        >
          {STANDINGS.map((value) => (
            <option key={value} value={value}>
              {t.identity.standings[value]}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
