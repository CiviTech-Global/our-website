import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { AppError } from '../middleware/errorHandler.js';
import { storage, type StoredObject } from './storage/index.js';
import { malwareScanner } from './malware/index.js';

/**
 * Storage and validation for client-supplied files.
 *
 * A public endpoint that accepts uploads is the highest-risk surface in this
 * application, and this flow has no login in front of it, so the controls here
 * are the only thing standing between a stranger and our disk. They follow the
 * OWASP file-upload guidance:
 *
 *   - An ALLOW list of types, never a deny list. A deny list is a promise to
 *     have thought of every dangerous extension, which nobody can keep.
 *   - The type is decided by the file's own leading bytes, not by the
 *     extension and not by the Content-Type the browser claimed. Both of those
 *     are attacker-controlled.
 *   - The stored name is random. Nothing derived from `originalName` ever
 *     reaches the filesystem, which is what makes path traversal impossible
 *     rather than merely filtered.
 *   - Files are written outside any directory the web server serves, and are
 *     handed back only through an authenticated route that forces a download.
 *     Even a file that somehow contained a script has nowhere to execute.
 *   - Size and count are capped before anything is written.
 *
 * Where the bytes end up is `services/storage`'s problem, not this file's:
 * this module decides whether a file is acceptable and what it is called, and
 * the driver decides whether that means a disk or a bucket.
 *
 * Contents are scanned by `services/malware` before anything is written, so
 * a hostile file never reaches storage at all. That scanner fails CLOSED: if
 * it cannot answer, the upload is refused rather than quietly accepted.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 8;

interface AllowedType {
  /** Extension we give the stored file. Chosen by us, never by the caller. */
  ext: string;
  mime: string;
  /** Returns true if these bytes look like this type. */
  sniff: (buf: Buffer, declaredExt: string) => boolean;
}

const startsWith = (buf: Buffer, bytes: number[]): boolean =>
  bytes.length <= buf.length && bytes.every((b, i) => buf[i] === b);

/**
 * OOXML files (.docx/.xlsx/.pptx) are ZIP archives, so their magic bytes are
 * just "PK\3\4" and cannot tell the three apart without unpacking. We verify
 * the container is genuinely a ZIP and then trust the declared extension to
 * pick between the three — which is safe here because the choice only affects
 * the label we store, never how the file is treated.
 */
const isZipContainer = (buf: Buffer): boolean =>
  startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) ||
  startsWith(buf, [0x50, 0x4b, 0x05, 0x06]) ||
  startsWith(buf, [0x50, 0x4b, 0x07, 0x08]);

/**
 * Text has no magic number, so "is this text?" is answered by decoding it.
 * A NUL byte or a lone replacement character means it is not the UTF-8 text
 * it claims to be, and a binary payload wearing a .txt extension is exactly
 * what this check is for.
 */
const looksLikeUtf8Text = (buf: Buffer): boolean => {
  if (buf.includes(0x00)) return false;
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  return !decoded.includes('�');
};

const ALLOWED: AllowedType[] = [
  { ext: 'pdf', mime: 'application/pdf', sniff: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]) },
  {
    ext: 'png',
    mime: 'image/png',
    sniff: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  { ext: 'jpg', mime: 'image/jpeg', sniff: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  {
    ext: 'webp',
    mime: 'image/webp',
    sniff: (b) =>
      startsWith(b, [0x52, 0x49, 0x46, 0x46]) && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sniff: (b, ext) => ext === 'docx' && isZipContainer(b),
  },
  {
    ext: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sniff: (b, ext) => ext === 'xlsx' && isZipContainer(b),
  },
  {
    ext: 'pptx',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sniff: (b, ext) => ext === 'pptx' && isZipContainer(b),
  },
  { ext: 'txt', mime: 'text/plain', sniff: (b, ext) => ext === 'txt' && looksLikeUtf8Text(b) },
  { ext: 'md', mime: 'text/markdown', sniff: (b, ext) => ext === 'md' && looksLikeUtf8Text(b) },
  { ext: 'csv', mime: 'text/csv', sniff: (b, ext) => ext === 'csv' && looksLikeUtf8Text(b) },
  // A LaTeX source file is plain text, so the same UTF-8 check that guards a
  // .txt guards this: a binary payload wearing a .tex extension is rejected.
  { ext: 'tex', mime: 'text/x-tex', sniff: (b, ext) => ext === 'tex' && looksLikeUtf8Text(b) },
];

export const ACCEPTED_EXTENSIONS = ALLOWED.map((a) => a.ext);

/**
 * What a resume may be. Narrower than the full list on purpose: an intake that
 * accepts a spreadsheet or a PNG because the general allowlist happens to
 * include them is an intake nobody chose the rules for.
 */
export const RESUME_EXTENSIONS = ['pdf', 'docx', 'tex'] as const;

/**
 * What a photograph may be. Narrower than the general allowlist for the same
 * reason RESUME_EXTENSIONS is: a staff portrait that arrives as a spreadsheet
 * is a mistake, and accepting it because the general list happens to permit it
 * is an intake nobody chose the rules for.
 *
 * No SVG, deliberately — it is a document format that executes script, and
 * these are rendered in an <img> on a public page.
 */
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'webp'] as const;
export const IMAGE_ACCEPT_ATTRIBUTE = IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',');
export const RESUME_ACCEPT_ATTRIBUTE = RESUME_EXTENSIONS.map((e) => `.${e}`).join(',');

/** The `accept` attribute for the file input, so the browser filters too. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',');

export interface IncomingFile {
  originalName: string;
  buffer: Buffer;
}

export interface StoredFile {
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}

/**
 * The extension the CLIENT used, lowercased and stripped of any path.
 * Used only to disambiguate ZIP-based and text formats — never to build a path.
 */
function declaredExtension(originalName: string): string {
  const base = path.basename(originalName.replace(/\\/g, '/'));
  const ext = path.extname(base).replace('.', '').toLowerCase();
  return ext;
}

/** Display name: no directories, no control characters, bounded length. */
export function safeDisplayName(originalName: string): string {
  const base = path.basename(originalName.replace(/\\/g, '/'));
  const cleaned = base.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return (cleaned || 'file').slice(0, 200);
}

export function identifyType(
  buffer: Buffer,
  originalName: string,
  allowed: readonly string[] = ACCEPTED_EXTENSIONS
): AllowedType {
  const declared = declaredExtension(originalName);
  const match = ALLOWED.find(
    (candidate) => allowed.includes(candidate.ext) && candidate.sniff(buffer, declared)
  );
  if (!match) {
    throw new AppError(
      `نوع فایل «${safeDisplayName(originalName)}» پشتیبانی نمی‌شود یا محتوای آن با پسوندش هم‌خوانی ندارد. فرمت‌های مجاز: ${allowed.join('، ')}`,
      415
    );
  }
  return match;
}

export function assertWithinLimits(files: IncomingFile[]): void {
  if (files.length > MAX_FILES) {
    throw new AppError(`حداکثر ${MAX_FILES} فایل می‌توانید پیوست کنید.`, 413);
  }
  let total = 0;
  for (const file of files) {
    if (file.buffer.length === 0) {
      throw new AppError(`فایل «${safeDisplayName(file.originalName)}» خالی است.`, 400);
    }
    if (file.buffer.length > MAX_FILE_BYTES) {
      throw new AppError(
        `حجم فایل «${safeDisplayName(file.originalName)}» بیش از ${MAX_FILE_BYTES / 1024 / 1024} مگابایت است.`,
        413
      );
    }
    total += file.buffer.length;
  }
  if (total > MAX_TOTAL_BYTES) {
    throw new AppError(
      `مجموع حجم پیوست‌ها نباید از ${MAX_TOTAL_BYTES / 1024 / 1024} مگابایت بیشتر باشد.`,
      413
    );
  }
}

/**
 * Opens a stored file for streaming to a client.
 *
 * Missing is a 410, not a 404: the database row says it existed, so "gone" is
 * the honest answer and a different problem from a bad id.
 */
export function openStoredFile(storedName: string): Promise<StoredObject> {
  return storage().get(storedName);
}

/**
 * Validates and writes every file, or writes none.
 *
 * Validation runs over the whole batch first so a rejected eighth file does not
 * leave seven orphans on disk; if a write then fails part-way, the ones already
 * written are removed.
 */
export async function storeFiles(
  files: IncomingFile[],
  allowed: readonly string[] = ACCEPTED_EXTENSIONS
): Promise<StoredFile[]> {
  if (files.length === 0) return [];

  assertWithinLimits(files);
  const typed = files.map((file) => ({
    file,
    type: identifyType(file.buffer, file.originalName, allowed),
  }));

  // Scan before writing anything. Storing first and scanning after would mean
  // a hostile file exists on disk for as long as the scan takes, and would
  // leave it there if the process died in between.
  const scanner = malwareScanner();
  for (const { file } of typed) {
    await scanner.assertClean(file.buffer, file.originalName);
  }

  const written: StoredFile[] = [];
  try {
    for (const { file, type } of typed) {
      const storedName = `${randomBytes(16).toString('hex')}.${type.ext}`;
      await storage().put(storedName, file.buffer, type.mime);
      written.push({
        originalName: safeDisplayName(file.originalName),
        storedName,
        mimeType: type.mime,
        sizeBytes: file.buffer.length,
        checksum: createHash('sha256').update(file.buffer).digest('hex'),
      });
    }
  } catch (error) {
    await Promise.all(written.map((f) => removeFile(f.storedName)));
    throw error;
  }

  return written;
}

export function removeFile(storedName: string): Promise<void> {
  return storage().delete(storedName);
}
