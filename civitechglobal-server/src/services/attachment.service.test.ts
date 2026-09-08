import { describe, expect, it } from 'vitest';
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILES,
  assertWithinLimits,
  identifyType,
  safeDisplayName,
} from './attachment.service.js';

const pdf = () => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 0x20)]);
const png = () =>
  Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const jpeg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const zip = () => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32)]);
const text = (s = 'hello') => Buffer.from(s, 'utf8');

describe('identifyType', () => {
  it('identifies a file by its bytes, not its extension', () => {
    expect(identifyType(pdf(), 'proposal.pdf').ext).toBe('pdf');
    expect(identifyType(png(), 'diagram.png').ext).toBe('png');
    expect(identifyType(jpeg(), 'photo.jpg').ext).toBe('jpg');
  });

  it('rejects an executable wearing a document extension', () => {
    // The classic upload attack: a PE binary called invoice.pdf. The extension
    // and the browser's Content-Type both say PDF; only the bytes disagree.
    const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64, 0x90)]);
    expect(() => identifyType(exe, 'invoice.pdf')).toThrow(/پشتیبانی نمی‌شود|هم‌خوانی/);
  });

  it('rejects a script renamed to .txt', () => {
    // Binary content cannot pass as text: the NUL byte gives it away.
    const binary = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x00, 0x01, 0x02]);
    expect(() => identifyType(binary, 'notes.txt')).toThrow();
  });

  it('accepts genuine UTF-8 text, including Persian', () => {
    expect(identifyType(text('سلام دنیا'), 'notes.txt').ext).toBe('txt');
    expect(identifyType(text('a,b,c\n1,2,3'), 'data.csv').ext).toBe('csv');
    expect(identifyType(text('# Title'), 'readme.md').ext).toBe('md');
  });

  it('uses the declared extension only to tell the OOXML formats apart', () => {
    // All three are ZIP containers with identical magic bytes.
    expect(identifyType(zip(), 'spec.docx').ext).toBe('docx');
    expect(identifyType(zip(), 'costs.xlsx').ext).toBe('xlsx');
    expect(identifyType(zip(), 'deck.pptx').ext).toBe('pptx');
  });

  it('refuses a bare .zip, which is not on the allow list', () => {
    expect(() => identifyType(zip(), 'bundle.zip')).toThrow();
  });

  it('refuses types nobody asked for', () => {
    expect(ACCEPTED_EXTENSIONS).not.toContain('exe');
    expect(ACCEPTED_EXTENSIONS).not.toContain('svg'); // scriptable
    expect(ACCEPTED_EXTENSIONS).not.toContain('html');
    expect(ACCEPTED_EXTENSIONS).not.toContain('zip');
  });
});

describe('safeDisplayName', () => {
  it('strips any directory component', () => {
    expect(safeDisplayName('../../etc/passwd')).toBe('passwd');
    expect(safeDisplayName('C:\\Windows\\System32\\drivers\\etc\\hosts')).toBe('hosts');
    expect(safeDisplayName('/var/www/shell.php')).toBe('shell.php');
  });

  it('strips control characters used to disguise a name', () => {
    // U+202E flips the text that follows it, the trick behind "annexe.exe"
    // displaying as "annexe.txt". Stripping controls removes the illusion.
    expect(safeDisplayName('report\u0000.pdf')).toBe('report.pdf');
    expect(safeDisplayName('line\nbreak.txt')).toBe('linebreak.txt');
  });

  it('never returns an empty name', () => {
    expect(safeDisplayName('')).toBe('file');
    expect(safeDisplayName('///')).toBe('file');
  });

  it('bounds the length', () => {
    expect(safeDisplayName('a'.repeat(500)).length).toBe(200);
  });
});

describe('assertWithinLimits', () => {
  const file = (bytes: number, name = 'a.pdf') => ({
    originalName: name,
    buffer: Buffer.alloc(bytes, 0x20),
  });

  it('accepts a normal batch', () => {
    expect(() => assertWithinLimits([file(1024), file(2048)])).not.toThrow();
  });

  it('rejects too many files', () => {
    const many = Array.from({ length: MAX_FILES + 1 }, () => file(16));
    expect(() => assertWithinLimits(many)).toThrow(/حداکثر/);
  });

  it('rejects an oversized file', () => {
    expect(() => assertWithinLimits([file(11 * 1024 * 1024)])).toThrow(/مگابایت/);
  });

  it('rejects an oversized batch even when each file is legal', () => {
    const three = Array.from({ length: 3 }, () => file(9 * 1024 * 1024));
    expect(() => assertWithinLimits(three)).toThrow(/مجموع/);
  });

  it('rejects an empty file', () => {
    expect(() => assertWithinLimits([file(0)])).toThrow(/خالی/);
  });
});
