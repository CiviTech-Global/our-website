import { useState } from 'react';
import { useAuditLog } from '@/api/marketplace';
import { useAuth } from '@/contexts/AuthProvider';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

const PAGE_SIZE = 20;

const ACTIONS = [
  'job.featured',
  'job.unfeatured',
  'job.deadline_extended',
  'project.featured',
  'project.unfeatured',
  'project.deadline_extended',
  'user.paused',
  'user.unpaused',
  'award.dispute_resolved',
];

/**
 * The cross-module "who did what, when". SUPER_ADMIN only — the entries name
 * accounts and editorial judgements, which is exactly what a permission
 * boundary exists for.
 */
export default function AuditLogPage() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const isSuper = user?.role === 'SUPER_ADMIN';
  useDocumentTitle(t.audit.title);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data, isLoading } = useAuditLog(
    { page, pageSize: PAGE_SIZE, action: action || undefined },
    isSuper,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page font-semibold text-app-text">{t.audit.title}</h1>
        <Select
          className="w-auto"
          value={action}
          aria-label={t.audit.actionFilter}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t.audit.allActions}</option>
          {ACTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && data?.items.length === 0 && <EmptyState title={t.audit.empty} />}

      <ul className="flex flex-col gap-2">
        {data?.items.map((entry) => (
          <li key={entry.id}>
            <Card className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-app-text">
                  <span className="ltr font-mono text-label text-brand-600">{entry.action}</span>
                </p>
                <p className="mt-0.5 text-body text-app-text-3">
                  {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : '—'} ·{' '}
                  <span className="ltr inline-block">{entry.targetType}</span> ·{' '}
                  <span className="ltr inline-block font-mono text-label">{entry.targetId.slice(0, 8)}…</span>
                </p>
              </div>
              <span className="text-label text-app-text-4">{formatDate(entry.createdAt, locale)}</span>
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
