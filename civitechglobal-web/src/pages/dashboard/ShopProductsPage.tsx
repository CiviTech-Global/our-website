import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Eye, ImageOff, Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import { IDLE, type UploadState } from '@/components/ui/UploadStatus';
import { diagnoseUpload, logUploadFailure } from '@/lib/uploadError';
import {
  useAddProductImages,
  useAddVariant,
  useCloseProduct,
  useCreateProduct,
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
import { TextArea } from '@/components/ui/TextArea';
import type { OwnProduct } from '@/types/trademaster';

const EMPTY_DRAFT = {
  title: '',
  summary: '',
  description: '',
  categoryId: '',
  price: '',
  stock: '',
  negotiable: false,
};

const EMPTY_VARIANT = { label: '', sku: '', price: '', stock: '' };

const PAGE_SIZE = 10;
const MAX_IMAGES = 12;

/**
 * The products inside one shop.
 *
 * Three jobs on one screen rather than three screens: the list, the product
 * form, and the pictures and options for whichever product is open. A seller
 * adding their first ten products should not be navigating a hierarchy to do
 * it, and the pictures only make sense next to the thing they are of.
 *
 * Pictures and options are edited on a saved product, not on the draft form —
 * both need an id to attach to, and inventing a client-side holding area for
 * files that may never be saved is a good way to lose somebody's uploads.
 */
export default function ShopProductsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, locale } = useLocale();
  const { showToast } = useToast();

  const { data: shops } = useOwnShops();
  const shop = shops?.find((candidate) => candidate.id === shopId);

  const { data: products, isLoading } = useShopProducts(shopId);
  const { data: categories } = useProductCategories();

  useDocumentTitle(
    shop ? t.trademaster.productsIn.replace('{shop}', shop.name) : t.trademaster.products
  );

  const controls = useListControls({ pageSize: PAGE_SIZE, filters: { status: '' } });
  const list = useClientList(products, controls, {
    searchFields: (product) => [product.title, product.code],
    filters: { status: (row, value) => row.moderationStatus === value },
    pageSize: PAGE_SIZE,
  });

  const create = useCreateProduct();
  const update = useUpdateProduct();
  const submit = useSubmitProduct();
  const close = useCloseProduct();
  const reopen = useReopenProduct();
  const withdraw = useWithdrawProduct();
  const addImages = useAddProductImages();
  const removeImage = useRemoveProductImage();
  const addVariant = useAddVariant();
  const removeVariant = useRemoveVariant();
  const updateVariant = useUpdateVariant();
  const setCaption = useUpdateImageCaption();

  const [editing, setEditing] = useState<'new' | OwnProduct | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [managing, setManaging] = useState<OwnProduct | null>(null);
  const [variant, setVariant] = useState(EMPTY_VARIANT);
  /**
   * The option being corrected, or null while the form is adding a new one.
   *
   * One form in two modes rather than two forms: the fields are the same four
   * either way, and a separate edit dialog would be the same inputs again with
   * its own copy of the parsing rules — including the one about an empty price
   * meaning "same as the product" rather than free.
   */
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>(IDLE);

  /**
   * The row from the latest fetch, not the one captured when the modal opened.
   *
   * Adding or removing a picture invalidates the list, so the object held in
   * `managing` goes stale the moment anything changes. Reading through to the
   * fresh row means the gallery updates in place instead of showing the set
   * that existed when the modal was opened.
   */
  const live = managing ? (products?.find((row) => row.id === managing.id) ?? null) : null;

  const number = (value: number) => (locale === 'fa' ? toPersianDigits(value) : String(value));
  const digits = (value: string) => value.replace(/[^0-9]/g, '');
  const set = (name: keyof typeof draft) => (value: string | boolean) =>
    setDraft((prev) => ({ ...prev, [name]: value }));

  function openNew() {
    setDraft(EMPTY_DRAFT);
    setEditing('new');
  }

  function openEdit(product: OwnProduct) {
    setDraft({
      ...EMPTY_DRAFT,
      title: product.title,
      summary: product.summary,
      price: product.price,
      stock: String(product.stock),
    });
    setEditing(product);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!shopId) return;

    const payload = {
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      description: draft.description.trim() || undefined,
      categoryId: draft.categoryId || undefined,
      price: digits(draft.price),
      stock: draft.stock ? Number(digits(draft.stock)) : undefined,
      negotiable: draft.negotiable,
    };

    try {
      if (editing === 'new') {
        await create.mutateAsync({ shopId, payload });
        showToast(t.trademaster.productCreated, 'success');
      } else if (editing) {
        await update.mutateAsync({ id: editing.id, payload });
        showToast(t.trademaster.productSaved, 'success');
      }
      setEditing(null);
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function handleImages(files: FileList | null) {
    if (!files?.length || !managing) return;

    const chosen = Array.from(files);
    const remaining = MAX_IMAGES - (live?.imageCount ?? managing.imageCount);
    if (chosen.length > remaining) {
      showToast(t.trademaster.imageLimit.replace('{count}', number(Math.max(0, remaining))), 'error');
      return;
    }

    setUploadState({ phase: 'uploading', percent: 0, file: chosen[0] });
    try {
      await addImages.mutateAsync({
        productId: managing.id,
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

  async function run(action: Promise<unknown>, message: string) {
    try {
      await action;
      showToast(message, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  async function handleSubmitProduct(product: OwnProduct) {
    // Told here rather than after a round trip; the server checks it too.
    if (product.imageCount === 0) {
      showToast(t.trademaster.imageRequired, 'error');
      return;
    }
    await run(submit.mutateAsync(product.id), t.trademaster.productSubmitted);
  }

  async function handleAddVariant(event: FormEvent) {
    event.preventDefault();
    if (!managing) return;

    try {
      const payload = {
        label: variant.label.trim(),
        sku: variant.sku.trim() || undefined,
        // Empty means "same as the product", which is not the same as zero —
        // and null rather than undefined, so emptying the box on an edit
        // actually removes the override instead of leaving the old one.
        price: digits(variant.price) || null,
        stock: variant.stock ? Number(digits(variant.stock)) : undefined,
      };

      if (editingVariant) {
        await updateVariant.mutateAsync({ id: editingVariant, payload });
      } else {
        await addVariant.mutateAsync({ productId: managing.id, payload });
      }

      setVariant(EMPTY_VARIANT);
      setEditingVariant(null);
      showToast(editingVariant ? t.trademaster.variantUpdated : t.trademaster.variantAdded, 'success');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  if (!shopId) return null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          shop ? t.trademaster.productsIn.replace('{shop}', shop.name) : t.trademaster.products
        }
        className="mb-2"
        actions={
          <div className="flex gap-2">
            <Link to="/dashboard/shops">
              <Button variant="ghost">{t.trademaster.myShops}</Button>
            </Link>
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              {t.trademaster.newProduct}
            </Button>
          </div>
        }
      />

      {(products?.length ?? 0) > 0 && (
        <ListToolbar
          controls={controls}
          searchPlaceholder={t.trademaster.searchProducts}
          total={list.total}
          isLoading={isLoading}
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && products?.length === 0 && (
        <EmptyState
          title={t.trademaster.noOwnProducts}
          icon={<Package aria-hidden="true" />}
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden="true" />
              {t.trademaster.newProduct}
            </Button>
          }
        />
      )}

      <ul className="flex flex-col gap-3">
        {list.items.map((product) => (
          <li key={product.id}>
            <Card className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {product.coverUrl ? (
                <img
                  src={product.coverUrl}
                  alt={product.title}
                  className="size-16 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-app-surface-2 text-app-text-3"
                  aria-hidden="true"
                >
                  <ImageOff className="size-6" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-app-text-1">{product.title}</h2>
                  <Badge variant={moderationVariant(product.moderationStatus)}>
                    {t.market[product.moderationStatus]}
                  </Badge>
                </div>

                <p className="mt-1 text-body text-app-text-3">
                  {formatMoney(product.price, locale)} {t.market.currency}
                </p>

                <p className="mt-1 flex flex-wrap gap-3 text-caption text-app-text-3">
                  <span>
                    {t.trademaster.stock}: {number(product.stock)}
                  </span>
                  <span>
                    {t.trademaster.images}: {number(product.imageCount)}
                  </span>
                  <span>
                    {t.trademaster.variants}: {number(product.variantCount)}
                  </span>
                  {/* Counted on every public view since the module was built,
                      and shown to nobody until now. The one number a seller
                      actually wants from a catalogue that cannot yet sell. */}
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
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {(product.moderationStatus === 'DRAFT' ||
                  product.moderationStatus === 'CHANGES_REQUESTED') && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setManaging(product)}>
                      {t.trademaster.images}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(product)}>
                      {t.trademaster.editProduct}
                    </Button>
                    <Button size="sm" onClick={() => void handleSubmitProduct(product)}>
                      {t.trademaster.submitForReview}
                    </Button>
                  </>
                )}

                {(product.moderationStatus === 'APPROVED' ||
                  product.moderationStatus === 'PENDING_REVIEW') && (
                  <Button
                    variant="outline"
                    size="sm"
                    title={t.trademaster.withdrawHint}
                    onClick={() =>
                      void run(withdraw.mutateAsync(product.id), t.trademaster.withdrawn)
                    }
                  >
                    {t.trademaster.withdraw}
                  </Button>
                )}

                {product.moderationStatus === 'APPROVED' && product.state === 'OPEN' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void run(close.mutateAsync(product.id), t.trademaster.productClosed)}
                  >
                    {t.common.close}
                  </Button>
                )}

                {/* Closed by its seller, so theirs to put back. A product in a
                    closed shop can be reopened here too — it simply stays
                    invisible until the shop is open, which is what the shops
                    screen says. */}
                {product.state === 'CLOSED' && (
                  <Button
                    size="sm"
                    onClick={() => void run(reopen.mutateAsync(product.id), t.trademaster.productReopened)}
                  >
                    {t.trademaster.reopenProduct}
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {/* The product form */}
      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t.trademaster.newProduct : t.trademaster.editProduct}
      >
        <form onSubmit={(event) => void handleSave(event)} className="flex flex-col gap-4">
          <FormField htmlFor="shop-products-product-title" label={t.trademaster.productTitle}>
            <Input id="shop-products-product-title" value={draft.title} onChange={(e) => set('title')(e.target.value)} required />
          </FormField>

          <FormField htmlFor="shop-products-product-summary" label={t.trademaster.productSummary}>
            <TextArea
              id="shop-products-product-summary"
              value={draft.summary}
              onChange={(e) => set('summary')(e.target.value)}
              rows={2}
              required
            />
          </FormField>

          <FormField htmlFor="shop-products-product-description" label={t.trademaster.productDescription}>
            <TextArea
              id="shop-products-product-description"
              value={draft.description}
              onChange={(e) => set('description')(e.target.value)}
              rows={4}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="shop-products-category" label={t.trademaster.category}>
              <Select
                id="shop-products-category"
                value={draft.categoryId}
                onChange={(e) => set('categoryId')(e.target.value)}
              >
                <option value="">{t.trademaster.noCategory}</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField htmlFor="shop-products-price" label={t.trademaster.price} hint={t.market.currency}>
              <Input
                id="shop-products-price"
                value={draft.price}
                onChange={(e) => set('price')(e.target.value)}
                inputMode="numeric"
                dir="ltr"
                required
              />
            </FormField>

            <FormField htmlFor="shop-products-stock" label={t.trademaster.stock}>
              <Input
                id="shop-products-stock"
                value={draft.stock}
                onChange={(e) => set('stock')(e.target.value)}
                inputMode="numeric"
                dir="ltr"
              />
            </FormField>

            <label className="flex items-center gap-2 self-end pb-2 text-body text-app-text-2">
              <input
                type="checkbox"
                checked={draft.negotiable}
                onChange={(e) => set('negotiable')(e.target.checked)}
              />
              {t.trademaster.negotiableLabel}
            </label>
          </div>

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

      {/* Pictures and options for one saved product */}
      <Modal
        isOpen={managing !== null}
        onClose={() => {
          setManaging(null);
          setUploadState(IDLE);
          // Otherwise the next product's form opens holding the last one's
          // half-corrected option, and submitting it would write those values
          // onto a variant that belongs to something else.
          setVariant(EMPTY_VARIANT);
          setEditingVariant(null);
        }}
        title={live?.title ?? managing?.title ?? t.trademaster.images}
      >
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="mb-1 text-label text-app-text-2">{t.trademaster.images}</h3>
            <p className="mb-2 text-caption text-app-text-3">{t.trademaster.imagesHint}</p>

            {live && live.images.length > 0 && (
              <ul className="mb-3 flex flex-wrap gap-2">
                {live.images.map((image) => (
                  <li key={image.id} className="relative w-28">
                    <img
                      src={image.url}
                      alt={image.caption || live.title}
                      className="size-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        void run(removeImage.mutateAsync(image.id), t.trademaster.imageRemoved)
                      }
                      aria-label={t.trademaster.removeImage}
                      className="absolute -end-1 -top-1 rounded-full bg-app-surface-1 p-1 text-app-danger shadow"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>

                    {/* Uncontrolled and saved on the way out: a caption is a
                        sentence somebody types once, and a request per
                        keystroke would be a request per keystroke. Keyed by
                        the image id so a fresh list does not put one picture's
                        words under another's. */}
                    <Input
                      key={image.id}
                      defaultValue={image.caption ?? ''}
                      aria-label={t.trademaster.imageCaption}
                      placeholder={t.trademaster.imageCaption}
                      // Says it becomes the picture's alt text, which is the
                      // reason to bother writing one.
                      title={t.trademaster.imageCaptionHint}
                      maxLength={200}
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
                ))}
              </ul>
            )}

            <input
              type="file"
              accept="image/*"
              multiple
              aria-label={t.trademaster.addImages}
              onChange={(e) => void handleImages(e.target.files)}
              disabled={addImages.isPending || (live?.imageCount ?? 0) >= MAX_IMAGES}
            />

            <p className="mt-1 text-caption text-app-text-3">
              {t.trademaster.imageLimit.replace(
                '{count}',
                number(Math.max(0, MAX_IMAGES - (live?.imageCount ?? 0)))
              )}
            </p>

            {uploadState.phase === 'uploading' && (
              <p className="mt-2 text-caption text-app-text-3">
                {t.upload.states.uploadingPercent.replace(
                  '{percent}',
                  number(uploadState.percent)
                )}
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-1 text-label text-app-text-2">{t.trademaster.variants}</h3>
            <p className="mb-2 text-caption text-app-text-3">{t.trademaster.variantsHint}</p>

            {live && live.variants.length > 0 && (
              <ul className="mb-3 flex flex-col divide-y divide-app-border-1">
                {live.variants.map((option) => (
                  <li key={option.id} className="flex items-center gap-3 py-2">
                    <span className="flex-1 text-body text-app-text-1">{option.label}</span>
                    <span className="text-caption text-app-text-3">
                      {/* Null price means "same as the product", not free. */}
                      {option.price
                        ? `${formatMoney(option.price, locale)} ${t.market.currency}`
                        : '—'}
                    </span>
                    <span className="text-caption text-app-text-3">
                      {t.trademaster.stock}: {number(option.stock)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVariant(option.id);
                        setVariant({
                          label: option.label,
                          sku: option.sku ?? '',
                          // Back into the form in the shape the form speaks:
                          // digit strings, with an absent price staying absent
                          // rather than becoming a zero the seller did not type.
                          price: option.price ?? '',
                          stock: String(option.stock),
                        });
                      }}
                      aria-label={t.trademaster.editVariant}
                      className="text-app-text-3 hover:text-app-text"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void run(removeVariant.mutateAsync(option.id), t.trademaster.variantRemoved)
                      }
                      aria-label={t.trademaster.removeVariant}
                      className="text-app-danger"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={(event) => void handleAddVariant(event)}
              className="grid gap-3 sm:grid-cols-2"
            >
              <FormField htmlFor="variant-label" label={t.trademaster.variantLabel} hint={t.trademaster.variantLabelHint}>
                <Input
                  id="variant-label"
                  value={variant.label}
                  onChange={(e) => setVariant((prev) => ({ ...prev, label: e.target.value }))}
                  required
                />
              </FormField>

              <FormField htmlFor="variant-sku" label={t.trademaster.variantSku}>
                <Input
                  id="variant-sku"
                  value={variant.sku}
                  onChange={(e) => setVariant((prev) => ({ ...prev, sku: e.target.value }))}
                  dir="ltr"
                />
              </FormField>

              <FormField htmlFor="variant-price" label={t.trademaster.variantPrice}>
                <Input
                  id="variant-price"
                  value={variant.price}
                  onChange={(e) => setVariant((prev) => ({ ...prev, price: e.target.value }))}
                  inputMode="numeric"
                  dir="ltr"
                />
              </FormField>

              <FormField htmlFor="variant-stock" label={t.trademaster.variantStock}>
                <Input
                  id="variant-stock"
                  value={variant.stock}
                  onChange={(e) => setVariant((prev) => ({ ...prev, stock: e.target.value }))}
                  inputMode="numeric"
                  dir="ltr"
                />
              </FormField>

              <div className="flex gap-2 sm:col-span-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={addVariant.isPending || updateVariant.isPending}
                >
                  {editingVariant ? (
                    <Pencil className="size-4" aria-hidden="true" />
                  ) : (
                    <Plus className="size-4" aria-hidden="true" />
                  )}
                  {editingVariant ? t.common.save : t.trademaster.addVariant}
                </Button>

                {editingVariant && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingVariant(null);
                      setVariant(EMPTY_VARIANT);
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
      </Modal>
    </div>
  );
}
