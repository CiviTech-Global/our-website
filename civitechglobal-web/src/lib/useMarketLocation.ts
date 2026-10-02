import { useCallback, useEffect, useState } from 'react';

/**
 * Where the reader wants to search from, and how far out.
 *
 * Shared by every page of the marketplace. A reader who sets "near me, 10 km"
 * on the map and then opens the products page expects the same circle there,
 * so the choice is kept for the browser session — and only in this tab's
 * session storage, never sent anywhere except as the query that asked for it.
 *
 * TWO WAYS IN. The browser's own location, asked for only on a press; and a
 * point chosen on the map. The second is not a fallback afterthought: a desktop
 * with location services off, a refusal, and a page opened over plain HTTP all
 * leave the browser with no location to give, and "near me" was simply broken
 * for all three until there was another way to say where "me" is.
 */

export type LocationSource = 'device' | 'map';

export interface MarketLocation {
  latitude: number;
  longitude: number;
  source: LocationSource;
}

export type LocateStatus =
  | 'idle'
  | 'locating'
  /** The reader said no. Asking again achieves nothing but a second refusal. */
  | 'denied'
  /** No fix: location services off, no signal, or a timeout. */
  | 'unavailable'
  /** The page is not on HTTPS, where browsers withhold location altogether. */
  | 'insecure';

/** The radii offered, in kilometres. */
export const RADIUS_OPTIONS_KM = [1, 2, 5, 10, 25, 50, 100, 200] as const;

/** A neighbourhood's worth: wide enough to find something in a city, narrow enough to mean "near". */
export const DEFAULT_RADIUS_KM = 10;

const STORAGE_KEY = 'trademaster.location';

/** Long enough for a cold fix, short enough that nobody stares at a spinner. */
const TIMEOUT_MS = 10_000;

interface Stored {
  location: MarketLocation | null;
  radiusKm: number;
}

function isLocation(value: unknown): value is MarketLocation {
  const candidate = value as MarketLocation | null;
  return (
    typeof candidate?.latitude === 'number' &&
    typeof candidate.longitude === 'number' &&
    Math.abs(candidate.latitude) <= 90 &&
    Math.abs(candidate.longitude) <= 180 &&
    (candidate.source === 'device' || candidate.source === 'map')
  );
}

/**
 * The saved choice, or nothing.
 *
 * Storage can be missing, blocked or full, and a value written by an older
 * version can be any shape at all; every one of those is "nothing saved"
 * rather than a crash or a search centred on garbage.
 */
function readStored(): Stored {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { location: null, radiusKm: DEFAULT_RADIUS_KM };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    const radiusKm = RADIUS_OPTIONS_KM.includes(parsed.radiusKm as (typeof RADIUS_OPTIONS_KM)[number])
      ? (parsed.radiusKm as number)
      : DEFAULT_RADIUS_KM;
    return { location: isLocation(parsed.location) ? parsed.location : null, radiusKm };
  } catch {
    return { location: null, radiusKm: DEFAULT_RADIUS_KM };
  }
}

function writeStored(value: Stored): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Not remembering it across pages is the whole cost.
  }
}

export function useMarketLocation() {
  const [stored, setStored] = useState<Stored>(readStored);
  const [status, setStatus] = useState<LocateStatus>('idle');

  useEffect(() => writeStored(stored), [stored]);

  const locate = useCallback(() => {
    // Browsers withhold location from pages not served over HTTPS (localhost
    // excepted). Said plainly rather than reported as a refusal, because the
    // reader did not refuse anything and choosing on the map still works.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setStatus('insecure');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStored((prev) => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: 'device',
          },
        }));
        setStatus('idle');
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      {
        timeout: TIMEOUT_MS,
        // A shop within a few kilometres does not need a rooftop-accurate fix,
        // and the coarse one arrives faster and costs less battery.
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, []);

  const pick = useCallback((latitude: number, longitude: number) => {
    setStored((prev) => ({ ...prev, location: { latitude, longitude, source: 'map' } }));
    setStatus('idle');
  }, []);

  const setRadius = useCallback((radiusKm: number) => {
    setStored((prev) => ({ ...prev, radiusKm }));
  }, []);

  const clear = useCallback(() => {
    setStored((prev) => ({ ...prev, location: null }));
    setStatus('idle');
  }, []);

  return {
    location: stored.location,
    radiusKm: stored.radiusKm,
    status,
    locate,
    pick,
    setRadius,
    clear,
    /** The query fields for a search near the chosen point, or none at all. */
    query: stored.location
      ? {
          latitude: Number(stored.location.latitude.toFixed(5)),
          longitude: Number(stored.location.longitude.toFixed(5)),
          radiusKm: stored.radiusKm,
        }
      : {},
  };
}

export type MarketLocationControls = ReturnType<typeof useMarketLocation>;
