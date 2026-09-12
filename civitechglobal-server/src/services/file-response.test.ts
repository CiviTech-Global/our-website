import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import type { Response } from 'express';
import { requestedDisposition, serveStoredFile } from './file-response.js';

function fakeResponse() {
  const headers: Record<string, string> = {};
  const res = {
    headers,
    setHeader: (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    },
  };
  return res as unknown as Response & { headers: Record<string, string> };
}

function serve(mimeType: string, disposition: 'inline' | 'attachment', originalName = 'file.pdf') {
  const res = fakeResponse();
  const stream = Readable.from([Buffer.from('bytes')]);
  stream.pipe = vi.fn() as never;

  serveStoredFile(res, { sizeBytes: 5, stream }, { mimeType, originalName, disposition });
  return (res as unknown as { headers: Record<string, string> }).headers;
}

describe('requestedDisposition', () => {
  it('treats only an explicit "inline" as a request to show the file', () => {
    expect(requestedDisposition('inline')).toBe('inline');
    expect(requestedDisposition('attachment')).toBe('attachment');
  });

  /** A malformed value must not quietly change how a file is treated. */
  it('falls back to a download for anything else', () => {
    expect(requestedDisposition(undefined)).toBe('attachment');
    expect(requestedDisposition('INLINE')).toBe('attachment');
    expect(requestedDisposition(['inline'])).toBe('attachment');
    expect(requestedDisposition(1)).toBe('attachment');
  });
});

describe('serveStoredFile', () => {
  it('shows the types a browser can actually render', () => {
    for (const mime of ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain']) {
      expect(serve(mime, 'inline')['content-disposition']).toMatch(/^inline;/);
    }
  });

  /**
   * The reason this is an allow list rather than a pass-through. An HTML or
   * SVG file served inline executes script in our own origin, which turns an
   * upload form into stored XSS. Neither is uploadable either — the two facts
   * are kept independent on purpose, so that widening the upload allowlist
   * cannot silently widen what gets rendered.
   */
  it('refuses to show anything that could carry script, even when asked', () => {
    for (const mime of ['text/html', 'image/svg+xml', 'application/xhtml+xml']) {
      expect(serve(mime, 'inline')['content-disposition']).toMatch(/^attachment;/);
    }
  });

  /** A browser cannot render these, so inline would mean a blank tab. */
  it('downloads office formats rather than showing a blank tab', () => {
    const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    expect(serve(docx, 'inline')['content-disposition']).toMatch(/^attachment;/);
  });

  it('downloads when nothing asked for otherwise', () => {
    expect(serve('application/pdf', 'attachment')['content-disposition']).toMatch(/^attachment;/);
  });

  it('always sets the headers that make serving an upload safe', () => {
    const headers = serve('application/pdf', 'inline');

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['content-security-policy']).toBe("default-src 'none'; sandbox");
    // Somebody's personal document: no shared cache keeps a copy.
    expect(headers['cache-control']).toBe('private, no-store');
    expect(headers['content-type']).toBe('application/pdf');
    expect(headers['content-length']).toBe('5');
  });

  /**
   * The original name is usually Persian, and a raw UTF-8 header value is not
   * portable — so the real name rides in the RFC 5987 extended form and the
   * ASCII fallback stays generic.
   */
  it('encodes a Persian filename rather than putting it in the header raw', () => {
    const headers = serve('application/pdf', 'inline', 'کارت ملی.pdf');

    expect(headers['content-disposition']).toContain(
      `filename*=UTF-8''${encodeURIComponent('کارت ملی.pdf')}`
    );
    expect(headers['content-disposition']).toContain('filename="file"');
  });

  /** A quoted filename containing a quote would otherwise break the header. */
  it('cannot have its header broken by a hostile filename', () => {
    const headers = serve('application/pdf', 'inline', 'a";attachment;x="b');

    expect(headers['content-disposition'].match(/"/g)).toHaveLength(2);
  });
});
