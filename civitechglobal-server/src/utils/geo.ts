/**
 * Distance on a sphere, and the box that bounds it.
 *
 * There is no PostGIS here — the schema note on `Business.latitude` explains
 * why — so "shops within 10 km" is answered in two steps: a bounding box in
 * SQL, which the (latitude, longitude) index can serve, and then exact
 * distances in memory to trim the corners of that box down to a circle.
 *
 * The box is a rectangle in degrees and the circle is not, so the prefilter
 * always returns slightly more than asked for. That is the right way round: a
 * box that were too small would silently omit real results, which is the one
 * failure nobody would notice.
 */

/** Mean radius, in kilometres. The figure WGS-84 rounds to. */
const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export interface Point {
  latitude: number;
  longitude: number;
}

/**
 * Great-circle distance in kilometres.
 *
 * Haversine rather than the spherical law of cosines: at the distances this
 * serves — a few kilometres across a city — the law of cosines loses precision
 * to floating point, because it takes the arccosine of a number very close to
 * one.
 */
export function distanceKm(a: Point, b: Point): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface BoundingBox {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  /**
   * True when the box crosses the 180th meridian, so longitude has to be
   * matched as two ranges rather than one.
   *
   * Iran is nowhere near it, and this is still handled: the alternative is a
   * function that is quietly wrong for anybody who ever uses it elsewhere, and
   * the wrongness would be a search that returns nothing at all.
   */
  crossesAntimeridian: boolean;
}

/**
 * The smallest degree rectangle containing every point within `radiusKm`.
 *
 * Latitude is simple: a degree is the same length everywhere. Longitude is not
 * — degrees converge towards the poles — so the span is divided by the cosine
 * of the latitude. At the poles that cosine reaches zero, where every longitude
 * is within the radius and the box becomes the whole world.
 */
export function boundingBox(centre: Point, radiusKm: number): BoundingBox {
  const latitudeSpan = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);

  const minLatitude = Math.max(-90, centre.latitude - latitudeSpan);
  const maxLatitude = Math.min(90, centre.latitude + latitudeSpan);

  const cosine = Math.cos(toRadians(centre.latitude));

  // Near a pole, or a radius large enough to reach around: every longitude
  // qualifies, so the box spans them all rather than producing a NaN or a
  // nonsensically narrow range.
  if (Math.abs(cosine) < 1e-9 || latitudeSpan / Math.abs(cosine) >= 180) {
    return {
      minLatitude,
      maxLatitude,
      minLongitude: -180,
      maxLongitude: 180,
      crossesAntimeridian: false,
    };
  }

  const longitudeSpan = latitudeSpan / cosine;
  const rawMin = centre.longitude - longitudeSpan;
  const rawMax = centre.longitude + longitudeSpan;

  // Wrapped rather than clamped: clamping at ±180 would drop the half of the
  // circle that lies across the meridian.
  const crossesAntimeridian = rawMin < -180 || rawMax > 180;

  return {
    minLatitude,
    maxLatitude,
    minLongitude: crossesAntimeridian ? wrapLongitude(rawMin) : rawMin,
    maxLongitude: crossesAntimeridian ? wrapLongitude(rawMax) : rawMax,
    crossesAntimeridian,
  };
}

/** Brings a longitude back into [-180, 180]. */
export function wrapLongitude(longitude: number): number {
  const wrapped = ((longitude + 180) % 360 + 360) % 360 - 180;
  // -180 and 180 are the same meridian; the modulo above lands on -180, which
  // is conventional and keeps comparisons total.
  return wrapped;
}

/** Whether a coordinate is somewhere on Earth. */
export function isValidPoint(point: Partial<Point>): point is Point {
  return (
    typeof point.latitude === 'number' &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}
