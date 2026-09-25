import { StrictMode } from 'react';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { localePrefix, splitLocalePath } from '@/i18n/localePath';
import { preloadLocale } from '@/i18n/dictionaries';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/AuthProvider';
import { installErrorReporter } from '@/lib/errorReporter';
import { installAnalytics } from '@/lib/analytics';
import './index.css';

// Before anything renders, so an error thrown during the first paint is
// caught too. Cheap: it registers two listeners and nothing else.
installErrorReporter();

// No-op unless the deployment opts in by setting the analytics environment
// variables; see src/lib/analytics.ts.
installAnalytics();

/**
 * The language comes off the front of the URL, once, before anything renders.
 *
 * It is read here rather than inside a route because it becomes the router's
 * basename: with `/de` as the base, every `<Link to="/services">` already in
 * the app resolves to `/de/services` without knowing that languages exist. The
 * alternative — a `:locale?` segment on every route and a prefix on every link
 * — is the same behaviour spread across two hundred call sites, each of which
 * can forget.
 */
const { locale: initialLocale } = splitLocalePath(window.location.pathname);

/**
 * The one language this visitor needs, fetched before anything mounts.
 *
 * Awaiting here rather than inside the provider is deliberate. The language is
 * already decided by the URL, so there is nothing to wait *for* once the chunk
 * has landed — and a provider that resolved asynchronously would paint one
 * frame of the wrong language, or of nothing, on every page load.
 *
 * The cost is one module fetch before first paint. It is a small chunk, the
 * prerendered HTML is already on screen while it loads, and it replaces the
 * ~155 KB of dictionaries that used to sit in the main bundle.
 *
 * An async IIFE rather than a top-level await: the build targets Safari 14 and
 * Chrome 87, which predate top-level await, and raising the target to get
 * prettier syntax here would drop browsers this audience actually uses.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

void preloadLocale(initialLocale).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider locale={initialLocale}>
            <ToastProvider>
              <BrowserRouter basename={localePrefix(initialLocale) || undefined}>
                <AuthProvider>
                  <ErrorBoundary>
                    <App />
                  </ErrorBoundary>
                </AuthProvider>
              </BrowserRouter>
              <ToastViewport />
            </ToastProvider>
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );
});
