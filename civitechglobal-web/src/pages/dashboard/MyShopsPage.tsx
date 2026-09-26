import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Package, Plus, Store } from 'lucide-react';
import { IDLE, type UploadState } from '@/components/ui/UploadStatus';
import { diagnoseUpload, logUploadFailure } from '@/lib/uploadError';
import {
  useCloseShop,
  useCreateShop,
  useOwnShops,
  useSubmitShop,
  useUpdateShop,
} from '@/api/trademaster';
import { useOwnVerification } from '@/api/marketplace';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useClientList } from '@/lib/clientList';
import { useListControls } from '@/lib/useListControls';
import { apiMessage } from '@/lib/apiMessage';
import { toPersianDigits } from '@/i18n/utils';
import { moderationVariant, stateVariant } from '@/lib/marketplace';
import { PageHeader } from '@/components/app/PageHeader';
import { CoverField } from '@/components/marketplace/CoverField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ListToolbar } from '@/components/ui/ListToolbar';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type { ModerationStatus, OwnShop } from '@/types/trademaster';

const EMPTY_DRAFT = {
  name: '',
  summary: '',
  description: '',
  industry: '',
  province: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  latitude: '',
  longitude: '',
};

const PAGE_SIZE = 10;

const MODERATION_STATUSES: ModerationStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'CHANGES_REQUESTED',
  'REJECTED',
];

/**
 * A seller's own shops.
 *
 * Drafts included, which the directory never shows — this is the only place
 * the moderation state is visible to the person it concerns, with the
 * reviewer's note when one came back.
 *
 * Unlike the book market, verification is required of everyone here including
 * staff: a shop is a trading identity rather than a listing attributed to the
 * company, so there is no case where somebody should be able to open one
 * without having proved who they are.
 */
export default function MyShopsPage() {
  const { t, locale } = useLocale();
  useDocumentTitle(t.trademaster.myShops);
  const { showToast } = useToast();

  const { data: verification } = useOwnVerification();
  const { data: shops, isLoading } = useOwnShops();

  const controls = useListControls({ pageSize: PAGE_SIZE, filters: { status: '' } });
  const list = useClientList(shops, controls, {
    searchFields: (shop) => [shop.name, shop.code, shop.industry ?? ''],
    filters: { status: (row, value) => row.moderationStatus === value },
    pageSize: PAGE_SIZE,
  });

  const create = useCreateShop();
  const update = useUpdateShop();
  const submit = useSubmitShop();
  const close = useCloseShop();

  const [editing, setEditing] = useState<'new' | OwnShop | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [logo, setLogo] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>(IDLE);

  const canPost = verification?.status === 'APPROVED';
  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  const set = (name: keyof typeof draft) => (value: string) =>
    setDraft((prev) => ({ ...prev, [name]: value }));

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setLogo(null);
    setUploadState(IDLE);
    setEditing('new');
  }

  function openEdit(shop: OwnShop) {
    // Only the fields the list carries; the rest are filled on the server and
    // left untouched by a PATCH that does not mention them.
    setDraft({
      ...EMPTY_DRAFT,
      name: shop.name,
      summary: shop.summary,
      industry: shop.industry ?? '',
      province: shop.province ?? '',
      city: shop.city ?? '',
    });
    setLogo(null);
    setUploadState(IDLE);
    setEditing(shop);
  }

  /**
   * A coordinate is only sent when both halves are present.
   *
   * Half a coordinate puts a pin at (0, 0), in the Gulf of Guinea, which is
   * where every half-filled location ends up. The server refuses it too; this
   * just means the seller finds out before the upload rather than after.
   */
  function coordinates() {
    const lat = draft.latitude.trim();
    const lng = draft.longitude.trim();
    if (!lat || !lng) return {};
    return { latitude: Number(lat), longitude: Number(lng) };
  }

  async function handleSave(event?: FormEvent) {
    event?.preventDefault();

    const lat = draft.latitude.trim();
    const lng = draft.longitude.trim();
    if (Boolean(lat) !== Boolean(lng)) {
      showToast(t.trademaster.locationHint, 'error');
      return;
    }

    const payload = {
      name: draft.name.trim(),
      summary: draft.summary.trim(),
      description: draft.description.trim() || undefined,
      industry: draft.industry.trim() || undefined,
      province: draft.province.trim() || undefined,
      city: draft.city.trim() || undefined,
      address: draft.address.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      email: draft.email.trim() || undefined,
      website: draft.website.trim() || undefined,
      ...coordinates(),
    };

    const sent = logo ?? null;
    const onProgress = (percent: number) =>
      setUploadState((prev) => ({
        ...prev,
        phase: percent >= 100 ? 'finishing' : 'uploading',
        percent,
        file: sent,
      }));

    if (sent) setUploadState({ phase: 'uploading', percent: 0, file: sent });

    try {
      if (editing === 'new') {
        await create.mutateAsync({ payload, logo: logo ?? undefined, onProgress });
        showToast(t.trademaster.shopCreated, 'success');
      } else if (editing) {
        await update.mutateAsync({
          id: editing.id,
          payload,
          logo: logo ?? undefined,
          onProgress,
        });
        showToast(t.trademaster.shopSaved, 'success');
      }
      setUploadState(IDLE);
      setEditing(null);
    } catch (error) {
      // Two audiences, one failure: the sentence goes in the toast, and the
      // status block keeps the code and the server's own words within reach of
      // whoever has to explain it.
      const diagnosis = diagnoseUpload(error, t, sent);
      logUploadFailure('shop-logo', diagnosis, error);
      if (sent) setUploadState({ phase: 'error', percent: 0, file: sent, error: diagnosis });
      showToast(diagnosis.message, 'error');
    }
  }

  async function handleSubmit(shop: OwnShop) {
    // Checked here as well as on the server so the seller is told why before
    // a request goes out, rather than after.
    if (!shop.logoUrl) {
      showToast(t.trademaster.logoRequired, 'error');
      return;
    }

    try {
      await submit.mutateAsync(shop.id);
      showToast(t.trademaster.shopSubmitted, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function handleClose(shop: OwnShop) {
    try {
      await close.mutateAsync(shop.id);
      showToast(t.trademaster.shopClosed, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.trademaster.myShops}
        description={t.trademaster.myShopsSubtitle}
        className="mb-2"
        actions={
          canPost && (
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              {t.trademaster.newShop}
            </Button>
          )
        }
      />

      {!canPost && (
        <Card>
          <p className="text-body text-app-text-3">{t.trademaster.verificationRequired}</p>
          <Link to="/dashboard/verification" className="mt-3 inline-block">
            <Button variant="outline">{t.trademaster.goToVerification}</Button>
          </Link>
        </Card>
      )}

      {(shops?.length ?? 0) > 0 && (
        <ListToolbar
          controls={controls}
          searchPlaceholder={t.trademaster.searchShops}
          total={list.total}
          isLoading={isLoading}
          filters={
            <Select
              className="w-48"
              value={controls.filters.status}
              aria-label={t.app.filterByStatus}
              onChange={(e) => controls.setFilter('status', e.target.value)}
            >
              <option value="">{t.list.allOption}</option>
              {MODERATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t.market[value]}
                </option>
              ))}
            </Select>
          }
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && controls.activeCount > 0 && list.total === 0 && (
        <EmptyState title={t.list.noResults} description={t.list.noResultsBody} />
      )}

      {!isLoading && controls.activeCount === 0 && shops?.length === 0 && canPost && (
        <EmptyState
          title={t.trademaster.noOwnShops}
          description={t.trademaster.noOwnShopsBody}
          icon={<Store aria-hidden="true" />}
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              {t.trademaster.newShop}
            </Button>
          }
        />
      )}

      <ul className="flex flex-col gap-3">
        {list.items.map((shop) => (
          <li key={shop.id}>
            <Card className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {shop.logoUrl ? (
                <img
                  src={shop.logoUrl}
                  alt={shop.name}
                  className="size-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-app-surface-2 text-app-text-3"
                  aria-hidden="true"
                >
                  <Store className="size-7" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-app-text-1">{shop.name}</h2>
                  <Badge variant={moderationVariant(shop.moderationStatus)}>
                    {t.market[shop.moderationStatus]}
                  </Badge>
                  {shop.moderationStatus === 'APPROVED' && shop.state !== 'EXPIRED' && (
                    <Badge variant={stateVariant(shop.state)}>{t.market[shop.state]}</Badge>
                  )}
                  {shop.featured && <Badge variant="info">{t.showcase.featured}</Badge>}
                </div>

                <p className="mt-1 line-clamp-2 text-body text-app-text-3">{shop.summary}</p>

                <p className="mt-2 flex flex-wrap items-center gap-3 text-caption text-app-text-3">
                  <span className="inline-flex items-center gap-1">
                    <Package className="size-3.5" aria-hidden="true" />
                    {t.trademaster.productCount.replace('{count}', number(shop.productCount))}
                  </span>
                  <span dir="ltr">{shop.code}</span>
                </p>

                {shop.reviewNote && (
                  <p className="mt-2 rounded-lg bg-app-surface-2 p-2 text-caption text-app-text-2">
                    <span className="font-medium">{t.market.reviewNote}: </span>
                    {shop.reviewNote}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {/* Products need an approved shop to hang off, so the link is
                    only useful once there is one. */}
                {shop.moderationStatus === 'APPROVED' && (
                  <Link to={`/dashboard/shops/${shop.id}/products`}>
                    <Button variant="outline" size="sm">
                      {t.trademaster.products}
                    </Button>
                  </Link>
                )}

                {(shop.moderationStatus === 'DRAFT' ||
                  shop.moderationStatus === 'CHANGES_REQUESTED') && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEdit(shop)}>
                      {t.trademaster.editShop}
                    </Button>
                    <Button size="sm" onClick={() => void handleSubmit(shop)}>
                      {t.trademaster.submitForReview}
                    </Button>
                  </>
                )}

                {shop.state === 'OPEN' && shop.moderationStatus === 'APPROVED' && (
                  <Button variant="ghost" size="sm" onClick={() => void handleClose(shop)}>
                    {t.trademaster.closeShop}
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t.trademaster.newShop : t.trademaster.editShop}
      >
        <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-4">
          <FormField label={t.trademaster.shopName}>
            <Input value={draft.name} onChange={(e) => set('name')(e.target.value)} required />
          </FormField>

          <FormField label={t.trademaster.shopSummary}>
            <TextArea
              value={draft.summary}
              onChange={(e) => set('summary')(e.target.value)}
              rows={2}
              required
            />
          </FormField>

          <FormField label={t.trademaster.shopDescription}>
            <TextArea
              value={draft.description}
              onChange={(e) => set('description')(e.target.value)}
              rows={4}
            />
          </FormField>

          <div className="flex flex-col gap-1">
            <span className="text-label text-app-text-2">{t.trademaster.logo}</span>
            <CoverField
              value={logo}
              previewUrl={editing !== null && editing !== 'new' ? editing.logoUrl : null}
              onChange={(file) => {
                setLogo(file);
                setUploadState(IDLE);
              }}
              uploadState={uploadState}
              onRetryUpload={() => void handleSave()}
            />
            <span className="text-caption text-app-text-3">{t.trademaster.logoHint}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t.trademaster.industry}>
              <Input value={draft.industry} onChange={(e) => set('industry')(e.target.value)} />
            </FormField>
            <FormField label={t.trademaster.province}>
              <Input value={draft.province} onChange={(e) => set('province')(e.target.value)} />
            </FormField>
            <FormField label={t.trademaster.city}>
              <Input value={draft.city} onChange={(e) => set('city')(e.target.value)} />
            </FormField>
            <FormField label={t.trademaster.phone}>
              <Input value={draft.phone} onChange={(e) => set('phone')(e.target.value)} dir="ltr" />
            </FormField>
            <FormField label={t.trademaster.email}>
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => set('email')(e.target.value)}
                dir="ltr"
              />
            </FormField>
            <FormField label={t.trademaster.website}>
              <Input
                type="url"
                value={draft.website}
                onChange={(e) => set('website')(e.target.value)}
                dir="ltr"
                placeholder="https://"
              />
            </FormField>
          </div>

          <FormField label={t.trademaster.address}>
            <Input value={draft.address} onChange={(e) => set('address')(e.target.value)} />
          </FormField>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-1 text-label text-app-text-2">{t.trademaster.location}</legend>
            <p className="col-span-full text-caption text-app-text-3">
              {t.trademaster.locationHint}
            </p>
            <FormField label={t.trademaster.latitude}>
              <Input
                value={draft.latitude}
                onChange={(e) => set('latitude')(e.target.value)}
                inputMode="decimal"
                dir="ltr"
              />
            </FormField>
            <FormField label={t.trademaster.longitude}>
              <Input
                value={draft.longitude}
                onChange={(e) => set('longitude')(e.target.value)}
                inputMode="decimal"
                dir="ltr"
              />
            </FormField>
          </fieldset>

          <p className="text-caption text-app-text-3">{t.trademaster.submitWarning}</p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {t.trademaster.saveDraft}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
