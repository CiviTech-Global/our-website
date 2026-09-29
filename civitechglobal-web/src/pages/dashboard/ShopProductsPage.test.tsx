import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { ToastProvider } from '@/contexts/ToastContext';
import type { OwnProduct, OwnShop } from '@/types/trademaster';

/**
 * The seller's product screen, and specifically its one form in two modes.
 *
 * Adding an option and correcting one share four fields, so they share a
 * form. That is worth the saving only if the mode never leaks: an edit must
 * not create a second option, a create must not overwrite the last one
 * edited, and an emptied price box must mean "no special price" rather than
 * "leave the old one".
 */

const mocks = vi.hoisted(() => ({
  products: [] as OwnProduct[],
  addVariant: vi.fn(async (_input: { productId: string; payload: Record<string, unknown> }) => undefined),
  updateVariant: vi.fn(async (_input: { id: string; payload: Record<string, unknown> }) => undefined),
  removeVariant: vi.fn(async (_id: string) => undefined),
  setCaption: vi.fn(async (_input: { imageId: string; caption?: string }) => undefined),
  noop: vi.fn(async (_input?: unknown) => undefined),
}));

const mutation = (fn: (...args: never[]) => Promise<unknown>) => ({ mutateAsync: fn, isPending: false });

vi.mock('@/api/trademaster', () => ({
  useShopProducts: () => ({ data: mocks.products, isLoading: false }),
  useOwnShops: () => ({ data: [{ id: 's1', name: 'A shop' } as OwnShop] }),
  useProductCategories: () => ({ data: [] }),
  useAddVariant: () => mutation(mocks.addVariant),
  useUpdateVariant: () => mutation(mocks.updateVariant),
  useRemoveVariant: () => mutation(mocks.removeVariant),
  useUpdateImageCaption: () => mutation(mocks.setCaption),
  useAddProductImages: () => mutation(mocks.noop),
  useRemoveProductImage: () => mutation(mocks.noop),
  useCreateProduct: () => mutation(mocks.noop),
  useUpdateProduct: () => mutation(mocks.noop),
  useSubmitProduct: () => mutation(mocks.noop),
  useCloseProduct: () => mutation(mocks.noop),
  useReopenProduct: () => mutation(mocks.noop),
  useWithdrawProduct: () => mutation(mocks.noop),
}));

const { default: ShopProductsPage } = await import('./ShopProductsPage');

function product(over: Partial<OwnProduct> = {}): OwnProduct {
  return {
    id: 'p1',
    code: 'PR1',
    slug: 'mug',
    title: 'A mug',
    summary: 'A mug for tea',
    price: '120000',
    currency: 'IRT',
    stock: 3,
    moderationStatus: 'DRAFT',
    state: 'OPEN',
    reviewNote: null,
    featured: false,
    views: 0,
    publishedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    coverUrl: null,
    images: [],
    variants: [],
    imageCount: 0,
    variantCount: 0,
    ...over,
  };
}

const LARGE = { id: 'v1', label: 'Large', sku: 'L', price: '50000', stock: 3, position: 1 };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/shops/s1/products']}>
      <LocaleProvider>
        <ToastProvider>
          <Routes>
            <Route path="/dashboard/shops/:shopId/products" element={<ShopProductsPage />} />
          </Routes>
        </ToastProvider>
      </LocaleProvider>
    </MemoryRouter>
  );
}

/** Opens the pictures-and-options dialog for the first product. */
async function openManage() {
  await userEvent.click(screen.getByRole('button', { name: /^تصویرها$|^images$/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.products = [product()];
});

describe('the options form', () => {
  it('adds a new option when nothing is being edited', async () => {
    renderPage();
    await openManage();

    await userEvent.type(screen.getByLabelText(/عنوان تنوع|option name|variant/i), 'Small');
    await userEvent.click(screen.getByRole('button', { name: /افزودن تنوع|add option/i }));

    await waitFor(() => expect(mocks.addVariant).toHaveBeenCalledOnce());
    expect(mocks.updateVariant).not.toHaveBeenCalled();
  });

  it('edits the option that was picked, instead of adding another', async () => {
    mocks.products = [product({ variants: [LARGE], variantCount: 1 })];
    renderPage();
    await openManage();

    await userEvent.click(screen.getByRole('button', { name: /ویرایش گزینه|edit option/i }));
    await userEvent.click(screen.getByRole('button', { name: /^ذخیره$|^save$/i }));

    await waitFor(() => expect(mocks.updateVariant).toHaveBeenCalledOnce());
    // The whole point of the two modes: an edit must never create.
    expect(mocks.addVariant).not.toHaveBeenCalled();
    expect(mocks.updateVariant.mock.calls[0][0]).toMatchObject({ id: 'v1' });
  });

  it('fills the form from the option being corrected', async () => {
    mocks.products = [product({ variants: [LARGE], variantCount: 1 })];
    renderPage();
    await openManage();

    await userEvent.click(screen.getByRole('button', { name: /ویرایش گزینه|edit option/i }));

    // Not a blank form to retype: the reader is correcting one field.
    expect(screen.getByDisplayValue('Large')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
  });

  it('clears the price with null when the box is emptied, not undefined', async () => {
    mocks.products = [product({ variants: [LARGE], variantCount: 1 })];
    renderPage();
    await openManage();

    await userEvent.click(screen.getByRole('button', { name: /ویرایش گزینه|edit option/i }));
    await userEvent.clear(screen.getByDisplayValue('50000'));
    await userEvent.click(screen.getByRole('button', { name: /^ذخیره$|^save$/i }));

    await waitFor(() => expect(mocks.updateVariant).toHaveBeenCalledOnce());
    // undefined would mean "leave it alone", and there would be no way back
    // from a price once set.
    expect(mocks.updateVariant.mock.calls[0][0].payload.price).toBeNull();
  });

  it('returns to adding after the edit is cancelled', async () => {
    mocks.products = [product({ variants: [LARGE], variantCount: 1 })];
    renderPage();
    await openManage();

    await userEvent.click(screen.getByRole('button', { name: /ویرایش گزینه|edit option/i }));
    await userEvent.click(screen.getByRole('button', { name: /^انصراف$|^cancel$/i }));

    await userEvent.type(screen.getByLabelText(/عنوان تنوع|option name|variant/i), 'Small');
    await userEvent.click(screen.getByRole('button', { name: /افزودن تنوع|add option/i }));

    // Cancelling has to drop the mode as well as the values, or the next add
    // would overwrite the option that was being corrected.
    await waitFor(() => expect(mocks.addVariant).toHaveBeenCalledOnce());
    expect(mocks.updateVariant).not.toHaveBeenCalled();
  });
});

describe('picture captions', () => {
  it('saves a caption when the box loses focus, and not before', async () => {
    mocks.products = [
      product({
        images: [{ id: 'i1', caption: null, position: 0, url: '/x.png' }],
        imageCount: 1,
      }),
    ];
    renderPage();
    await openManage();

    const box = screen.getByLabelText(/شرح تصویر|caption/i);
    await userEvent.type(box, 'A blue mug');
    expect(mocks.setCaption).not.toHaveBeenCalled();

    await userEvent.tab();

    await waitFor(() => expect(mocks.setCaption).toHaveBeenCalledOnce());
    expect(mocks.setCaption.mock.calls[0][0]).toMatchObject({ imageId: 'i1', caption: 'A blue mug' });
  });

  it('says nothing to the server when the caption was not changed', async () => {
    mocks.products = [
      product({
        images: [{ id: 'i1', caption: 'A blue mug', position: 0, url: '/x.png' }],
        imageCount: 1,
      }),
    ];
    renderPage();
    await openManage();

    await userEvent.click(screen.getByLabelText(/شرح تصویر|caption/i));
    await userEvent.tab();

    // Focus alone is not an edit; a request per glance is a request per glance.
    expect(mocks.setCaption).not.toHaveBeenCalled();
  });
});
