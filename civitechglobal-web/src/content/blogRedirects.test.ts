import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/i18n/locales';
import { localeHref, splitLocalePath } from '@/i18n/localePath';
import { blogPostLocales, blogPostsFor } from './blog';

/*
 * nginx-blog-redirects.conf is written by scripts/build-sitemap.mjs and copied
 * into the web image. It sends a blog URL in a language the post does not have
 * to the edition that exists. A stale file would either redirect a real page
 * away or leave a missing edition to the noindex shell, so check it against
 * the posts themselves.
 */
const conf = readFileSync(resolve(__dirname, '..', '..', 'nginx-blog-redirects.conf'), 'utf8');
const rules = [...conf.matchAll(/^location = (\S+) \{ return 301 (\S+); \}$/gm)].map((m) => ({
  from: m[1],
  to: m[2],
}));

const slugOf = (path: string) => splitLocalePath(path).path.replace(/^\/blog\//, '');

describe('blog redirects', () => {
  it('never redirects an edition that exists, and always lands on one', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const { from, to } of rules) {
      const source = splitLocalePath(from);
      const target = splitLocalePath(to);
      expect(blogPostLocales(slugOf(from))).not.toContain(source.locale);
      expect(blogPostLocales(slugOf(to))).toContain(target.locale);
    }
  });

  it('covers every missing edition of every post', () => {
    const slugs = new Set(LOCALES.flatMap((locale) => blogPostsFor(locale).map((post) => post.slug)));
    const covered = new Set(rules.map((rule) => rule.from));
    for (const slug of slugs) {
      for (const locale of LOCALES) {
        if (blogPostLocales(slug).includes(locale)) continue;
        expect(covered, `${locale} ${slug}`).toContain(localeHref(locale, `/blog/${slug}`));
      }
    }
  });
});
