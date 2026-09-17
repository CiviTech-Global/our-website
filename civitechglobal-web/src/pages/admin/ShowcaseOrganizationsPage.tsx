import { PageHeader } from '@/components/app/PageHeader';
import { useState, type FormEvent } from 'react';
import { Building2, Eye, EyeOff, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import {
  PARTNERSHIP_TYPES,
  adminImagePath,
  useAdminOrganizations,
  useDeleteOrganization,
  useReorderOrganizations,
  useSaveOrganization,
  type AdminShowcaseOrganization,
  type OrganizationKind,
  type OrganizationPayload,
  type PartnershipType,
} from '@/api/showcase';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { normalizePersianDigits } from '@/lib/persian';
import { MoveButtons } from '@/components/admin/OrderedList';
import { useOrderedList } from '@/components/admin/useOrderedList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { StaffImage } from '@/components/ui/StaffImage';
import { TextArea } from '@/components/ui/TextArea';

/**
 * The customers club and the partners page, from the editor's side.
 *
 * One screen for both kinds, as on the public side. Each list is reordered
 * independently — moving a customer never shuffles the partners — and the
 * public page puts featured entries first whatever their position here, which
 * the screen says rather than leaving the editor to discover.
 */
export default function ShowcaseOrganizationsPage({ kind }: { kind: OrganizationKind }) {
  const { t } = useLocale();
  const isCustomer = kind === 'CUSTOMER';
  const title = isCustomer ? t.showcase.adminCustomersTitle : t.showcase.adminPartnersTitle;
  useDocumentTitle(title);

  const { showToast } = useToast();
  const onError = (error: unknown) => showToast(apiMessage(error, t.common.error), 'error');

  const { data, isLoading } = useAdminOrganizations(kind);
  const reorder = useReorderOrganizations();
  const remove = useDeleteOrganization();
  const save = useSaveOrganization();
  const list = useOrderedList(data, reorder.mutateAsync, onError);

  const [editing, setEditing] = useState<AdminShowcaseOrganization | 'new' | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        className="mb-2"
        description={
          <>
            {isCustomer ? t.showcase.adminCustomersSubtitle : t.showcase.adminPartnersSubtitle}{' '}
            {t.showcase.orderNote}
          </>
        }
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            {isCustomer ? t.showcase.addCustomer : t.showcase.addPartner}
          </Button>
        }
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && list.order.length === 0 && (
        <EmptyState title={isCustomer ? t.showcase.customersEmpty : t.showcase.partnersEmpty} />
      )}

      <ul className="flex flex-col gap-3">
        {list.order.map((org, index) => (
          <li key={org.id}>
            <Card className={org.published ? undefined : 'opacity-70'}>
              <div className="flex flex-wrap items-center gap-4">
                <MoveButtons
                  index={index}
                  count={list.order.length}
                  busy={reorder.isPending}
                  onMove={(i, d) => void list.move(i, d)}
                  upLabel={t.showcase.moveUp}
                  downLabel={t.showcase.moveDown}
                />

                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded border border-app-border-light bg-white p-1.5">
                  <StaffImage
                    path={adminImagePath(org.logoUrl)}
                    alt={org.name}
                    className="max-h-full max-w-full object-contain"
                    fallback={<Building2 className="size-6 text-app-text-4" aria-hidden="true" />}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-app-text">
                    {org.name}
                    {org.featured && (
                      <Star className="size-4 fill-status-warning text-status-warning" aria-label={t.showcase.featuredLabel} />
                    )}
                  </p>
                  <p className="text-label text-app-text-4">
                    {[
                      org.partnershipType ? t.showcase.partnershipTypes[org.partnershipType] : null,
                      org.industry,
                      org.active ? null : t.showcase.former,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={org.published ? 'success' : 'default'}>
                    {org.published ? t.showcase.published : t.showcase.hidden}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={org.published ? t.showcase.hide : t.showcase.publish}
                    onClick={async () => {
                      try {
                        await save.mutateAsync({ id: org.id, payload: { published: !org.published } });
                      } catch (error) {
                        onError(error);
                      }
                    }}
                  >
                    {org.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(org)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    {t.common.edit}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t.common.delete}
                    onClick={() => setConfirming(org.id)}
                  >
                    <Trash2 className="size-4 text-status-error" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {confirming === org.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-app-border-light pt-3">
                  <p className="text-body text-app-text-3">{t.showcase.deleteOrganizationConfirm}</p>
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={remove.isPending}
                    onClick={async () => {
                      try {
                        await remove.mutateAsync(org.id);
                        setConfirming(null);
                      } catch (error) {
                        onError(error);
                      }
                    }}
                  >
                    {t.common.delete}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                    {t.common.cancel}
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {editing && (
        <OrganizationForm
          kind={kind}
          org={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function OrganizationForm({
  kind,
  org,
  onClose,
}: {
  kind: OrganizationKind;
  org: AdminShowcaseOrganization | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const save = useSaveOrganization();
  const isCustomer = kind === 'CUSTOMER';

  const [values, setValues] = useState({
    name: org?.name ?? '',
    description: org?.description ?? '',
    industry: org?.industry ?? '',
    website: org?.website ?? '',
    featured: org?.featured ?? false,
    active: org?.active ?? true,
    sinceYear: org?.sinceYear ? String(org.sinceYear) : '',
    partnershipType: (org?.partnershipType ?? '') as PartnershipType | '',
    testimonialQuote: org?.testimonialQuote ?? '',
    testimonialAuthor: org?.testimonialAuthor ?? '',
    testimonialRole: org?.testimonialRole ?? '',
    published: org?.published ?? true,
  });
  const [logo, setLogo] = useState<File | null>(null);

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();

    // Emptied fields are sent as '' deliberately: the server reads that as
    // "clear it", where leaving the key out would keep the old value.
    const payload: OrganizationPayload = {
      kind,
      name: values.name.trim(),
      description: values.description.trim(),
      industry: values.industry.trim(),
      website: values.website.trim(),
      featured: values.featured,
      active: values.active,
      sinceYear: values.sinceYear ? Number(values.sinceYear) : null,
      partnershipType: isCustomer ? null : values.partnershipType || null,
      testimonialQuote: values.testimonialQuote.trim(),
      testimonialAuthor: values.testimonialAuthor.trim(),
      testimonialRole: values.testimonialRole.trim(),
      published: values.published,
    };

    try {
      await save.mutateAsync({ id: org?.id, payload, logo });
      showToast(t.showcase.saved, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  const check = (key: 'featured' | 'active' | 'published', label: string) => (
    <label className="flex items-start gap-2 text-body text-app-text-3">
      <input
        type="checkbox"
        className="mt-0.5 size-4 rounded border-app-border"
        checked={values[key]}
        onChange={(e) => set(key, e.target.checked)}
      />
      {label}
    </label>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={org ? t.showcase.editOrganization : isCustomer ? t.showcase.addCustomer : t.showcase.addPartner}
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t.showcase.name} htmlFor="org-name">
            <Input id="org-name" required minLength={2} value={values.name} onChange={(e) => set('name', e.target.value)} />
          </FormField>
          <FormField label={t.showcase.industry} htmlFor="org-industry">
            <Input id="org-industry" value={values.industry} onChange={(e) => set('industry', e.target.value)} />
          </FormField>
          <FormField label={t.showcase.website} htmlFor="org-website">
            <Input
              id="org-website"
              type="url"
              dir="ltr"
              className="ltr"
              placeholder="https://"
              value={values.website}
              onChange={(e) => set('website', e.target.value)}
            />
          </FormField>
          <FormField label={t.showcase.sinceYear} htmlFor="org-since">
            <Input
              id="org-since"
              inputMode="numeric"
              placeholder="2024"
              className="ltr"
              value={values.sinceYear}
              onChange={(e) =>
                set('sinceYear', normalizePersianDigits(e.target.value).replace(/\D/g, '').slice(0, 4))
              }
            />
          </FormField>
          {!isCustomer && (
            <FormField label={t.showcase.partnershipType} htmlFor="org-type">
              <Select
                id="org-type"
                value={values.partnershipType}
                onChange={(e) => set('partnershipType', e.target.value as PartnershipType | '')}
              >
                <option value="">—</option>
                {PARTNERSHIP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t.showcase.partnershipTypes[type]}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        <FormField label={t.showcase.description} htmlFor="org-description">
          <TextArea id="org-description" rows={3} value={values.description} onChange={(e) => set('description', e.target.value)} />
        </FormField>

        <FormField
          label={t.showcase.logo}
          htmlFor="org-logo"
          hint={org?.logoUrl ? t.showcase.imageReplaceHint : t.showcase.imageHint}
        >
          <Input
            id="org-logo"
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
          />
        </FormField>

        <fieldset className="flex flex-col gap-3 rounded border border-app-border-light p-4">
          <legend className="px-1 text-body font-medium text-app-text">{t.showcase.testimonial}</legend>
          <p className="text-label text-app-text-4">{t.showcase.testimonialHint}</p>
          <FormField label={t.showcase.testimonialQuote} htmlFor="org-quote">
            <TextArea id="org-quote" rows={3} value={values.testimonialQuote} onChange={(e) => set('testimonialQuote', e.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t.showcase.testimonialAuthor} htmlFor="org-author">
              <Input id="org-author" value={values.testimonialAuthor} onChange={(e) => set('testimonialAuthor', e.target.value)} />
            </FormField>
            <FormField label={t.showcase.testimonialRole} htmlFor="org-role">
              <Input id="org-role" value={values.testimonialRole} onChange={(e) => set('testimonialRole', e.target.value)} />
            </FormField>
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          {check('featured', `${t.showcase.featuredLabel} — ${t.showcase.featuredHint}`)}
          {check('active', `${t.showcase.activeLabel} — ${t.showcase.activeHint}`)}
          {check('published', t.showcase.publishedHint)}
        </div>

        <div className="flex gap-2">
          <Button type="submit" isLoading={save.isPending}>
            {t.common.save}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
