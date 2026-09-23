import { describe, expect, it } from 'vitest';
import {
  allBlogPosts,
  blogPostLocales,
  blogPostsFor,
  getBlogPost,
  localeFromFilename,
  parseFrontmatter,
} from './blog';

const frontmatter = [
  '---',
  'slug: test-post',
  'title: عنوان آزمایشی',
  'description: توضیح کوتاه',
  'date: 2026-01-01',
  'updated: 2026-01-02',
  'dateLabel: ۱۱ دی ۱۴۰۴',
  'keywords: بیمه, آزمون',
  'faqHeading: پرسش‌های متداول',
  '---',
  '',
  '## سرفصل',
  '',
  'متن.',
];

describe('parseFrontmatter', () => {
  it('reads the block and returns the body', () => {
    const { frontmatter: fields, body } = parseFrontmatter(frontmatter.join('\n'));

    expect(fields.slug).toBe('test-post');
    expect(fields.keywords).toBe('بیمه, آزمون');
    expect(body.startsWith('## سرفصل')).toBe(true);
  });

  // The whole blog went down on a Windows checkout because the pattern was
  // anchored on \n and git hands the files out with CRLF there. The two
  // spellings have to parse identically.
  it('reads a block with CRLF line endings', () => {
    const lf = parseFrontmatter(frontmatter.join('\n'));
    const crlf = parseFrontmatter(frontmatter.join('\r\n'));

    expect(crlf).toEqual(lf);
  });

  it('rejects a post with no frontmatter block', () => {
    expect(() => parseFrontmatter('## سرفصل\n\nمتن.')).toThrow(/frontmatter block/);
  });

  it('rejects a block missing a required field', () => {
    const without = frontmatter.filter((line) => !line.startsWith('slug:'));
    expect(() => parseFrontmatter(without.join('\n'))).toThrow(/"slug"/);
  });
});

describe('localeFromFilename', () => {
  it('reads the language a file names', () => {
    expect(localeFromFilename('./blog/what-we-build.en.md')).toBe('en');
    expect(localeFromFilename('./blog/was-wir-bauen.de.md')).toBe('de');
  });

  it('treats an unsuffixed file as Persian, the default', () => {
    expect(localeFromFilename('./blog/third-party-insurance-guide.md')).toBe('fa');
  });

  /**
   * A typo like .ne.md must not be filed under the default language, where
   * nobody would notice until a reader met the wrong prose on the Persian
   * blog. It fails the build instead.
   */
  it('refuses a language this site does not have', () => {
    expect(() => localeFromFilename('./blog/oops.ne.md')).toThrow(/does not have/);
  });
});

describe('blogPosts', () => {
  // Reads the real files through the glob, so it fails on whatever line
  // endings this checkout actually has.
  it('parses every post on disk', () => {
    expect(allBlogPosts.length).toBeGreaterThan(0);
    for (const post of allBlogPosts) {
      expect(post.slug).toMatch(/^[a-z0-9-]+$/);
      expect(post.title).not.toBe('');
      expect(post.blocks.length).toBeGreaterThan(0);
      expect(post.readingMinutes).toBeGreaterThan(0);
    }
  });

  it('gives every post one edition per language, newest first', () => {
    const persian = blogPostsFor('fa');
    const seen = persian.map((post) => post.slug);
    expect(new Set(seen).size).toBe(seen.length);

    const dates = persian.map((post) => post.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('shows a reader only the editions written in their language', () => {
    for (const post of blogPostsFor('fa')) expect(post.locale).toBe('fa');
    for (const post of blogPostsFor('de')) expect(post.locale).toBe('de');
  });

  it('finds a post by slug and language', () => {
    const first = blogPostsFor('fa')[0];
    expect(getBlogPost(first.slug, 'fa')?.title).toBe(first.title);
    expect(getBlogPost('no-such-post', 'fa')).toBeUndefined();
  });

  // The set is what hreflang is built from, so it has to be the truth about
  // which editions exist rather than an assumption that all six do.
  it('reports the languages a post was actually written in', () => {
    const first = blogPostsFor('fa')[0];
    const locales = blogPostLocales(first.slug);

    expect(locales).toContain('fa');
    expect(locales).toEqual(first.locales);
    for (const locale of locales) {
      expect(getBlogPost(first.slug, locale)).toBeDefined();
    }
  });

  it('knows nothing about a slug that does not exist', () => {
    expect(blogPostLocales('no-such-post')).toEqual([]);
  });
});
