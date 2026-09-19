import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { countWords, extractFaqs, Markdown, parseMarkdown, safeHref } from './markdown';

describe('parseMarkdown', () => {
  it('parses headings, paragraphs and lists', () => {
    const blocks = parseMarkdown(
      [
        '## بیمه شخص ثالث',
        '',
        'این یک **مهم** پاراگراف با [لینک](/insurance) است.',
        '',
        '- مورد اول',
        '- مورد دوم',
        '',
        '۱. گام نخست',
        '۲. گام دوم',
      ].join('\n')
    );

    expect(blocks[0]).toEqual({ kind: 'h2', text: 'بیمه شخص ثالث' });
    expect(blocks[1].kind).toBe('p');
    expect(blocks[2]).toEqual({ kind: 'ul', items: ['مورد اول', 'مورد دوم'] });
    expect(blocks[3]).toEqual({ kind: 'ol', items: ['گام نخست', 'گام دوم'] });
  });

  it('parses pipe tables with a separator row', () => {
    const blocks = parseMarkdown(
      ['| عامل | اثر روی قیمت |', '|---|---|', '| تخفیف عدم خسارت | کاهش |', '| جریمه معوقه | افزایش |'].join(
        '\n'
      )
    );
    expect(blocks[0]).toEqual({
      kind: 'table',
      head: ['عامل', 'اثر روی قیمت'],
      rows: [
        ['تخفیف عدم خسارت', 'کاهش'],
        ['جریمه معوقه', 'افزایش'],
      ],
    });
  });

  it('joins multi-line paragraphs and keeps blockquotes', () => {
    const blocks = parseMarkdown('خط نخست\nخط دوم\n\n> نکته مهم');
    expect(blocks[0]).toEqual({ kind: 'p', text: 'خط نخست خط دوم' });
    expect(blocks[1]).toEqual({ kind: 'quote', text: 'نکته مهم' });
  });
});

describe('countWords', () => {
  it('counts words across blocks', () => {
    const blocks = parseMarkdown('## عنوان\n\nیک دو سه\n\n- چهار پنج');
    expect(countWords(blocks)).toBe(6);
  });
});

describe('extractFaqs', () => {
  it('collects h3 questions with their following paragraph until the next h2', () => {
    const blocks = parseMarkdown(
      [
        '## سوالات متداول',
        '',
        '### قیمت چقدر است؟',
        '',
        'قیمت به عوامل مختلفی بستگی دارد.',
        '',
        '### مدارک لازم چیست؟',
        '',
        'کارت خودرو و بیمه‌نامه قبلی.',
        '',
        '## بخش بعدی',
        '',
        'متن عادی',
      ].join('\n')
    );
    expect(extractFaqs(blocks, 'سوالات متداول')).toEqual([
      { question: 'قیمت چقدر است؟', answer: 'قیمت به عوامل مختلفی بستگی دارد.' },
      { question: 'مدارک لازم چیست؟', answer: 'کارت خودرو و بیمه‌نامه قبلی.' },
    ]);
  });

  it('returns an empty list when the heading is absent', () => {
    expect(extractFaqs(parseMarkdown('## چیز دیگری'), 'سوالات متداول')).toEqual([]);
  });
});

describe('Markdown rendering', () => {
  it('renders links and bold text', () => {
    const blocks = parseMarkdown('متن با **مهم** و [استعلام آنلاین](/insurance).');
    render(<Markdown blocks={blocks} />);
    expect(screen.getByRole('link', { name: 'استعلام آنلاین' })).toHaveAttribute('href', '/insurance');
    expect(screen.getByText('مهم')).toBeInTheDocument();
  });
});

describe('link schemes', () => {
  it('keeps the ordinary ones', () => {
    expect(safeHref('https://example.com/a')).toBe('https://example.com/a');
    expect(safeHref('http://example.com')).toBe('http://example.com');
    expect(safeHref('mailto:a@example.com')).toBe('mailto:a@example.com');
    expect(safeHref('tel:+982112345678')).toBe('tel:+982112345678');
  });

  it('keeps relative paths and anchors, which carry no scheme', () => {
    expect(safeHref('/insurance')).toBe('/insurance');
    expect(safeHref('#faq')).toBe('#faq');
    expect(safeHref('?page=2')).toBe('?page=2');
  });

  it('refuses anything that can execute', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('JaVaScRiPt:alert(1)')).toBeNull();
    // The parser collapses the whitespace a naive prefix check would trip on.
    expect(safeHref('  javascript:alert(1)')).toBeNull();
    expect(safeHref('java\nscript:alert(1)')).toBeNull();
    expect(safeHref('vbscript:msgbox(1)')).toBeNull();
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('renders a refused link as plain words rather than dropping it', () => {
    const { container } = render(<Markdown blocks={parseMarkdown('[click me](javascript:alert(1))')} />);

    expect(container.textContent).toContain('click me');
    expect(container.querySelector('a')).toBeNull();
  });

  it('still links a safe one', () => {
    const { container } = render(<Markdown blocks={parseMarkdown('[our insurance](/insurance)')} />);

    expect(container.querySelector('a')?.getAttribute('href')).toBe('/insurance');
  });
});
