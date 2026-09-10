import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { promisify } from 'node:util';

/**
 * Writes .gz and .br next to every compressible build artefact.
 *
 * Compressing once at build time beats compressing on every request twice
 * over: nginx serves the precompressed file with `gzip_static` at zero CPU,
 * and because it happens offline it can use the maximum level rather than the
 * level 5 you would pick to keep per-request cost sane.
 *
 * The .br files are written even though stock nginx cannot serve them —
 * `brotli_static` needs a module that is not in the base image. They cost
 * nothing to carry and are immediately useful behind a CDN or any proxy built
 * with brotli, which is the direction this is going. Brotli is roughly 15%
 * smaller than gzip on JavaScript.
 *
 * Uses node:zlib rather than a plugin, so this adds no dependency.
 */

const DIST = path.resolve('dist');

// Text formats only. Recompressing a PNG, a WOFF2 or an already-compressed
// artefact spends CPU to produce a bigger file.
const COMPRESSIBLE = new Set([
  '.js', '.css', '.html', '.json', '.svg', '.txt', '.xml', '.map', '.webmanifest',
]);

// Below about a kilobyte, framing overhead cancels the saving out.
const MIN_BYTES = 1024;

const gzipAsync = promisify(gzip);
const brotliAsync = promisify(brotliCompress);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const results = { files: 0, raw: 0, gz: 0, br: 0 };

for await (const file of walk(DIST)) {
  if (!COMPRESSIBLE.has(path.extname(file))) continue;
  if (file.endsWith('.gz') || file.endsWith('.br')) continue;

  const { size } = await stat(file);
  if (size < MIN_BYTES) continue;

  const buffer = await readFile(file);

  const [gzipped, brotlied] = await Promise.all([
    gzipAsync(buffer, { level: 9 }),
    brotliAsync(buffer, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        // Telling brotli the input is text measurably improves the ratio.
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
      },
    }),
  ]);

  await Promise.all([
    writeFile(`${file}.gz`, gzipped),
    writeFile(`${file}.br`, brotlied),
  ]);

  results.files += 1;
  results.raw += size;
  results.gz += gzipped.length;
  results.br += brotlied.length;
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const pct = (n) => `${((1 - n / results.raw) * 100).toFixed(0)}%`;

console.log(
  results.files === 0
    ? 'precompress: nothing to do'
    : `precompress: ${results.files} files  ${kb(results.raw)} raw  →  ` +
      `${kb(results.gz)} gzip (${pct(results.gz)})  ·  ${kb(results.br)} brotli (${pct(results.br)})`,
);
