import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../core/format.dart';
import '../../core/geo.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'market_data.dart';

/// The pieces every page of the local market shares, as the web's
/// MarketplaceUi and ShopCards: distances, the shop row, the listing tile,
/// the map, and the "where am I searching from" bar.

/// Kilometres in the reader's numerals: "۲٫۴ کیلومتر", "2.4 km".
String kmText(num km, Strings s, String language) => s.mobile.kmShort.fill({
  'km': km < 10
      ? localDecimal(km, km == km.roundToDouble() ? 0 : 1, language)
      : localDigits(km.round(), language),
});

/// A price in toman, as every listing is priced.
String? marketMoney(String? value, Strings s, String language) =>
    formatMoneyIn(value, 'IRT', language, s.market.currency);

/// City, then province.
String placeOf(String? city, String? province) => [?city, ?province].join('، ');

/// Map tiles come from the network; the layout audit turns them off.
final showMapTilesProvider = Provider<bool>((_) => true);

/// Products, services, or both, as small pills.
class OfferPills extends ConsumerWidget {
  const OfferPills(this.kinds, {super.key});

  final List<String> kinds;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hub = ref.watch(stringsProvider).trademaster.hub;
    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: [
        if (kinds.contains('PRODUCT')) StatusPill(hub.offersProducts, tone: 4),
        if (kinds.contains('SERVICE')) StatusPill(hub.offersServices, tone: 2),
      ],
    );
  }
}

/// All / products / services, as chips.
class KindChips extends ConsumerWidget {
  const KindChips({required this.value, required this.onChanged, super.key});

  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hub = ref.watch(stringsProvider).trademaster.hub;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final (k, label) in [
          ('', hub.kindAll),
          ('PRODUCT', hub.kindProducts),
          ('SERVICE', hub.kindServices),
        ])
          ChoiceChip(
            label: Text(label),
            selected: value == k,
            onSelected: (_) => onChanged(k),
          ),
      ],
    );
  }
}

/// A shop in a list, as a maps app lists places: a small picture, then the
/// name, what kind of business and how far, and where.
class ShopRow extends ConsumerWidget {
  const ShopRow(this.shop, {this.kind, super.key});

  final ShopSummary shop;

  /// Carried to the shop page, so it opens on what the reader was browsing.
  final String? kind;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final subtitle = [
      ?shop.trade,
      // How far, when known; where it is has its own line below.
      if (shop.distanceKm case final km?)
        tm.distanceAway.fill({'km': kmText(km, s, language)}),
    ].join(factSep(language));
    final where = shop.address ?? placeOf(shop.city, shop.province);
    return SoftSurface(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(BaghRadius.card),
        onTap: () => context.push(
          Uri(
            path: '/marketplace/shops/${shop.slug}',
            queryParameters: kind == null || kind!.isEmpty
                ? null
                : {'kind': kind},
          ).toString(),
        ),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              Stack(
                children: [
                  SizedBox.square(
                    dimension: 76,
                    child: RemoteImage(
                      url: apiAsset(shop.coverUrl),
                      radius: BaghRadius.tile,
                      fit: shop.hasCover ? BoxFit.cover : BoxFit.contain,
                      tint: 1,
                    ),
                  ),
                  if (shop.featured)
                    const PositionedDirectional(
                      top: 4,
                      start: 4,
                      child: StatusPill('★', tone: 1),
                    ),
                ],
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 3,
                  children: [
                    Text(shop.name, style: text.titleSmall),
                    if (subtitle.isNotEmpty) Text(subtitle, style: small),
                    if (where.isNotEmpty)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: 3,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Icon(
                              Icons.place_outlined,
                              size: 14,
                              color: c.ink2,
                            ),
                          ),
                          Expanded(
                            child: Text(
                              where,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: small,
                            ),
                          ),
                        ],
                      ),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        OfferPills(shop.kinds),
                        Text(
                          tm.productCount.fill({
                            'count': localDigits(shop.productCount, language),
                          }),
                          style: small,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A listing, browsed by its picture: what it is, what it costs, who sells
/// it where.
class ProductTile extends ConsumerWidget {
  const ProductTile(this.product, {super.key});

  final ProductSummary product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final p = product;
    return InkWell(
      borderRadius: BorderRadius.circular(BaghRadius.tile),
      onTap: () =>
          context.push('/marketplace/products/${p.shopSlug}/${p.slug}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 4,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: Stack(
              fit: StackFit.expand,
              children: [
                RemoteImage(
                  url: apiAsset(p.coverUrl),
                  radius: BaghRadius.tile,
                  tint: 3,
                  semanticLabel: p.title,
                ),
                // Only a service is labelled: most listings are products.
                if (p.service)
                  PositionedDirectional(
                    top: 6,
                    start: 6,
                    child: StatusPill(tm.hub.kindService, tone: 2),
                  ),
                if (!p.available)
                  PositionedDirectional(
                    bottom: 0,
                    start: 0,
                    end: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      decoration: BoxDecoration(
                        color: c.ink.withValues(alpha: 0.75),
                        borderRadius: const BorderRadius.vertical(
                          bottom: Radius.circular(BaghRadius.tile),
                        ),
                      ),
                      child: Text(
                        tm.outOfStock,
                        textAlign: TextAlign.center,
                        style: text.labelSmall?.copyWith(color: c.surface),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 2),
          Text(
            p.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: text.bodyMedium,
          ),
          if (marketMoney(p.price, s, language) case final price?)
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: price,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  if (p.negotiable)
                    TextSpan(
                      text: '${factSep(language)}${tm.negotiable}',
                      style: small,
                    ),
                ],
              ),
              style: text.bodyMedium,
            ),
          Text(
            [
              p.shopName,
              if (p.distanceKm case final km?)
                tm.distanceAway.fill({'km': kmText(km, s, language)})
              else if (placeOf(p.city, p.province) case final w
                  when w.isNotEmpty)
                w,
            ].join(factSep(language)),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: small,
          ),
        ],
      ),
    );
  }
}

typedef MapPin = ({String id, double latitude, double longitude, String label});

/// A map on OpenStreetMap's own tiles, as the web's ShopMap: pins, the
/// search circle, and a tap that can choose a point.
class MarketMap extends ConsumerStatefulWidget {
  const MarketMap({
    this.pins = const [],
    this.circle,
    this.point,
    this.onPick,
    this.onPin,
    this.height = 320,
    this.interactive = true,
    super.key,
  });

  final List<MapPin> pins;

  /// The search centre and radius in km.
  final (double, double, int)? circle;

  /// A single chosen point (the picker's).
  final (double, double)? point;
  final void Function(double latitude, double longitude)? onPick;
  final void Function(String id)? onPin;
  final double height;

  /// False for a map inside a scrolling page: a still picture of where the
  /// place is, so a swipe across it scrolls the page instead of the map.
  final bool interactive;

  @override
  ConsumerState<MarketMap> createState() => _MarketMapState();
}

class _MarketMapState extends ConsumerState<MarketMap> {
  // Iran, whole, when there is nothing to show yet.
  static const _iran = LatLng(32.4, 53.7);

  MapOptions _options() {
    final points = [
      for (final p in widget.pins) LatLng(p.latitude, p.longitude),
      if (widget.circle case (final lat, final lng, _)) LatLng(lat, lng),
      if (widget.point case (final lat, final lng)) LatLng(lat, lng),
    ];
    final tap = widget.onPick;
    return MapOptions(
      initialCenter: points.isEmpty ? _iran : points.first,
      initialZoom: points.isEmpty ? 5 : 13,
      initialCameraFit: points.length > 1
          ? CameraFit.coordinates(
              coordinates: points,
              padding: const EdgeInsets.all(48),
              maxZoom: 15,
            )
          : null,
      // Shops are far apart and a phone is small: no rotating the map by
      // accident with two fingers.
      interactionOptions: InteractionOptions(
        flags: widget.interactive
            ? InteractiveFlag.all & ~InteractiveFlag.rotate
            : InteractiveFlag.none,
      ),
      onTap: tap == null ? null : (_, at) => tap(at.latitude, at.longitude),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final c = BaghColors.of(context);
    final tiles = ref.watch(showMapTilesProvider);
    return ClipRRect(
      borderRadius: BorderRadius.circular(BaghRadius.card),
      child: SizedBox(
        height: widget.height,
        child: Semantics(
          label: s.trademaster.location,
          child: FlutterMap(
            options: _options(),
            children: [
              if (tiles)
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'ir.rayantamaddonjahangostar.app',
                  // OpenStreetMap's servers run on donations: no zooming in
                  // past what their usage policy allows.
                  maxZoom: 19,
                ),
              if (widget.circle case (final lat, final lng, final km))
                CircleLayer(
                  circles: [
                    CircleMarker(
                      point: LatLng(lat, lng),
                      radius: km * 1000.0,
                      useRadiusInMeter: true,
                      color: c.primary.withValues(alpha: 0.10),
                      borderColor: c.primary,
                      borderStrokeWidth: 2,
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  for (final p in widget.pins)
                    Marker(
                      point: LatLng(p.latitude, p.longitude),
                      width: 48,
                      height: 48,
                      alignment: Alignment.topCenter,
                      child: Semantics(
                        button: widget.onPin != null,
                        label: p.label,
                        child: GestureDetector(
                          onTap: widget.onPin == null
                              ? null
                              : () => widget.onPin!(p.id),
                          child: Icon(
                            Icons.location_on,
                            size: 40,
                            color: c.tints[3].ink,
                          ),
                        ),
                      ),
                    ),
                  if (widget.point case (final lat, final lng))
                    Marker(
                      point: LatLng(lat, lng),
                      width: 48,
                      height: 48,
                      alignment: Alignment.topCenter,
                      child: Icon(
                        Icons.location_on,
                        size: 40,
                        color: c.primary,
                      ),
                    ),
                ],
              ),
              // The credit OpenStreetMap asks for, shrunk to fit a narrow
              // map rather than spilling past it.
              Align(
                alignment: AlignmentDirectional.bottomEnd,
                child: ExcludeSemantics(
                  child: Container(
                    color: c.surface.withValues(alpha: 0.85),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        '© OpenStreetMap contributors',
                        textDirection: TextDirection.ltr,
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "Near me", the radius, and choosing the point on a map, as the web's
/// LocationBar: every state says what is happening and what can be done.
class LocationBar extends ConsumerWidget {
  const LocationBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final loc = ref.watch(marketLocationProvider);
    final ctrl = ref.read(marketLocationProvider.notifier);
    final status = switch (loc.status) {
      LocateStatus.denied => hub.locationDenied,
      LocateStatus.unavailable => hub.locationUnavailable,
      _ => null,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 6,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            if (loc.set) ...[
              Chip(
                avatar: const Icon(Icons.place_outlined, size: 18),
                label: Text(
                  loc.device ? hub.nearMyLocation : hub.nearChosenPoint,
                ),
              ),
              PopupMenuButton<int>(
                tooltip: hub.within,
                initialValue: loc.radiusKm,
                onSelected: ctrl.setRadius,
                itemBuilder: (_) => [
                  for (final km in radiusOptionsKm)
                    PopupMenuItem(
                      value: km,
                      child: Text(kmText(km, s, language)),
                    ),
                ],
                child: Chip(
                  avatar: const Icon(Icons.radar_rounded, size: 18),
                  label: Text(
                    '${hub.within} ${kmText(loc.radiusKm, s, language)}',
                  ),
                ),
              ),
              TextButton(
                onPressed: () => showLocationPicker(context),
                child: Text(hub.change),
              ),
              TextButton.icon(
                icon: const Icon(Icons.close_rounded, size: 18),
                label: Text(hub.clearLocation),
                onPressed: ctrl.clear,
              ),
            ] else ...[
              if (loc.status != LocateStatus.denied)
                OutlinedButton.icon(
                  icon: loc.status == LocateStatus.locating
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.my_location_rounded, size: 18),
                  label: Text(
                    loc.status == LocateStatus.locating
                        ? tm.locating
                        : hub.useMyLocation,
                  ),
                  onPressed: loc.status == LocateStatus.locating
                      ? null
                      : ctrl.locate,
                ),
              OutlinedButton.icon(
                icon: const Icon(Icons.map_outlined, size: 18),
                label: Text(hub.chooseOnMap),
                onPressed: () => showLocationPicker(context),
              ),
            ],
          ],
        ),
        if (status != null)
          Text(status, style: text.bodySmall?.copyWith(color: c.ink2)),
      ],
    );
  }
}

/// Choosing the search point on a map, full screen.
Future<void> showLocationPicker(BuildContext context) async {
  final container = ProviderScope.containerOf(context);
  final loc = container.read(marketLocationProvider);
  final ctrl = container.read(marketLocationProvider.notifier);
  final hub = container.read(stringsProvider).trademaster.hub;
  final picked = await pickPoint(
    context,
    initial: loc.set ? (loc.latitude!, loc.longitude!) : null,
    title: hub.pickTitle,
    hint: hub.pickHint,
    confirm: hub.usePoint,
    // The phone's own fix is applied directly; there is no point to confirm.
    device: loc.status == LocateStatus.denied
        ? null
        : (hub.useMyLocation, ctrl.locate),
  );
  if (picked != null) ctrl.pick(picked.$1, picked.$2);
}

/// A point chosen on a full-screen map: choosing a point is the whole job,
/// and a postage-stamp map inside a scrolling page makes it a struggle.
/// Null when the reader leaves without one.
Future<(double, double)?> pickPoint(
  BuildContext context, {
  required String title,
  required String hint,
  required String confirm,
  (double, double)? initial,
  (String, VoidCallback)? device,
}) => Navigator.of(context, rootNavigator: true).push(
  MaterialPageRoute<(double, double)>(
    fullscreenDialog: true,
    builder: (_) => _PointPicker(
      title: title,
      hint: hint,
      confirm: confirm,
      initial: initial,
      device: device,
    ),
  ),
);

class _PointPicker extends StatefulWidget {
  const _PointPicker({
    required this.title,
    required this.hint,
    required this.confirm,
    this.initial,
    this.device,
  });

  final String title;
  final String hint;
  final String confirm;
  final (double, double)? initial;
  final (String, VoidCallback)? device;

  @override
  State<_PointPicker> createState() => _PointPickerState();
}

class _PointPickerState extends State<_PointPicker> {
  late (double, double)? _draft = widget.initial;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Text(
                widget.hint,
                style: text.bodyMedium?.copyWith(color: c.ink2),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: LayoutBuilder(
                  builder: (context, box) => MarketMap(
                    height: box.maxHeight,
                    point: _draft,
                    onPick: (lat, lng) => setState(() => _draft = (lat, lng)),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 10,
                children: [
                  if (widget.device case (final label, final use))
                    OutlinedButton.icon(
                      icon: const Icon(Icons.my_location_rounded),
                      label: Text(label),
                      onPressed: () {
                        use();
                        Navigator.of(context).pop();
                      },
                    ),
                  BaghKey(
                    label: widget.confirm,
                    icon: Icons.check_rounded,
                    expand: true,
                    onPressed: _draft == null
                        ? null
                        : () => Navigator.of(context).pop(_draft),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// What to say when a radius search came back empty: how far the nearest
/// match is, and one press to widen the circle to reach it.
class NothingNearby extends ConsumerWidget {
  const NothingNearby({required this.nearestKm, super.key});

  final double? nearestKm;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final hub = s.trademaster.hub;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final loc = ref.watch(marketLocationProvider);
    final near = nearestKm;
    final reach = near == null
        ? null
        : radiusOptionsKm
              .where((km) => km >= near && km > loc.radiusKm)
              .firstOrNull;
    return SoftSurface(
      padding: const EdgeInsets.all(18),
      child: Column(
        spacing: 6,
        children: [
          Text(
            hub.noneWithin.fill({'radius': kmText(loc.radiusKm, s, language)}),
            style: text.titleSmall,
            textAlign: TextAlign.center,
          ),
          Text(
            near == null
                ? hub.noneAnywhere
                : hub.nearestIs.fill({'km': kmText(near, s, language)}),
            style: text.bodyMedium?.copyWith(color: c.ink2),
            textAlign: TextAlign.center,
          ),
          if (reach != null)
            OutlinedButton(
              onPressed: () =>
                  ref.read(marketLocationProvider.notifier).setRadius(reach),
              child: Text(
                hub.widenTo.fill({'radius': kmText(reach, s, language)}),
              ),
            ),
        ],
      ),
    );
  }
}

/// A shop at a glance, as a map pin opens it: the place, then directions,
/// call, website and the shop itself.
Future<void> showShopCard(BuildContext context, ShopSummary shop) =>
    showBaghSheet<void>(
      context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _ShopCard(shop),
    );

class _ShopCard extends ConsumerWidget {
  const _ShopCard(this.shop);

  final ShopSummary shop;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final hub = s.trademaster.hub;
    final router = GoRouter.of(context);
    Widget action(IconData icon, String label, VoidCallback onTap) =>
        TextButton.icon(icon: Icon(icon), label: Text(label), onPressed: onTap);
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          ShopRow(shop),
          if (shop.phone case final phone?)
            Text(phone, textDirection: TextDirection.ltr),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: [
              if (shop.mappable)
                action(
                  Icons.directions_outlined,
                  hub.directions,
                  () => openExternal(
                    'https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}',
                  ),
                ),
              if (shop.phone case final phone?)
                action(Icons.call_outlined, hub.call, () => openTel(phone)),
              if (shop.website case final site?)
                action(Icons.public, hub.website, () => openExternal(site)),
              action(Icons.storefront_outlined, hub.openShop, () {
                Navigator.of(context).pop();
                router.push('/marketplace/shops/${shop.slug}');
              }),
            ],
          ),
        ],
      ),
    );
  }
}
