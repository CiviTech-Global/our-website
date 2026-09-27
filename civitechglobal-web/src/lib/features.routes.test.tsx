import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * What the client gate actually guarantees.
 *
 * Not that the code is absent from the bundle — it is not, and features.ts says
 * so. What it guarantees is that with a flag off the route does not resolve, so
 * nothing in the app can reach a module whose endpoints answer 404.
 *
 * ON THE SHAPE OF THIS FILE. The first two attempts used `vi.doMock` plus
 * `vi.resetModules()` in a beforeEach, re-importing the whole app graph for
 * every case. That made the file pass alone and fail intermittently in a full
 * suite, and adding cases made it worse — one run took 37 seconds and two
 * assertions failed for reasons that had nothing to do with the gate.
 *
 * The fix was to notice that `{features.x && <Route/>}` is evaluated when App
 * RENDERS, not when its module loads. So the module graph can be imported once
 * and the flags mutated between renders: no resetModules, no import timing, no
 * lazy-chunk race across module registries. Fast and deterministic.
 */

const mocked = vi.hoisted(() => ({
  features: { tradeMaster: true, tradeMasterOrders: false },
}));

vi.mock('@/lib/features', () => ({ features: mocked.features }));

let App: typeof import('@/App').default;
let LocaleProvider: typeof import('@/i18n/LocaleProvider').LocaleProvider;
let ThemeProvider: typeof import('@/contexts/ThemeProvider').ThemeProvider;
let AuthProvider: typeof import('@/contexts/AuthProvider').AuthProvider;
let ToastProvider: typeof import('@/contexts/ToastContext').ToastProvider;

beforeAll(async () => {
  // Once. Every provider from the same registry as App, and the dictionary
  // warmed, because the provider reads it synchronously.
  [App, { LocaleProvider }, { ThemeProvider }, { AuthProvider }, { ToastProvider }] =
    await Promise.all([
      import('@/App').then((m) => m.default),
      import('@/i18n/LocaleProvider'),
      import('@/contexts/ThemeProvider'),
      import('@/contexts/AuthProvider'),
      // CartPage calls useToast. Leaving this out threw inside the lazy chunk
      // and rendered nothing, which read as 'the route did not match' — the
      // harness was incomplete, not the gate.
      import('@/contexts/ToastContext'),
    ]);

  const { preloadLocale } = await import('@/i18n/dictionaries');
  await preloadLocale('en');
});

function mountAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider locale="en">
          <ToastProvider>
            <MemoryRouter initialEntries={[path]}>
              <AuthProvider>
                <App />
              </AuthProvider>
            </MemoryRouter>
          </ToastProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('the TradeMaster client gate', () => {
  beforeEach(() => {
    // Back to the defaults; the flag object is shared between cases.
    mocked.features.tradeMaster = true;
    mocked.features.tradeMasterOrders = false;
  });

  /**
   * Matched on copy the page renders in the state it will actually be in.
   *
   * An empty basket shows CartPage's empty state and never reaches its <h1>, so
   * an earlier version asserting on a heading failed while the gate worked
   * perfectly — the test was wrong, not the code.
   */
  const SHOP_BOARD = /shops/i;
  const EMPTY_BASKET = /basket is empty/i;

  it('registers the shop board when the module is on', async () => {
    // First, and deliberately: if this route never worked, every negative
    // assertion below would pass for the wrong reason.
    mountAt('/marketplace/shops');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: SHOP_BOARD })).toBeInTheDocument();
    });
  });

  it('does not register the shop board when the module is off', async () => {
    mocked.features.tradeMaster = false;
    mountAt('/marketplace/shops');

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: SHOP_BOARD })).not.toBeInTheDocument();
    });
  });

  it('registers the basket when buying is on', async () => {
    mocked.features.tradeMasterOrders = true;
    mountAt('/marketplace/cart');

    await waitFor(
      () => {
        expect(screen.getByText(EMPTY_BASKET)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  it('does not register the basket while buying is off', async () => {
    // The module is a catalogue for now: the basket must not exist as a route,
    // or it loads a page whose every request answers 404.
    mountAt('/marketplace/cart');

    await waitFor(() => {
      expect(screen.queryByText(EMPTY_BASKET)).not.toBeInTheDocument();
    });
  });
});
