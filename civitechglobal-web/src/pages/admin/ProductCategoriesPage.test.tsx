import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { ToastProvider } from '@/contexts/ToastContext';
import type { AdminProductCategory } from '@/types/trademaster';

/**
 * The category desk, rendered.
 *
 * The service tests cover what the server refuses. These cover what the screen
 * offers, which is a different question: a rule enforced only on the server is
 * one the reader discovers by being told no.
 */

const mocks = vi.hoisted(() => ({
  rows: [] as AdminProductCategory[],
  create: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
}));

vi.mock('@/api/trademaster', () => ({
  useCategoryDesk: () => ({ data: mocks.rows, isLoading: false }),
  useCreateCategory: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: mocks.update, isPending: false }),
  useDeleteCategory: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));

const { default: ProductCategoriesPage } = await import('./ProductCategoriesPage');

function category(over: Partial<AdminProductCategory> = {}): AdminProductCategory {
  return {
    id: 'c1',
    slug: 'home',
    name: 'Home',
    kind: 'PRODUCT',
    parentId: null,
    position: 0,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    productCount: 0,
    childCount: 0,
    ...over,
  };
}

function renderPage() {
  return render(
    // The page sets the document title, which reads the location.
    <MemoryRouter initialEntries={['/admin/trademaster/categories']}>
      <LocaleProvider>
        <ToastProvider>
          <ProductCategoriesPage />
        </ToastProvider>
      </LocaleProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows = [];
});

describe('the category desk', () => {
  it('says so when there is nothing yet, rather than showing an empty list', () => {
    renderPage();

    // A blank page is indistinguishable from a broken one, and this is the
    // state every deployment starts in. The empty state says both what is
    // missing and why it matters.
    expect(screen.getByText(/هنوز دسته‌بندی‌ای تعریف نشده|no categories/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /دستهٔ جدید|new categor/i }).length).toBeGreaterThan(0);
  });

  it('shows a switched-off category as hidden rather than leaving it out', () => {
    mocks.rows = [category({ active: false })];
    renderPage();

    // The desk opened this screen to find it; a filter that hid it would be
    // the one thing that makes the screen useless.
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText(/پنهان|hidden/i)).toBeInTheDocument();
  });

  it('counts the products in a category, in the digits the reader uses', () => {
    mocks.rows = [category({ productCount: 30 })];
    renderPage();

    // ۳۰, not 30: the default locale here is Persian, and a Persian screen
    // carrying Latin numerals is the detail that makes it look translated
    // rather than written. The count itself is of ALL products, drafts
    // included, because somebody about to hide a category needs to know.
    expect(screen.getByText(/۳۰/)).toBeInTheDocument();
  });

  it('asks before deleting, and only deletes when told twice', async () => {
    mocks.rows = [category()];
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /حذف|delete/i }));
    expect(mocks.remove).not.toHaveBeenCalled();

    // The second button is the confirmation's own.
    const confirm = screen.getAllByRole('button', { name: /حذف|delete/i }).at(-1)!;
    await userEvent.click(confirm);

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('c1'));
  });

  it('does not offer a category as its own parent', async () => {
    mocks.rows = [category({ id: 'c1', name: 'Home' }), category({ id: 'c2', name: 'Garden', slug: 'garden' })];
    renderPage();

    // Open the edit form on the first one.
    await userEvent.click(screen.getAllByRole('button', { name: /ویرایش|edit/i })[0]);

    const select = await screen.findByLabelText(/دستهٔ والد|parent/i);
    const options = within(select).getAllByRole('option').map((o) => o.textContent);

    // The server refuses this; leaving it out of the menu means nobody has to
    // be told.
    expect(options).not.toContain('Home');
    expect(options).toContain('Garden');
  });

  it('does not offer a child as a parent, because the tree is two deep', async () => {
    mocks.rows = [
      category({ id: 'c1', name: 'Home' }),
      category({ id: 'c2', name: 'Knives', slug: 'knives', parentId: 'c1' }),
    ];
    renderPage();

    await userEvent.click(screen.getAllByRole('button', { name: /دستهٔ جدید|new categor/i })[0]);

    const select = await screen.findByLabelText(/دستهٔ والد|parent/i);
    const options = within(select).getAllByRole('option').map((o) => o.textContent);

    expect(options).toContain('Home');
    expect(options).not.toContain('Knives');
  });
});
