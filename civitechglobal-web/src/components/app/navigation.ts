import type { ReactNode } from 'react';

/**
 * The shape of a dashboard's navigation.
 *
 * Two levels, as in VerifyWise: a **module** is a whole area of work (intake,
 * the marketplace, the showcase) and sits on the icon rail; its **items** are
 * the screens inside it and fill the context sidebar. A module's items can be
 * split into labelled sections when there are enough of them to need it.
 *
 * Kept as plain data so the rail, the sidebar and the breadcrumbs all read the
 * same structure — a screen cannot appear in the sidebar under one name and in
 * the breadcrumb trail under another.
 */

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Match the path exactly rather than as a prefix. For index routes. */
  end?: boolean;
  /** Something waiting — shown as a chip beside the link. Zero shows nothing. */
  count?: number;
  /**
   * A second link to a screen that belongs to another module — the overview's
   * "waiting on you" list. Never decides where the reader is, or opening CVs
   * from that list would light up the overview instead of intake.
   */
  shortcut?: boolean;
}

export interface NavSection {
  id: string;
  /** Omitted for a module's first, unlabelled section. */
  label?: string;
  items: NavItem[];
}

export interface NavModule {
  id: string;
  label: string;
  icon: ReactNode;
  sections: NavSection[];
}

export interface ActiveLocation {
  module: NavModule;
  item: NavItem | null;
}

/** Whether `pathname` is this item's screen, or a screen beneath it. */
export function itemMatches(pathname: string, item: NavItem): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return item.end ? path === item.to : path === item.to || path.startsWith(`${item.to}/`);
}

export function moduleItems(module: NavModule): NavItem[] {
  return module.sections.flatMap((section) => section.items);
}

/**
 * Where the reader is.
 *
 * The longest matching link wins, so `/admin/resumes/123` belongs to "CVs" and
 * not to an `/admin` index link that also prefixes it. A path that matches
 * nothing falls to the first module, which is always the panel's home.
 */
export function resolveActive(pathname: string, modules: NavModule[]): ActiveLocation | null {
  let best: ActiveLocation | null = null;
  let bestLength = -1;

  for (const module of modules) {
    for (const item of moduleItems(module)) {
      if (!item.shortcut && itemMatches(pathname, item) && item.to.length > bestLength) {
        best = { module, item };
        bestLength = item.to.length;
      }
    }
  }

  if (best) return best;
  return modules[0] ? { module: modules[0], item: null } : null;
}

/** Modules with nothing the reader may open are not shown at all. */
export function visibleModules(modules: NavModule[]): NavModule[] {
  return modules
    .map((module) => ({
      ...module,
      sections: module.sections.filter((section) => section.items.length > 0),
    }))
    .filter((module) => module.sections.length > 0);
}

/** A module's own landing screen: its first link. */
export function moduleHome(module: NavModule): string | null {
  return moduleItems(module)[0]?.to ?? null;
}

/** The sum a rail icon shows for everything waiting inside its module. */
export function moduleCount(module: NavModule): number {
  // Shortcuts repeat counts that already belong to another module.
  return moduleItems(module).reduce((sum, item) => sum + (item.shortcut ? 0 : (item.count ?? 0)), 0);
}

/** "99+" past two digits — a chip that grows with the queue stops fitting the row. */
export function formatCount(count: number, localize: (value: number) => string): string {
  return count > 99 ? `${localize(99)}+` : localize(count);
}
