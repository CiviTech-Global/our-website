import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { pageWindow } from '@/lib/pageWindow';
import { ListPager, type ListPagerProps } from './ListPager';

describe('pageWindow', () => {
  it('lists every page when there are few', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps the ends and the neighbours, with gaps between', () => {
    expect(pageWindow(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
  });

  // Near an end, a gap standing in for one page would be silly.
  it('fills out the near end instead of a gap of one', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, 'gap', 20]);
    expect(pageWindow(3, 20)).toEqual([1, 2, 3, 4, 'gap', 20]);
    expect(pageWindow(20, 20)).toEqual([1, 'gap', 17, 18, 19, 20]);
  });

  it('never shows more than seven slots', () => {
    for (let total = 1; total <= 40; total += 1) {
      for (let page = 1; page <= total; page += 1) {
        expect(pageWindow(page, total).length).toBeLessThanOrEqual(7);
      }
    }
  });
});

function renderPager(props: Partial<ListPagerProps> = {}) {
  const onPageChange = vi.fn();
  const onPageSizeChange = vi.fn();
  render(
    <LocaleProvider locale="en">
      <ListPager
        page={2}
        pageSize={18}
        total={87}
        totalPages={5}
        onPageChange={onPageChange}
        pageSizeOptions={[9, 18, 36, 60]}
        onPageSizeChange={onPageSizeChange}
        {...props}
      />
    </LocaleProvider>
  );
  return { onPageChange, onPageSizeChange };
}

describe('ListPager', () => {
  it('says which rows are on screen', () => {
    renderPager();
    expect(screen.getByText('19–36 of 87')).toBeInTheDocument();
  });

  it('marks the current page and moves to another', () => {
    const { onPageChange } = renderPager();
    expect(screen.getByRole('button', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 5' }));
    expect(onPageChange).toHaveBeenCalledWith(5);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('changes the page size', () => {
    const { onPageSizeChange } = renderPager();
    fireEvent.change(screen.getByLabelText('Per page'), {
      target: { value: '60' },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(60);
  });

  // One page of results still lets the reader ask for fewer per page.
  it('keeps the size choice with a single page, but no page buttons', () => {
    renderPager({ page: 1, total: 15, totalPages: 1 });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Per page')).toBeInTheDocument();
  });

  it('offers no size choice when every size would show the same', () => {
    renderPager({ page: 1, total: 6, totalPages: 1 });
    expect(screen.queryByLabelText('Per page')).not.toBeInTheDocument();
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(
      <LocaleProvider locale="en">
        <ListPager page={1} pageSize={18} total={0} totalPages={0} onPageChange={vi.fn()} />
      </LocaleProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
