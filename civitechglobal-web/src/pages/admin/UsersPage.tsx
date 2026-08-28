import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Users as UsersIcon } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDate } from '@/i18n/utils';
import { useAdminUsers } from '@/api/admin';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import type { AdminUserListItem } from '@/types/admin';

const PAGE_SIZE = 10;

/**
 * NOTE: `/api/admin/users` was not in the backend agent's explicit scope for this
 * pass. This page renders a real table when the endpoint exists, and degrades to a
 * clean empty state if it 404s/501s — see src/api/admin.ts:useAdminUsers.
 */
export default function UsersPage() {
  const { t, locale } = useLocale();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useAdminUsers(page, PAGE_SIZE);

  const endpointMissing = isAxiosError(error) && [404, 501].includes(error.response?.status ?? 0);

  const columns: TableColumn<AdminUserListItem>[] = [
    { key: 'name', header: t.admin.fullName, render: (row) => `${row.firstName} ${row.lastName}` },
    { key: 'email', header: t.auth.email, render: (row) => <span className="ltr">{row.email}</span> },
    { key: 'role', header: t.admin.role, render: (row) => <Badge variant="info">{row.role}</Badge> },
    { key: 'createdAt', header: t.admin.createdOn, render: (row) => formatDate(row.createdAt, locale) },
  ];

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-text-primary">{t.admin.users}</h1>
      <p className="mb-4 text-xs text-text-muted">{t.admin.usersEndpointNote}</p>

      {isError ? (
        <Card>
          <EmptyState
            icon={<UsersIcon className="size-8" />}
            title={endpointMissing ? t.errors.endpointUnavailable : t.errors.networkError}
          />
        </Card>
      ) : (
        <>
          <Table
            columns={columns}
            data={data?.data ?? []}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            emptyMessage={t.common.noResults}
          />
          {total > 0 && (
            <div className="mt-4 flex flex-wrap justify-end">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
