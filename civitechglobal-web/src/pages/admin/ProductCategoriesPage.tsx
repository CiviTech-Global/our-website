import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useBusinessCategoryDesk,
  useCategoryDesk,
  useCreateBusinessCategory,
  useCreateCategory,
  useDeleteBusinessCategory,
  useDeleteCategory,
  useUpdateBusinessCategory,
  useUpdateCategory,
} from '@/api/trademaster';
import type { CategoryPayload, ListingKind } from '@/types/trademaster';
import { useLocale } from '@/i18n/LocaleProvider';
import { useToast } from '@/contexts/ToastContext';
import { useDocumentTitle } from '@/lib/documentTitle';
import { apiMessage } from '@/lib/apiMessage';
import { toLatinDigits, toPersianDigits } from '@/i18n/utils';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

/**
 * How the marketplace is filed — both of its lists, on one desk.
 *
 * LISTING categories file what is offered (a coat, a haircut) and carry a
 * kind; BUSINESS categories file what a shop is (a barber, a bookshop). The
 * same staff do both, with the same two-level shape and the same rules, so it
 * is one screen in two modes rather than two screens that drift apart.
 *
 * Staff work, not seller work. A seller who can invent categories invents
 * twelve spellings of the same one inside a month, and the filters stop
 * meaning anything.
 *
 * Laid out as the two levels it actually has, parents with their children
 * indented under them. The shape of the tree is the thing being edited, so it
 * should be the thing on the screen.
 */

export type DeskMode = 'listing' | 'business';

/** One row, whichever list it came from. */
interface DeskRow {
  id: string;
  slug: string;
  name: string;
  kind?: ListingKind;
  parentId: string | null;
  position: number;
  active: boolean;
  /** Products filed here (listing) or shops (business). */
  count: number;
  childCount: number;
}

/**
 * Both lists' hooks, called every time in the same order — the rules of hooks
 * — with only the chosen one actually fetching.
 */
function useDesk(mode: DeskMode) {
  const listing = useCategoryDesk(mode === 'listing');
  const business = useBusinessCategoryDesk(mode === 'business');
  const createListing = useCreateCategory();
  const updateListing = useUpdateCategory();
  const deleteListing = useDeleteCategory();
  const createBusiness = useCreateBusinessCategory();
  const updateBusiness = useUpdateBusinessCategory();
  const deleteBusiness = useDeleteBusinessCategory();

  const rows: DeskRow[] =
    mode === 'listing'
      ? (listing.data ?? []).map((row) => ({ ...row, count: row.productCount }))
      : (business.data ?? []).map((row) => ({ ...row, count: row.shopCount }));

  return {
    rows,
    isLoading: mode === 'listing' ? listing.isLoading : business.isLoading,
    create: mode === 'listing' ? createListing : createBusiness,
    update: mode === 'listing' ? updateListing : updateBusiness,
    remove: mode === 'listing' ? deleteListing : deleteBusiness,
  };
}

export default function ProductCategoriesPage() {
  return <CategoryDesk mode="listing" />;
}

export function CategoryDesk({ mode }: { mode: DeskMode }) {
  const { t, locale } = useLocale();
  const hub = t.trademaster.hub;
  const title = mode === 'listing' ? t.categoryDesk.title : hub.guildDeskTitle;
  const subtitle = mode === 'listing' ? t.categoryDesk.subtitle : hub.guildDeskSubtitle;
  const countLabel = mode === 'listing' ? t.categoryDesk.productsCount : hub.shopsInCategory;
  useDocumentTitle(title);
  const { showToast } = useToast();

  const desk = useDesk(mode);
  const { rows: all, isLoading, update, remove } = desk;

  const [editing, setEditing] = useState<DeskRow | 'new' | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const onError = (error: unknown) => showToast(apiMessage(error, t.common.error), 'error');

  const parents = all.filter((row) => row.parentId === null);
  const childrenOf = (id: string) => all.filter((row) => row.parentId === id);

  // A child whose parent is missing from the list cannot happen today — the
  // desk list is unfiltered — but rendering only `parents` and their children
  // would silently drop such a row, and a category you cannot see is one you
  // cannot fix. Anything unaccounted for is shown at the end.
  const placed = new Set(parents.flatMap((p) => [p.id, ...childrenOf(p.id).map((c) => c.id)]));
  const orphans = all.filter((row) => !placed.has(row.id));

  async function toggleActive(row: DeskRow) {
    try {
      await update.mutateAsync({ id: row.id, payload: { active: !row.active } });
      showToast(t.categoryDesk.updated, 'success');
    } catch (error) {
      onError(error);
    }
  }

  async function confirmDelete(id: string) {
    try {
      await remove.mutateAsync(id);
      setConfirming(null);
      showToast(t.categoryDesk.deleted, 'success');
    } catch (error) {
      // The server refuses while anything or any child points at it, and says
      // how many. That message is more useful than anything written here.
      onError(error);
    }
  }

  function renderRow(row: DeskRow, child: boolean) {
    return (
      <li key={row.id} className={child ? 'ms-6' : undefined}>
        <Card className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-medium text-app-text">
                {row.name}
                {/* Shown on the top of each branch; children always share it. */}
                {mode === 'listing' && !child && (
                  <Badge variant={row.kind === 'SERVICE' ? 'info' : 'default'}>
                    {row.kind === 'SERVICE' ? hub.kindServices : hub.kindProducts}
                  </Badge>
                )}
                {!row.active && <Badge variant="default">{t.categoryDesk.hidden}</Badge>}
              </p>
              <p className="ltr font-mono text-caption text-app-text-4">{row.slug}</p>
            </div>

            <Badge>{count(countLabel, row.count, locale)}</Badge>
            {row.childCount > 0 && (
              <Badge variant="default">{count(t.categoryDesk.childrenCount, row.childCount, locale)}</Badge>
            )}

            <Button
              size="sm"
              variant="ghost"
              aria-label={row.active ? t.categoryDesk.hidden : t.categoryDesk.active}
              disabled={update.isPending}
              onClick={() => void toggleActive(row)}
            >
              {row.active ? (
                <Eye className="size-4" aria-hidden="true" />
              ) : (
                <EyeOff className="size-4 text-app-text-4" aria-hidden="true" />
              )}
            </Button>

            <Button size="sm" variant="outline" onClick={() => setEditing(row)}>
              <Pencil className="size-4" aria-hidden="true" />
              {t.common.edit}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              aria-label={t.common.delete}
              onClick={() => setConfirming(row.id)}
            >
              <Trash2 className="size-4 text-status-error" aria-hidden="true" />
            </Button>
          </div>

          {confirming === row.id && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-app-border-light pt-3">
              <p className="text-body text-app-text-3">{t.categoryDesk.confirmDelete}</p>
              <Button
                size="sm"
                variant="danger"
                isLoading={remove.isPending}
                onClick={() => void confirmDelete(row.id)}
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
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            {t.categoryDesk.add}
          </Button>
        }
        className="mb-2"
      />

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner label={t.common.loading} />
        </div>
      )}

      {!isLoading && all.length === 0 && (
        <EmptyState
          title={t.categoryDesk.empty}
          description={t.categoryDesk.emptyHint}
          icon={<FolderTree aria-hidden="true" />}
          action={
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden="true" />
              {t.categoryDesk.add}
            </Button>
          }
        />
      )}

      {all.length > 0 && (
        <ul className="flex flex-col gap-2">
          {parents.map((parent) => (
            <li key={parent.id}>
              <ul className="flex flex-col gap-2">
                {renderRow(parent, false)}
                {childrenOf(parent.id).map((child) => renderRow(child, true))}
              </ul>
            </li>
          ))}
          {orphans.map((row) => renderRow(row, true))}
        </ul>
      )}

      {editing && (
        <CategoryForm
          mode={mode}
          desk={desk}
          countLabel={countLabel}
          category={editing === 'new' ? null : editing}
          parents={parents}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** '{count} products', with the digits in the reader's own script. */
function count(template: string, value: number, locale: string): string {
  return template.replace('{count}', locale === 'fa' ? toPersianDigits(value) : String(value));
}

function CategoryForm({
  mode,
  desk,
  countLabel,
  category,
  parents,
  onClose,
}: {
  mode: DeskMode;
  desk: ReturnType<typeof useDesk>;
  countLabel: string;
  category: DeskRow | null;
  parents: DeskRow[];
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const hub = t.trademaster.hub;
  const { showToast } = useToast();
  const { create, update } = desk;

  const [values, setValues] = useState<CategoryPayload>({
    name: category?.name ?? '',
    kind: category?.kind ?? 'PRODUCT',
    slug: category?.slug ?? '',
    parentId: category?.parentId ?? null,
    position: category?.position,
    active: category?.active ?? true,
  });

  // A category cannot be its own parent, and cannot sit under one of its own
  // children — the tree is two deep, so "its own children" is the whole list
  // of things it could strand. The server refuses both; leaving them out of
  // the menu means nobody has to be told.
  const available = parents.filter((row) => row.id !== category?.id);
  // One that already has children cannot become a child itself: that would be
  // a third level, which no screen shows. The server refuses it too.
  const hasChildren = (category?.childCount ?? 0) > 0;
  const parent = parents.find((row) => row.id === values.parentId);

  async function submit(event: FormEvent) {
    event.preventDefault();

    // An empty slug is sent as undefined rather than '', so the server derives
    // one from the name instead of storing nothing.
    const payload: CategoryPayload = {
      ...values,
      // Only listing categories have a kind, and a child takes its parent's;
      // sending one would only be ignored — or, for a guild, refused.
      kind: mode === 'listing' && !values.parentId ? values.kind : undefined,
      slug: values.slug?.trim() ? values.slug.trim() : undefined,
    };

    try {
      if (category) await update.mutateAsync({ id: category.id, payload });
      else await create.mutateAsync(payload);
      showToast(category ? t.categoryDesk.updated : t.categoryDesk.created, 'success');
      onClose();
    } catch (error) {
      showToast(apiMessage(error, t.common.error), 'error');
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <Modal isOpen onClose={onClose} title={category ? t.categoryDesk.editTitle : t.categoryDesk.add}>
      <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
        <FormField label={t.categoryDesk.name} htmlFor="category-name">
          <Input
            id="category-name"
            value={values.name}
            required
            minLength={2}
            maxLength={80}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
          />
        </FormField>

        <FormField label={t.categoryDesk.slug} htmlFor="category-slug" hint={t.categoryDesk.slugHint}>
          <Input
            id="category-slug"
            className="ltr"
            value={values.slug ?? ''}
            maxLength={60}
            onChange={(event) => setValues({ ...values, slug: event.target.value })}
          />
        </FormField>

        <FormField label={t.categoryDesk.parent} htmlFor="category-parent" hint={t.categoryDesk.depthHint}>
          <Select
            id="category-parent"
            value={values.parentId ?? ''}
            disabled={hasChildren}
            onChange={(event) => setValues({ ...values, parentId: event.target.value || null })}
          >
            <option value="">{t.categoryDesk.topLevel}</option>
            {available.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </FormField>

        {/* Products or services: chosen at the top of a branch, inherited below it. */}
        {mode === 'listing' &&
          (parent ? (
            <p className="text-caption text-app-text-3">
              {hub.kindInherited.replace(
                '{kind}',
                parent.kind === 'SERVICE' ? hub.kindServices : hub.kindProducts
              )}
            </p>
          ) : (
            <FormField label={hub.kindField} htmlFor="category-kind" hint={hub.kindCategoryHint}>
              <Select
                id="category-kind"
                value={values.kind ?? 'PRODUCT'}
                onChange={(event) =>
                  setValues({ ...values, kind: event.target.value === 'SERVICE' ? 'SERVICE' : 'PRODUCT' })
                }
              >
                <option value="PRODUCT">{hub.kindProducts}</option>
                <option value="SERVICE">{hub.kindServices}</option>
              </Select>
            </FormField>
          ))}

        <FormField label={t.categoryDesk.position} htmlFor="category-position">
          <Input
            id="category-position"
            className="ltr"
            inputMode="numeric"
            value={values.position ?? ''}
            maxLength={4}
            onChange={(event) => {
              // Persian digits are digits too; they used to be dropped here.
              const digits = toLatinDigits(event.target.value).replace(/[^0-9]/g, '');
              // Cleared means "leave it where it is", which on a new category
              // is the end of its siblings — not position zero, which would
              // silently put every new category first.
              setValues({ ...values, position: digits === '' ? undefined : Number(digits) });
            }}
          />
        </FormField>

        <label className="flex items-center gap-2 text-body text-app-text-2">
          <input
            type="checkbox"
            checked={values.active ?? true}
            onChange={(event) => setValues({ ...values, active: event.target.checked })}
          />
          {t.categoryDesk.active}
        </label>

        {category && (
          <p className="text-caption text-app-text-4">{count(countLabel, category.count, locale)}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" isLoading={busy}>
            {t.common.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
