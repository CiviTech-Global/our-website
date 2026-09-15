import { StrictMode } from 'react';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { localePrefix, splitLocalePath } from '@/i18n/localePath';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/AuthProvider';
import { installErrorReporter } from '@/lib/errorReporter';
import './index.css';

// Before anything renders, so an error thrown during the first paint is
// caught too. Cheap: it registers two listeners and nothing else.
installErrorReporter();

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

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
