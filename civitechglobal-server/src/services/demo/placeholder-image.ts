import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';

/**
 * A PNG made from nothing.
 *
 * Demo shops and products need pictures or the catalogue shows a grid of grey
 * icons, which tells you very little about how the site looks — and looking at
 * it is the entire reason for the demo data.
 *
 * Written by hand rather than by adding an image library: this needs one solid
 * rectangle with a diagonal band, and sharp is already a dependency of the
 * upload path but pulling it in here would mean the seeder cannot run without
 * native bindings. A PNG is a header, one deflated bitmap and three checksums —
 * about sixty lines, no dependencies, and it works anywhere Node runs.
 *
 * The colour comes from the subject's name, so the same shop is the same colour
 * every time it is seeded. Random colours would make two screenshots of the
 * same demo look like different data.
 */

const SIZE = 600;

/** A stable hue from a string, so a given name always gets a given colour. */
function hueOf(seed: string): number {
  const digest = createHash('sha256').update(seed).digest();
  return digest[0] / 255;
}

/**
 * HSL to RGB, at fixed saturation and lightness.
 *
 * Fixed because the point is a set of placeholders that look like they belong
 * to one system: varying all three gives some that are nearly white and some
 * nearly black, and text on them is unreadable at both ends.
 */
function colourOf(seed: string, lightness: number): [number, number, number] {
  const h = hueOf(seed) * 6;
  const c = 0.45 * (1 - Math.abs(2 * lightness - 1));
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = lightness - c / 2;

  const [r, g, b] =
    h < 1 ? [c, x, 0]
    : h < 2 ? [x, c, 0]
    : h < 3 ? [0, c, x]
    : h < 4 ? [0, x, c]
    : h < 5 ? [x, 0, c]
    : [c, 0, x];

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));

  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * CRC-32, as PNG requires on every chunk.
 *
 * The table is built once rather than kept as a literal: a 256-entry array of
 * magic numbers in the source is unreviewable, and this is four lines that
 * anybody can check against the specification.
 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * A square placeholder, coloured from `seed`.
 *
 * The diagonal band is there so a placeholder is recognisable as one at a
 * glance: a plain rectangle looks like a photograph that failed to load, and
 * somebody would report it as a bug.
 */
export function placeholderPng(seed: string): Buffer {
  const background = colourOf(seed, 0.55);
  const band = colourOf(seed, 0.42);

  // Raw scanlines: one filter byte (0, none) then RGB per pixel.
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 3));
  let offset = 0;

  for (let y = 0; y < SIZE; y += 1) {
    raw[offset] = 0;
    offset += 1;

    for (let x = 0; x < SIZE; x += 1) {
      // A band about a sixth of the way across, at 45 degrees.
      const onBand = ((x + y) % (SIZE / 3) | 0) < SIZE / 24;
      const [r, g, b] = onBand ? band : background;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  return Buffer.concat([
    // The PNG signature. The 0x0d0a pair and the 0x1a are there to make a file
    // mangled by a text-mode transfer fail loudly rather than subtly.
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
