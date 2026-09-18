/**
 * An API path turned into something an `<img src>` can load.
 *
 * The server hands back paths relative to the API root (`/market/books/x/cover`)
 * rather than absolute URLs, so that the same row works behind whatever origin
 * or proxy prefix the deployment uses. A browser resolves `src` against the
 * page, not against the API client, so the base has to be put back on here —
 * without it the picture is requested from the site root and 404s.
 *
 * Only for routes that are open to anybody. An image behind a session needs
 * StaffImage, which fetches it with the access token and shows it as a blob.
 */
export function apiAssetSrc(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const base: string = import.meta.env.VITE_API_URL ?? '/api';
  return `${base}${path}`;
}
