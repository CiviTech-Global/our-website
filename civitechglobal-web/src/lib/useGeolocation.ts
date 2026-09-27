import { useCallback, useState } from 'react';

/**
 * The browser's own idea of where the reader is.
 *
 * Asked for only on a press, never on load. The permission prompt is the most
 * intrusive thing a page can do unbidden, and a shop directory that demands to
 * know where you are before showing anything deserves the refusal it gets.
 *
 * Every failure is a state rather than a throw, because all three happen
 * routinely and none of them is exceptional: the reader says no, the device has
 * no fix, or the request times out on a poor connection.
 */

export type GeolocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; latitude: number; longitude: number }
  | { status: 'denied' }
  | { status: 'unavailable' };

/** Long enough for a cold GPS fix, short enough that nobody stares at a spinner. */
const TIMEOUT_MS = 10_000;

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: 'idle' });

  const locate = useCallback(() => {
    // Absent over plain HTTP and in a few embedded browsers. Treated as
    // unavailable rather than crashing on `navigator.geolocation.getCurrent…`.
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unavailable' });
      return;
    }

    setState({ status: 'locating' });

    navigator.geolocation.getCurrentPosition(
      (position) =>
        setState({
          status: 'ready',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) =>
        // PERMISSION_DENIED is the one worth distinguishing: it is the only
        // failure where asking again achieves nothing, so the UI should stop
        // offering the button rather than inviting a second refusal.
        setState({
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        }),
      {
        timeout: TIMEOUT_MS,
        // A shop within a few kilometres does not need a rooftop-accurate fix,
        // and the coarse one arrives faster and costs less battery.
        enableHighAccuracy: false,
        // A fix from the last five minutes is fine for this; the reader has not
        // moved far enough to matter.
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, []);

  const clear = useCallback(() => setState({ status: 'idle' }), []);

  return { state, locate, clear };
}
