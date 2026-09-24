import { describe, expect, it } from 'vitest';
import { allBlogPosts, blogPostLocales } from './blog';

/**
 * The links the articles make to each other and to the rest of the site.
 *
 * The insurance library is built as pillars that link down to products and
 * products that link back up, so the cross-references are the structure rather
 * than decoration — and a broken one is invisible in review. Nothing else
 * checks them: Markdown links are strings, so a typo in a slug type-checks,
 * renders, and 404s only for the reader who clicks it.
 */

/** Every root-relative link in a post's body, with the post that made it. */
function internalLinks() {
  return allBlogPosts.flatMap((post) =>
    [...post.body.matchAll(/\]\((\/[^)\s]*)\)/g)].map((match) => ({
      from: `${post.slug} (${post.locale})`,
      href: match[1],
    }))
  );
}

/** The public routes an article is allowed to point at. See src/App.tsx. */
const ROUTES = [
  '/',
  '/about',
  '/services',
  '/insurance',
  '/insurance/third-party',
  '/start-project',
  '/consult',
  '/experts',
  '/books',
  '/jobs',
  '/projects',
  '/portfolio',
  '/team',
  '/customers',
  '/partners',
  '/volunteer',
  '/join',
  '/blog',
  '/track',
  '/contact',
];

describe('blog cross-links', () => {
  it('points every /blog/… link at an article that exists', () => {
    const broken = internalLinks()
      .filter(({ href }) => href.startsWith('/blog/'))
      .filter(({ href }) => blogPostLocales(href.replace('/blog/', '')).length === 0);

    expect(broken).toEqual([]);
  });

  it('points every other link at a route the app serves', () => {
    const broken = internalLinks()
      .filter(({ href }) => !href.startsWith('/blog/'))
      .filter(({ href }) => !ROUTES.includes(href.replace(/\/$/, '') || '/'));

    expect(broken).toEqual([]);
  });

  // An article that nothing links to is reachable only from the index, which
  // is the weakest position a page can have — for a reader and for a crawler.
  it('links to each insurance article from somewhere else', () => {
    const linked = new Set(
      internalLinks()
        .filter(({ href }) => href.startsWith('/blog/'))
        .map(({ href }) => href.replace('/blog/', ''))
    );

    const orphans = allBlogPosts
      .filter((post) => post.locale === 'fa')
      .map((post) => post.slug)
      .filter((slug) => !linked.has(slug));

    // Reported by name rather than counted, so the failure says which.
    expect(orphans).toEqual([]);
  });
});
