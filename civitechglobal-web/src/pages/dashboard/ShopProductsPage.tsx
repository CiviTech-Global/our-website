import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Eye, EyeOff, ImageOff, Package, Pencil, Plus, Send, Trash2, Wrench, X } from 'lucide-react';
import { IDLE, type UploadState } from '@/components/ui/UploadStatus';
import { diagnoseUpload, logUploadFailure } from '@/lib/uploadError';
import {
  useAddProductImages,
  useAddVariant,
  useCloseProduct,
  useCreateProduct,
  useDeleteProduct,
  useOwnShops,
  useProductCategories,
  useRemoveProductImage,
  useRemoveVariant,
  useReopenProduct,
  useWithdrawProduct,
  useUpdateImageCaption,
  useUpdateVariant,
  useShopProducts,
  useSubmitProduct,
  useUpdateProduct,
} from '@/api/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useClientList } from '@/lib/clientList';
import { useListControls } from '@/lib/useListControls';
import { apiMessage } from '@/lib/apiMessage';
import { toPersianDigits } from '@/i18n/utils';
import { formatMoney, moderationVariant } from '@/lib/marketplace';
import {
  EMPTY_LISTING,
  EMPTY_OPTION,
  listingPayload,
  optionPayload,
  validateListing,
  validateOption,
  type FieldErrors,
  type ListingDraft,
  type OptionDraft,
} from '@/lib/marketForms';
import { CategorySelect } from '@/components/trademaster/MarketplaceUi';
import { PageHeader } from '@/components/app/PageHeader';
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
import type { ListingKind, ModerationStatus, OwnProduct } from '@/types/trademaster';

const PAGE_SIZE = 10;
const MAX_IMAGES = 12;

/** Where the seller can still change a listing; the server's own rule. */
const EDITABLE: ModerationStatus[] = ['DRAFT', 'CHANGES_REQUESTED', 'APPROVED'];

/** The saved listing, as the form's boxes hold it. */
function draftFrom(product: OwnProduct): ListingDraft {
  return {
    kind: product.kind,
    title: product.title,
    summary: product.summary,
    description: product.description ?? '',
    categoryId: product.categoryId ?? '',
    price: product.price,
    stock: product.kind === 'PRODUCT' ? String(product.stock) : '',
    negotiable: product.negotiable,
  };
}

/**
 * The products and services inside one shop.
 *
 * The owner runs this catalogue themselves. Once the shop is approved and the
 * owner verified, a listing is published, edited and deleted directly — no
 * queue — and edits to a published listing are live at once. The one
 * exception is a listing the review desk has sent back: that is resubmitted to
 * the desk, which asked to see the correction.
 *
 * Three jobs on one screen rather than three screens: the list, the listing
 * form, and the pictures and options for whichever listing is open. A seller
 * adding their first ten listings should not be navigating a hierarchy to do
 * it, and pictures only make sense next to the thing they are of.
 */
export default function ShopProductsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, locale } = useLocale();
  const hub = t.trademaster.hub;
  const { showToast } = useToast();

  const { data: shops, isLoading: loadingShops } = useOwnShops();
  const shop = shops?.find((candidate) => candidate.id === shopId);

  const { data: products, isLoading } = useShopProducts(shopId);
  const { data: categories } = useProductCategories();

  useDocumentTitle(
    shop ? t.trademaster.productsIn.replace('{shop}', shop.name) : t.trademaster.products
  );

  const controls = useListControls({ pageSize: PAGE_SIZE, filters: { status: '', kind: '' } });
  const list = useClientList(products, controls, {
    searchFields: (product) => [product.title, product.code],
    filters: {
      status: (row, value) => row.moderationStatus === value,
      kind: (row, value) => row.kind === value,
    },
    pageSize: PAGE_SIZE,
  });

  const create = useCreateProduct();
  const update = useUpdateProduct();
  const submit = useSubmitProduct();
  const close = useCloseProduct();
  const reopen = useReopenProduct();
  const withdraw = useWithdrawProduct();
  const remove = useDeleteProduct();
  const addImages = useAddProductImages();
  const removeImage = useRemoveProductImage();
  const addVariant = useAddVariant();
  const removeVariant = useRemoveVariant();
  const updateVariant = useUpdateVariant();
  const setCaption = useUpdateImageCaption();

  const [editing, setEditing] = useState<'new' | OwnProduct | null>(null);
  const [draft, setDraft] = useState<ListingDraft>(EMPTY_LISTING);
  const [errors, setErrors] = useState<FieldErrors<keyof ListingDraft>>({});
  /**
   * The listing whose pictures and options are open, by id.
   *
   * An id rather than the row, so the gallery reads the latest fetch: adding or
   * removing a picture refetches the list, and a row captured when the dialog
   * opened would go on showing the old set. An id also lets the dialog open on
   * a listing that has only just been created and is not in the list yet.
   */
  const [managingId, setManagingId] = useState<string | null>(null);
  const [option, setOption] = useState<OptionDraft>(EMPTY_OPTION);
  const [optionErrors, setOptionErrors] = useState<FieldErrors<keyof OptionDraft>>({});
  /** The option being corrected, or null while the form is adding a new one. */
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>(IDLE);

  const live = managingId ? (products?.find((row) => row.id === managingId) ?? null) : null;

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  const set = <K extends keyof ListingDraft>(name: K) => (value: ListingDraft[K]) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };
  const errorOf = (name: keyof ListingDraft) => (errors[name] ? hub[errors[name]] : undefined);
  const optionErrorOf = (name: keyof OptionDraft) =>
    optionErrors[name] ? hub[optionErrors[name]] : undefined;

  const shopOpen = shop?.moderationStatus === 'APPROVED' && shop.state === 'OPEN';

  function openNew() {
    setDraft(EMPTY_LISTING);
    setErrors({});
    setEditing('new');
  }

  function openEdit(product: OwnProduct) {
    // Every field from the saved listing, including the ones the form used to
    // open blank: the description, the category, and "negotiable" — which was
    // switched off on every save because the form never loaded it.
    setDraft(draftFrom(product));
    setErrors({});
    setEditing(product);
  }

  function setKind(kind: ListingKind) {
    setDraft((prev) => {
      // A category belongs to one kind; keeping a services category on a
      // product would be refused by the server, so it is cleared here.
      const category = categories?.find((candidate) => candidate.id === prev.categoryId);
      return {
        ...prev,
        kind,
        categoryId: category && category.kind !== kind ? '' : prev.categoryId,
      };
    });
    setErrors((prev) => ({ ...prev, kind: undefined, stock: undefined, categoryId: undefined }));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!shopId) return;

    const found = validateListing(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showToast(hub.fixErrors, 'error');
      return;
    }

    try {
      if (editing === 'new') {
        const created = await create.mutateAsync({ shopId, payload: listingPayload(draft, false) });
        showToast(hub.listingCreated, 'success');
        setEditing(null);
        // Straight on to the pictures: a listing cannot be published without
        // one, and making the seller find the button is a step for nothing.
        setManagingId(created.id);
      } else if (editing) {
        await update.mutateAsync({ id: editing.id, payload: listingPayload(draft, true) });
        showToast(
          editing.moderationStatus === 'APPROVED' ? hub.savedLive : t.trademaster.productSaved,
          'success'
        );
        setEditing(null);
      }
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

  async function handlePublish(product: OwnProduct) {
    // Told here rather than after a round trip; the server checks it too.
    if (product.imageCount === 0) {
      showToast(t.trademaster.imageRequired, 'error');
      setManagingId(product.id);
      return;
    }
    try {
      const result = await submit.mutateAsync(product.id);
      showToast(result.moderationStatus === 'APPROVED' ? hub.published : hub.sentForReview, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  function handleDelete(product: OwnProduct) {
    if (!window.confirm(hub.deleteConfirm.replace('{title}', product.title))) return;
    if (managingId === product.id) setManagingId(null);
    void run(remove.mutateAsync(product.id), hub.deleted);
  }

  async function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = input.files;
    if (!files?.length || !live) return;

    const chosen = Array.from(files);
    // Cleared at once, so choosing the same file again — after a failed upload,
    // say — still fires a change. A file input holding its last value ignores
    // the same selection silently.
    input.value = '';

    const remaining = MAX_IMAGES - live.imageCount;
    if (chosen.length > remaining) {
      showToast(t.trademaster.imageLimit.replace('{count}', number(Math.max(0, remaining))), 'error');
      return;
    }

    setUploadState({ phase: 'uploading', percent: 0, file: chosen[0] });
    try {
      await addImages.mutateAsync({
        productId: live.id,
        files: chosen,
        onProgress: (percent) =>
          setUploadState((prev) => ({
            ...prev,
            phase: percent >= 100 ? 'finishing' : 'uploading',
            percent,
          })),
      });
      setUploadState(IDLE);
      showToast(t.trademaster.imagesAdded, 'success');
    } catch (error) {
      const diagnosis = diagnoseUpload(error, t, chosen[0]);
      logUploadFailure('product-images', diagnosis, error);
      setUploadState({ phase: 'error', percent: 0, file: chosen[0], error: diagnosis });
      showToast(diagnosis.message, 'error');
    }
  }

  async function handleSaveOption(event: FormEvent) {
    event.preventDefault();
    if (!live) return;

    const found = validateOption(option, live.kind);
    setOptionErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      const payload = optionPayload(option, live.kind);
      if (editingOption) {
        await updateVariant.mutateAsync({ id: editingOption, payload });
      } else {
        await addVariant.mutateAsync({ productId: live.id, payload });
      }

      setOption(EMPTY_OPTION);
      setEditingOption(null);
      showToast(editingOption ? t.trademaster.variantUpdated : t.trademaster.variantAdded, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  function closeManager() {
    setManagingId(null);
    setUploadState(IDLE);
    // Otherwise the next listing's dialog opens holding the last one's
    // half-corrected option, and saving it would write those values onto an
    // option that belongs to something else.
    setOption(EMPTY_OPTION);
    setOptionErrors({});
    setEditingOption(null);
  }

  if (!shopId) return null;

  const notOpenMessage =
    shop && shop.moderationStatus !== 'APPROVED'
      ? hub.shopNotApproved
      : shop && shop.state !== 'OPEN'
        ? hub.shopClosedForListings
        : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={shop ? t.trademaster.productsIn.replace('{shop}', shop.name) : t.trademaster.products}
        description={hub.listingsManageHint}
        className="mb-2"
        actions={
          <div className="flex gap-2">
            <Link to="/dashboard/shops">
              <Button variant="ghost">{t.trademaster.myShops}</Button>
            </Link>
            {shopOpen && (
              <Button onClick={openNew}>
                <Plus className="size-4" aria-hidden="true" />
                {hub.newListing}
              </Button>
            )}
          </div>
        }
      />

      {!loadingShops && !shop && (
        <EmptyState title={t.errors.notFoundTitle} description={t.errors.notFoundBody} />
      )}

      {notOpenMessage && (
        <Card>
          <p className="text-body text-app-text-3">{notOpenMessage}</p>
        </Card>
      )}

      {(products?.length ?? 0) > 0 && (
        <ListToolbar
          controls={controls}
          searchPlaceholder={t.trademaster.searchProducts}
          total={list.total}
          isLoading={isLoading}
          filters={
            <Select
              className="w-40"
              value={controls.filters.kind}
              aria-label={hub.kindLabel}
              onChange={(e) => controls.setFilter('kind', e.target.value)}
            >
              <option value="">{hub.kindAll}</option>
              <option value="PRODUCT">{hub.kindProducts}</option>
              <option value="SERVICE">{hub.kindServices}</option>
            </Select>
          }
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && shop && products?.length === 0 && (
        <EmptyState
          title={hub.noListingsYet}
          description={shopOpen ? hub.noListingsYetBody : undefined}
          icon={<Package aria-hidden="true" />}
          action={
            shopOpen ? (
              <Button onClick={openNew}>
                <Plus className="size-4" aria-hidden="true" />
                {hub.newListing}
              </Button>
            ) : undefined
          }
        />
      )}

      <ul className="flex flex-col gap-3">
        {list.items.map((product) => {
          const editable = EDITABLE.includes(product.moderationStatus);
          const isService = product.kind === 'SERVICE';
          return (
            <li key={product.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {/* The owner's own route, for the same reason as the shop
                    logo: the public route answers 404 for every draft. */}
                <StaffImage
                  path={
                    product.images[0] ? `/trademaster/me/products/images/${product.images[0].id}` : null
                  }
                  alt={product.title}
                  className="size-16 shrink-0 rounded-lg object-cover"
                  fallback={
                    <div
                      className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-app-surface-2 text-app-text-3"
                      aria-hidden="true"
                    >
                      <ImageOff className="size-6" />
                    </div>
                  }
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-app-text-1">{product.title}</h2>
                    <Badge variant={isService ? 'info' : 'default'}>
                      {isService ? hub.kindService : hub.kindProduct}
                    </Badge>
                    <Badge variant={moderationVariant(product.moderationStatus)}>
                      {product.moderationStatus === 'APPROVED' ? hub.statusPublished : t.market[product.moderationStatus]}
                    </Badge>
                    {product.state === 'CLOSED' && <Badge variant="warning">{hub.statusHidden}</Badge>}
                    {!isService && !product.available && (
                      <Badge variant="warning">{t.trademaster.outOfStock}</Badge>
                    )}
                  </div>

                  <p className="mt-1 text-body text-app-text-3">
                    {formatMoney(product.price, locale)} {t.market.currency}
                    {product.negotiable && ` · ${t.trademaster.negotiable}`}
                  </p>

                  <p className="mt-1 flex flex-wrap gap-3 text-caption text-app-text-3">
                    {!isService && product.variantCount === 0 && (
                      <span>
                        {t.trademaster.stock}: {number(product.stock)}
                      </span>
                    )}
                    <span>
                      {t.trademaster.images}: {number(product.imageCount)}
                    </span>
                    <span>
                      {t.trademaster.variants}: {number(product.variantCount)}
                    </span>
                    {product.publishedAt && (
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" aria-hidden="true" />
                        {t.trademaster.viewsLabel}: {number(product.views)}
                      </span>
                    )}
                  </p>

                  {product.reviewNote && (
                    <p className="mt-2 rounded-lg bg-app-surface-2 p-2 text-caption text-app-text-2">
                      <span className="font-medium">{t.market.reviewNote}: </span>
                      {product.reviewNote}
                    </p>
                  )}
                  {product.moderationStatus === 'PENDING_REVIEW' && (
                    <p className="mt-2 text-caption text-app-text-3">{hub.pendingListingHint}</p>
                  )}
                  {product.moderationStatus === 'REJECTED' && (
                    <p className="mt-2 text-caption text-app-text-3">{hub.rejectedListingHint}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {editable && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(product)}>
                        <Pencil className="size-4" aria-hidden="true" />
                        {t.common.edit}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setManagingId(product.id)}>
                        {hub.picturesAndOptions}
                      </Button>
                    </>
                  )}

                  {(product.moderationStatus === 'DRAFT' ||
                    product.moderationStatus === 'CHANGES_REQUESTED') && (
                    <Button size="sm" onClick={() => void handlePublish(product)} disabled={!shopOpen}>
                      <Send className="size-4" aria-hidden="true" />
                      {product.moderationStatus === 'CHANGES_REQUESTED' ? hub.resubmit : hub.publish}
                    </Button>
                  )}

                  {product.moderationStatus === 'APPROVED' && product.state === 'OPEN' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title={hub.hideHint}
                      onClick={() => void run(close.mutateAsync(product.id), hub.hidden)}
                    >
                      <EyeOff className="size-4" aria-hidden="true" />
                      {hub.hide}
                    </Button>
                  )}

                  {product.state === 'CLOSED' && (
                    <Button
                      size="sm"
                      onClick={() => void run(reopen.mutateAsync(product.id), hub.shown)}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      {hub.show}
                    </Button>
                  )}

                  {/* Taking a listing back out of the review queue. A live
                      listing is edited in place and does not need this. */}
                  {product.moderationStatus === 'PENDING_REVIEW' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void run(withdraw.mutateAsync(product.id), t.trademaster.withdrawn)}
                    >
                      {t.trademaster.withdraw}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-app-danger"
                    onClick={() => handleDelete(product)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t.common.delete}
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {/* The listing form */}
      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? hub.newListing : hub.editListing}
      >
        <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-4" noValidate>
          <p className="text-caption text-app-text-3">{hub.requiredHint}</p>

          <fieldset>
            <legend className="mb-2 text-label text-app-text-2">{hub.kindField} *</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['PRODUCT', 'SERVICE'] as const).map((kind) => (
                <label
                  key={kind}
                  htmlFor={`listing-kind-${kind}`}
                  // A grid rather than nested wrappers: the name is a direct
                  // child of the label, where assistive tech (and the a11y
                  // lint) reads it as the radio's accessible name.
                  className={`grid cursor-pointer grid-cols-[auto_1fr] items-center gap-x-2 gap-y-0.5 rounded-lg border p-3 font-medium text-app-text-1 ${
                    draft.kind === kind ? 'border-app-text-2 bg-app-surface-2' : 'border-app-border'
                  }`}
                >
                  <input
                    id={`listing-kind-${kind}`}
                    type="radio"
                    name="listing-kind"
                    value={kind}
                    checked={draft.kind === kind}
                    onChange={() => setKind(kind)}
                  />
                  {kind === 'PRODUCT' ? hub.kindProduct : hub.kindService}
                  <span className="col-start-2 flex items-center gap-1.5 text-caption font-normal text-app-text-3">
                    {kind === 'PRODUCT' ? (
                      <Package className="size-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Wrench className="size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    {kind === 'PRODUCT' ? hub.kindProductHint : hub.kindServiceHint}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <FormField htmlFor="listing-title" label={`${hub.titleField} *`} error={errorOf('title')}>
            <Input
              id="listing-title"
              value={draft.title}
              onChange={(e) => set('title')(e.target.value)}
              invalid={Boolean(errors.title)}
              maxLength={160}
              required
            />
          </FormField>

          <FormField
            htmlFor="listing-summary"
            label={`${t.trademaster.productSummary} *`}
            error={errorOf('summary')}
            hint={hub.summaryHint}
          >
            <TextArea
              id="listing-summary"
              value={draft.summary}
              onChange={(e) => set('summary')(e.target.value)}
              invalid={Boolean(errors.summary)}
              rows={2}
              maxLength={300}
              required
            />
          </FormField>

          <FormField
            htmlFor="listing-description"
            label={t.trademaster.productDescription}
            error={errorOf('description')}
          >
            <TextArea
              id="listing-description"
              value={draft.description}
              onChange={(e) => set('description')(e.target.value)}
              invalid={Boolean(errors.description)}
              rows={4}
              maxLength={5000}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="listing-category" label={t.trademaster.category}>
              <CategorySelect
                id="listing-category"
                categories={categories}
                kind={draft.kind}
                value={draft.categoryId}
                onChange={(value) => set('categoryId')(value)}
                emptyLabel={t.trademaster.noCategory}
                showCounts={false}
              />
            </FormField>

            <FormField
              htmlFor="listing-price"
              label={`${t.trademaster.price} *`}
              hint={t.market.currency}
              error={errorOf('price')}
            >
              <Input
                id="listing-price"
                value={draft.price}
                onChange={(e) => set('price')(e.target.value)}
                invalid={Boolean(errors.price)}
                inputMode="numeric"
                maxLength={24}
                dir="ltr"
                required
              />
            </FormField>

            {draft.kind === 'PRODUCT' ? (
              <FormField
                htmlFor="listing-stock"
                label={t.trademaster.stock}
                hint={hub.stockHint}
                error={errorOf('stock')}
              >
                <Input
                  id="listing-stock"
                  value={draft.stock}
                  onChange={(e) => set('stock')(e.target.value)}
                  invalid={Boolean(errors.stock)}
                  inputMode="numeric"
                  maxLength={9}
                  dir="ltr"
                />
              </FormField>
            ) : (
              <p className="self-end pb-2 text-caption text-app-text-3">{hub.serviceNoStock}</p>
            )}

            <label className="flex items-center gap-2 self-end pb-2 text-body text-app-text-2">
              <input
                type="checkbox"
                checked={draft.negotiable}
                onChange={(e) => set('negotiable')(e.target.checked)}
              />
              {t.trademaster.negotiableLabel}
            </label>
          </div>

          {editing !== 'new' && editing?.moderationStatus === 'APPROVED' && (
            <p className="text-caption text-app-text-3">{hub.liveEditHint}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing === 'new' ? hub.createAndAddPictures : t.common.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pictures and options for one saved listing */}
      <Modal
        isOpen={managingId !== null}
        onClose={closeManager}
        title={live?.title ?? hub.picturesAndOptions}
      >
        {!live ? (
          <div className="flex justify-center py-12">
            <Spinner label={t.common.loading} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <section>
              <h3 className="mb-1 text-label text-app-text-2">{t.trademaster.images}</h3>
              <p className="mb-2 text-caption text-app-text-3">{t.trademaster.imagesHint}</p>

              {live.images.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2">
                  {live.images.map((image) => {
                    // A published listing must keep a picture; the server says
                    // so too, and this says why before anyone clicks.
                    const lastOfLive = live.moderationStatus === 'APPROVED' && live.imageCount <= 1;
                    return (
                      <li key={image.id} className="relative w-28">
                        <StaffImage
                          path={`/trademaster/me/products/images/${image.id}`}
                          alt={image.caption || live.title}
                          className="size-20 rounded-lg object-cover"
                          fallback={
                            <div className="flex size-20 items-center justify-center rounded-lg bg-app-surface-2 text-app-text-3">
                              <ImageOff className="size-5" aria-hidden="true" />
                            </div>
                          }
                        />
                        <button
                          type="button"
                          disabled={lastOfLive}
                          title={lastOfLive ? hub.lastPictureHint : undefined}
                          onClick={() => {
                            if (!window.confirm(hub.removePictureConfirm)) return;
                            void run(removeImage.mutateAsync(image.id), t.trademaster.imageRemoved);
                          }}
                          aria-label={t.trademaster.removeImage}
                          className="absolute -end-1 -top-1 rounded-full bg-app-surface-1 p-1 text-app-danger shadow disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>

                        {/* Uncontrolled and saved on the way out: a caption is a
                            sentence somebody types once, and a request per
                            keystroke would be a request per keystroke. */}
                        <Input
                          key={image.id}
                          defaultValue={image.caption ?? ''}
                          aria-label={t.trademaster.imageCaption}
                          placeholder={t.trademaster.imageCaption}
                          title={t.trademaster.imageCaptionHint}
                          maxLength={160}
                          className="mt-1 h-7 text-caption"
                          onBlur={(event) => {
                            const caption = event.target.value.trim();
                            if (caption === (image.caption ?? '')) return;
                            void run(
                              setCaption.mutateAsync({ imageId: image.id, caption }),
                              t.trademaster.captionSaved
                            );
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}

              <input
                type="file"
                accept="image/*"
                multiple
                aria-label={t.trademaster.addImages}
                onChange={(e) => void handleImages(e)}
                disabled={addImages.isPending || live.imageCount >= MAX_IMAGES}
              />

              <p className="mt-1 text-caption text-app-text-3">
                {t.trademaster.imageLimit.replace(
                  '{count}',
                  number(Math.max(0, MAX_IMAGES - live.imageCount))
                )}
              </p>

              {uploadState.phase === 'uploading' && (
                <p className="mt-2 text-caption text-app-text-3" role="status">
                  {t.upload.states.uploadingPercent.replace('{percent}', number(uploadState.percent))}
                </p>
              )}

              {live.moderationStatus === 'DRAFT' && live.imageCount > 0 && shopOpen && (
                <Button className="mt-3" size="sm" onClick={() => void handlePublish(live)}>
                  <Send className="size-4" aria-hidden="true" />
                  {hub.publishNow}
                </Button>
              )}
            </section>

            <section>
              <h3 className="mb-1 text-label text-app-text-2">{t.trademaster.variants}</h3>
              <p className="mb-2 text-caption text-app-text-3">
                {live.kind === 'SERVICE' ? hub.serviceOptionsHint : t.trademaster.variantsHint}
              </p>

              {live.variants.length > 0 && (
                <ul className="mb-3 flex flex-col divide-y divide-app-border-1">
                  {live.variants.map((variant) => (
                    <li key={variant.id} className="flex items-center gap-3 py-2">
                      <span className="flex-1 text-body text-app-text-1">{variant.label}</span>
                      <span className="text-caption text-app-text-3">
                        {/* Null price means "same as the listing", not free. */}
                        {variant.price
                          ? `${formatMoney(variant.price, locale)} ${t.market.currency}`
                          : hub.sameAsListing}
                      </span>
                      {live.kind === 'PRODUCT' && (
                        <span className="text-caption text-app-text-3">
                          {t.trademaster.stock}: {number(variant.stock)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOption(variant.id);
                          setOptionErrors({});
                          setOption({
                            label: variant.label,
                            sku: variant.sku ?? '',
                            // Back into the form in the shape the form speaks:
                            // an absent price stays absent rather than becoming
                            // a zero the seller did not type.
                            price: variant.price ?? '',
                            stock: live.kind === 'PRODUCT' ? String(variant.stock) : '',
                          });
                        }}
                        aria-label={t.trademaster.editVariant}
                        className="text-app-text-3 hover:text-app-text"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(hub.removeOptionConfirm.replace('{label}', variant.label))) return;
                          if (editingOption === variant.id) {
                            setEditingOption(null);
                            setOption(EMPTY_OPTION);
                          }
                          void run(removeVariant.mutateAsync(variant.id), t.trademaster.variantRemoved);
                        }}
                        aria-label={t.trademaster.removeVariant}
                        className="text-app-danger"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={(event) => void handleSaveOption(event)} className="grid gap-3 sm:grid-cols-2" noValidate>
                <FormField
                  htmlFor="variant-label"
                  label={`${t.trademaster.variantLabel} *`}
                  hint={t.trademaster.variantLabelHint}
                  error={optionErrorOf('label')}
                >
                  <Input
                    id="variant-label"
                    value={option.label}
                    onChange={(e) => setOption((prev) => ({ ...prev, label: e.target.value }))}
                    invalid={Boolean(optionErrors.label)}
                    maxLength={60}
                    required
                  />
                </FormField>

                <FormField htmlFor="variant-sku" label={t.trademaster.variantSku} error={optionErrorOf('sku')}>
                  <Input
                    id="variant-sku"
                    value={option.sku}
                    onChange={(e) => setOption((prev) => ({ ...prev, sku: e.target.value }))}
                    invalid={Boolean(optionErrors.sku)}
                    maxLength={60}
                    dir="ltr"
                  />
                </FormField>

                <FormField
                  htmlFor="variant-price"
                  label={t.trademaster.variantPrice}
                  hint={hub.optionPriceHint}
                  error={optionErrorOf('price')}
                >
                  <Input
                    id="variant-price"
                    value={option.price}
                    onChange={(e) => setOption((prev) => ({ ...prev, price: e.target.value }))}
                    invalid={Boolean(optionErrors.price)}
                    inputMode="numeric"
                    maxLength={24}
                    dir="ltr"
                  />
                </FormField>

                {live.kind === 'PRODUCT' && (
                  <FormField
                    htmlFor="variant-stock"
                    label={t.trademaster.variantStock}
                    error={optionErrorOf('stock')}
                  >
                    <Input
                      id="variant-stock"
                      value={option.stock}
                      onChange={(e) => setOption((prev) => ({ ...prev, stock: e.target.value }))}
                      invalid={Boolean(optionErrors.stock)}
                      inputMode="numeric"
                      maxLength={9}
                      dir="ltr"
                    />
                  </FormField>
                )}

                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addVariant.isPending || updateVariant.isPending}
                  >
                    {editingOption ? (
                      <Pencil className="size-4" aria-hidden="true" />
                    ) : (
                      <Plus className="size-4" aria-hidden="true" />
                    )}
                    {editingOption ? t.common.save : t.trademaster.addVariant}
                  </Button>

                  {editingOption && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingOption(null);
                        setOption(EMPTY_OPTION);
                        setOptionErrors({});
                      }}
                    >
                      <X className="size-4" aria-hidden="true" />
                      {t.common.cancel}
                    </Button>
                  )}
                </div>
              </form>
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
