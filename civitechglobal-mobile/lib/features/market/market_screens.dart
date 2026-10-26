import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../browse/browse.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../profile/profile_data.dart';
import 'market_data.dart';
import 'market_ui.dart';

/// The local market's public side, as the web's MarketplaceHomePage,
/// ShopsPage, ShopDetailPage, MarketProductsPage, MarketProductDetailPage
/// and MarketplaceJoinPage.

/// The market's own way around: explore, shops, listings, joining.
List<Widget> _nav(BuildContext context, Strings s, String here) {
  final hub = s.trademaster.hub;
  return [
    for (final (path, label, icon) in [
      ('/marketplace/shops', hub.navShops, Icons.storefront_outlined),
      ('/marketplace/products', hub.navListings, Icons.inventory_2_outlined),
      ('/marketplace/join', hub.navJoin, Icons.add_business_outlined),
    ])
      if (path != here)
        ActionChip(
          avatar: Icon(icon, size: 18),
          label: Text(label),
          onPressed: () => context.push(path),
        ),
  ];
}

/// The shops, as a list with the map a key away: the front door
/// (/marketplace) and the shops page (/marketplace/shops) answer the same
/// question with the same filters.
class ShopsScreen extends ConsumerWidget {
  const ShopsScreen({this.home = false, this.initial = const {}, super.key});

  /// The front door: its own title, and the way to the shops page.
  final bool home;
  final Map<String, String> initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final loc = ref.watch(marketLocationProvider);
    final guilds = ref.watch(businessCategoriesProvider).value ?? const [];
    final categories = ref.watch(productCategoriesProvider).value;
    final provinces = ref.watch(shopProvincesProvider).value ?? const [];
    final near = loc.set;

    return BrowseScreen(
      title: home ? hub.exploreTitle : tm.shops,
      subtitle: home ? hub.exploreSubtitle : tm.subtitle,
      path: '/trademaster/shops',
      searchHint: home ? hub.searchPlaceholder : tm.searchShops,
      helpId: 'marketplace',
      countText: hub.shopCount,
      emptyText: tm.noShops,
      initial: initial,
      // A radius search is ordered by distance; a sort menu that changes
      // nothing is worse than none.
      fixed: {...loc.query, if (near) 'sort': 'nearest'},
      sorts: near
          ? [('nearest', hub.sortedByDistance)]
          : [('newest', tm.sortNewest), ('name', tm.sortName)],
      header: [
        ActionChip(
          avatar: const Icon(Icons.map_outlined, size: 18),
          label: Text(tm.explore.showMap),
          onPressed: () => context.push('/marketplace/map'),
        ),
        ..._nav(context, s, home ? '' : '/marketplace/shops'),
        const SizedBox(width: double.infinity, child: LocationBar()),
      ],
      emptyBuilder: (context, page) => near
          ? NothingNearby(
              nearestKm: (page.meta['nearestKm'] as num?)?.toDouble(),
            )
          : null,
      filters: (query) {
        final kind = query.params['kind'] ?? '';
        return [
          ChoiceFilter(hub.kindLabel, 'kind', [
            ('PRODUCT', hub.kindProducts),
            ('SERVICE', hub.kindServices),
          ], all: hub.kindAll),
          PickerFilter(
            hub.businessCategory,
            'businessCategoryId',
            twoLevel(
              guilds,
              id: (c) => c.id,
              parent: (c) => c.parentId,
              label: (c) =>
                  c.shopCount > 0 ? '${c.name} (${c.shopCount})' : c.name,
            ),
            all: hub.allBusinessCategories,
          ),
          PickerFilter(
            tm.category,
            'categoryId',
            twoLevel(
              [
                for (final c in categories ?? const <ProductCategory>[])
                  if (kind.isEmpty || c.kind == kind) c,
              ],
              id: (c) => c.id,
              parent: (c) => c.parentId,
              label: (c) => c.name,
            ),
            all: hub.allListingCategories,
          ),
          if (provinces.length > 1)
            PickerFilter(tm.filterProvince, 'province', [
              for (final p in provinces) (p, p),
            ], all: tm.filterAllProvinces),
        ];
      },
      itemBuilder: (context, row) {
        final kind = initial['kind'];
        return ShopRow(ShopSummary.fromJson(row), kind: kind);
      },
    );
  }
}

/// Every shop on a map, with the search circle; a pin opens the shop's
/// card. The phone's half of the web's list-beside-map.
class MarketMapScreen extends ConsumerWidget {
  const MarketMapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final loc = ref.watch(marketLocationProvider);
    final map = ref.watch(shopMapProvider(MapQuery(loc.query)));
    final shops = map.value?.items ?? const <ShopSummary>[];
    return Scaffold(
      appBar: AppBar(
        title: Text(hub.exploreTitle),
        actions: const [HelpAction('marketplace')],
      ),
      // The map has a size of its own, most of the screen; on a small screen
      // with large text the page scrolls rather than squeezing it away.
      body: SafeArea(
        top: false,
        child: LayoutBuilder(
          builder: (context, page) => SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: LocationBar(),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: MarketMap(
                    // A new search point is a new map.
                    key: ValueKey((loc.query, shops.length)),
                    height: (page.maxHeight * 0.6).clamp(300, 900),
                    pins: [
                      for (final shop in shops)
                        if (shop.mappable)
                          (
                            id: shop.id,
                            latitude: shop.latitude!,
                            longitude: shop.longitude!,
                            label: shop.name,
                          ),
                    ],
                    circle: loc.set
                        ? (loc.latitude!, loc.longitude!, loc.radiusKm)
                        : null,
                    onPick: (lat, lng) => ref
                        .read(marketLocationProvider.notifier)
                        .pick(lat, lng),
                    onPin: (id) => showShopCard(
                      context,
                      shops.firstWhere((shop) => shop.id == id),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 4,
                    children: [
                      if (map.isLoading)
                        const LinearProgressIndicator()
                      else if (map.hasError)
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                describeError(s, map.error!),
                                style: text.bodySmall,
                              ),
                            ),
                            TextButton(
                              onPressed: () => ref.invalidate(
                                shopMapProvider(MapQuery(loc.query)),
                              ),
                              child: Text(s.common.retry),
                            ),
                          ],
                        )
                      else
                        Text(
                          hub.shopCount.fill({
                            'count': localDigits(shops.length, language),
                          }),
                          style: text.titleSmall,
                        ),
                      Text(
                        hub.mapHint,
                        style: text.bodySmall?.copyWith(color: c.ink2),
                      ),
                      if (map.value?.truncated ?? false)
                        Text(
                          hub.truncated.fill({
                            'count': localDigits(shops.length, language),
                          }),
                          style: text.bodySmall,
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// One shop and what it offers, as the web's ShopDetailPage.
class ShopScreen extends ConsumerWidget {
  const ShopScreen({required this.slug, this.kind = '', super.key});

  final String slug;
  final String kind;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final shop = ref.watch(shopProvider(slug));
    return Scaffold(
      appBar: AppBar(
        title: Text(shop.value?.name ?? s.trademaster.shops),
        actions: const [HelpAction('marketplace')],
      ),
      body: shop.hasError && ApiException.from(shop.error!).status == 404
          ? EmptyNote(
              message: s.errors.notFoundBody,
              action: (
                s.trademaster.shops,
                () => context.go('/marketplace/shops'),
              ),
            )
          : AsyncView(
              value: shop,
              onRetry: () => ref.invalidate(shopProvider(slug)),
              data: (v) => _ShopBody(v, initialKind: kind),
            ),
    );
  }
}

class _ShopBody extends ConsumerStatefulWidget {
  const _ShopBody(this.shop, {required this.initialKind});

  final ShopSummary shop;
  final String initialKind;

  @override
  ConsumerState<_ShopBody> createState() => _ShopBodyState();
}

class _ShopBodyState extends ConsumerState<_ShopBody> {
  late String _kind = widget.initialKind;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final shop = widget.shop;
    final both = shop.kinds.length > 1;
    final heading = shop.kinds.length == 1 && shop.kinds.first == 'SERVICE'
        ? hub.kindServices
        : both
        ? hub.navListings
        : tm.products;
    final query = BrowseQuery('/trademaster/products', {
      'shopSlug': shop.slug,
      'sort': 'newest',
      if (both && _kind.isNotEmpty) 'kind': _kind,
    });
    final products = ref.watch(browseProvider(query));
    final where = [?shop.address, ?shop.city, ?shop.province].join('، ');

    Widget fact(
      IconData icon,
      String words, {
      VoidCallback? onTap,
      bool ltr = false,
    }) => InkWell(
      onTap: onTap,
      // As tall as a finger needs, the call and website lines being keys.
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 4),
        constraints: const BoxConstraints(minHeight: 48),
        alignment: AlignmentDirectional.centerStart,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 8,
          children: [
            Icon(icon, size: 18, color: c.ink2),
            Expanded(
              child: Text(
                words,
                textDirection: ltr ? TextDirection.ltr : null,
                textAlign: ltr ? TextAlign.end : null,
                style: text.bodyMedium?.copyWith(
                  color: onTap == null ? c.ink2 : c.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );

    return RefreshIndicator(
      color: c.primary,
      onRefresh: () async {
        ref
          ..invalidate(browseProvider(query))
          ..invalidate(shopProvider(shop.slug));
        await ref.read(shopProvider(shop.slug).future);
      },
      // The next page of listings loads as the reader nears the end.
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 600) {
            ref.read(browseProvider(query).notifier).loadMore();
          }
          return false;
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: BaghLayout.readablePadding(
            context,
            top: BaghSpace.gutter,
            bottom: BaghSpace.section * 2,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: BaghSpace.gutter,
            children: [
              // The shop's own photograph across the top; a stand-in would
              // only repeat what the page already shows.
              if (shop.hasCover && shop.coverUrl != null)
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: RemoteImage(
                    url: apiAsset(shop.coverUrl),
                    radius: BaghRadius.card,
                    tint: 1,
                  ),
                ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 14,
                children: [
                  SizedBox.square(
                    dimension: 80,
                    child: shop.logoUrl == null
                        ? Container(
                            decoration: BoxDecoration(
                              color: c.fill,
                              borderRadius: BorderRadius.circular(
                                BaghRadius.tile,
                              ),
                            ),
                            child: Icon(
                              Icons.storefront_outlined,
                              size: 36,
                              color: c.ink2,
                            ),
                          )
                        : RemoteImage(
                            url: apiAsset(shop.logoUrl),
                            radius: BaghRadius.tile,
                            semanticLabel: shop.name,
                          ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      spacing: 6,
                      children: [
                        Text(shop.name, style: text.headlineSmall),
                        if (shop.trade case final t?)
                          Text(
                            t,
                            style: text.bodyMedium?.copyWith(color: c.ink2),
                          ),
                        OfferPills(shop.kinds),
                      ],
                    ),
                  ),
                ],
              ),
              Text(shop.summary, style: text.bodyLarge),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (where.isNotEmpty) fact(Icons.place_outlined, where),
                  if (shop.phone case final phone?)
                    fact(
                      Icons.call_outlined,
                      phone,
                      ltr: true,
                      onTap: () => openTel(phone),
                    ),
                  if (shop.email case final email?)
                    fact(Icons.mail_outline_rounded, email, ltr: true),
                  if (shop.website case final site?)
                    fact(
                      Icons.public,
                      tm.visitWebsite,
                      onTap: () => openExternal(site),
                    ),
                ],
              ),
              if (shop.description case final d?)
                Text(
                  d,
                  style: text.bodyMedium?.copyWith(color: c.ink2),
                  textDirection: textDirectionOf(d, Directionality.of(context)),
                ),
              if (shop.mappable) ...[
                Text(tm.location, style: text.titleMedium),
                // Still, so the page scrolls past it; a tap anywhere opens
                // directions.
                GestureDetector(
                  onTap: () => openExternal(
                    'https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}',
                  ),
                  child: MarketMap(
                    height: 240,
                    interactive: false,
                    pins: [
                      (
                        id: shop.id,
                        latitude: shop.latitude!,
                        longitude: shop.longitude!,
                        label: shop.name,
                      ),
                    ],
                  ),
                ),
              ],
              Text(heading, style: text.titleLarge),
              if (both)
                KindChips(
                  value: _kind,
                  onChanged: (k) => setState(() => _kind = k),
                ),
              AsyncView(
                value: products,
                onRetry: () => ref.invalidate(browseProvider(query)),
                isEmpty: (page) => page.items.isEmpty,
                empty: tm.noProducts,
                data: (page) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 12,
                  children: [
                    _TileRows([
                      for (final row in page.items)
                        ProductTile(ProductSummary.fromJson(row)),
                    ]),
                    if (page.page < page.totalPages)
                      const Center(child: GirihSpinner()),
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

/// Tiles side by side, as many as fit at about 150 points, each row as tall
/// as its tallest tile.
class _TileRows extends StatelessWidget {
  const _TileRows(this.tiles);

  final List<Widget> tiles;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, box) {
      final scale = MediaQuery.textScalerOf(context).scale(1);
      final per = (box.maxWidth / (150 * scale)).floor().clamp(1, 4);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 18,
        children: [
          for (var r = 0; r * per < tiles.length; r++)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 12,
              children: [
                for (var i = r * per; i < (r + 1) * per; i++)
                  Expanded(
                    child: i < tiles.length
                        ? tiles[i]
                        : const SizedBox.shrink(),
                  ),
              ],
            ),
        ],
      );
    },
  );
}

/// Every listing, browsed by picture, as the web's MarketProductsPage.
class ProductsScreen extends ConsumerWidget {
  const ProductsScreen({this.initial = const {}, super.key});

  final Map<String, String> initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final loc = ref.watch(marketLocationProvider);
    final categories = ref.watch(productCategoriesProvider).value;
    final provinces = ref.watch(shopProvincesProvider).value ?? const [];
    final near = loc.set;
    return BrowseScreen(
      title: hub.listingsTitle,
      subtitle: hub.listingsSubtitle,
      path: '/trademaster/products',
      searchHint: hub.searchListings,
      helpId: 'marketplace',
      countText: s.list.resultCount,
      emptyText: tm.noProducts,
      tiles: true,
      initial: initial,
      fixed: loc.query,
      sorts: [
        if (near) ('nearest', hub.sortNearest),
        ('newest', tm.sortNewest),
        ('priceAsc', tm.sortPriceAsc),
        ('priceDesc', tm.sortPriceDesc),
      ],
      header: [
        ..._nav(context, s, '/marketplace/products'),
        const SizedBox(width: double.infinity, child: LocationBar()),
      ],
      emptyBuilder: (context, page) => near
          ? NothingNearby(
              nearestKm: (page.meta['nearestKm'] as num?)?.toDouble(),
            )
          : null,
      filters: (query) {
        final kind = query.params['kind'] ?? '';
        return [
          ChoiceFilter(hub.kindLabel, 'kind', [
            ('PRODUCT', hub.kindProducts),
            ('SERVICE', hub.kindServices),
          ], all: hub.kindAll),
          PickerFilter(
            tm.category,
            'categoryId',
            twoLevel(
              [
                for (final c in categories ?? const <ProductCategory>[])
                  if (kind.isEmpty || c.kind == kind) c,
              ],
              id: (c) => c.id,
              parent: (c) => c.parentId,
              label: (c) =>
                  c.productCount > 0 ? '${c.name} (${c.productCount})' : c.name,
            ),
            all: tm.allCategories,
          ),
          // A service is never out of stock.
          if (kind != 'SERVICE') SwitchFilter(tm.inStockOnly, 'inStock'),
          if (provinces.length > 1)
            PickerFilter(tm.filterProvince, 'province', [
              for (final p in provinces) (p, p),
            ], all: tm.filterAllProvinces),
          MoneyRangeFilter(
            tm.price,
            minKey: 'priceMin',
            maxKey: 'priceMax',
            minLabel: tm.priceFrom,
            maxLabel: tm.priceTo,
          ),
        ];
      },
      itemBuilder: (context, row) => ProductTile(ProductSummary.fromJson(row)),
    );
  }
}

/// One listing, as the web's MarketProductDetailPage: pictures, the offer
/// with its options, the seller and how to reach them.
class ProductScreen extends ConsumerWidget {
  const ProductScreen({required this.shopSlug, required this.slug, super.key});

  final String shopSlug;
  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final product = ref.watch(productProvider((shopSlug, slug)));
    return Scaffold(
      appBar: AppBar(
        title: Text(s.trademaster.hub.navListings),
        actions: const [HelpAction('marketplace')],
      ),
      body: product.hasError && ApiException.from(product.error!).status == 404
          ? EmptyNote(
              message: s.errors.notFoundBody,
              action: (
                s.trademaster.hub.navListings,
                () => context.go('/marketplace/products'),
              ),
            )
          : AsyncView(
              value: product,
              onRetry: () => ref.invalidate(productProvider((shopSlug, slug))),
              data: _ProductBody.new,
            ),
    );
  }
}

const _lowStock = 5;

class _ProductBody extends ConsumerStatefulWidget {
  const _ProductBody(this.p);

  final ProductDetail p;

  @override
  ConsumerState<_ProductBody> createState() => _ProductBodyState();
}

class _ProductBodyState extends ConsumerState<_ProductBody> {
  int _image = 0;
  String? _variant;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final p = widget.p;
    final variant = p.variants.where((v) => v.id == _variant).firstOrNull;
    final price = marketMoney(variant?.price ?? p.price, s, language);
    final stock = variant?.stock ?? p.stock;
    final cover = p.images.isEmpty
        ? null
        : p.images[_image.clamp(0, p.images.length - 1)];
    final more = BrowseQuery('/trademaster/products', {
      'shopSlug': p.shopSlug,
      'sort': 'newest',
    });
    final others = [
      for (final row
          in ref.watch(browseProvider(more)).value?.items ??
              const <Map<String, Object?>>[])
        if ('${row['id']}' != p.id) ProductSummary.fromJson(row),
    ].take(5).toList();
    String n(int v) => localDigits(v, language);

    return RefreshIndicator(
      color: c.primary,
      onRefresh: () =>
          ref.refresh(productProvider((p.shopSlug, p.slug)).future),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: BaghLayout.readablePadding(
          context,
          top: BaghSpace.gutter,
          bottom: BaghSpace.section * 2,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: BaghSpace.gutter,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: RemoteImage(
                url: apiAsset(cover?.url),
                radius: BaghRadius.card,
                tint: 3,
                semanticLabel: cover?.caption ?? p.title,
              ),
            ),
            if (cover?.caption case final caption?)
              Text(caption, style: text.bodySmall?.copyWith(color: c.ink2)),
            if (p.images.length > 1)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final (i, image) in p.images.indexed)
                    Semantics(
                      button: true,
                      selected: i == _image,
                      label: s.showcase.shotOf.fill({
                        'index': n(i + 1),
                        'total': n(p.images.length),
                      }),
                      child: GestureDetector(
                        onTap: () => setState(() => _image = i),
                        child: Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: i == _image ? c.primary : c.edge,
                              width: i == _image ? 2 : 1,
                            ),
                            borderRadius: BorderRadius.circular(
                              BaghRadius.tile,
                            ),
                          ),
                          child: RemoteImage(
                            url: apiAsset(image.url),
                            radius: BaghRadius.tile - 2,
                            tint: 3,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 6,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    StatusPill(
                      p.service ? hub.kindService : hub.kindProduct,
                      tone: p.service ? 2 : 4,
                    ),
                    if (p.category case final cat?)
                      Text(cat, style: text.bodySmall?.copyWith(color: c.ink2)),
                  ],
                ),
                Text(p.title, style: text.headlineSmall),
                Text(p.summary, style: text.bodyLarge?.copyWith(color: c.ink2)),
              ],
            ),
            Wrap(
              spacing: 10,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (price != null)
                  Text(
                    price,
                    style: text.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                if (p.negotiable) StatusPill(tm.negotiable, tone: 2),
                // A service has no stock to report.
                if (!p.service)
                  StatusPill(
                    p.available ? tm.inStock : tm.outOfStock,
                    tone: p.available ? 0 : 4,
                  ),
              ],
            ),
            if (!p.service && p.available && stock > 0 && stock <= _lowStock)
              Text(
                tm.lowStock.fill({'count': n(stock)}),
                style: text.bodyMedium?.copyWith(color: c.ink2),
              ),
            if (p.variants.isNotEmpty) ...[
              Text(tm.variants, style: text.titleSmall),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final v in p.variants)
                    ChoiceChip(
                      label: Text(
                        !p.service && v.stock == 0
                            ? '${v.label} — ${tm.outOfStock}'
                            : v.label,
                      ),
                      selected: _variant == v.id,
                      onSelected: !p.service && v.stock == 0
                          ? null
                          : (_) => setState(
                              () => _variant = _variant == v.id ? null : v.id,
                            ),
                    ),
                ],
              ),
            ],
            // Money does not move on the site yet: the seller is reached
            // directly, as the block below says how.
            SoftSurface(
              tint: c.tints[4],
              elevated: false,
              padding: const EdgeInsets.all(12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 8,
                children: [
                  Icon(
                    Icons.info_outline_rounded,
                    size: 18,
                    color: c.tints[4].ink,
                  ),
                  Expanded(
                    child: Text(
                      p.service ? hub.bookService : tm.noPaymentYet,
                      style: text.bodyMedium?.copyWith(color: c.tints[4].ink),
                    ),
                  ),
                ],
              ),
            ),
            SoftSurface(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 8,
                children: [
                  Text(
                    tm.soldBy,
                    style: text.labelLarge?.copyWith(color: c.ink2),
                  ),
                  InkWell(
                    onTap: () =>
                        context.push('/marketplace/shops/${p.shopSlug}'),
                    child: Row(
                      spacing: 12,
                      children: [
                        SizedBox.square(
                          dimension: 48,
                          child: RemoteImage(
                            url: apiAsset(p.shopLogoUrl),
                            radius: BaghRadius.tile,
                            initials: initialsOf(p.shopName),
                            tint: 1,
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            spacing: 2,
                            children: [
                              Text(
                                p.shopName,
                                style: text.titleSmall?.copyWith(
                                  color: c.primary,
                                ),
                              ),
                              Text(
                                p.shopSummary,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: text.bodySmall?.copyWith(color: c.ink2),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (p.shopPhone != null || p.shopEmail != null)
                    Text(
                      tm.contactSeller,
                      style: text.labelMedium?.copyWith(color: c.ink2),
                    ),
                  Wrap(
                    spacing: 14,
                    runSpacing: 4,
                    children: [
                      if (placeOf(p.shopCity, p.shopProvince) case final w
                          when w.isNotEmpty)
                        Text(w, style: text.bodySmall?.copyWith(color: c.ink2)),
                      if (p.shopPhone case final phone?)
                        TextButton.icon(
                          icon: const Icon(Icons.call_outlined, size: 18),
                          label: Text(phone, textDirection: TextDirection.ltr),
                          onPressed: () => openTel(phone),
                        ),
                      if (p.shopEmail case final email?)
                        Text(
                          email,
                          textDirection: TextDirection.ltr,
                          style: text.bodySmall,
                        ),
                    ],
                  ),
                ],
              ),
            ),
            Row(
              spacing: 4,
              children: [
                Icon(Icons.visibility_outlined, size: 16, color: c.ink2),
                Text(
                  tm.views.fill({'count': n(p.views)}),
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
              ],
            ),
            if (p.description case final d?) ...[
              Text(tm.productDescription, style: text.titleMedium),
              Text(
                d,
                style: text.bodyMedium?.copyWith(color: c.ink2),
                textDirection: textDirectionOf(d, Directionality.of(context)),
              ),
            ],
            if (others.isNotEmpty) ...[
              Text(tm.moreFromShop, style: text.titleMedium),
              _TileRows([for (final o in others) ProductTile(o)]),
            ],
          ],
        ),
      ),
    );
  }
}

/// How a shop gets into the market, and the key to the reader's next step:
/// sign in, verify, or open the shop form (the web's MarketplaceJoinPage).
class JoinMarketScreen extends ConsumerWidget {
  const JoinMarketScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final hub = s.trademaster.hub;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final signedIn = ref.watch(sessionProvider).value != null;
    final verification = ref.watch(ownVerificationProvider);
    final status = verification.value?.status;

    Widget next() {
      if (!signedIn) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 10,
          children: [
            BaghKey(
              label: hub.ctaRegister,
              expand: true,
              onPressed: () => context.push(
                Uri(
                  path: '/register',
                  queryParameters: {'from': '/marketplace/join'},
                ).toString(),
              ),
            ),
            BaghKey(
              label: hub.ctaLogin,
              kind: BaghKeyKind.outline,
              expand: true,
              onPressed: () => context.push(
                Uri(
                  path: '/login',
                  queryParameters: {'from': '/marketplace/join'},
                ).toString(),
              ),
            ),
          ],
        );
      }
      if (verification.isLoading) {
        return const Center(child: GirihSpinner());
      }
      return switch (status) {
        'APPROVED' => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 10,
          children: [
            BaghKey(
              label: hub.ctaCreateShop,
              icon: Icons.storefront_outlined,
              expand: true,
              onPressed: () => context.push('/dashboard/shops/new'),
            ),
            BaghKey(
              label: hub.ctaMyShops,
              kind: BaghKeyKind.outline,
              expand: true,
              onPressed: () => context.push('/dashboard/shops'),
            ),
          ],
        ),
        'PENDING' => SoftSurface(
          padding: const EdgeInsets.all(14),
          child: Text(hub.verificationPending, style: text.bodyMedium),
        ),
        _ => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 10,
          children: [
            if (status == 'REJECTED')
              Text(
                hub.verificationRejected,
                style: text.bodyMedium?.copyWith(color: c.ink2),
              ),
            BaghKey(
              label: hub.ctaVerify,
              icon: Icons.verified_user_outlined,
              expand: true,
              onPressed: () => context.push('/dashboard/verification'),
            ),
          ],
        ),
      };
    }

    final steps = [
      (Icons.person_add_alt_outlined, hub.step1Title, hub.step1Body),
      (Icons.verified_outlined, hub.step2Title, hub.step2Body),
      (Icons.storefront_outlined, hub.step3Title, hub.step3Body),
      (Icons.add_box_outlined, hub.step4Title, hub.step4Body),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text(hub.joinTitle),
        actions: const [HelpAction('marketplace-join')],
      ),
      body: SingleChildScrollView(
        padding: BaghLayout.readablePadding(
          context,
          top: BaghSpace.gutter,
          bottom: BaghSpace.section * 2,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: BaghSpace.gutter,
          children: [
            Text(
              hub.joinSubtitle,
              style: text.bodyLarge?.copyWith(color: c.ink2),
            ),
            for (final (i, (icon, title, body)) in steps.indexed)
              SoftSurface(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 14,
                  children: [
                    CircleAvatar(
                      backgroundColor: c.fill,
                      foregroundColor: c.ink,
                      child: Icon(icon, size: 20),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: 4,
                        children: [
                          Semantics(
                            label: '${i + 1}. $title',
                            excludeSemantics: true,
                            child: Text(title, style: text.titleSmall),
                          ),
                          Text(
                            body,
                            style: text.bodyMedium?.copyWith(color: c.ink2),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            SoftSurface(
              tint: c.tints[4],
              elevated: false,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 6,
                children: [
                  Text(hub.needTitle, style: text.titleSmall),
                  for (final need in [
                    hub.need1,
                    hub.need2,
                    hub.need3,
                    hub.need4,
                  ])
                    Text('•  $need', style: text.bodyMedium),
                ],
              ),
            ),
            next(),
          ],
        ),
      ),
    );
  }
}
