import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate, toPersianDigits } from '@/i18n/utils';
import { useLeads } from '@/api/leads';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Card } from '@/components/ui/Card';
import { LEAD_STATUSES, leadStatusBadgeVariant, leadStatusLabel } from '@/lib/leadStatus';
import type { Lead, LeadStatus } from '@/types/leads';

const PAGE_SIZE = 10;

export default function LeadsPage() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LeadStatus | 'ALL'>('ALL');

  const { data, isLoading, isError } = useLeads({ page, limit: PAGE_SIZE, status });

  const columns: TableColumn<Lead>[] = [
    { key: 'fullName', header: t.admin.fullName, render: (row) => row.fullName },
    { key: 'phone', header: t.admin.phone, render: (row) => <span className="ltr">{row.phoneNumber}</span> },
    {
      key: 'category',
      header: t.admin.category,
      render: (row) => (
        <span>
          {row.category.emoji} {row.category.title}
        </span>
      ),
    },
    { key: 'subcategory', header: t.admin.subcategory, render: (row) => row.subcategory.title },
    { key: 'city', header: t.admin.city, render: (row) => row.city },
    {
      key: 'status',
      header: t.admin.status,
      render: (row) => <Badge variant={leadStatusBadgeVariant(row.status)}>{leadStatusLabel(t, row.status)}</Badge>,
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
        <h1 className="text-2xl font-semibold text-text-primary">{t.admin.leads}</h1>
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
            onRowClick={(row) => navigate(`/admin/leads/${row.id}`)}
          />
          {total > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                {locale === 'fa' ? toPersianDigits(total) : total} {t.admin.leads}
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
