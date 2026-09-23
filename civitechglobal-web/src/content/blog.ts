import { countWords, extractFaqs, parseMarkdown, type MarkdownBlock } from '@/lib/markdown';
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from '@/i18n/locales';

/**
 * The blog's content model.
 *
 * Posts are Markdown files in ./blog with a small frontmatter block (key: value
 * lines between --- markers). They are imported with Vite's `?raw` at build
 * time, so a post is code-reviewed, versioned and prerendered like any other
 * page — no CMS, no runtime fetch, no unpublished draft reaching the bundle.
 * Files are matched by glob, so adding a post is adding a file.
 *
 * Language is carried by the filename rather than by frontmatter, because it
 * decides which glob entry a file is rather than what it says:
 *
 *   third-party-insurance-guide.md       Persian — the default, no suffix
 *   what-we-build.en.md                  the English edition of the same post
 *   what-we-build.de.md                  the German one
 *
 * Not every post exists in every language, and that is the point. The insurance
 * writing is Persian because the products, the regulator and the readers are;
 * translating a guide to a compulsory Iranian motor policy into Spanish would
 * be work nobody reads. What the company does and how it works is written for
 * everyone, so those posts carry every language. Each post therefore declares
 * which languages it actually has, and the index, the sitemap, the hreflang set
 * and the prerender all follow that rather than assuming.
 */

export interface BlogPost {
  slug: string;
  /** The language this edition is written in. */
  locale: Locale;
  /** Every language this post exists in, for hreflang and the picker. */
  locales: Locale[];
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

/** Exported for the test that pins the line-ending handling. */
export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  // Normalised first, as parseMarkdown already does. Git hands these files out
  // with whatever line ending the checkout asks for — CRLF on a Windows clone
  // — and a pattern anchored on \n then failed to match its own frontmatter,
  // taking the whole blog down with "missing its frontmatter block" on every
  // developer machine while the Linux build was fine.
  const source = raw.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source);
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

/**
 * The language a file declares, from its name.
 *
 * `what-we-build.en.md` is English; `third-party-guide.md` is Persian. An
 * unknown suffix is not silently treated as Persian — that would file a typo
 * like `.ne.md` under the default language, where nobody would notice it until
 * a reader met Dutch prose on the Persian blog.
 */
export function localeFromFilename(path: string): Locale {
  const name = path.split('/').pop() ?? '';
  const match = /\.([a-z]{2})\.md$/.exec(name);
  if (!match) return DEFAULT_LOCALE;
  if (!isLocale(match[1])) {
    throw new Error(`blog post "${name}" names a language this site does not have`);
  }
  return match[1];
}

function toPost(raw: string, locale: Locale, locales: Locale[]): BlogPost {
  const { frontmatter, body } = parseFrontmatter(raw);
  const blocks = parseMarkdown(body);
  return {
    slug: frontmatter.slug,
    locale,
    locales,
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

const files = import.meta.glob('./blog/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/**
 * Every edition, keyed by slug then language.
 *
 * Built in two passes because a post has to know its whole language set before
 * any edition of it is constructed: the English edition's hreflang has to name
 * the German one, and the German file may be read after it.
 */
const editions = new Map<string, Map<Locale, string>>();
for (const [path, raw] of Object.entries(files)) {
  const locale = localeFromFilename(path);
  const { frontmatter } = parseFrontmatter(raw);
  const bySlug = editions.get(frontmatter.slug) ?? new Map<Locale, string>();
  if (bySlug.has(locale)) {
    throw new Error(`two blog files claim slug "${frontmatter.slug}" in the same language`);
  }
  bySlug.set(locale, raw);
  editions.set(frontmatter.slug, bySlug);
}

const posts: BlogPost[] = [];
for (const [, byLocale] of editions) {
  // Ordered by the site's own language list rather than by whichever file the
  // glob happened to return first, so hreflang sets read the same everywhere.
  const available = LOCALES.filter((locale) => byLocale.has(locale));
  for (const locale of available) {
    posts.push(toPost(byLocale.get(locale)!, locale, available));
  }
}

/** Newest first. `date` is ISO, so lexicographic order is chronological. */
function newestFirst(list: BlogPost[]): BlogPost[] {
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Every edition in every language. The sitemap and the prerender want this. */
export const allBlogPosts: BlogPost[] = newestFirst(posts);

/**
 * What a reader of this language can actually read.
 *
 * Only editions written in their language — never a Persian article on the
 * German blog. A reader who follows a link to a post that has no edition in
 * their language is a different case, handled by the post page.
 */
export function blogPostsFor(locale: Locale): BlogPost[] {
  return newestFirst(posts.filter((post) => post.locale === locale));
}

export function getBlogPost(slug: string, locale: Locale): BlogPost | undefined {
  return posts.find((post) => post.slug === slug && post.locale === locale);
}

/** Which languages a post has, for a link that offers one of them. */
export function blogPostLocales(slug: string): Locale[] {
  const byLocale = editions.get(slug);
  return byLocale ? LOCALES.filter((locale) => byLocale.has(locale)) : [];
}
