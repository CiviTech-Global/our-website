import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@/lib/errorReporter';

interface Props {
  children: ReactNode;
  /** Rendered instead of the default panel, when a section wants its own. */
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render error so one broken component does not blank the app.
 *
 * Without this, any exception thrown during render unmounts the entire React
 * tree and the user is left looking at a white page with no way forward — the
 * worst possible failure mode, because it looks identical to the site being
 * down.
 *
 * Deliberately a class: `componentDidCatch` and `getDerivedStateFromError` have
 * no hook equivalent, and this is the one place React still requires one.
 *
 * Render failures are reported to our own API rather than to an SDK. The
 * browser Sentry bundle costs more than everything saved by removing the
 * animation library; `lib/errorReporter` sends the part that matters — that a
 * page broke at all — for about a kilobyte.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Console for whoever has devtools open, and the API so we find out
    // without being told. A blank page is the worst failure mode precisely
    // because nobody reports it.
    console.error('Unhandled render error', error, info.componentStack);
    reportError(error, 'boundary');
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);

    return (
      <div
        role="alert"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <h1 className="text-xl font-semibold text-text-primary">مشکلی پیش آمد</h1>
        <p className="max-w-md text-sm text-text-secondary">
          صفحه به‌درستی بارگذاری نشد. می‌توانید دوباره تلاش کنید یا به صفحهٔ اصلی برگردید.
        </p>

        {/* The message, but never the stack: a stack trace on screen tells an
            attacker about the build and tells a user nothing. */}
        {import.meta.env.DEV && (
          <pre className="max-w-xl overflow-x-auto rounded-lg bg-surface-100 p-3 text-start text-xs text-brand-red-500">
            {error.message}
          </pre>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg bg-brand-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-600"
          >
            تلاش دوباره
          </button>
          {/* A full navigation, not a router link: the router itself may be the
              thing that failed. */}
          <a
            href="/"
            className="rounded-lg border border-border-default px-4 py-2 text-sm text-text-secondary hover:border-brand-green-500/40"
          >
            صفحهٔ اصلی
          </a>
        </div>
      </div>
    );
  }
}
