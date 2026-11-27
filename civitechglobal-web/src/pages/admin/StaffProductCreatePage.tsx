import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Package, PackagePlus, Wrench } from 'lucide-react';
import { useProductCategories, useShopReview, useStaffCreateProduct } from '@/api/trademaster';
import { useToast } from '@/contexts/ToastContext';
import { useLocale } from '@/i18n/LocaleProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useDocumentTitle } from '@/lib/documentTitle';
import {
  EMPTY_LISTING,
  listingPayload,
  validateListing,
  type FieldErrors,
  type ListingDraft,
} from '@/lib/marketForms';
import { PageHeader } from '@/components/app/PageHeader';
import { Panel } from '@/components/app/Panel';
import { CategorySelect } from '@/components/trademaster/MarketplaceUi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import type { ListingKind } from '@/types/trademaster';

/**
 * The market desk adds a listing to a shop it manages.
 *
 * The same fields and the same validation as the seller's own listing form;
 * the difference is only whose shop it lands in. The listing is a draft —
 * pictures and publishing stay with the owner, from their dashboard, and the
 * desk's review queue sees it like anything else that is submitted.
 */
export default function StaffProductCreatePage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useLocale();
  const desk = t.trademaster.desk;
  const hub = t.trademaster.hub;
  useDocumentTitle(desk.addListing);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { data: shop, isLoading } = useShopReview(shopId);
  const { data: categories } = useProductCategories();
  const create = useStaffCreateProduct();

  const [draft, setDraft] = useState<ListingDraft>(EMPTY_LISTING);
  const [errors, setErrors] = useState<FieldErrors<keyof ListingDraft>>({});

  const set = <K extends keyof ListingDraft>(name: K) => (value: ListingDraft[K]) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };
  const errorOf = (name: keyof ListingDraft) => (errors[name] ? hub[errors[name]] : undefined);

  function setKind(kind: ListingKind) {
    setDraft((prev) => {
      // A category belongs to one kind; keeping a services category on a
      // product would be refused by the server, so it is cleared here.
      const category = categories?.find((candidate) => candidate.id === prev.categoryId);
      return { ...prev, kind, categoryId: category && category.kind !== kind ? '' : prev.categoryId };
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
      await create.mutateAsync({ shopId, payload: listingPayload(draft, false) });
      showToast(desk.listingCreated, 'success');
      navigate('/admin/trademaster/shops');
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={t.common.loading} />
      </div>
    );
  }

  if (!shop) {
    return <Card><p className="text-body text-app-text-3">{t.errors.notFoundBody}</p></Card>;
  }

  const shopOpen = shop.moderationStatus === 'APPROVED' && shop.state === 'OPEN';

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={desk.addListing}
        description={desk.addListingSubtitle.replace('{shop}', shop.name)}
        actions={
          <Link to="/admin/trademaster/shops">
            <Button variant="ghost">{t.common.cancel}</Button>
          </Link>
        }
      />

      {!shopOpen && (
        <Card>
          <p className="text-body text-app-text-3">{hub.shopNotApproved}</p>
        </Card>
      )}

      <form onSubmit={(event) => void handleSave(event)} noValidate>
        <Panel title={shop.name}>
          <div className="flex flex-col gap-4">
            <p className="text-caption text-app-text-3">{hub.requiredHint}</p>

            <fieldset>
              <legend className="mb-2 text-label text-app-text-2">{hub.kindField} *</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['PRODUCT', 'SERVICE'] as const).map((kind) => (
                  <label
                    key={kind}
                    htmlFor={`desk-listing-kind-${kind}`}
                    className={`grid cursor-pointer grid-cols-[auto_1fr] items-center gap-x-2 gap-y-0.5 rounded-lg border p-3 font-medium text-app-text-1 ${
                      draft.kind === kind ? 'border-app-text-2 bg-app-surface-2' : 'border-app-border'
                    }`}
                  >
                    <input
                      id={`desk-listing-kind-${kind}`}
                      type="radio"
                      name="desk-listing-kind"
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

            <FormField htmlFor="desk-listing-title" label={`${hub.titleField} *`} error={errorOf('title')}>
              <Input
                id="desk-listing-title"
                value={draft.title}
                onChange={(e) => set('title')(e.target.value)}
                invalid={Boolean(errors.title)}
                maxLength={160}
                required
              />
            </FormField>

            <FormField
              htmlFor="desk-listing-summary"
              label={`${t.trademaster.productSummary} *`}
              error={errorOf('summary')}
              hint={hub.summaryHint}
            >
              <TextArea
                id="desk-listing-summary"
                value={draft.summary}
                onChange={(e) => set('summary')(e.target.value)}
                invalid={Boolean(errors.summary)}
                rows={2}
                maxLength={300}
                required
              />
            </FormField>

            <FormField
              htmlFor="desk-listing-description"
              label={t.trademaster.productDescription}
              error={errorOf('description')}
            >
              <TextArea
                id="desk-listing-description"
                value={draft.description}
                onChange={(e) => set('description')(e.target.value)}
                invalid={Boolean(errors.description)}
                rows={4}
                maxLength={5000}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="desk-listing-category" label={t.trademaster.category}>
                <CategorySelect
                  id="desk-listing-category"
                  categories={categories}
                  kind={draft.kind}
                  value={draft.categoryId}
                  onChange={(value) => set('categoryId')(value)}
                  emptyLabel={t.trademaster.noCategory}
                  showCounts={false}
                />
              </FormField>

              <FormField
                htmlFor="desk-listing-price"
                label={`${t.trademaster.price} *`}
                hint={t.market.currency}
                error={errorOf('price')}
              >
                <Input
                  id="desk-listing-price"
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
                  htmlFor="desk-listing-stock"
                  label={t.trademaster.stock}
                  hint={hub.stockHint}
                  error={errorOf('stock')}
                >
                  <Input
                    id="desk-listing-stock"
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

            <div className="flex justify-end">
              <Button type="submit" size="lg" isLoading={create.isPending} disabled={!shopOpen}>
                <PackagePlus className="size-4" aria-hidden="true" />
                {desk.createListing}
              </Button>
            </div>
          </div>
        </Panel>
      </form>
    </div>
  );
}
