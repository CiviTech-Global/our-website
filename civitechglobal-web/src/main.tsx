import { StrictMode } from 'react';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastViewport } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/AuthProvider';
import { installErrorReporter } from '@/lib/errorReporter';
import './index.css';

// Before anything renders, so an error thrown during the first paint is
// caught too. Cheap: it registers two listeners and nothing else.
installErrorReporter();

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
        <LocaleProvider>
          <ToastProvider>
            <BrowserRouter>
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
