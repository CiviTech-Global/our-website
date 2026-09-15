import { useState } from 'react';
import { ShieldCheck, UserPlus, Users as UsersIcon } from 'lucide-react';
import {
  useAdminUsers,
  useCreateAdmin,
  useDeactivateUser,
  usePermissionCatalogue,
  useSetUserPermissions,
} from '@/api/admin';
import { apiMessage } from '@/lib/apiMessage';
import { useLocale } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from '@/lib/documentTitle';
import { formatDate } from '@/i18n/utils';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import type { AdminUserListItem, Permission } from '@/types/admin';
import type { Translations } from '@/i18n/LocaleProvider';

/**
 * The catalogue comes from the server, so a module may exist that this build
 * has no label for. Falling back to the raw key keeps such a module grantable
 * instead of rendering an empty checkbox nobody can identify.
 */
function moduleLabel(t: Translations, permission: Permission): string {
  return (t.access.modules_ as Record<string, string | undefined>)[permission] ?? permission;
}

const PAGE_SIZE = 10;

/**
 * Staff accounts, and what each one can reach.
 *
 * This page listed users and did nothing else, while the server had endpoints
 * to create staff, change a role, set permissions and deactivate an account —
 * none of which anything called. So the only way to make an admin was to have
 * somebody register as a customer and promote them by hand, and the only way
 * to limit one was to edit the database.
 *
 * Everything that changes an account is SUPER_ADMIN, matching the API. An
 * admin holding the `users` module can read this list and change nothing,
 * which is the useful half of it: knowing who has access.
 */
export default function UsersPage() {
  const { t } = useLocale();
  useDocumentTitle(t.admin.users);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isError } = useAdminUsers(page, PAGE_SIZE);
  const { data: catalogue } = usePermissionCatalogue();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{t.admin.users}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t.access.pageSubtitle}</p>
        </div>
        {isSuperAdmin && (
          <Button type="button" onClick={() => setCreating((open) => !open)}>
            <UserPlus className="size-4" />
            {t.access.newAdmin}
          </Button>
        )}
      </div>

      {creating && isSuperAdmin && (
        <CreateAdminForm
          catalogue={catalogue ?? []}
          onDone={() => {
            setCreating(false);
            showToast(t.access.adminCreated, 'success');
          }}
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {isError && !isLoading && (
        <Card>
          <EmptyState icon={<UsersIcon className="size-8" />} title={t.errors.networkError} />
        </Card>
      )}

      <ul className="flex flex-col gap-3">
        {data?.items.map((account) => (
          <li key={account.id}>
            <AccountCard
              account={account}
              catalogue={catalogue ?? []}
              canEdit={isSuperAdmin && account.id !== user?.id}
            />
          </li>
        ))}
      </ul>

      {total > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function AccountCard({
  account,
  catalogue,
  canEdit,
}: {
  account: AdminUserListItem;
  catalogue: Permission[];
  canEdit: boolean;
}) {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const setPermissions = useSetUserPermissions();
  const deactivate = useDeactivateUser();

  const [draft, setDraft] = useState<Permission[] | null>(null);
  const current = draft ?? account.permissions;
  const dirty = draft !== null && draft.join() !== account.permissions.join();

  // A super admin holds everything implicitly, so showing unticked boxes for
  // it would be a lie about what it can reach.
  const isSuperAdmin = account.role === 'SUPER_ADMIN';
  const isCustomer = account.role === 'USER';

  async function save() {
    try {
      await setPermissions.mutateAsync({ id: account.id, permissions: current });
      setDraft(null);
      // Their sessions were just cut, which is the point — say so, or it looks
      // like nothing happened.
      showToast(t.access.permissionsSaved, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-text-primary">
            {account.firstName} {account.lastName}
          </p>
          <p className="ltr mt-0.5 text-xs text-text-muted">{account.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {account.isActive === false && <Badge variant="danger">{t.access.deactivated}</Badge>}
          <Badge variant={isSuperAdmin ? 'success' : isCustomer ? 'default' : 'info'}>
            {isSuperAdmin && <ShieldCheck className="size-3.5" aria-hidden="true" />}
            {t.access.roles[account.role]}
          </Badge>
        </div>
      </div>

      <p className="mt-2 text-xs text-text-muted">
        {t.admin.createdOn}: {formatDate(account.createdAt, locale)}
      </p>

      {isSuperAdmin ? (
        <p className="mt-4 text-sm text-text-secondary">{t.access.superAdminNote}</p>
      ) : isCustomer ? (
        <p className="mt-4 text-sm text-text-secondary">{t.access.customerNote}</p>
      ) : (
        <div className="mt-4 border-t border-border-subtle pt-4">
          <p className="mb-2 text-xs text-text-muted">{t.access.modules}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {catalogue.map((permission) => (
              <label
                key={permission}
                className="flex items-center gap-2 text-sm text-text-primary"
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-border-default accent-brand-green-500"
                  checked={current.includes(permission)}
                  disabled={!canEdit || setPermissions.isPending}
                  onChange={(event) =>
                    setDraft(
                      event.target.checked
                        ? [...current, permission]
                        : current.filter((value) => value !== permission)
                    )
                  }
                />
                {moduleLabel(t, permission)}
              </label>
            ))}
          </div>

          {canEdit && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={save}
                disabled={!dirty}
                isLoading={setPermissions.isPending}
              >
                {t.common.save}
              </Button>
              {dirty && (
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  {t.common.cancel}
                </Button>
              )}
              {account.isActive !== false && (
                <Button
                  type="button"
                  variant="outline"
                  isLoading={deactivate.isPending}
                  onClick={async () => {
                    try {
                      await deactivate.mutateAsync(account.id);
                      showToast(t.access.deactivatedDone, 'success');
                    } catch (error) {
                      showToast(apiMessage(error, t.common.error), 'error');
                    }
                  }}
                >
                  {t.access.deactivate}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function CreateAdminForm({
  catalogue,
  onDone,
}: {
  catalogue: Permission[];
  onDone: () => void;
}) {
  const { t } = useLocale();
  const create = useCreateAdmin();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-text-primary">{t.access.newAdmin}</h2>
      <p className="mb-4 text-sm text-text-secondary">{t.access.newAdminHint}</p>

      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          try {
            await create.mutateAsync({ ...form, permissions });
            onDone();
          } catch (err) {
            setError(apiMessage(err, t.common.error));
          }
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t.auth.firstName} htmlFor="admin-first">
            <Input
              id="admin-first"
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              required
            />
          </FormField>
          <FormField label={t.auth.lastName} htmlFor="admin-last">
            <Input
              id="admin-last"
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              required
            />
          </FormField>
          <FormField label={t.auth.email} htmlFor="admin-email">
            <Input
              id="admin-email"
              type="email"
              className="ltr text-start"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </FormField>
          <FormField
            label={t.auth.password}
            htmlFor="admin-password"
            hint={t.auth.passwordHint}
          >
            <Input
              id="admin-password"
              type="password"
              autoComplete="new-password"
              className="ltr text-start"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
            />
          </FormField>
        </div>

        <div>
          <p className="mb-2 text-xs text-text-muted">{t.access.modules}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {catalogue.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border-default accent-brand-green-500"
                  checked={permissions.includes(permission)}
                  onChange={(event) =>
                    setPermissions((prev) =>
                      event.target.checked
                        ? [...prev, permission]
                        : prev.filter((value) => value !== permission)
                    )
                  }
                />
                {moduleLabel(t, permission)}
              </label>
            ))}
          </div>
          {/* Granting nothing is a legitimate starting point, not a mistake. */}
          <p className="mt-2 text-xs text-text-muted">{t.access.noModulesNote}</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-brand-red-500">
            {error}
          </p>
        )}

        <Button type="submit" isLoading={create.isPending} className="w-fit">
          {t.access.createAdmin}
        </Button>
      </form>
    </Card>
  );
}
