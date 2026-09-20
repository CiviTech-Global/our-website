import { describe, expect, it } from 'vitest';
import { blogPosts, getBlogPost, parseFrontmatter } from './blog';

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

describe('blogPosts', () => {
  // Reads the real files through the glob, so it fails on whatever line
  // endings this checkout actually has.
  it('parses every post on disk', () => {
    expect(blogPosts.length).toBeGreaterThan(0);
    for (const post of blogPosts) {
      expect(post.slug).toMatch(/^[a-z0-9-]+$/);
      expect(post.title).not.toBe('');
      expect(post.blocks.length).toBeGreaterThan(0);
      expect(post.readingMinutes).toBeGreaterThan(0);
    }
  });

  it('gives every post a distinct slug, newest first', () => {
    const slugs = blogPosts.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const dates = blogPosts.map((post) => post.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('finds a post by slug', () => {
    expect(getBlogPost(blogPosts[0].slug)?.title).toBe(blogPosts[0].title);
    expect(getBlogPost('no-such-post')).toBeUndefined();
  });
});
