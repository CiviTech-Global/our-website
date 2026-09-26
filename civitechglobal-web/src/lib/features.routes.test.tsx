import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * What the client gate actually guarantees.
 *
 * Not that the code is absent from the bundle — it is not, and features.ts says
 * so. What it guarantees is that with the flag off the routes do not resolve,
 * so nothing in the app can reach a module whose every endpoint answers 404.
 *
 * Driven through the real router with a real URL rather than by reading the
 * flag, because the failure that matters is "this address renders something",
 * and that depends on where the flag is used, not on its value.
 */

/**
 * Every module imported from the same registry as App.
 *
 * `vi.resetModules()` gives the dynamic `import('@/App')` a fresh copy of the
 * whole graph, including a fresh LocaleContext object. A statically imported
 * LocaleProvider would therefore be providing a *different* context than the
 * one App's useLocale reads, and every render fails with "useLocale must be
 * used within a LocaleProvider" — which looks like a missing provider rather
 * than two copies of one.
 */
async function mountAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const [{ default: App }, { LocaleProvider }, { ThemeProvider }, { AuthProvider }] =
    await Promise.all([
      import('@/App'),
      import('@/i18n/LocaleProvider'),
      import('@/contexts/ThemeProvider'),
      import('@/contexts/AuthProvider'),
    ]);

  // The dictionary cache lives in module scope, so the fresh registry starts
  // empty and the provider would hand every screen an undefined `t`. The
  // vitest setup file preloaded the *original* registry, not this one.
  const { preloadLocale } = await import('@/i18n/dictionaries');
  await preloadLocale('en');

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider locale="en">
          <MemoryRouter initialEntries={[path]}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </MemoryRouter>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('the TradeMaster client gate', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/lib/features');
    vi.resetModules();
  });

  it('does not render the shop board when the flag is off', async () => {
    vi.doMock('@/lib/features', () => ({ features: { tradeMaster: false } }));
    await mountAt('/marketplace/shops');

    // The heading belongs to ShopsPage. Its absence is the assertion; waiting
    // first so a lazy chunk that *would* have resolved has had its chance.
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /shops/i })).not.toBeInTheDocument();
    });
  });

  it('renders the shop board when the flag is on', async () => {
    vi.doMock('@/lib/features', () => ({ features: { tradeMaster: true } }));
    await mountAt('/marketplace/shops');

    // Proves the negative above is the gate rather than a typo in the path: if
    // this route never worked, the first test would pass for the wrong reason.
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /shops/i })).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});
