import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { LocateFixed, Package, Plus, Store, X } from 'lucide-react';
import { IDLE, type UploadState } from '@/components/ui/UploadStatus';
import { diagnoseUpload, logUploadFailure } from '@/lib/uploadError';
import {
  useCloseShop,
  useReopenShop,
  useWithdrawShop,
  useBusinessCategories,
  useCreateShop,
  useOwnShop,
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
import { useGeolocation } from '@/lib/useGeolocation';
import { apiMessage } from '@/lib/apiMessage';
import { toPersianDigits } from '@/i18n/utils';
import { moderationVariant, stateVariant } from '@/lib/marketplace';
import {
  EMPTY_SHOP,
  parseCoordinate,
  shopPayload,
  validateShop,
  type FieldErrors,
  type ShopDraft,
} from '@/lib/marketForms';
import { features } from '@/lib/features';
import { BusinessCategorySelect } from '@/components/trademaster/MarketplaceUi';
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
import { StaffImage } from '@/components/ui/StaffImage';
import { TextArea } from '@/components/ui/TextArea';
import type { ModerationStatus, OwnShop, OwnShopDetail } from '@/types/trademaster';

// Lazy, like every other use of the map: a seller editing their opening hours
// should not download Leaflet to do it.
const LocationPicker = lazy(() =>
  import('@/components/trademaster/ShopMap').then((m) => ({ default: m.LocationPicker }))
);

const PAGE_SIZE = 10;

const MODERATION_STATUSES: ModerationStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'CHANGES_REQUESTED',
  'REJECTED',
];

/** The saved shop, as the form's text boxes hold it. */
function draftFrom(shop: OwnShopDetail): ShopDraft {
  return {
    name: shop.name,
    summary: shop.summary,
    businessCategoryId: shop.businessCategoryId ?? '',
    description: shop.description ?? '',
    industry: shop.industry ?? '',
    province: shop.province ?? '',
    city: shop.city ?? '',
    address: shop.address ?? '',
    phone: shop.phone ?? '',
    email: shop.email ?? '',
    website: shop.website ?? '',
    latitude: shop.latitude == null ? '' : String(shop.latitude),
    longitude: shop.longitude == null ? '' : String(shop.longitude),
  };
}

/**
 * A seller's own shops.
 *
 * Drafts included, which the directory never shows — this is the only place
 * the moderation state is visible to the person it concerns, with the
 * reviewer's note when one came back.
 *
 * Verification is required of everyone here including staff: a shop is a
 * trading identity rather than a listing attributed to the company, so there
 * is no case where somebody should be able to open one without having proved
 * who they are.
 *
 * THE FORM. An existing shop is loaded whole before the form opens — it used
 * to be filled from the list row, which lacks the description, address, phone,
 * email, website and location, so all of those opened blank and could be
 * neither checked nor corrected. Every field is checked before anything is
 * sent, with the problem shown under the field; and on an edit every field is
 * sent, so emptying one actually removes it.
 */
export default function MyShopsPage() {
  const { t, locale } = useLocale();
  const hub = t.trademaster.hub;
  useDocumentTitle(t.trademaster.myShops);
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: verification } = useOwnVerification();
  const { data: shops, isLoading } = useOwnShops();
  const { data: businessCategories } = useBusinessCategories();

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
  const reopen = useReopenShop();
  const withdraw = useWithdrawShop();

  const [editing, setEditing] = useState<'new' | OwnShop | null>(null);
  const [draft, setDraft] = useState<ShopDraft>(EMPTY_SHOP);
  const [errors, setErrors] = useState<FieldErrors<keyof ShopDraft>>({});
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>(IDLE);
  const [coverUploadState, setCoverUploadState] = useState<UploadState>(IDLE);

  const editingId = editing && editing !== 'new' ? editing.id : undefined;
  const existing = useOwnShop(editingId);
  const geo = useGeolocation();

  const canPost = verification?.status === 'APPROVED';
  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  const set = (name: keyof ShopDraft) => (value: string) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
    // The complaint goes as soon as the field is touched again; it comes back
    // on the next save if the field is still wrong.
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };
  const errorOf = (name: keyof ShopDraft) => (errors[name] ? hub[errors[name]] : undefined);

  // The whole shop, once it arrives — not before, so a slow response cannot
  // land on top of what the seller has started typing.
  useEffect(() => {
    if (existing.data && editingId && loadedId !== editingId) {
      setDraft(draftFrom(existing.data));
      setLoadedId(editingId);
    }
  }, [existing.data, editingId, loadedId]);

  // "Create your shop" on the join page lands here with ?new=1.
  useEffect(() => {
    if (searchParams.get('new') !== '1' || !canPost) return;
    openNew();
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canPost]);

  // The device's location, into the two boxes, when the seller asks for it.
  const { state: geoState, clear: clearGeo } = geo;
  useEffect(() => {
    if (geoState.status !== 'ready') return;
    setDraft((prev) => ({
      ...prev,
      latitude: geoState.latitude.toFixed(6),
      longitude: geoState.longitude.toFixed(6),
    }));
    setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
    clearGeo();
  }, [geoState, clearGeo]);

  function resetPictures() {
    setLogo(null);
    setCover(null);
    setUploadState(IDLE);
    setCoverUploadState(IDLE);
  }

  function openNew() {
    setDraft(EMPTY_SHOP);
    setErrors({});
    setLoadedId(null);
    resetPictures();
    setEditing('new');
  }

  function openEdit(shop: OwnShop) {
    setDraft(EMPTY_SHOP);
    setErrors({});
    setLoadedId(null);
    resetPictures();
    setEditing(shop);
  }

  function closeForm() {
    setEditing(null);
    setErrors({});
  }

  async function handleSave(event?: FormEvent) {
    event?.preventDefault();

    const found = validateShop(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showToast(hub.fixErrors, 'error');
      return;
    }

    const isEdit = editing !== 'new';
    const payload = shopPayload(draft, isEdit);

    // Progress is one number for the whole request; it is shown against
    // whichever picture is being sent, both when both are.
    const sent = logo ?? null;
    const sentCover = cover ?? null;
    const onProgress = (percent: number) => {
      const phase = percent >= 100 ? 'finishing' : 'uploading';
      if (sent) setUploadState((prev) => ({ ...prev, phase, percent, file: sent }));
      if (sentCover) setCoverUploadState((prev) => ({ ...prev, phase, percent, file: sentCover }));
    };

    if (sent) setUploadState({ phase: 'uploading', percent: 0, file: sent });
    if (sentCover) setCoverUploadState({ phase: 'uploading', percent: 0, file: sentCover });

    try {
      if (editing === 'new') {
        await create.mutateAsync({
          payload,
          logo: logo ?? undefined,
          cover: cover ?? undefined,
          onProgress,
        });
        showToast(t.trademaster.shopCreated, 'success');
      } else if (editing) {
        await update.mutateAsync({
          id: editing.id,
          payload,
          logo: logo ?? undefined,
          cover: cover ?? undefined,
          onProgress,
        });
        showToast(t.trademaster.shopSaved, 'success');
      }
      setUploadState(IDLE);
      setCoverUploadState(IDLE);
      closeForm();
    } catch (error) {
      // Two audiences, one failure: the sentence goes in the toast, and the
      // status block keeps the code and the server's own words within reach of
      // whoever has to explain it.
      const diagnosis = diagnoseUpload(error, t, sent ?? sentCover);
      logUploadFailure('shop-pictures', diagnosis, error);
      if (sent) setUploadState({ phase: 'error', percent: 0, file: sent, error: diagnosis });
      if (sentCover) setCoverUploadState({ phase: 'error', percent: 0, file: sentCover, error: diagnosis });
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
    if (!shop.businessCategoryId) {
      showToast(hub.categoryRequiredToSubmit, 'error');
      openEdit(shop);
      return;
    }

    try {
      await submit.mutateAsync(shop.id);
      showToast(t.trademaster.shopSubmitted, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function run(action: Promise<unknown>, message: string) {
    try {
      await action;
      showToast(message, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  const formLoading = editingId !== undefined && loadedId !== editingId;
  const lat = parseCoordinate(draft.latitude, 90);
  const lng = parseCoordinate(draft.longitude, 180);

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
              {/* The owner's own route, fetched with the session. The public
                  one serves approved shops only, so a seller's own logo was
                  a broken image for as long as the shop sat in review. */}
              <StaffImage
                path={shop.logoUrl ? `/trademaster/me/shops/${shop.id}/logo` : null}
                alt={shop.name}
                className="size-16 shrink-0 rounded-lg object-cover"
                fallback={
                  <div
                    className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-app-surface-2 text-app-text-3"
                    aria-hidden="true"
                  >
                    <Store className="size-7" />
                  </div>
                }
              />

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

                {/* What happens next, said where the seller is looking. */}
                {shop.moderationStatus === 'APPROVED' && (
                  <p className="mt-2 text-caption text-app-text-3">{hub.approvedShopHint}</p>
                )}
                {shop.moderationStatus === 'PENDING_REVIEW' && (
                  <p className="mt-2 text-caption text-app-text-3">{hub.pendingShopHint}</p>
                )}
                {/* Said here rather than in a confirmation, because it stays
                    true for as long as the shop is shut and the seller may
                    well be looking at this screen days later wondering why
                    their listings vanished. */}
                {shop.state === 'CLOSED' && (
                  <p className="mt-2 text-caption text-app-text-3">{t.trademaster.closedHint}</p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {/* Listings need an approved shop to hang off, so the link is
                    only useful once there is one. */}
                {shop.moderationStatus === 'APPROVED' && (
                  <Link to={`/dashboard/shops/${shop.id}/products`}>
                    <Button size="sm">{hub.manageListings}</Button>
                  </Link>
                )}

                {features.tradeMasterOrders && shop.moderationStatus === 'APPROVED' && (
                  <Link to={`/dashboard/shops/${shop.id}/orders`}>
                    <Button variant="outline" size="sm">
                      {t.trademaster.shopOrders}
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

                {/* The way back to editing the shop itself. Its listings are
                    managed directly and do not need this. */}
                {(shop.moderationStatus === 'APPROVED' ||
                  shop.moderationStatus === 'PENDING_REVIEW') && (
                  <Button
                    variant="outline"
                    size="sm"
                    title={t.trademaster.withdrawHint}
                    onClick={() => {
                      if (
                        shop.moderationStatus === 'APPROVED' &&
                        !window.confirm(hub.withdrawShopConfirm)
                      ) {
                        return;
                      }
                      void run(withdraw.mutateAsync(shop.id), t.trademaster.withdrawn);
                    }}
                  >
                    {t.trademaster.withdraw}
                  </Button>
                )}

                {shop.state === 'OPEN' && shop.moderationStatus === 'APPROVED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void run(close.mutateAsync(shop.id), t.trademaster.shopClosed)}
                  >
                    {t.trademaster.closeShop}
                  </Button>
                )}

                {/* Only from CLOSED. An EXPIRED shop is not the seller's to
                    revive, and the server says so. */}
                {shop.state === 'CLOSED' && (
                  <Button
                    size="sm"
                    onClick={() => void run(reopen.mutateAsync(shop.id), t.trademaster.shopReopened)}
                  >
                    {t.trademaster.reopenShop}
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={editing !== null}
        onClose={closeForm}
        title={editing === 'new' ? t.trademaster.newShop : t.trademaster.editShop}
      >
        {formLoading ? (
          existing.isError ? (
            <p className="text-body text-app-text-3" role="alert">
              {apiMessage(existing.error, t.common.error)}
            </p>
          ) : (
            <div className="flex justify-center py-12">
              <Spinner label={t.common.loading} />
            </div>
          )
        ) : (
          <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-4" noValidate>
            <p className="text-caption text-app-text-3">{hub.requiredHint}</p>

            <FormField
              htmlFor="my-shops-shop-name"
              label={`${t.trademaster.shopName} *`}
              error={errorOf('name')}
            >
              <Input
                id="my-shops-shop-name"
                value={draft.name}
                onChange={(e) => set('name')(e.target.value)}
                invalid={Boolean(errors.name)}
                maxLength={120}
                required
              />
            </FormField>

            <FormField
              htmlFor="my-shops-shop-summary"
              label={`${t.trademaster.shopSummary} *`}
              error={errorOf('summary')}
              hint={hub.summaryHint}
            >
              <TextArea
                id="my-shops-shop-summary"
                value={draft.summary}
                onChange={(e) => set('summary')(e.target.value)}
                invalid={Boolean(errors.summary)}
                rows={2}
                maxLength={300}
                required
              />
            </FormField>

            <FormField
              htmlFor="my-shops-business-category"
              label={`${hub.businessCategory} *`}
              hint={hub.businessCategoryHint}
              error={errorOf('businessCategoryId')}
            >
              <BusinessCategorySelect
                id="my-shops-business-category"
                categories={businessCategories}
                value={draft.businessCategoryId}
                onChange={(value) => set('businessCategoryId')(value)}
                emptyLabel={hub.chooseBusinessCategory}
                showCounts={false}
                invalid={Boolean(errors.businessCategoryId)}
              />
            </FormField>

            <FormField
              htmlFor="my-shops-shop-description"
              label={t.trademaster.shopDescription}
              error={errorOf('description')}
            >
              <TextArea
                id="my-shops-shop-description"
                value={draft.description}
                onChange={(e) => set('description')(e.target.value)}
                invalid={Boolean(errors.description)}
                rows={4}
                maxLength={5000}
              />
            </FormField>

            <div className="flex flex-col gap-1">
              <span className="text-label text-app-text-2">{t.trademaster.logo}</span>
              <CoverField
                value={logo}
                previewPath={
                  editing !== null && editing !== 'new' && editing.logoUrl
                    ? `/trademaster/me/shops/${editing.id}/logo`
                    : null
                }
                onChange={(file) => {
                  setLogo(file);
                  setUploadState(IDLE);
                }}
                uploadState={uploadState}
                onRetryUpload={() => void handleSave()}
              />
              <span className="text-caption text-app-text-3">{t.trademaster.logoHint}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-label text-app-text-2">{hub.coverField}</span>
              <CoverField
                value={cover}
                previewPath={
                  editing !== null && editing !== 'new' && editing.coverUrl
                    ? `/trademaster/me/shops/${editing.id}/cover`
                    : null
                }
                onChange={(file) => {
                  setCover(file);
                  setCoverUploadState(IDLE);
                }}
                uploadState={coverUploadState}
                onRetryUpload={() => void handleSave()}
              />
              <span className="text-caption text-app-text-3">{hub.coverHint}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="my-shops-industry" label={t.trademaster.industry} error={errorOf('industry')}>
                <Input
                  id="my-shops-industry"
                  value={draft.industry}
                  onChange={(e) => set('industry')(e.target.value)}
                  invalid={Boolean(errors.industry)}
                  maxLength={80}
                />
              </FormField>
              <FormField htmlFor="my-shops-province" label={t.trademaster.province} error={errorOf('province')}>
                <Input
                  id="my-shops-province"
                  value={draft.province}
                  onChange={(e) => set('province')(e.target.value)}
                  invalid={Boolean(errors.province)}
                  maxLength={60}
                />
              </FormField>
              <FormField htmlFor="my-shops-city" label={t.trademaster.city} error={errorOf('city')}>
                <Input
                  id="my-shops-city"
                  value={draft.city}
                  onChange={(e) => set('city')(e.target.value)}
                  invalid={Boolean(errors.city)}
                  maxLength={60}
                />
              </FormField>
              <FormField htmlFor="my-shops-phone" label={t.trademaster.phone} error={errorOf('phone')}>
                <Input
                  id="my-shops-phone"
                  type="tel"
                  inputMode="tel"
                  value={draft.phone}
                  onChange={(e) => set('phone')(e.target.value)}
                  invalid={Boolean(errors.phone)}
                  maxLength={30}
                  dir="ltr"
                />
              </FormField>
              <FormField htmlFor="my-shops-email" label={t.trademaster.email} error={errorOf('email')}>
                <Input
                  id="my-shops-email"
                  type="email"
                  value={draft.email}
                  onChange={(e) => set('email')(e.target.value)}
                  invalid={Boolean(errors.email)}
                  maxLength={160}
                  dir="ltr"
                />
              </FormField>
              <FormField htmlFor="my-shops-website" label={t.trademaster.website} error={errorOf('website')}>
                <Input
                  id="my-shops-website"
                  type="url"
                  value={draft.website}
                  onChange={(e) => set('website')(e.target.value)}
                  invalid={Boolean(errors.website)}
                  maxLength={200}
                  dir="ltr"
                  placeholder="https://"
                />
              </FormField>
            </div>

            <FormField htmlFor="my-shops-address" label={t.trademaster.address} error={errorOf('address')}>
              <Input
                id="my-shops-address"
                value={draft.address}
                onChange={(e) => set('address')(e.target.value)}
                invalid={Boolean(errors.address)}
                maxLength={300}
              />
            </FormField>

            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-1 text-label text-app-text-2">{t.trademaster.location}</legend>
              <p className="col-span-full text-caption text-app-text-3">{hub.shopLocationHint}</p>

              <div className="col-span-full flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={geo.locate}
                  disabled={geo.state.status === 'locating'}
                >
                  <LocateFixed className="size-4" aria-hidden="true" />
                  {geo.state.status === 'locating' ? t.trademaster.locating : hub.useMyLocationForShop}
                </Button>
                {(draft.latitude || draft.longitude) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      set('latitude')('');
                      set('longitude')('');
                    }}
                  >
                    <X className="size-4" aria-hidden="true" />
                    {hub.removeLocation}
                  </Button>
                )}
              </div>
              {(geo.state.status === 'denied' || geo.state.status === 'unavailable') && (
                <p className="col-span-full text-caption text-app-text-3" role="status">
                  {geo.state.status === 'denied' ? hub.locationDenied : hub.locationUnavailable}
                </p>
              )}

              <FormField htmlFor="my-shops-latitude" label={t.trademaster.latitude} error={errorOf('latitude')}>
                <Input
                  id="my-shops-latitude"
                  value={draft.latitude}
                  onChange={(e) => set('latitude')(e.target.value)}
                  invalid={Boolean(errors.latitude)}
                  inputMode="decimal"
                  maxLength={20}
                  dir="ltr"
                />
              </FormField>
              <FormField htmlFor="my-shops-longitude" label={t.trademaster.longitude} error={errorOf('longitude')}>
                <Input
                  id="my-shops-longitude"
                  value={draft.longitude}
                  onChange={(e) => set('longitude')(e.target.value)}
                  invalid={Boolean(errors.longitude)}
                  inputMode="decimal"
                  maxLength={20}
                  dir="ltr"
                />
              </FormField>

              {/* The map fills the boxes above; it does not replace them. A map
                  cannot be used with a keyboard alone, and somebody who already
                  has their coordinates should not hunt for the right pixel. */}
              <div className="col-span-full">
                <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-app-surface-2" />}>
                  <LocationPicker
                    latitude={lat ?? undefined}
                    longitude={lat !== null ? (lng ?? undefined) : undefined}
                    onPick={(pickedLat, pickedLng) => {
                      // Six decimals is about 10 cm, which is far past what a
                      // shop front needs and keeps the field readable.
                      set('latitude')(pickedLat.toFixed(6));
                      set('longitude')(pickedLng.toFixed(6));
                    }}
                  />
                </Suspense>
              </div>
            </fieldset>

            <p className="text-caption text-app-text-3">{t.trademaster.submitWarning}</p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeForm}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {t.trademaster.saveDraft}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
