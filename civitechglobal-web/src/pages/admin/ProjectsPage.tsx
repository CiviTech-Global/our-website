import { PageHeader } from '@/components/app/PageHeader';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Paperclip } from 'lucide-react';
import { useAdminProjects } from '@/api/projects';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Table, type TableColumn } from '@/components/ui/Table';
import { formatThousands } from '@/lib/persian';
import { PROJECT_STATUSES, projectStatusBadgeVariant, projectStatusLabel } from '@/lib/projectStatus';
import type { AdminProjectSummary, ProjectRequestStatus } from '@/types/project';

const PAGE_SIZE = 15;

export default function ProjectsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.proposal.adminTitle);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ProjectRequestStatus | 'ALL'>('ALL');

  const { data, isLoading, isError } = useAdminProjects({ page, pageSize: PAGE_SIZE, status });

  const budget = (row: AdminProjectSummary) => {
    if (row.budgetUnknown) return t.proposal.budgetUnknown;
    if (!row.budgetMin && !row.budgetMax) return '—';
    return `${formatThousands(row.budgetMin ?? '0')} – ${formatThousands(row.budgetMax ?? '0')}`;
  };

  const columns: TableColumn<AdminProjectSummary>[] = [
    {
      key: 'trackingCode',
      header: t.insurance.trackingCode,
      render: (row) => (
        <span className="ltr font-mono text-label tracking-wider text-app-text-3">
          {row.trackingCode}
        </span>
      ),
    },
    {
      key: 'title',
      header: t.proposal.project,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-app-text">{row.title}</p>
          <p className="truncate text-label text-app-text-4">
            {row.organizationName ? `${row.organizationName} · ` : ''}
            {row.contactName}
          </p>
        </div>
      ),
    },
    {
      key: 'projectType',
      header: t.project.projectType,
      render: (row) => (
        <span className="text-app-text-3">{t.project.types[row.projectType]}</span>
      ),
    },
    {
      key: 'budget',
      header: t.project.sectionBudget,
      render: (row) => <span className="ltr text-app-text-3">{budget(row)}</span>,
    },
    {
      key: 'urgency',
      header: t.project.urgency,
      render: (row) => (
        <span className="text-app-text-3">{t.project.urgencies[row.urgency]}</span>
      ),
    },
    {
      key: 'attachments',
      header: '',
      // Whether a brief came with documents changes how long reading it takes,
      // which is worth knowing before opening it.
      render: (row) =>
        row._count.attachments > 0 ? (
          <span className="inline-flex items-center gap-1 text-label text-app-text-4">
            <Paperclip className="size-3.5" aria-hidden="true" />
            {row._count.attachments}
          </span>
        ) : null,
    },
    {
      key: 'status',
      header: t.admin.status,
      render: (row) => (
        <Badge variant={projectStatusBadgeVariant(row.status)}>
          {projectStatusLabel(t, row.status)}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: t.admin.createdAt,
      render: (row) => (
        <span className="text-label text-app-text-4">{formatDate(row.createdAt, locale)}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.proposal.adminTitle}
        description={t.proposal.adminSubtitle}
        className="mb-2"
        actions={
          <Select
            value={status}
            className="w-auto min-w-44"
            aria-label={t.admin.status}
            onChange={(e) => {
              setStatus(e.target.value as ProjectRequestStatus | 'ALL');
              setPage(1);
            }}
          >
            <option value="ALL">{t.common.all}</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {projectStatusLabel(t, s)}
              </option>
            ))}
          </Select>
        }
      />

      <Card className="p-0">
        <Table
          columns={columns}
          data={data?.items ?? []}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={isError ? t.common.error : t.proposal.adminEmpty}
          onRowClick={(row) => navigate(`/admin/projects/${row.id}`)}
        />
      </Card>

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
