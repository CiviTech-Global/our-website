import { useEffect, useMemo } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { Link } from 'react-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Imported, not constructed with new URL().
 *
 * Vite only rewrites `new URL(…, import.meta.url)` for a RELATIVE path; a bare
 * package specifier is left as a literal string, so the first version of this
 * emitted no assets at all and every marker would have 404'd in production.
 * An import is what makes the bundler emit the file and hand back its hashed
 * URL. Verified by checking dist/assets after a build rather than by reading
 * the code.
 */
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useLocale } from '@/i18n/LocaleProvider';

/**
 * A map, on OpenStreetMap's own tiles.
 *
 * Leaflet and OpenStreetMap because that is what TradeMaster used, and because
 * both are free and need no account, no key and no per-view billing. The
 * alternative — a commercial provider — would put a credential in the bundle
 * and a meter on a shop directory that nobody is paying for yet.
 *
 * Two things this file has to get right or the map is a grey box:
 *
 * The tile hosts are in the Content-Security-Policy. nginx.conf carries
 * `https://*.tile.openstreetmap.org` in img-src for exactly this; without it
 * every tile is blocked and the console says so while the page looks merely
 * empty. This site has already lost an afternoon to the same shape of problem
 * with blob: URLs on uploads.
 *
 * Leaflet's default marker icon is resolved relative to the CSS file, which a
 * bundler rewrites, so the stock configuration asks for an image that is not
 * there. Fixed once, below, rather than per marker.
 *
 * This module must only ever be imported lazily. Leaflet is around 45 KB
 * gzipped, and the main chunk took real work to get to 101 KB.
 */

/**
 * OpenStreetMap's usage policy, honoured rather than assumed.
 *
 * Their tile servers are free and run on donations, on the understanding that
 * heavy or bulk use goes elsewhere. A shop directory browsing a few tiles per
 * visit is squarely within it. If this ever grows into something busier, the
 * honest move is a paid provider or our own tile server, not a higher zoom
 * limit.
 */
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/** Beyond 18 the tiles are mostly unsurveyed here, and it is more requests for less. */
const MAX_ZOOM = 18;

/** Tehran, for a map that has nothing else to centre on. */
const FALLBACK_CENTRE: [number, number] = [35.6892, 51.389];

/**
 * Leaflet ships its marker images as CSS-relative URLs.
 *
 * A bundler rewrites the stylesheet but not the paths Leaflet computes at
 * runtime, so the default icon 404s and markers render as nothing at all. This
 * points it at the bundled assets instead. Done at module scope because it is
 * global state and doing it per component would race.
 */
const markerIcon = new L.Icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  /** Rendered in the popup under the label. A shop's summary, usually. */
  detail?: string;
  href?: string;
}

/** A point and the radius around it, in kilometres. */
export interface MapCircle {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

/**
 * Keeps the view in step when what it shows changes beneath it.
 *
 * With a search circle, the circle is the frame: the reader asked about that
 * area, and zooming to the pins instead would hide how far it reaches — or, with
 * no pins, show nothing of where they were looking.
 */
function FitToView({ pins, circle }: { pins: MapPin[]; circle?: MapCircle | null }) {
  const map = useMap();

  useEffect(() => {
    if (circle) {
      map.fitBounds(
        L.latLng(circle.latitude, circle.longitude).toBounds(circle.radiusKm * 2000),
        { padding: [16, 16], maxZoom: 16 }
      );
      return;
    }

    if (pins.length === 0) return;

    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 14);
      return;
    }

    // padded, so a pin never sits under the edge of the frame.
    map.fitBounds(
      L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude] as [number, number])),
      { padding: [32, 32], maxZoom: MAX_ZOOM }
    );
  }, [map, pins, circle]);

  return null;
}

/**
 * Shops on a map, and optionally the circle being searched.
 *
 * `onPick`, when given, makes a click on the map choose the search point —
 * the way to say where "near me" is when the browser cannot. Without it the map
 * is read-only.
 */
export default function ShopMap({
  pins,
  circle,
  onPick,
  className,
  height = 320,
}: {
  pins: MapPin[];
  circle?: MapCircle | null;
  onPick?: (latitude: number, longitude: number) => void;
  className?: string;
  height?: number;
}) {
  const { t } = useLocale();

  const centre = useMemo<[number, number]>(
    () =>
      circle
        ? [circle.latitude, circle.longitude]
        : pins[0]
          ? [pins[0].latitude, pins[0].longitude]
          : FALLBACK_CENTRE,
    [pins, circle]
  );

  return (
    <div
      className={className}
      style={{ height }}
      // The map is a visual aid, and every shop it shows is also in the list
      // beside it. Announcing a canvas of tiles to a screen reader adds noise
      // without adding information.
      role="presentation"
    >
      <MapContainer
        center={centre}
        zoom={12}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom={false}
        // Scroll-wheel zoom off: a map in the middle of a scrolling page that
        // swallows the wheel traps the reader on it.
        className="h-full w-full rounded-xl"
        aria-label={t.trademaster.shops}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={MAX_ZOOM} />
        <FitToView pins={pins} circle={circle} />
        {onPick && <ClickToPlace onPick={onPick} />}

        {circle && (
          <>
            {/* Metres: Leaflet's circle radius is in metres, the search in km. */}
            <Circle
              center={[circle.latitude, circle.longitude]}
              radius={circle.radiusKm * 1000}
              pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.06 }}
            />
            <CircleMarker
              center={[circle.latitude, circle.longitude]}
              radius={7}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
            >
              <Popup>{t.trademaster.hub.searchPoint}</Popup>
            </CircleMarker>
          </>
        )}

        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.latitude, pin.longitude]} icon={markerIcon}>
            <Popup>
              <strong>{pin.label}</strong>
              {pin.detail && <p className="mt-1">{pin.detail}</p>}
              {pin.href && (
                // A router link, not a plain anchor: a full page load to open
                // a shop threw away the map, the filters and the search point.
                <Link to={pin.href} className="mt-1 block underline">
                  {t.trademaster.viewShop}
                </Link>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

/** Reports a click, so a seller can drop a pin where their shop is. */
function ClickToPlace({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

/**
 * Picking a location.
 *
 * The map is an aid, not the only way in: the numeric fields beside it remain
 * authoritative and editable, because a map is unusable with a keyboard alone
 * and somebody who has their coordinates already should not have to hunt for
 * the right pixel.
 */
export function LocationPicker({
  latitude,
  longitude,
  onPick,
  className,
  height = 280,
}: {
  latitude?: number;
  longitude?: number;
  onPick: (latitude: number, longitude: number) => void;
  className?: string;
  height?: number;
}) {
  const { t } = useLocale();
  const placed = latitude !== undefined && longitude !== undefined;

  return (
    <div className={className} style={{ height }} role="presentation">
      <MapContainer
        center={placed ? [latitude, longitude] : FALLBACK_CENTRE}
        zoom={placed ? 15 : 11}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom={false}
        className="h-full w-full rounded-xl"
        aria-label={t.trademaster.location}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={MAX_ZOOM} />
        <ClickToPlace onPick={onPick} />
        {placed && <Marker position={[latitude, longitude]} icon={markerIcon} />}
      </MapContainer>
    </div>
  );
}
