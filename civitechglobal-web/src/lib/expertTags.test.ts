import { describe, expect, it } from 'vitest';
import { firstTooLong, splitTags } from './expertTags';

describe('splitTags', () => {
  it('splits on Latin and Persian commas and semicolons', () => {
    expect(splitTags('امنیت، شبکه؛ ابر, DevOps; AI')).toEqual(['امنیت', 'شبکه', 'ابر', 'DevOps', 'AI']);
  });

  it('splits on new lines and drops blanks', () => {
    expect(splitTags('a\n\nb\r\nc ,, ')).toEqual(['a', 'b', 'c']);
  });
});

describe('firstTooLong', () => {
  it('names the first item over the limit', () => {
    expect(firstTooLong(['short', 'x'.repeat(101), 'y'.repeat(200)], 100)).toBe('x'.repeat(101));
    expect(firstTooLong(['short'], 100)).toBeUndefined();
  });
});
