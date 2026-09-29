import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { ToastProvider } from '@/contexts/ToastContext';
import type { DemoBatch } from '@/api/demo';

/**
 * The demo-data panel, rendered.
 *
 * One button here empties tables. The server refuses to do it in production
 * and refuses anybody who is not the owner, but neither of those guards helps
 * against the mistake this screen can actually make: a press meant for the
 * button beside it. So the thing worth pinning is that a single click removes
 * nothing.
 */

const mocks = vi.hoisted(() => ({
  status: { data: [] as DemoBatch[], isLoading: false, isError: false, refetch: vi.fn() },
  seed: vi.fn(async () => ({ batch: 'b1' })),
  clear: vi.fn(async () => ({ batches: 1, deleted: 42, missing: 0 })),
}));

vi.mock('@/api/demo', () => ({
  useDemoStatus: () => mocks.status,
  useSeedDemo: () => ({ mutateAsync: mocks.seed, isPending: false }),
  useClearDemo: () => ({ mutateAsync: mocks.clear, isPending: false }),
}));

const { default: DemoDataPage } = await import('./DemoDataPage');

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/demo']}>
      <LocaleProvider>
        <ToastProvider>
          <DemoDataPage />
        </ToastProvider>
      </LocaleProvider>
    </MemoryRouter>
  );
}

const clearButton = () => screen.getAllByRole('button', { name: /حذف داده‌های نمونه|remove demo/i });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.status = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
});

describe('the demo data panel', () => {
  it('removes nothing on a single press', async () => {
    renderPage();

    await userEvent.click(clearButton()[0]);

    // The confirmation is open; nothing has been deleted yet.
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(screen.getByText(/داده‌هایی که این ابزار ساخته|everything the tool created/i)).toBeInTheDocument();
  });

  it('removes only after the confirmation is pressed', async () => {
    renderPage();

    await userEvent.click(clearButton()[0]);
    await userEvent.click(clearButton().at(-1)!);

    await waitFor(() => expect(mocks.clear).toHaveBeenCalledOnce());
  });

  it('lets the confirmation be backed out of', async () => {
    renderPage();

    await userEvent.click(clearButton()[0]);
    await userEvent.click(screen.getByRole('button', { name: /انصراف|cancel/i }));

    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it('creates on a single press, because creating is not destructive', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /ساخت داده‌های نمونه|create demo/i }));

    await waitFor(() => expect(mocks.seed).toHaveBeenCalledOnce());
  });

  it('says the tool is absent rather than showing an error when the server has no such route', () => {
    // In production every endpoint behind this answers 404. A super admin who
    // opens the page on a production build should read "not available here",
    // not a red box that looks like something is broken.
    mocks.status = { data: undefined as never, isLoading: false, isError: true, refetch: vi.fn() };
    renderPage();

    expect(screen.getByText(/فقط در محیط توسعه|only available in development/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /حذف داده‌های نمونه|remove demo/i })).toBeNull();
  });

  it('warns what removal touches, beside the button that does it', () => {
    renderPage();

    // "Remove demo data" is only reassuring if you know it cannot take the
    // real catalogue with it.
    expect(screen.getByText(/فهرست بیمه‌ها|insurance catalogue/i)).toBeInTheDocument();
  });
});
