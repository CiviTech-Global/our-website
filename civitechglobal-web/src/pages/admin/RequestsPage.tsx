import { PageHeader } from '@/components/app/PageHeader';
import { useNavigate } from 'react-router';
import { Globe, Send } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { formatDate } from '@/i18n/utils';
import { useRequests } from '@/api/requests';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { LEAD_STATUSES, leadStatusBadgeVariant, leadStatusLabel } from '@/lib/leadStatus';
import { describeRequestSubject } from '@/lib/requestSubject';
import type { InsuranceRequest, LeadStatus, RequestSource } from '@/types/requests';

const PAGE_SIZE = 10;

export default function RequestsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.admin.requests);
  const navigate = useNavigate();
  // A table by default: these rows are read as columns — who, on what, when —
  // and the card view is for a narrow screen, where seven columns become a
  // horizontal scroll nobody can follow.
  const controls = useListControls({
    defaultView: 'table',
    pageSize: PAGE_SIZE,
    filters: { status: 'ALL', source: 'ALL' },
  });

  const { data, isLoading, isError } = useRequests({
    page: controls.page,
    limit: PAGE_SIZE,
    status: controls.filters.status as LeadStatus | 'ALL',
    source: controls.filters.source as RequestSource | 'ALL',
    search: controls.search || undefined,
  });

  const columns: TableColumn<InsuranceRequest>[] = [
    {
      key: 'source',
      header: t.admin.source,
      render: (row) => (
        <span
          className="inline-flex items-center gap-1.5 text-app-text-3"
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
            <span className="text-app-primary" title={t.admin.phoneVerified} aria-label={t.admin.phoneVerified}>
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

  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      <PageHeader
        title={t.admin.requests}
        description={t.app.intakeDescriptions.insurance}
        className="mb-4"
      />

      <ListToolbar
        className="mb-4"
        controls={controls}
        searchPlaceholder={t.admin.searchRequests}
        total={data?.total}
        isLoading={isLoading}
        views={['cards', 'table']}
        filters={
          <>
            <Select
              className="w-44"
              aria-label={t.admin.filterBySource}
              value={controls.filters.source}
              onChange={(e) => controls.setFilter('source', e.target.value)}
            >
              <option value="ALL">{t.admin.allSources}</option>
              <option value="WEB">{t.admin.sourceWeb}</option>
              <option value="TELEGRAM">{t.admin.sourceTelegram}</option>
            </Select>
            <Select
              className="w-52"
              aria-label={t.admin.filterByStatus}
              value={controls.filters.status}
              onChange={(e) => controls.setFilter('status', e.target.value)}
            >
              <option value="ALL">{t.common.all}</option>
              {LEAD_STATUSES.map((leadStatus) => (
                <option key={leadStatus} value={leadStatus}>
                  {leadStatusLabel(t, leadStatus)}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {isError ? (
        <Card className="border-status-error-border text-body text-app-text-3">{t.errors.networkError}</Card>
      ) : (
        <>
          {controls.view === 'table' ? (
            <Table
              columns={columns}
              data={data?.items ?? []}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              emptyMessage={controls.activeCount > 0 ? t.list.noResults : t.common.noResults}
              onRowClick={(row) => navigate(`/admin/requests/${row.id}`)}
              rowLabel={(row) => `${t.common.view} — ${row.fullName}`}
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data?.items.map((row) => (
                <li key={row.id}>
                  <RequestCard row={row} onOpen={() => navigate(`/admin/requests/${row.id}`)} />
                </li>
              ))}
            </ul>
          )}

          {!isLoading && controls.view === 'cards' && data?.items.length === 0 && (
            <EmptyState
              title={controls.activeCount > 0 ? t.list.noResults : t.common.noResults}
              description={controls.activeCount > 0 ? t.list.noResultsBody : undefined}
            />
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                page={controls.page}
                totalPages={totalPages}
                onPageChange={controls.setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * One request as a card.
 *
 * A button rather than a div with a click handler: opening a request is an
 * action, and a keyboard has to reach it the same way the table's rows can.
 */
function RequestCard({ row, onOpen }: { row: InsuranceRequest; onOpen: () => void }) {
  const { t, locale } = useLocale();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded border border-app-border bg-app-panel p-3 text-start transition hover:bg-app-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-medium text-app-text">{row.fullName}</p>
        <Badge variant={leadStatusBadgeVariant(row.status)}>{leadStatusLabel(t, row.status)}</Badge>
      </div>

      <p className="ltr flex items-center gap-1.5 text-body text-app-text-2">
        {row.phoneNumber}
        {row.phoneVerified && (
          <span className="text-app-primary" title={t.admin.phoneVerified}>
            ✓
          </span>
        )}
      </p>

      <p className="text-body text-app-text-3">{describeRequestSubject(row, locale)}</p>

      <div className="flex flex-wrap items-center gap-2 text-label text-app-text-4">
        <span className="inline-flex items-center gap-1">
          {row.source === 'WEB' ? (
            <Globe className="size-3.5" aria-hidden="true" />
          ) : (
            <Send className="size-3.5" aria-hidden="true" />
          )}
          {row.source === 'WEB' ? t.admin.sourceWeb : t.admin.sourceTelegram}
        </span>
        {row.city && <span>{row.city}</span>}
        <span className="ms-auto">{formatDate(row.createdAt, locale)}</span>
      </div>
    </button>
  );
}
