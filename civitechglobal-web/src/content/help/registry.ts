import { matchPath } from 'react-router';
import { features } from '@/lib/features';
import manifest from './manifest.json';
import type { HelpAudience, HelpCollectionId, HelpEntry } from './types';

/** Every guide, in reading order. */
export const HELP_ENTRIES: readonly HelpEntry[] = (manifest as HelpEntry[]).filter(
  // A guide for a module that is switched off would describe a page nobody can reach.
  (entry) => !entry.feature || features[entry.feature]
);

const BY_ID = new Map(HELP_ENTRIES.map((entry) => [entry.id, entry]));

/** The collections, in the order the help centre lists them. */
export const HELP_COLLECTIONS: readonly HelpCollectionId[] = [
  'company',
  'insurance',
  'consult',
  'jobs',
  'freelance',
  'books',
  'marketplace',
  'account',
  'member',
  'staff',
];

export function helpEntry(id: string): HelpEntry | undefined {
  return BY_ID.get(id);
}

/**
 * How specific a route pattern is: static segments outweigh parameters, so
 * "/insurance/third-party" wins over "/insurance/:slug" for the same address.
 */
function specificity(pattern: string): number {
  return pattern
    .split('/')
    .filter(Boolean)
    .reduce((score, segment) => score + (segment.startsWith(':') ? 1 : 3), 0);
}

/**
 * The guide for an address, if there is one.
 *
 * The address is what useLocation reports, which already has the language
 * prefix stripped (it is the router's basename), so one pattern covers the
 * page in all six languages.
 */
export function helpEntryForPath(pathname: string): HelpEntry | undefined {
  let best: { entry: HelpEntry; score: number } | undefined;
  for (const entry of HELP_ENTRIES) {
    for (const pattern of entry.routes) {
      if (!matchPath({ path: pattern, end: true }, pathname)) continue;
      const score = specificity(pattern);
      if (!best || score > best.score) best = { entry, score };
    }
  }
  return best?.entry;
}

/** The module's own page, when it has one without parameters in it. */
export function helpEntryHome(entry: HelpEntry): string | undefined {
  return entry.routes.find((route) => !route.includes(':'));
}

/**
 * Who may read a guide.
 *
 * Staff guides describe internal procedures, so they are shown to staff only,
 * and never to a search engine. Member guides are readable by anyone: they
 * explain what an account offers, which is exactly what a visitor deciding
 * whether to make one wants to know.
 */
export function canReadHelp(audience: HelpAudience, viewer: { isStaff: boolean }): boolean {
  return audience !== 'staff' || viewer.isStaff;
}
