import { useEffect, useMemo } from 'react';

/**
 * A preview URL for a file held in state, without the leak.
 *
 * URL.createObjectURL called inline in render mints a fresh URL on every
 * render and none of them is ever revoked, so a form that re-renders while a
 * photograph is attached leaks one blob per render. This makes exactly one
 * URL per file and revokes it when the file is replaced or the component
 * showing it goes away.
 */
export function useObjectUrl(file: File): string {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return url;
}
