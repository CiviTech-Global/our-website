import { describe, expect, it } from 'vitest';
import { inflateSync } from 'node:zlib';
import { placeholderPng } from './placeholder-image.js';

/**
 * A hand-written PNG encoder.
 *
 * Checked by decoding it rather than by eye: every byte here is a length, a
 * checksum or a filter byte, and getting one wrong produces a file that some
 * decoders accept and browsers refuse — which would look like a broken upload
 * path rather than a broken encoder.
 */

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Walks the chunk structure, verifying each length and CRC as it goes. */
function chunks(png: Buffer) {
  const found: Array<{ type: string; data: Buffer }> = [];
  let offset = SIGNATURE.length;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);
    const declared = png.readUInt32BE(offset + 8 + length);

    // The same CRC the encoder claims to have written, recomputed here
    // independently so a bug in the encoder's table cannot hide behind itself.
    let c = 0xffffffff;
    for (const byte of png.subarray(offset + 4, offset + 8 + length)) {
      c ^= byte;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    const actual = (c ^ 0xffffffff) >>> 0;

    found.push({ type, data });
    if (declared !== actual) {
      throw new Error(`chunk ${type} has a bad CRC: ${declared} vs ${actual}`);
    }

    offset += 12 + length;
  }

  return found;
}

describe('the placeholder PNG', () => {
  const png = placeholderPng('Tehran Ceramics');

  it('starts with the PNG signature', () => {
    expect(png.subarray(0, 8).equals(SIGNATURE)).toBe(true);
  });

  it('has a valid CRC on every chunk', () => {
    // chunks() throws on a mismatch, so reaching the assertion is the result.
    expect(() => chunks(png)).not.toThrow();
  });

  it('carries exactly the chunks a PNG needs, in order', () => {
    expect(chunks(png).map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
  });

  it('declares a square truecolour image at eight bits', () => {
    const [ihdr] = chunks(png);
    expect(ihdr.data.readUInt32BE(0)).toBe(600);
    expect(ihdr.data.readUInt32BE(4)).toBe(600);
    expect(ihdr.data[8]).toBe(8);
    expect(ihdr.data[9]).toBe(2);
  });

  it('holds a bitmap of exactly the declared size', () => {
    // The commonest way to get this wrong is a scanline short of its filter
    // byte, which decodes to a skewed image rather than an error.
    const idat = chunks(png).find((c) => c.type === 'IDAT')!;
    const raw = inflateSync(idat.data);

    expect(raw.length).toBe(600 * (1 + 600 * 3));
  });

  it('uses the no-op filter on every scanline', () => {
    const idat = chunks(png).find((c) => c.type === 'IDAT')!;
    const raw = inflateSync(idat.data);

    for (let y = 0; y < 600; y += 1) {
      expect(raw[y * (1 + 600 * 3)], `scanline ${y}`).toBe(0);
    }
  });

  it('gives the same name the same colour every time', () => {
    // Otherwise two screenshots of the same demo would look like different data.
    expect(placeholderPng('Tehran Ceramics').equals(placeholderPng('Tehran Ceramics'))).toBe(true);
  });

  it('gives different names different colours', () => {
    expect(placeholderPng('One').equals(placeholderPng('Two'))).toBe(false);
  });

  it('is small enough to store a few dozen of without thinking about it', () => {
    // Two flat colours deflate hard; if this ever grew past a few hundred KB it
    // would mean the bitmap had stopped being flat.
    expect(png.length).toBeLessThan(200_000);
  });
});
