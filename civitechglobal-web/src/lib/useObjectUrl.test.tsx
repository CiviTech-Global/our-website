import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useObjectUrl } from './useObjectUrl';

/**
 * The one promise this hook makes: a URL per file, not per render, and every
 * URL it makes is eventually revoked.
 */

const created: string[] = [];
const revoked: string[] = [];

beforeEach(() => {
  created.length = 0;
  revoked.length = 0;
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => {
      const url = `blob:stub-${created.length}`;
      created.push(url);
      return url;
    },
    revokeObjectURL: (url: string) => revoked.push(url),
  });
});

describe('useObjectUrl', () => {
  it('makes one URL per file, not one per render', () => {
    const file = new File(['a'], 'a.png', { type: 'image/png' });
    const { result, rerender } = renderHook(({ f }) => useObjectUrl(f), {
      initialProps: { f: file },
    });

    rerender({ f: file });
    rerender({ f: file });

    expect(created).toHaveLength(1);
    expect(result.current).toBe(created[0]);
  });

  it('revokes the old URL when the file changes, and the last one on unmount', () => {
    const first = new File(['a'], 'a.png', { type: 'image/png' });
    const second = new File(['b'], 'b.png', { type: 'image/png' });
    const { result, rerender, unmount } = renderHook(({ f }) => useObjectUrl(f), {
      initialProps: { f: first },
    });

    rerender({ f: second });
    expect(revoked).toEqual([created[0]]);
    expect(result.current).toBe(created[1]);

    unmount();
    expect(revoked).toEqual([created[0], created[1]]);
  });
});
