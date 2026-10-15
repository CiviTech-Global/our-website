import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { Link } from 'react-router';
import { X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

/**
 * A map, on OpenStreetMap's own tiles.
 *
 * Leaflet and OpenStreetMap because that is what TradeMaster used, and because
 * both are free and need no account, no key and no per-view billing. The
 * alternative — a commercial provider — would put a credential in the bundle
 * and a meter on a shop directory that nobody is paying for yet.
 *
 * Three things this file has to get right:
 *
 * The tile hosts are in the Content-Security-Policy. nginx.conf carries
 * `https://*.tile.openstreetmap.org` in img-src for exactly this; without it
 * every tile is blocked and the map is a grey box.
 *
 * Leaflet's layers carry z-indexes of 400 to 1000. In the page's own stacking
 * context those beat every dialog (z-50) and the sticky navbar (z-40), which is
 * how the location picker opened UNDER the explore page's map. Every map here
 * therefore sits in its own stacking context (`isolate`): whatever Leaflet does
 * inside stays inside.
 *
 * A pin's card is not a Leaflet popup. A 280px card in a popup inside a map is
 * clipped by the map's edges wherever the pin happens to be; it is a panel
 * docked inside the frame instead — a bottom sheet on a phone, a corner card on
 * a wide screen — which is always whole and always in reach of its close
 * button.
 *
 * This module must only ever be imported lazily: Leaflet is around 45 KB
 * gzipped, and the main chunk took real work to get to 101 KB.
 */

/**
 * OpenStreetMap's usage policy, honoured rather than assumed: their tile
 * servers are free and run on donations. A shop directory browsing a few tiles
 * per visit is within it; if this grows, the honest move is a paid provider or
 * our own tile server, not a higher zoom limit.
 */
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/** Beyond 18 the tiles are mostly unsurveyed here, and it is more requests for less. */
const MAX_ZOOM = 18;

/** Tehran, for a map that has nothing else to centre on. */
const FALLBACK_CENTRE: [number, number] = [35.6892, 51.389];

/**
 * The garden's pins: a turquoise drop for a shop, saffron when chosen or
 * pointed at, and a lapis dot for the search point. Drawn in CSS (index.css,
 * `.bagh-pin`), so they follow the theme and need no image files — Leaflet's
 * stock PNG markers resolve against a CSS path a bundler rewrites, which once
 * left every marker a 404.
 */
function pinIcon(state: 'idle' | 'active'): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="bagh-pin${state === 'active' ? ' bagh-pin-active' : ''}"><span></span></span>`,
    iconSize: [30, 38],
    iconAnchor: [15, 36],
    tooltipAnchor: [0, -34],
    popupAnchor: [0, -34],
  });
}
const IDLE_PIN = pinIcon('idle');
const ACTIVE_PIN = pinIcon('active');
const SEARCH_POINT = L.divIcon({
  className: '',
  html: '<span class="bagh-point"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  /** Under the label in a plain pin's popup. A shop's summary, usually. */
  detail?: string;
  href?: string;
  /**
   * The shop's card, shown in the docked panel when the pin is chosen. Pins
   * without one open a small popup instead.
   */
  card?: ReactNode;
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
 * area, and zooming to the pins instead would hide how far it reaches.
 */
function FitToView({ pins, circle }: { pins: MapPin[]; circle?: MapCircle | null }) {
  const map = useMap();

  useEffect(() => {
    if (circle) {
      map.fitBounds(L.latLng(circle.latitude, circle.longitude).toBounds(circle.radiusKm * 2000), {
        padding: [24, 24],
        maxZoom: 16,
      });
      return;
    }
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude] as [number, number])), {
      padding: [40, 40],
      maxZoom: 16,
    });
  }, [map, pins, circle]);

  return null;
}

/** Brings the chosen pin into view without changing the zoom the reader chose. */
function PanToChosen({ pin }: { pin: MapPin | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    // Clear of the docked card: the bottom third on a phone, the start corner
    // on a wide screen — a generous inset covers both.
    map.panInside([pin.latitude, pin.longitude], { padding: [48, 220] });
  }, [map, pin]);
  return null;
}

/**
 * A map has to be told when its box changes size: shown after being hidden
 * (the phone's Map tab), or opened inside a dialog. A dialog opens with a
 * scale animation, and a transform changes nothing a ResizeObserver can see —
 * Leaflet measured the box mid-animation and left a grey band where the
 * difference was. So it is measured again once the animation is over.
 */
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    const settled = [150, 400].map((ms) => window.setTimeout(() => map.invalidateSize(), ms));
    return () => {
      observer.disconnect();
      settled.forEach(window.clearTimeout);
    };
  }, [map]);
  return null;
}

/**
 * Shops on a map, and optionally the circle being searched.
 *
 * `onPick`, when given, makes a click on empty map choose the search point —
 * the way to say where "near me" is when the browser cannot. The chosen shop
 * can be controlled from outside (`selectedId`/`onSelect`), so a list beside
 * the map can open a shop's card; `highlightId` lights a pin up while its
 * entry in that list is pointed at.
 */
export default function ShopMap({
  pins,
  circle,
  onPick,
  className,
  height = 320,
  selectedId,
  onSelect,
  highlightId,
}: {
  pins: MapPin[];
  circle?: MapCircle | null;
  onPick?: (latitude: number, longitude: number) => void;
  className?: string;
  /** Pixels, or any CSS length — '100%' for a map that fills its column. */
  height?: number | string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  highlightId?: string | null;
}) {
  const { t } = useLocale();
  const [ownSelected, setOwnSelected] = useState<string | null>(null);
  const chosenId = selectedId !== undefined ? selectedId : ownSelected;
  const choose = (id: string | null) => {
    if (onSelect) onSelect(id);
    if (selectedId === undefined) setOwnSelected(id);
  };
  const chosen = pins.find((pin) => pin.id === chosenId && pin.card);

  const centre = useMemo<[number, number]>(
    () =>
      circle ? [circle.latitude, circle.longitude] : pins[0] ? [pins[0].latitude, pins[0].longitude] : FALLBACK_CENTRE,
    [pins, circle]
  );

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-[var(--radius-card)] border border-border-default bg-surface-muted',
        className
      )}
      style={{ height }}
    >
      <MapContainer
        center={centre}
        zoom={12}
        maxZoom={MAX_ZOOM}
        // Off: a map in the middle of a scrolling page that swallows the wheel
        // traps the reader on it. Pinch and the +/- buttons still zoom.
        scrollWheelZoom={false}
        className="bagh-map h-full w-full"
        aria-label={t.trademaster.shops}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={MAX_ZOOM} />
        <FitToView pins={pins} circle={circle} />
        <PanToChosen pin={chosen} />
        <KeepSized />
        <MapClicks
          onPick={onPick}
          // A click on empty map closes an open card before it moves the
          // search point: the first click away is "close", not "search here".
          onBackground={chosen ? () => choose(null) : undefined}
        />

        {circle && (
          <>
            {/* Metres: Leaflet's radius is in metres, the search in km. */}
            <Circle
              center={[circle.latitude, circle.longitude]}
              radius={circle.radiusKm * 1000}
              // A literal colour: Leaflet writes SVG attributes, which cannot read var().
              pathOptions={{ color: '#406bce', weight: 1.5, fillOpacity: 0.06, dashArray: '6 6' }}
            />
            <Marker position={[circle.latitude, circle.longitude]} icon={SEARCH_POINT} interactive={false} />
          </>
        )}

        {pins.map((pin) => {
          const active = pin.id === chosenId || pin.id === highlightId;
          return (
            <Marker
              key={pin.id}
              position={[pin.latitude, pin.longitude]}
              icon={active ? ACTIVE_PIN : IDLE_PIN}
              zIndexOffset={active ? 1000 : 0}
              title={pin.label}
              alt={pin.label}
              eventHandlers={pin.card ? { click: () => choose(pin.id === chosenId ? null : pin.id) } : undefined}
            >
              {pin.card ? (
                <Tooltip direction="top" className="bagh-tooltip">
                  {pin.label}
                </Tooltip>
              ) : (
                <Popup>
                  <strong>{pin.label}</strong>
                  {pin.detail && <p className="mt-1">{pin.detail}</p>}
                  {pin.href && (
                    // A router link: a full page load to open a shop threw away
                    // the map, the filters and the search point.
                    <Link to={pin.href} className="mt-1 block underline">
                      {t.trademaster.viewShop}
                    </Link>
                  )}
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      {/* The chosen shop, docked inside the frame — never clipped by it. Above
          Leaflet's panes and controls, inside this map's own stacking context. */}
      {chosen && (
        <div
          className="ct-pop-in absolute inset-x-2 bottom-2 z-[1100] max-h-[70%] overflow-y-auto rounded-[var(--radius-card)] border border-border-default bg-surface-50 shadow-soft-lg sm:inset-x-auto sm:start-3 sm:bottom-3 sm:w-[300px]"
          role="dialog"
          aria-label={chosen.label}
        >
          <button
            type="button"
            onClick={() => choose(null)}
            aria-label={t.common.close}
            className="absolute end-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-surface-50/90 text-text-primary shadow-soft ring-1 ring-border-default hover:bg-surface-100"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          {chosen.card}
        </div>
      )}
    </div>
  );
}

/** Clicks on the map itself (not on a pin): close an open card, or choose a point. */
function MapClicks({
  onPick,
  onBackground,
}: {
  onPick?: (latitude: number, longitude: number) => void;
  onBackground?: () => void;
}) {
  useMapEvents({
    click(event) {
      if (onBackground) {
        onBackground();
        return;
      }
      onPick?.(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

/**
 * Picking a location.
 *
 * Click anywhere, or drag the pin. The map is an aid, not the only way in: the
 * numeric fields beside it stay authoritative and editable, because a map is
 * unusable with a keyboard alone and somebody who has their coordinates should
 * not have to hunt for the right pixel.
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
  height?: number | string;
}) {
  const { t } = useLocale();
  const placed = latitude !== undefined && longitude !== undefined;

  return (
    <div
      className={cn('relative isolate overflow-hidden rounded-[var(--radius-card)] border border-border-default', className)}
      style={{ height }}
    >
      <MapContainer
        center={placed ? [latitude, longitude] : FALLBACK_CENTRE}
        zoom={placed ? 15 : 11}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom={false}
        className="bagh-map h-full w-full cursor-crosshair"
        aria-label={t.trademaster.location}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={MAX_ZOOM} />
        <KeepSized />
        <MapClicks onPick={onPick} />
        {placed && <FollowPoint latitude={latitude} longitude={longitude} />}
        {placed && (
          <Marker
            position={[latitude, longitude]}
            icon={ACTIVE_PIN}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const point = (event.target as L.Marker).getLatLng();
                onPick(point.lat, point.lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

/** Keeps a point chosen elsewhere (typed, or "use my location") in view. */
function FollowPoint({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.panInside([latitude, longitude], { padding: [40, 40] });
  }, [map, latitude, longitude]);
  return null;
}
