import { describe, expect, it } from 'vitest';
import { assertEstimateIsOrdered, assertPriceIsOrdered, pertHours } from './project-proposal.service.js';

describe('pertHours', () => {
  it('weights the likely case four times, per the PERT formula', () => {
    // (10 + 4*20 + 60) / 6 = 25
    expect(pertHours(10, 20, 60)).toBe(25);
  });

  it('collapses to the single value when all three agree', () => {
    expect(pertHours(40, 40, 40)).toBe(40);
  });

  it('sits nearer the likely case than a plain average would', () => {
    // Plain mean of 10/20/60 is 30; PERT is 25, because the long tail should
    // move the answer without dominating it.
    const plainMean = (10 + 20 + 60) / 3;
    expect(pertHours(10, 20, 60)!).toBeLessThan(plainMean);
  });

  it('refuses to guess from a partial estimate', () => {
    expect(pertHours(10, 20, undefined)).toBeNull();
    expect(pertHours(undefined, undefined, undefined)).toBeNull();
    expect(pertHours(10, null, 60)).toBeNull();
  });

  it('rounds to a whole hour', () => {
    // (1 + 4*2 + 4) / 6 = 2.166…
    expect(pertHours(1, 2, 4)).toBe(2);
  });
});

describe('assertEstimateIsOrdered', () => {
  it('accepts an empty estimate — not every proposal is costed by hours', () => {
    expect(() => assertEstimateIsOrdered(undefined, undefined, undefined)).not.toThrow();
  });

  it('accepts a correctly ordered estimate', () => {
    expect(() => assertEstimateIsOrdered(10, 20, 60)).not.toThrow();
    expect(() => assertEstimateIsOrdered(20, 20, 20)).not.toThrow();
  });

  it('rejects a half-filled estimate', () => {
    expect(() => assertEstimateIsOrdered(10, 20, undefined)).toThrow(/هر سه مقدار/);
  });

  it('rejects points that are out of order', () => {
    expect(() => assertEstimateIsOrdered(60, 20, 10)).toThrow(/ترتیب/);
    expect(() => assertEstimateIsOrdered(10, 60, 20)).toThrow(/ترتیب/);
  });
});

describe('assertPriceIsOrdered', () => {
  it('accepts an ordered range', () => {
    expect(() => assertPriceIsOrdered(100n, 150n, 200n)).not.toThrow();
  });

  it('accepts a partially specified range', () => {
    expect(() => assertPriceIsOrdered(100n, undefined, 200n)).not.toThrow();
    expect(() => assertPriceIsOrdered(undefined, undefined, undefined)).not.toThrow();
  });

  it('rejects a range that reads backwards', () => {
    expect(() => assertPriceIsOrdered(300n, 150n, 200n)).toThrow();
    expect(() => assertPriceIsOrdered(100n, 250n, 200n)).toThrow();
    expect(() => assertPriceIsOrdered(300n, undefined, 200n)).toThrow();
  });
});
