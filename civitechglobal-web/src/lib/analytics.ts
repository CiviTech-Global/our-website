/**
 * Visitor analytics, opt-in by environment.
 *
 * The site ships with no tracker until the deployment sets one, which keeps
 * the CSP `script-src 'self'` intact and the page free of third-party weight
 * for everyone else. Two backends are supported, chosen by which variable is
 * set:
 *
 *   VITE_UMAMI_SRC         e.g. https://analytics.example.com/script.js
 *   VITE_UMAMI_WEBSITE_ID  e.g. 7f3a1c...
 *
 *   VITE_GA4_ID            e.g. G-AB12CD34EF
 *
 * Anything with no variable set installs nothing — the function is a no-op
 * and the head stays exactly as the document declared it.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function installAnalytics(): void {
  const umamiSrc = import.meta.env.VITE_UMAMI_SRC as string | undefined;
  const umamiId = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;
  const ga4Id = import.meta.env.VITE_GA4_ID as string | undefined;

  if (umamiSrc && umamiId) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = umamiSrc;
    script.dataset.websiteId = umamiId;
    document.head.appendChild(script);
    return;
  }

  if (ga4Id) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', ga4Id);
  }
}
