import { Link } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/config/api';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { formatDate } from '@/i18n/utils';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useListControls } from '@/lib/useListControls';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListPager } from '@/components/ui/ListPager';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Spinner } from '@/components/ui/Spinner';
import type { Paged } from '@/types/api';

interface StaffCompany {
  id: string;
  slug: string;
  name: string;
  hidden: boolean;
  createdAt: string;
  owner: { id: string; email: string; firstName: string; lastName: string };
  _count: { jobs: number };
}

/**
 * Company pages, for the jobs desk.
 *
 * Not a queue: a page goes live with its owner's verification. This is where
 * staff take one down when it misrepresents somebody, and put it back.
 */
export default function CompaniesAdminPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.jobs.companiesTitle);
  const { showToast } = useToast();
  const qc = useQueryClient();
  const controls = useListControls({ pageSize: 20 });

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', 'admin', 'companies', controls.page, controls.search],
    queryFn: async () =>
      (
        await api.get<Paged<StaffCompany>>('/jobs/admin/companies', {
          params: { page: controls.page, pageSize: 20, search: controls.search || undefined },
        })
      ).data,
  });

  const setHidden = useMutation({
    mutationFn: async (input: { id: string; hidden: boolean }) => {
      await api.patch(`/jobs/admin/companies/${input.id}`, { hidden: input.hidden });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
    onError: (error) => showToast(apiMessage(error, t.common.error), 'error'),
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.jobs.companiesTitle} className="mb-2" />
      <ListToolbar controls={controls} searchPlaceholder={t.jobs.searchCompanies} total={data?.total} isLoading={isLoading} />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}
      {!isLoading && data?.items.length === 0 && <EmptyState title={t.jobs.noCompanies} />}

      <ul className="flex flex-col gap-3">
        {data?.items.map((company) => (
          <li key={company.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/companies/${encodeURIComponent(company.slug)}`}
                    target="_blank"
                    className="font-medium text-app-text hover:underline"
                  >
                    {company.name}
                  </Link>
                  <p className="mt-0.5 text-label text-app-text-4">
                    {company.owner.firstName} {company.owner.lastName} ·{' '}
                    <span className="ltr">{company.owner.email}</span> · {formatDate(company.createdAt, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {company.hidden && <Badge variant="danger">{t.jobs.hiddenBadge}</Badge>}
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={setHidden.isPending && setHidden.variables?.id === company.id}
                    onClick={() => setHidden.mutate({ id: company.id, hidden: !company.hidden })}
                  >
                    {company.hidden ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
                    {company.hidden ? t.jobs.showPage : t.jobs.hidePage}
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {data && (
        <ListPager
          page={controls.page}
          pageSize={20}
          total={data.total}
          totalPages={data.totalPages}
          onPageChange={controls.setPage}
        />
      )}
    </div>
  );
}
