import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Globe, Send } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { useRequests } from '@/api/requests';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Card } from '@/components/ui/Card';
import { LEAD_STATUSES, leadStatusBadgeVariant, leadStatusLabel } from '@/lib/leadStatus';
import { describeRequestSubject } from '@/lib/requestSubject';
import type { InsuranceRequest, LeadStatus, RequestSource } from '@/types/requests';

const PAGE_SIZE = 10;

export default function RequestsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.admin.requests);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LeadStatus | 'ALL'>('ALL');
  const [source, setSource] = useState<RequestSource | 'ALL'>('ALL');

  const { data, isLoading, isError } = useRequests({ page, limit: PAGE_SIZE, status, source });

  const columns: TableColumn<InsuranceRequest>[] = [
    {
      key: 'source',
      header: t.admin.source,
      render: (row) => (
        <span
          className="inline-flex items-center gap-1.5 text-text-secondary"
          title={row.source === 'WEB' ? t.admin.sourceWeb : t.admin.sourceTelegram}
        >
          {row.source === 'WEB' ? (
            <Globe className="size-4" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          <span className="sr-only">
            {row.source === 'WEB' ? t.admin.sourceWeb : t.admin.sourceTelegram}
          </span>
        </span>
      ),
    },
    { key: 'fullName', header: t.admin.fullName, render: (row) => row.fullName },
    {
      key: 'phone',
      header: t.admin.phone,
      render: (row) => (
        <span className="ltr inline-flex items-center gap-1.5">
          {row.phoneNumber}
          {/* Whether the number was proved reachable decides how much faith to
              put in it before spending a call on it. */}
          {row.phoneVerified && (
            <span className="text-brand-green-500" title={t.admin.phoneVerified} aria-label={t.admin.phoneVerified}>
              ✓
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'product',
      header: t.admin.product,
      render: (row) => describeRequestSubject(row, locale),
    },
    { key: 'city', header: t.admin.city, render: (row) => row.city },
    {
      key: 'status',
      header: t.admin.status,
      render: (row) => (
        <Badge variant={leadStatusBadgeVariant(row.status)}>{leadStatusLabel(t, row.status)}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: t.admin.createdAt,
      render: (row) => formatDate(row.createdAt, locale),
    },
  ];

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">{t.admin.requests}</h1>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="w-full sm:w-44">
            <Select
              aria-label={t.admin.filterBySource}
              value={source}
              onChange={(e) => {
                setSource(e.target.value as RequestSource | 'ALL');
                setPage(1);
              }}
            >
              <option value="ALL">{t.admin.allSources}</option>
              <option value="WEB">{t.admin.sourceWeb}</option>
              <option value="TELEGRAM">{t.admin.sourceTelegram}</option>
            </Select>
          </div>

          <div className="w-full sm:w-52">
            <Select
              aria-label={t.admin.filterByStatus}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as LeadStatus | 'ALL');
                setPage(1);
              }}
            >
              <option value="ALL">{t.common.all}</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {leadStatusLabel(t, s)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {isError ? (
        <Card className="border-brand-red-500/30 text-sm text-text-secondary">{t.errors.networkError}</Card>
      ) : (
        <>
          <Table
            columns={columns}
            data={data?.data ?? []}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            emptyMessage={t.common.noResults}
            onRowClick={(row) => navigate(`/admin/requests/${row.id}`)}
          />
          {total > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                {locale === 'fa' ? toPersianDigits(total) : total} {t.admin.requests}
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
