import { describe, expect, it } from 'vitest';
import { optionalList } from './env.js';

/** Sets the variable for one call and puts the environment back afterwards. */
function parse(value: string | undefined): string[] {
  const previous = process.env.CORS_TEST_ORIGIN;
  if (value === undefined) delete process.env.CORS_TEST_ORIGIN;
  else process.env.CORS_TEST_ORIGIN = value;
  try {
    return optionalList('CORS_TEST_ORIGIN', 'http://localhost:5173');
  } finally {
    if (previous === undefined) delete process.env.CORS_TEST_ORIGIN;
    else process.env.CORS_TEST_ORIGIN = previous;
  }
}

describe('CORS_ORIGIN parsing', () => {
  /**
   * The apex and the www alias are different origins to a browser, so a single
   * value meant the API rejected its own front end from one of the two names —
   * which presents to a user as "login does nothing".
   */
  it('accepts several origins, so apex and www both work', () => {
    expect(parse('https://example.ir,https://www.example.ir')).toEqual([
      'https://example.ir',
      'https://www.example.ir',
    ]);
  });

  it('tolerates the spacing people actually type', () => {
    expect(parse(' https://a.ir , https://b.ir ,, ')).toEqual(['https://a.ir', 'https://b.ir']);
  });

  it('still handles a single origin', () => {
    expect(parse('https://only.ir')).toEqual(['https://only.ir']);
  });

  it('falls back to the dev server when unset', () => {
    expect(parse(undefined)).toEqual(['http://localhost:5173']);
  });

  /** An empty value is not an origin; it must not become a blank entry. */
  it('treats an empty value as unset rather than as an empty origin', () => {
    expect(parse('   ')).toEqual(['http://localhost:5173']);
  });
});
