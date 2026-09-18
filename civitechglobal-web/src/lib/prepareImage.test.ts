import { beforeEach, describe, expect, it, vi } from 'vitest';
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
