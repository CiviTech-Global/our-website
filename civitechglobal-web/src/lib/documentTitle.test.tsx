import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { LocaleProvider, type Locale } from '@/i18n/LocaleProvider';
import { CANONICAL_ORIGIN, useDocumentTitle, type PageMeta } from './documentTitle';

function Page({ title, meta }: { title?: string; meta?: PageMeta }) {
  useDocumentTitle(title, meta);
  return null;
}

function at(path: string, options: { locale?: Locale; title?: string; meta?: PageMeta } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocaleProvider locale={options.locale}>
        <Page title={options.title} meta={options.meta} />
      </LocaleProvider>
    </MemoryRouter>
  );
}

// Whatever the build declares — a hard-coded origin here would pass locally
// and fail the moment the deployment's canonical origin is configured.
const origin = CANONICAL_ORIGIN;

function links(rel: string) {
  return [...document.head.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`)].map((l) => ({
    href: l.getAttribute('href'),
    hreflang: l.getAttribute('hreflang'),
  }));
}

function meta(key: string) {
  return document.head
    .querySelector(`meta[name="${key}"], meta[property="${key}"]`)
    ?.getAttribute('content');
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

afterEach(() => {
  document.head.innerHTML = '';
});

describe('page head', () => {
  it('titles the page after the route, not the site alone', () => {
    at('/about', { title: 'About' });
    expect(document.title).toContain('About');
  });

  it('points the canonical link at this route, not the home page', () => {
    at('/services');
    // A single static canonical in index.html would have every route declaring
    // itself a duplicate of "/", and a search engine that believes it drops
    // the rest of the site.
    expect(links('canonical')).toEqual([{ href: `${origin}/services`, hreflang: null }]);
  });

  it('puts the language prefix in the canonical of a translated page', () => {
    at('/services', { locale: 'de' });
    expect(links('canonical')).toEqual([{ href: `${origin}/de/services`, hreflang: null }]);
  });

  it('names every language for the route, plus a default', () => {
    at('/about', { locale: 'en' });

    expect(links('alternate')).toEqual([
      { href: `${origin}/about`, hreflang: 'fa-IR' },
      { href: `${origin}/en/about`, hreflang: 'en' },
      { href: `${origin}/tr/about`, hreflang: 'tr-TR' },
      { href: `${origin}/de/about`, hreflang: 'de-DE' },
      { href: `${origin}/fr/about`, hreflang: 'fr-FR' },
      { href: `${origin}/es/about`, hreflang: 'es-ES' },
      { href: `${origin}/about`, hreflang: 'x-default' },
    ]);
  });

  /**
   * A blog post exists only in the languages it was written in, so it names
   * those and no others. Naming a language it does not have would ask a
   * search engine to send those readers to prose they cannot read.
   */
  it('lets a page name only the languages it actually has', () => {
    at('/blog/how-we-work', {
      title: 'How we work',
      meta: {
        alternates: [
          { locale: 'fa', href: '/blog/how-we-work' },
          { locale: 'en', href: '/en/blog/how-we-work' },
        ],
      },
    });

    expect(links('alternate')).toEqual([
      { href: `${origin}/blog/how-we-work`, hreflang: 'fa-IR' },
      { href: `${origin}/en/blog/how-we-work`, hreflang: 'en' },
      { href: `${origin}/blog/how-we-work`, hreflang: 'x-default' },
    ]);
  });

  // The option takes paths and adds the origin itself. Passing whole URLs
  // emitted every blog hreflang with the origin twice over, which is a link
  // to nowhere that nothing in a type check or a render would notice.
  it('adds the origin exactly once to a page-supplied alternate', () => {
    at('/blog/one', {
      title: 'One',
      meta: { alternates: [{ locale: 'fa', href: '/blog/one' }] },
    });

    for (const link of links('alternate')) {
      expect(link.href).toBe(`${origin}/blog/one`);
      expect(link.href?.match(/https?:\/\//g) ?? []).toHaveLength(1);
    }
  });

  // An article with no Persian edition still needs somewhere to send a reader
  // whose language is not in the set.
  it('falls back to the first edition when there is no default-language one', () => {
    at('/en/blog/english-only', {
      locale: 'en',
      title: 'English only',
      meta: { alternates: [{ locale: 'en', href: '/en/blog/english-only' }] },
    });

    expect(links('alternate')).toEqual([
      { href: `${origin}/en/blog/english-only`, hreflang: 'en' },
      { href: `${origin}/en/blog/english-only`, hreflang: 'x-default' },
    ]);
  });

  it('gives each page its own description', () => {
    at('/services', { meta: { description: 'What we build.' } });
    expect(meta('description')).toBe('What we build.');
    expect(meta('og:description')).toBe('What we build.');
  });

  it('keeps signed-in areas out of the index without being told', () => {
    at('/admin/users', { title: 'Users' });

    // Derived from the path rather than declared per page: sixty screens each
    // remembering to opt out is sixty chances to forget, and the cost of
    // forgetting is a signed-in view in a search result.
    expect(meta('robots')).toBe('noindex, nofollow');
    expect(links('alternate')).toEqual([]);
  });

  it('keeps a tracking-code page out of the index', () => {
    at('/track', { title: 'Track' });
    expect(meta('robots')).toBe('noindex, nofollow');
  });

  it('indexes ordinary public routes', () => {
    at('/about');
    expect(meta('robots')).toBeUndefined();
  });

  it('does not leave the previous page description behind', () => {
    const first = at('/services', { meta: { description: 'What we build.' } });
    first.unmount();
    at('/about', { meta: { description: 'Who we are.' } });

    // Tags are cleared and rewritten rather than edited in place. Leaving one
    // behind is how a search engine ends up with the wrong summary for half a
    // site.
    expect(
      [...document.head.querySelectorAll('meta[name="description"]')].map((m) =>
        m.getAttribute('content')
      )
    ).toEqual(['Who we are.']);
  });

  it('writes structured data as JSON-LD', () => {
    at('/jobs/ABC', { meta: { jsonLd: { '@type': 'JobPosting', title: 'Engineer' } } });

    const script = document.head.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(script?.textContent ?? '{}')).toMatchObject({ title: 'Engineer' });
  });

  it('declares the page language and the ones it is also published in', () => {
    at('/about', { locale: 'fr' });
    expect(meta('og:locale')).toBe('fr_FR');
    expect(
      [...document.head.querySelectorAll('meta[property="og:locale:alternate"]')].map((m) =>
        m.getAttribute('content')
      )
    ).toEqual(['fa_IR', 'en_US', 'tr_TR', 'de_DE', 'es_ES']);
  });
});
