import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

/**
 * The state machine, without a network or a canvas.
 *
 * What matters here is the sequence somebody watches — and in particular that
 * the bar reaching 100% is not the same thing as the upload being finished.
 */

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  prepareImage: vi.fn(),
}));

vi.mock('@/config/api', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, api: { upload: mocks.upload } };
});
vi.mock('@/lib/prepareImage', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, prepareImage: mocks.prepareImage };
});

const { useUpload } = await import('./useUpload');
const { LocaleProvider } = await import('@/i18n/LocaleProvider');

const wrapper = ({ children }: { children: ReactNode }) => <LocaleProvider>{children}</LocaleProvider>;

const file = new File([new Uint8Array(10)], 'scan.pdf', { type: 'application/pdf' });

const options = {
  url: '/market/me/books',
  context: 'test',
  buildBody: (f: File) => {
    const form = new FormData();
    form.append('cover', f);
    return form;
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the sequence', () => {
  it('ends in done, having passed through uploading', async () => {
    mocks.upload.mockImplementation(async (_m, _u, _b, config) => {
      config.onProgress?.(40);
      return { data: { id: 'x' } };
    });

    const { result } = renderHook(() => useUpload(options), { wrapper });

    await act(async () => {
      await result.current.start(file);
    });

    await waitFor(() => expect(result.current.state.phase).toBe('done'));
    expect(result.current.state.percent).toBe(100);
    expect(result.current.state.file?.name).toBe('scan.pdf');
  });

  it('moves to finishing at 100%, not to done', async () => {
    // The server has not answered yet: the bytes are out and it is scanning.
    let resolveUpload: (value: unknown) => void = () => {};
    mocks.upload.mockImplementation(async (_m, _u, _b, config) => {
      config.onProgress?.(100);
      return new Promise((resolve) => {
        resolveUpload = resolve;
      });
    });

    const { result } = renderHook(() => useUpload(options), { wrapper });

    act(() => {
      void result.current.start(file);
    });

    await waitFor(() => expect(result.current.state.phase).toBe('finishing'));
    expect(result.current.state.percent).toBe(100);

    await act(async () => {
      resolveUpload({ data: null });
    });
    await waitFor(() => expect(result.current.state.phase).toBe('done'));
  });

  it('reports a failure with a reason and keeps the file for a retry', async () => {
    const { UploadError } = await import('@/config/api');
    mocks.upload.mockRejectedValue(new UploadError('network', 'down'));

    const { result } = renderHook(() => useUpload(options), { wrapper });

    await act(async () => {
      await result.current.start(file);
    });

    expect(result.current.state.phase).toBe('error');
    expect(result.current.state.error?.retryable).toBe(true);
    expect(result.current.state.error?.detail).toContain('scan.pdf');

    // Retry re-sends without the person finding the file again.
    mocks.upload.mockResolvedValue({ data: { id: 'x' } });
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.state.phase).toBe('done'));
    expect(mocks.upload).toHaveBeenCalledTimes(2);
  });
});

describe('images', () => {
  it('shrinks before sending and reports what it saved', async () => {
    const shrunk = new File([new Uint8Array(2)], 'photo.webp', { type: 'image/webp' });
    mocks.prepareImage.mockResolvedValue({ file: shrunk, originalBytes: 4_000_000, width: 1600, height: 1200 });
    mocks.upload.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useUpload({ ...options, prepareImages: true }), { wrapper });

    await act(async () => {
      await result.current.start(new File([new Uint8Array(9)], 'photo.jpg', { type: 'image/jpeg' }));
    });

    await waitFor(() => expect(result.current.state.phase).toBe('done'));
    // The prepared file is what was sent, and the original size is kept so the
    // UI can say what the shrinking achieved.
    expect(result.current.state.file?.name).toBe('photo.webp');
    expect(result.current.state.originalBytes).toBe(4_000_000);
  });

  it('does not offer a retry for a picture that cannot be read', async () => {
    const { ImageUnreadableError } = await import('@/lib/prepareImage');
    mocks.prepareImage.mockRejectedValue(new ImageUnreadableError('nope'));

    const { result } = renderHook(() => useUpload({ ...options, prepareImages: true }), { wrapper });

    await act(async () => {
      await result.current.start(file);
    });

    expect(result.current.state.phase).toBe('error');
    expect(result.current.state.error?.retryable).toBe(false);
    expect(result.current.state.error?.needsDifferentFile).toBe(true);
    // Never sent: there was nothing worth sending.
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
