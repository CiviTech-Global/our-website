import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { countWords, extractFaqs, Markdown, parseMarkdown } from './markdown';

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
