import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every member-area link a notification carries opens a real page.
 *
 * A notification's link is written here and followed by the web (and the
 * app), which never questions it. Message notifications once pointed at
 * `/dashboard/messages/<id>` while the page lives at
 * `/dashboard/messages/<kind>/<id>`: every "new message" notice led to the
 * not-found page, and nothing failed anywhere.
 *
 * So this reads the links the services write and matches each against the
 * member routes the web declares in App.tsx.
 */

function serviceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) serviceFiles(full, out);
    else if (full.endsWith('.ts') && !full.includes('.test.')) out.push(full);
  }
  return out;
}

/** The web's /dashboard routes, as patterns over a path without its query. */
function memberRoutes(): RegExp[] {
  const app = readFileSync('../civitechglobal-web/src/App.tsx', 'utf8');
  const start = app.indexOf('path="/dashboard"');
  const end = app.indexOf('path="/admin"', start);
  const block = app.slice(start, end);
  // A redirect (an old address kept alive) is not a page to link to.
  const paths = [...block.matchAll(/path="([^"]+)"(\s+element=\{<Navigate)?/g)]
    .filter((m) => !m[2])
    .map((m) => m[1]!);
  return paths.map((path) => {
    const full = path === '/dashboard' ? path : `/dashboard/${path}`;
    return new RegExp(`^${full.replace(/:[A-Za-z]+/g, '[^/]+')}$`);
  });
}

/** Each `link:` path into the member area, with interpolations as a stand-in id. */
function writtenLinks(): string[] {
  const links: string[] = [];
  for (const file of serviceFiles('src/services')) {
    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(/link:[^\n]*?['`](\/dashboard[^'`]*)['`]/g)) {
      links.push(m[1]!.replace(/\$\{[^}]+\}/g, 'x1').split('?')[0]!);
    }
  }
  return links;
}

describe('notification links into the member area', () => {
  it('each lead to a page the web has', () => {
    const routes = memberRoutes();
    const dead = writtenLinks().filter((link) => !routes.some((route) => route.test(link)));
    expect(dead).toEqual([]);
  });

  it('is looking at the routes and links that exist', () => {
    // Guards the finders: a move must not leave a test that checks nothing.
    expect(memberRoutes().length).toBeGreaterThan(20);
    expect(writtenLinks()).toContain('/dashboard/messages/k/x1');
    expect(writtenLinks().length).toBeGreaterThan(20);
  });
});
