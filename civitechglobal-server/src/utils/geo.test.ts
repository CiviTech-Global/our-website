import { describe, expect, it } from 'vitest';
import { boundingBox, distanceKm, isValidPoint, wrapLongitude } from './geo.js';

/**
 * The distance maths.
 *
 * Checked against known distances rather than against itself, which is the only
 * way this kind of function can be tested meaningfully: a test that recomputes
 * Haversine to verify Haversine passes even when the formula is wrong.
 *
 * The bounding box has one property that matters more than its exactness — it
 * must never be too small. A box that omits a real result produces a search
 * that quietly misses shops, and nobody reports a result they never saw.
 */

const TEHRAN = { latitude: 35.6892, longitude: 51.389 };
const ISFAHAN = { latitude: 32.6539, longitude: 51.666 };
const MASHHAD = { latitude: 36.2605, longitude: 59.6168 };

describe('great-circle distance', () => {
  it('is zero for a point and itself', () => {
    expect(distanceKm(TEHRAN, TEHRAN)).toBe(0);
  });

  it('matches the known Tehran to Isfahan distance', () => {
    // Roughly 338 km as the crow flies. Two kilometres of tolerance covers the
    // difference between a sphere and the real ellipsoid.
    expect(distanceKm(TEHRAN, ISFAHAN)).toBeGreaterThan(336);
    expect(distanceKm(TEHRAN, ISFAHAN)).toBeLessThan(340);
  });

  it('matches the known Tehran to Mashhad distance', () => {
    // Roughly 737 km.
    expect(distanceKm(TEHRAN, MASHHAD)).toBeGreaterThan(730);
    expect(distanceKm(TEHRAN, MASHHAD)).toBeLessThan(745);
  });

  it('is symmetric', () => {
    expect(distanceKm(TEHRAN, MASHHAD)).toBeCloseTo(distanceKm(MASHHAD, TEHRAN), 9);
  });

  it('gets a one-degree step of latitude right anywhere', () => {
    // A degree of latitude is about 111.2 km at every latitude, which is the
    // easiest independent check there is.
    for (const latitude of [0, 35, 60, 80]) {
      const d = distanceKm({ latitude, longitude: 0 }, { latitude: latitude + 1, longitude: 0 });
      expect(d).toBeGreaterThan(111);
      expect(d).toBeLessThan(111.5);
    }
  });

  it('shrinks a degree of longitude towards the poles', () => {
    const atEquator = distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
    const atSixty = distanceKm({ latitude: 60, longitude: 0 }, { latitude: 60, longitude: 1 });

    // cos(60°) is exactly a half, so the second should be half the first.
    expect(atSixty).toBeCloseTo(atEquator / 2, 1);
  });

  it('handles antipodal points without exceeding half the circumference', () => {
    // The clamp on sqrt(h) exists for this: floating point can push it just
    // past 1, and Math.asin would then return NaN.
    const d = distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 });
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(20000);
    expect(d).toBeLessThan(20040);
  });

  it('measures a short city hop plausibly', () => {
    // About 1.1 km north. The case the feature actually serves.
    const d = distanceKm(TEHRAN, { latitude: TEHRAN.latitude + 0.01, longitude: TEHRAN.longitude });
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.2);
  });
});

describe('the bounding box', () => {
  it('contains every point inside the radius', () => {
    // The property that matters. Sampled around the circle rather than reasoned
    // about, because an off-by-one in the cosine would pass a spot check.
    const radiusKm = 10;
    const box = boundingBox(TEHRAN, radiusKm);

    for (let bearing = 0; bearing < 360; bearing += 5) {
      const rad = (bearing * Math.PI) / 180;
      // A point just inside the radius in that direction.
      const dLat = (radiusKm * 0.99 * Math.cos(rad)) / 111.2;
      const dLon =
        (radiusKm * 0.99 * Math.sin(rad)) /
        (111.2 * Math.cos((TEHRAN.latitude * Math.PI) / 180));

      const point = { latitude: TEHRAN.latitude + dLat, longitude: TEHRAN.longitude + dLon };

      expect(point.latitude, `bearing ${bearing} latitude`).toBeGreaterThanOrEqual(box.minLatitude);
      expect(point.latitude, `bearing ${bearing} latitude`).toBeLessThanOrEqual(box.maxLatitude);
      expect(point.longitude, `bearing ${bearing} longitude`).toBeGreaterThanOrEqual(
        box.minLongitude
      );
      expect(point.longitude, `bearing ${bearing} longitude`).toBeLessThanOrEqual(box.maxLongitude);
    }
  });

  it('is wider in longitude than in latitude away from the equator', () => {
    const box = boundingBox(TEHRAN, 10);
    const latSpan = box.maxLatitude - box.minLatitude;
    const lonSpan = box.maxLongitude - box.minLongitude;

    // At 35.7° north, cos is about 0.81, so longitude spans roughly 1.23× more.
    expect(lonSpan).toBeGreaterThan(latSpan);
  });

  it('never proposes a latitude beyond the poles', () => {
    const box = boundingBox({ latitude: 89.5, longitude: 0 }, 500);
    expect(box.maxLatitude).toBeLessThanOrEqual(90);
    expect(box.minLatitude).toBeGreaterThanOrEqual(-90);
  });

  it('spans every longitude at a pole rather than producing NaN', () => {
    // cos(90°) is zero, and dividing by it is how this function would otherwise
    // return a box of NaNs that matches nothing.
    const box = boundingBox({ latitude: 90, longitude: 0 }, 10);
    expect(box.minLongitude).toBe(-180);
    expect(box.maxLongitude).toBe(180);
    expect(Number.isNaN(box.minLongitude)).toBe(false);
  });

  it('spans every longitude when the radius reaches around the world', () => {
    const box = boundingBox(TEHRAN, 30000);
    expect(box.minLongitude).toBe(-180);
    expect(box.maxLongitude).toBe(180);
  });

  it('reports crossing the antimeridian rather than clamping', () => {
    // Clamping at ±180 would drop half the circle. Iran is nowhere near this,
    // and getting it wrong would be a search that returns nothing for anybody
    // who is.
    const box = boundingBox({ latitude: 0, longitude: 179.9 }, 50);
    expect(box.crossesAntimeridian).toBe(true);
    expect(box.minLongitude).toBeGreaterThan(0);
    expect(box.maxLongitude).toBeLessThan(0);
  });

  it('does not report crossing for an ordinary box', () => {
    expect(boundingBox(TEHRAN, 10).crossesAntimeridian).toBe(false);
  });
});

describe('wrapping a longitude', () => {
  it('leaves an ordinary longitude alone', () => {
    expect(wrapLongitude(51.389)).toBeCloseTo(51.389, 9);
  });

  it('wraps past the antimeridian', () => {
    expect(wrapLongitude(181)).toBeCloseTo(-179, 9);
    expect(wrapLongitude(-181)).toBeCloseTo(179, 9);
  });

  it('wraps a full turn back to itself', () => {
    expect(wrapLongitude(360 + 10)).toBeCloseTo(10, 9);
  });
});

describe('validating a point', () => {
  it('accepts a real coordinate', () => {
    expect(isValidPoint(TEHRAN)).toBe(true);
  });

  it('rejects a latitude off the Earth', () => {
    expect(isValidPoint({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidPoint({ latitude: -91, longitude: 0 })).toBe(false);
  });

  it('rejects a longitude off the Earth', () => {
    expect(isValidPoint({ latitude: 0, longitude: 181 })).toBe(false);
  });

  it('rejects NaN and Infinity, which arrive from a bad parse', () => {
    expect(isValidPoint({ latitude: Number.NaN, longitude: 0 })).toBe(false);
    expect(isValidPoint({ latitude: 0, longitude: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it('rejects a half-filled point', () => {
    // Half a coordinate puts a pin at (0, 0), in the Gulf of Guinea.
    expect(isValidPoint({ latitude: 35 })).toBe(false);
    expect(isValidPoint({ longitude: 51 })).toBe(false);
  });
});
