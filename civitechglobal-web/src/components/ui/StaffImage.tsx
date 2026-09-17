import { useEffect, useState, type ReactNode } from 'react';
import { api } from '@/config/api';
import { cn } from '@/lib/utils';

/**
 * An image from a staff-only route.
 *
 * A plain <img src> sends no Authorization header, so it cannot load from a
 * route behind a session — which is where a logo or a portrait lives until the
 * row it belongs to is published. Without this, the one moment an editor most
 * needs to see a picture (just uploaded, not live yet) is the one moment the
 * admin list shows a blank.
 *
 * Fetched as a blob, shown through an object URL, and the URL is revoked when
 * the path changes or the component unmounts, so a long admin session does not
 * keep every image it has ever shown in memory.
 */
export function StaffImage({
  path,
  alt,
  className,
  fallback,
}: {
  /** API path, without the base. Null renders the fallback. */
  path: string | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(null);
    setFailed(false);
    if (!path) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get<Blob>(path, { responseType: 'blob' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!path || failed || !src) return <>{fallback}</>;
  return <img src={src} alt={alt} className={cn(className)} />;
}
