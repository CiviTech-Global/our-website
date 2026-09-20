import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { useListControls } from './useListControls';

/**
 * The list state, as a URL.
 *
 * These pin the decisions that are invisible in the signature: that typing is
 * debounced and replaces rather than pushes, that anything but paging returns
 * to page 1, that a default is absent from the query string rather than
 * spelled out in it, and that a page number out of a URL is untrusted input.
 */

function wrapper(initial = '/books') {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  );
}

/** Renders the hook alongside the location, so assertions can read the URL. */
function setup(initial?: string, options?: Parameters<typeof useListControls>[0]) {
  return renderHook(
    () => ({ controls: useListControls(options), location: useLocation() }),
    { wrapper: wrapper(initial) }
  );
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe('useListControls', () => {
  it('starts from the defaults with an empty query string', () => {
    const { result } = setup('/books', { defaultView: 'cards', defaultSort: 'newest' });

    expect(result.current.controls.page).toBe(1);
    expect(result.current.controls.search).toBe('');
    expect(result.current.controls.sort).toBe('newest');
    expect(result.current.controls.view).toBe('cards');
    expect(result.current.controls.activeCount).toBe(0);
    expect(result.current.location.search).toBe('');
  });

  it('reads state out of the URL it was opened with', () => {
    const { result } = setup('/books?q=شاهنامه&condition=USED&page=3&view=table&sort=price-asc', {
      filters: { condition: '' },
      defaultSort: 'newest',
    });

    expect(result.current.controls.search).toBe('شاهنامه');
    expect(result.current.controls.searchInput).toBe('شاهنامه');
    expect(result.current.controls.filters.condition).toBe('USED');
    expect(result.current.controls.page).toBe(3);
    expect(result.current.controls.view).toBe('table');
    expect(result.current.controls.sort).toBe('price-asc');
    expect(result.current.controls.activeCount).toBe(2);
  });

  // The box has to answer the keystroke; the server does not.
  it('shows typing immediately but only queries once it settles', () => {
    const { result } = setup();

    act(() => result.current.controls.setSearch('کت'));
    expect(result.current.controls.searchInput).toBe('کت');
    expect(result.current.controls.search).toBe('');

    act(() => result.current.controls.setSearch('کتاب'));
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.controls.search).toBe('کتاب');
    expect(result.current.location.search).toBe('?q=%DA%A9%D8%AA%D8%A7%D8%A8');
  });

  it('keeps a defaulted value out of the query string', () => {
    const { result } = setup('/books', { defaultView: 'cards', defaultSort: 'newest' });

    act(() => result.current.controls.setView('table'));
    expect(result.current.location.search).toBe('?view=table');

    act(() => result.current.controls.setView('cards'));
    expect(result.current.location.search).toBe('');

    act(() => result.current.controls.setSort('newest'));
    expect(result.current.location.search).toBe('');
  });

  // Page 7 of a two-page result is an empty screen that reads as "no results".
  it('returns to the first page when a filter, sort or search changes', () => {
    const { result } = setup('/books?page=5', { filters: { condition: '' } });
    expect(result.current.controls.page).toBe(5);

    act(() => result.current.controls.setFilter('condition', 'NEW'));
    expect(result.current.controls.page).toBe(1);

    act(() => result.current.controls.setPage(4));
    act(() => result.current.controls.setSort('title'));
    expect(result.current.controls.page).toBe(1);

    act(() => result.current.controls.setPage(4));
    act(() => result.current.controls.setSearch('x'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.controls.page).toBe(1);
  });

  it('keeps the page when only the page changes', () => {
    const { result } = setup('/books?q=x', { filters: { condition: '' } });

    act(() => result.current.controls.setPage(2));
    expect(result.current.controls.page).toBe(2);
    expect(result.current.controls.search).toBe('x');
  });

  it('treats a nonsense page number in the URL as page 1', () => {
    for (const bad of ['0', '-4', 'abc', '']) {
      const { result } = setup(`/books?page=${bad}`);
      expect(result.current.controls.page).toBe(1);
    }
  });

  it('clears everything it owns at once', () => {
    const { result } = setup('/books?q=x&condition=USED&sort=title&page=3', {
      filters: { condition: '' },
      defaultSort: 'newest',
    });

    act(() => result.current.controls.clear());

    expect(result.current.controls.searchInput).toBe('');
    expect(result.current.controls.search).toBe('');
    expect(result.current.controls.filters.condition).toBe('');
    expect(result.current.controls.sort).toBe('newest');
    expect(result.current.controls.page).toBe(1);
    expect(result.current.controls.activeCount).toBe(0);
  });

  // Landing on a shared link, or going back, has to reach the text box: the
  // URL is the state, and a box still showing the old word is a lie.
  it('follows the URL back into the search box', () => {
    const { result } = setup('/books?q=first');
    expect(result.current.controls.searchInput).toBe('first');

    act(() => result.current.controls.clear());
    expect(result.current.controls.searchInput).toBe('');
  });

  // A dropdown changes once per decision; a text box changes once per letter.
  it('debounces a typed filter but shows it immediately', () => {
    const { result } = setup('/jobs', {
      filters: { skills: '' },
      typedFilters: ['skills'],
    });

    act(() => result.current.controls.setFilter('skills', 'rea'));
    expect(result.current.controls.filterInput('skills')).toBe('rea');
    expect(result.current.controls.filters.skills).toBe('');
    expect(result.current.location.search).toBe('');

    act(() => result.current.controls.setFilter('skills', 'react'));
    act(() => vi.advanceTimersByTime(300));

    expect(result.current.controls.filters.skills).toBe('react');
    expect(result.current.location.search).toBe('?skills=react');
  });

  it('writes a picked filter straight through', () => {
    const { result } = setup('/jobs', { filters: { skills: '', kind: '' }, typedFilters: ['skills'] });

    act(() => result.current.controls.setFilter('kind', 'REMOTE'));
    expect(result.current.controls.filters.kind).toBe('REMOTE');
    expect(result.current.location.search).toBe('?kind=REMOTE');
  });

  it('fills a typed filter box from the URL it was opened with', () => {
    const { result } = setup('/jobs?skills=go', { filters: { skills: '' }, typedFilters: ['skills'] });
    expect(result.current.controls.filterInput('skills')).toBe('go');
  });

  it('empties a typed filter box when the filters are cleared', () => {
    const { result } = setup('/jobs?skills=go', { filters: { skills: '' }, typedFilters: ['skills'] });

    act(() => result.current.controls.setFilter('skills', 'golang'));
    act(() => result.current.controls.clear());

    expect(result.current.controls.filterInput('skills')).toBe('');
    expect(result.current.location.search).toBe('');
  });

  it('ignores a view the app does not have', () => {
    const { result } = setup('/books?view=carousel', { defaultView: 'table' });
    expect(result.current.controls.view).toBe('table');
  });
});
