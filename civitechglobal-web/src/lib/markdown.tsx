import { type ReactNode } from 'react';

/**
 * A deliberately small Markdown renderer for the blog.
 *
 * It supports exactly the constructs the articles use — headings, paragraphs,
 * bold, links, unordered and ordered lists, pipe tables and blockquotes —
 * and renders them with the site's own typographic classes so a post looks
 * like the rest of the platform. Anything outside the subset (images, code
 * fences, nested lists) is treated as plain text, which keeps the surface
 * area — and the test matrix — small.
 *
 * Block-level parsing is line-based; inline parsing (bold/links) runs on the
 * resulting text spans.
 */

export type MarkdownBlock =
  | { kind: 'h2' | 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'quote'; text: string };

const INLINE_TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_TOKEN);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) {
      return (
        <strong key={key} className="font-semibold text-text-primary">
          {renderInline(bold[1], `${key}-b`)}
        </strong>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const external = link[2].startsWith('http');
      return (
        <a
          key={key}
          href={link[2]}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-brand-green-600 underline decoration-brand-green-500/40 underline-offset-4 hover:decoration-brand-green-500 dark:text-brand-green-400"
        >
          {renderInline(link[1], `${key}-l`)}
        </a>
      );
    }
    return part;
  });
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-');
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const h2 = /^##\s+(.+)$/.exec(trimmed);
    if (h2) {
      blocks.push({ kind: 'h2', text: h2[1] });
      i += 1;
      continue;
    }

    const h3 = /^###\s+(.+)$/.exec(trimmed);
    if (h3) {
      blocks.push({ kind: 'h3', text: h3[1] });
      i += 1;
      continue;
    }

    const quote = /^>\s+(.+)$/.exec(trimmed);
    if (quote) {
      blocks.push({ kind: 'quote', text: quote[1] });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const head = splitRow(lines[i]);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ kind: 'table', head, rows });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    // Persian digits are accepted as well as ASCII: posts are authored in
    // Persian, and "۱." is the natural way to write an ordered step there.
    if (/^[0-9۰-۹]+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[0-9۰-۹]+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[0-9۰-۹]+[.)]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    // Paragraph: consecutive non-empty lines that open no other block.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|>|\||[-*]\s|[0-9۰-۹]+[.)]\s)/.test(lines[i].trim())) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: 'p', text: para.join(' ') });
  }

  return blocks;
}

/** Word count over the plain text of every block, for reading time. */
export function countWords(blocks: MarkdownBlock[]): number {
  const text = blocks
    .map((block) => {
      switch (block.kind) {
        case 'h2':
        case 'h3':
        case 'p':
        case 'quote':
          return block.text;
        case 'ul':
        case 'ol':
          return block.items.join(' ');
        case 'table':
          return [block.head, ...block.rows].flat().join(' ');
      }
    })
    .join(' ');
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Extracts FAQ question/answer pairs for the FAQPage structured data.
 *
 * Convention: the article's FAQ section is an `##` heading (named in the
 * frontmatter as `faqHeading`), followed by `###` questions whose answer is
 * the paragraph right under them. The same content renders visibly on the
 * page, so the markup states only what readers see.
 */
export function extractFaqs(
  blocks: MarkdownBlock[],
  faqHeading: string
): { question: string; answer: string }[] {
  const start = blocks.findIndex((block) => block.kind === 'h2' && block.text === faqHeading);
  if (start === -1) return [];

  const faqs: { question: string; answer: string }[] = [];
  for (let i = start + 1; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.kind === 'h2') break;
    if (block.kind === 'h3') {
      const next = blocks[i + 1];
      const answer = next && next.kind === 'p' ? next.text : '';
      faqs.push({ question: block.text, answer });
    }
  }
  return faqs;
}

export function Markdown({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'h2':
            return (
              <h2 key={index} className="mt-4 text-xl font-semibold text-text-primary sm:text-2xl">
                {renderInline(block.text, `h2-${index}`)}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={index} className="mt-2 text-lg font-semibold text-text-primary">
                {renderInline(block.text, `h3-${index}`)}
              </h3>
            );
          case 'p':
            return (
              <p key={index} className="text-base leading-8 text-text-secondary">
                {renderInline(block.text, `p-${index}`)}
              </p>
            );
          case 'quote':
            return (
              <blockquote
                key={index}
                className="rounded-r-xl border-r-4 border-brand-green-500/60 bg-surface-50 px-4 py-3 text-sm leading-7 text-text-secondary"
              >
                {renderInline(block.text, `q-${index}`)}
              </blockquote>
            );
          case 'ul':
            return (
              <ul key={index} className="flex flex-col gap-2 ps-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="list-disc text-base leading-7 text-text-secondary">
                    {renderInline(item, `ul-${index}-${itemIndex}`)}
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={index} className="flex flex-col gap-2 ps-5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="list-decimal text-base leading-7 text-text-secondary">
                    {renderInline(item, `ol-${index}-${itemIndex}`)}
                  </li>
                ))}
              </ol>
            );
          case 'table':
            return (
              <div key={index} className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {block.head.map((cell, cellIndex) => (
                        <th
                          key={cellIndex}
                          className="border border-border-default bg-surface-50 px-3 py-2 text-start font-semibold text-text-primary"
                        >
                          {renderInline(cell, `th-${index}-${cellIndex}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="border border-border-default px-3 py-2 text-text-secondary"
                          >
                            {renderInline(cell, `td-${index}-${rowIndex}-${cellIndex}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
