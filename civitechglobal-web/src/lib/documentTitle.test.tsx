import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { useDocumentTitle } from './documentTitle';

function Page({ title }: { title?: string }) {
  useDocumentTitle(title);
  return null;
}

function renderAt(path: string, title?: string) {
  render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<Page title={title} />} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>
  );
}

const canonical = () =>
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href');
const ogUrl = () =>
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.getAttribute('content');

describe('useDocumentTitle', () => {
  it('names the tab after the page', () => {
    renderAt('/services', 'Services');

    expect(document.title).toContain('Services');
  });

  /**
   * The reason the canonical is set here rather than in index.html. The HTML
   * shell is byte-identical for every route of a single-page app, so one
   * static tag would have /services declare itself a duplicate of the home
   * page — and a search engine that believes it drops /services from the
   * index. A wrong canonical is worse than none.
   */
  it('points the canonical at the route being viewed, not the home page', () => {
    renderAt('/services', 'Services');

    expect(canonical()).toMatch(/\/services$/);
    expect(canonical()).not.toMatch(/\.ir\/$/);
  });

  it('sets og:url to the same address, so a shared link matches', () => {
    renderAt('/about', 'About');

    expect(ogUrl()).toBe(canonical());
    expect(ogUrl()).toMatch(/\/about$/);
  });

  /**
   * ?ref=x is the same page. Listing each variant as its own URL splits one
   * page's ranking across copies of itself.
   */
  it('drops the query string, which does not make a different page', () => {
    renderAt('/services?ref=newsletter&utm_source=x', 'Services');

    expect(canonical()).toMatch(/\/services$/);
    expect(canonical()).not.toContain('?');
  });

  it('writes exactly one canonical tag however many times it runs', () => {
    renderAt('/', 'Home');
    renderAt('/about', 'About');
    renderAt('/contact', 'Contact');

    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[property="og:url"]')).toHaveLength(1);
  });
});
