import { useSyncExternalStore } from 'react';

/**
 * Which postings this browser has opened, so a card can say "Viewed".
 *
 * Kept in the browser only, as a convenience: it is about this reader on this
 * device, and nothing anybody else should see. Storage can be refused or
 * cleared at any moment, so every read and write is guarded and an empty set
 * is always a valid answer.
 */

const KEY = 'ct-viewed-jobs';
const LIMIT = 300;
const listeners = new Set<() => void>();
let cache: Set<string> | null = null;

function read(): Set<string> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

export function markJobViewed(code: string): void {
  const current = read();
  if (current.has(code)) return;
  // Newest last; the oldest fall off once the list is long.
  const next = new Set([...current, code].slice(-LIMIT));
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    // Refused storage: the mark lasts for this visit only.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The set of viewed codes, re-rendering when one is added. */
export function useViewedJobs(): Set<string> {
  return useSyncExternalStore(subscribe, read, () => new Set<string>());
}
