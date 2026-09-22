import { PageHeader } from '@/components/app/PageHeader';
import { Shield } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useClientList } from '@/lib/clientList';
import { useListControls } from '@/lib/useListControls';
import { useAdminRoles } from '@/api/admin';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Spinner } from '@/components/ui/Spinner';

/**
 * NOTE: role/permission CRUD endpoints (`/api/admin/roles`) were not in the backend
 * agent's explicit scope for this pass. This page renders real data when available
 * and degrades to a clean empty state otherwise — see src/api/admin.ts:useAdminRoles.
 */
export default function RolesPage() {
  const { t } = useLocale();
  useDocumentTitle(t.admin.roles);
  const { data, isLoading, isError } = useAdminRoles();

  // The permissions are searched as well as the name: "who can reach the
  // books module" is the question this page is opened to answer.
  const controls = useListControls({ pageSize: Number.MAX_SAFE_INTEGER });
  const shown = useClientList(data, controls, {
    searchFields: (role) => [role.name, role.description, ...role.permissions],
  });

  return (
    <div>
      <PageHeader title={t.admin.roles} description={t.admin.rolesEndpointNote} />

      {(data?.length ?? 0) > 0 && (
        <ListToolbar
          className="mb-4"
          controls={controls}
          searchPlaceholder={t.access.searchRoles}
          total={shown.total}
          isLoading={isLoading}
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {isError && !isLoading && (
        <Card>
          <EmptyState icon={<Shield className="size-8" />} title={t.errors.endpointUnavailable} />
        </Card>
      )}

      {data && data.length === 0 && !isLoading && (
        <Card>
          <EmptyState icon={<Shield className="size-8" />} title={t.common.noResults} />
        </Card>
      )}

      {!isLoading && shown.total === 0 && (data?.length ?? 0) > 0 && (
        <Card>
          <EmptyState
            icon={<Shield className="size-8" />}
            title={t.list.noResults}
            description={t.list.noResultsBody}
          />
        </Card>
      )}

      {shown.total > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {shown.items.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle>{role.name}</CardTitle>
                {role.description && <p className="text-body text-app-text-3">{role.description}</p>}
              </CardHeader>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map((permission) => (
                  <Badge key={permission} variant="default">
                    {permission}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
