/**
 * Every picture this site uploads, made small before it leaves the browser.
 *
 * The photograph somebody picks is whatever their phone took: four thousand
 * pixels wide and several megabytes, to be shown in a card two hundred pixels
 * across. Sending that costs the uploader their data, costs the server its
 * disk, and costs every later reader the download — for detail no one will
 * ever see.
 *
 * So the page re-encodes before it uploads: scale to fit a sane box, encode as
 * WebP, and step the quality down until the result fits the budget. WebP
 * because every browser that can run this application can both write and read
 * it, and it is roughly a third smaller than JPEG at the same quality.
 *
 * This is a courtesy to the uploader, never a security control — it runs on
 * the client, where nothing can be enforced. The server applies the same
 * ceiling itself (attachment.service's MAX_IMAGE_BYTES) and refuses what does
 * not meet it.
 */

/** Matches MAX_IMAGE_BYTES on the server, which is what actually binds. */
export const MAX_IMAGE_BYTES = 300 * 1024;

/**
 * The longest edge we keep.
 *
 * 1600px covers a full-bleed cover on a large screen at 2× pixel density, and
 * is well past what any card or thumbnail needs.
 */
const MAX_EDGE = 1600;

/** Tried in order until one fits the budget. */
const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.5, 0.4];

export interface PreparedImage {
  file: File;
  /** What the original weighed, so the page can say what it saved. */
  originalBytes: number;
  width: number;
  height: number;
}

export class ImageTooLargeError extends Error {}
export class ImageUnreadableError extends Error {}

function scaled(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE) return { width, height };
  const ratio = MAX_EDGE / longest;
  // Never round to zero: a 3000×2 panorama is degenerate but should not become
  // a canvas of height 0, which throws rather than failing meaningfully.
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

async function decode(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch {
    // A file the browser cannot decode is not an image, whatever it is called.
    throw new ImageUnreadableError('unreadable');
  } finally {
    // Safe here: decode() has already read the bytes, and the canvas draw
    // below works from the decoded image rather than the URL.
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
}

/**
 * Re-encodes `file` to a WebP that fits the budget.
 *
 * Throws ImageUnreadableError if the browser cannot decode it, and
 * ImageTooLargeError if even the lowest quality step is over budget — which in
 * practice means an image so large that shrinking it further would be
 * pointless anyway, and the honest answer is to ask for a different picture.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const image = await decode(file);
  const { width, height } = scaled(image.naturalWidth, image.naturalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new ImageUnreadableError('no 2d context');
  // White underneath: a transparent PNG re-encoded to a lossy format would
  // otherwise get black where the transparency was.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  for (const quality of QUALITY_STEPS) {
    const blob = await toBlob(canvas, quality);
    if (!blob) throw new ImageUnreadableError('encode failed');
    if (blob.size <= MAX_IMAGE_BYTES) {
      const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`;
      return {
        file: new File([blob], name, { type: 'image/webp' }),
        originalBytes: file.size,
        width,
        height,
      };
    }
  }

  throw new ImageTooLargeError('over budget at the lowest quality');
}
