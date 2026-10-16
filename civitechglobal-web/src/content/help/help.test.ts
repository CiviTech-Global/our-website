import { describe, expect, it } from 'vitest';
import manifest from './manifest.json';
import { helpEntryForPath } from './registry';
import type { HelpEntry, HelpLibraryText } from './types';
import fa from './text/fa';
import en from './text/en';
import tr from './text/tr';
import de from './text/de';
import fr from './text/fr';
import es from './text/es';

const entries = manifest as HelpEntry[];
const ids = new Set(entries.map((entry) => entry.id));
const publicIds = entries.filter((entry) => entry.audience === 'public').map((entry) => entry.id);
const LIBRARIES: Record<string, HelpLibraryText> = { fa, en, tr, de, fr, es };

describe('help content', () => {
  it('gives every guide a unique id', () => {
    expect(ids.size).toBe(entries.length);
  });

  it('only relates guides that exist', () => {
    const broken = entries.flatMap((entry) =>
      entry.related.filter((id) => !ids.has(id) || id === entry.id).map((id) => `${entry.id} → ${id}`)
    );
    expect(broken).toEqual([]);
  });

  /**
   * Persian and English are complete: every guide, member and staff included.
   * A guide missing from Persian would leave the site's main language with an
   * English guide, and one missing from English leaves the other four
   * languages with nothing to fall back to.
   */
  it.each(['fa', 'en'])('%s has every guide', (locale) => {
    const missing = [...ids].filter((id) => !LIBRARIES[locale].articles[id]);
    expect(missing).toEqual([]);
  });

  /** The public guides are what a live audience reads, so they exist in every language. */
  it.each(['tr', 'de', 'fr', 'es'])('%s has every public guide', (locale) => {
    const missing = publicIds.filter((id) => !LIBRARIES[locale].articles[id]);
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(LIBRARIES))('%s writes no guide the manifest does not know', (locale) => {
    const unknown = Object.keys(LIBRARIES[locale].articles).filter((id) => !ids.has(id));
    expect(unknown).toEqual([]);
  });

  /** An explanation for a relation the manifest does not list would never be shown. */
  it.each(Object.keys(LIBRARIES))('%s explains only listed relations', (locale) => {
    const stray = Object.entries(LIBRARIES[locale].articles).flatMap(([id, text]) => {
      const listed = new Set(entries.find((entry) => entry.id === id)?.related ?? []);
      return Object.keys(text.related ?? {})
        .filter((other) => !listed.has(other))
        .map((other) => `${id} → ${other}`);
    });
    expect(stray).toEqual([]);
  });

  it.each(Object.keys(LIBRARIES))('%s gives every guide a summary, an intro and questions', (locale) => {
    const thin = Object.entries(LIBRARIES[locale].articles)
      .filter(([, text]) => !text.title || !text.summary || !text.intro || text.faqs.length === 0)
      .map(([id]) => id);
    expect(thin).toEqual([]);
  });
});

describe('helpEntryForPath', () => {
  it.each([
    ['/', 'home'],
    ['/start-project', 'start-project'],
    ['/insurance/third-party', 'insurance-product'],
    ['/insurance/auto-body', 'insurance-product'],
    ['/jobs', 'jobs'],
    ['/jobs/in/tehran', 'jobs'],
    ['/jobs/AB12CD34', 'job-detail'],
    ['/projects/category/web', 'projects'],
    ['/books/shelf/new', 'books'],
    ['/dashboard', 'dashboard'],
    ['/dashboard/messages/project/42', 'messages'],
    ['/dashboard/projects/new', 'client-projects'],
    ['/admin', 'admin-dashboard'],
    ['/admin/requests/7', 'admin-insurance-requests'],
    ['/help/contact', 'help-centre'],
  ])('%s → %s', (path, id) => {
    expect(helpEntryForPath(path)?.id).toBe(id);
  });

  it('has nothing for an unknown address', () => {
    expect(helpEntryForPath('/no/such/page')).toBeUndefined();
  });
});
