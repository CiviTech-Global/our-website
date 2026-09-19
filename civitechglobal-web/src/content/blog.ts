import { countWords, extractFaqs, parseMarkdown, type MarkdownBlock } from '@/lib/markdown';

/**
 * The blog's content model.
 *
 * Posts are Markdown files in ./blog/*.md with a small frontmatter block
 * (key: value lines between --- markers). They are imported with Vite's `?raw`
 * at build time, so a post is code-reviewed, versioned and prerendered like
 * any other page — no CMS, no runtime fetch, no unpublished draft reaching
 * the bundle. Files are matched by glob, so adding a post is adding a file.
 *
 * Posts are Persian-first: the article URL exists only in the default locale,
 * which the sitemap and the prerender script mirror.
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** ISO date — feeds Article structured data and the sitemap's lastmod. */
  date: string;
  updated: string;
  /** Human date for display, written in the post's own language. */
  dateLabel: string;
  keywords: string[];
  /** The h2 heading that opens the FAQ section, used to build FAQPage data. */
  faqHeading: string;
  /** Raw Markdown body. */
  body: string;
  blocks: MarkdownBlock[];
  faqs: { question: string; answer: string }[];
  /** Whole-word count / reading speed, rounded up to a minute. */
  readingMinutes: number;
}

interface Frontmatter {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  dateLabel: string;
  keywords: string;
  faqHeading: string;
}

function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error('blog post is missing its frontmatter block');

  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const field = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (field) fields[field[1]] = field[2].trim();
  }

  const required: (keyof Frontmatter)[] = [
    'slug',
    'title',
    'description',
    'date',
    'updated',
    'dateLabel',
    'keywords',
    'faqHeading',
  ];
  for (const key of required) {
    if (!fields[key]) throw new Error(`blog post frontmatter is missing "${key}"`);
  }

  return { frontmatter: fields as unknown as Frontmatter, body: match[2].trim() };
}

function toPost(raw: string): BlogPost {
  const { frontmatter, body } = parseFrontmatter(raw);
  const blocks = parseMarkdown(body);
  return {
    slug: frontmatter.slug,
    title: frontmatter.title,
    description: frontmatter.description,
    date: frontmatter.date,
    updated: frontmatter.updated,
    dateLabel: frontmatter.dateLabel,
    keywords: frontmatter.keywords.split(',').map((keyword) => keyword.trim()),
    faqHeading: frontmatter.faqHeading,
    body,
    blocks,
    faqs: extractFaqs(blocks, frontmatter.faqHeading),
    readingMinutes: Math.max(1, Math.ceil(countWords(blocks) / 180)),
  };
}

const files = import.meta.glob('./blog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const posts: BlogPost[] = Object.values(files).map((raw) => toPost(raw));

// Newest first. date is ISO, so lexicographic order is chronological.
export const blogPosts: BlogPost[] = posts.sort((a, b) => (a.date < b.date ? 1 : -1));

export function getBlogPost(slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}
