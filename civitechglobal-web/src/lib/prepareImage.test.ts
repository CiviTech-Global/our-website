import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageTooLargeError, ImageUnreadableError, MAX_IMAGE_BYTES, prepareImage } from './prepareImage';

/**
 * jsdom has no canvas encoder, so the parts that would need one are stubbed:
 * `decode` reports the dimensions, `toBlob` reports a size for a quality. What
 * is under test is the logic between them — the scaling, the quality ladder
 * and what happens when nothing fits.
 */

let naturalWidth = 4000;
let naturalHeight = 3000;
/** Bytes this fake encoder returns for a given quality. */
let sizeFor: (quality: number) => number = () => 100 * 1024;
let decodeFails = false;
let lastCanvas: { width: number; height: number } = { width: 0, height: 0 };

beforeEach(() => {
  naturalWidth = 4000;
  naturalHeight = 3000;
  sizeFor = () => 100 * 1024;
  decodeFails = false;

  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => 'blob:stub',
    revokeObjectURL: () => {},
  });

  class StubImage {
    naturalWidth = 0;
    naturalHeight = 0;
    src = '';
    async decode() {
      if (decodeFails) throw new Error('bad image');
      this.naturalWidth = naturalWidth;
      this.naturalHeight = naturalHeight;
    }
  }
  vi.stubGlobal('Image', StubImage);

  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag !== 'canvas') throw new Error(`unexpected ${tag}`);
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ fillStyle: '', fillRect: () => {}, drawImage: () => {} }),
      toBlob: (cb: (blob: Blob | null) => void, _type: string, quality: number) => {
        lastCanvas = { width: canvas.width, height: canvas.height };
        cb({ size: sizeFor(quality) } as Blob);
      },
    };
    return canvas as unknown as HTMLElement;
  }) as typeof document.createElement);
});

afterEach(() => {
  // Tests that stub createImageBitmap must not leak it into the Image-path
  // tests; the beforeEach stubs are re-applied per test anyway.
  vi.unstubAllGlobals();
});

const sourceFile = (name = 'photo.jpg') =>
  new File([new Uint8Array(1)], name, { type: 'image/jpeg' });

describe('prepareImage', () => {
  it('scales the longest edge down to the box, keeping the aspect ratio', async () => {
    await prepareImage(sourceFile());

    expect(lastCanvas).toEqual({ width: 1600, height: 1200 });
  });

  it('leaves an already-small picture at its own size', async () => {
    naturalWidth = 800;
    naturalHeight = 600;

    await prepareImage(sourceFile());

    expect(lastCanvas).toEqual({ width: 800, height: 600 });
  });

  it('never produces a zero-height canvas from a degenerate ratio', async () => {
    naturalWidth = 3000;
    naturalHeight = 2;

    await prepareImage(sourceFile());

    expect(lastCanvas.height).toBeGreaterThanOrEqual(1);
  });

  it('steps the quality down until the result fits the budget', async () => {
    const tried: number[] = [];
    sizeFor = (quality) => {
      tried.push(quality);
      // Only the third step is small enough.
      return quality > 0.62 ? MAX_IMAGE_BYTES + 1 : MAX_IMAGE_BYTES - 1;
    };

    const prepared = await prepareImage(sourceFile());

    expect(tried).toEqual([0.82, 0.72, 0.62]);
    expect(prepared.file.type).toBe('image/webp');
  });

  it('renames the file to .webp, whatever it was called', async () => {
    const prepared = await prepareImage(sourceFile('holiday.snap.JPEG'));

    expect(prepared.file.name).toBe('holiday.snap.webp');
  });

  it('reports what the original weighed', async () => {
    const prepared = await prepareImage(sourceFile());

    expect(prepared.originalBytes).toBe(sourceFile().size);
  });

  it('gives up rather than shipping something over budget', async () => {
    sizeFor = () => MAX_IMAGE_BYTES + 1;

    await expect(prepareImage(sourceFile())).rejects.toBeInstanceOf(ImageTooLargeError);
  });

  it('refuses a file the browser cannot decode', async () => {
    decodeFails = true;

    await expect(prepareImage(sourceFile('notreally.png'))).rejects.toBeInstanceOf(ImageUnreadableError);
  });
});

describe('prepareImage with createImageBitmap', () => {
  const fakeBitmap = (width: number, height: number) => ({ width, height, close: vi.fn() });

  it('decodes downscaled, bounding the width and closing the bitmap', async () => {
    const options: Array<ImageBitmapOptions | undefined> = [];
    const bitmap = fakeBitmap(1600, 1200);
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async (_source: unknown, opts?: ImageBitmapOptions) => {
        options.push(opts);
        return bitmap;
      }),
    );

    const prepared = await prepareImage(sourceFile());

    expect(options).toEqual([{ resizeWidth: 1600, resizeQuality: 'high' }]);
    expect(lastCanvas).toEqual({ width: 1600, height: 1200 });
    expect(prepared.file.type).toBe('image/webp');
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('bounds the height too when the first pass comes back portrait', async () => {
    const options: Array<ImageBitmapOptions | undefined> = [];
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async (_source: unknown, opts?: ImageBitmapOptions) => {
        options.push(opts);
        return opts?.resizeHeight ? fakeBitmap(1200, 1600) : fakeBitmap(1600, 2133);
      }),
    );

    await prepareImage(sourceFile());

    expect(options).toEqual([
      { resizeWidth: 1600, resizeQuality: 'high' },
      { resizeHeight: 1600, resizeQuality: 'high' },
    ]);
    expect(lastCanvas).toEqual({ width: 1200, height: 1600 });
  });

  it('falls back to the Image path when the resize options are refused', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new TypeError('unsupported options');
      }),
    );

    // The Image stub from beforeEach reports 4000×3000.
    await prepareImage(sourceFile());

    expect(lastCanvas).toEqual({ width: 1600, height: 1200 });
  });
});
