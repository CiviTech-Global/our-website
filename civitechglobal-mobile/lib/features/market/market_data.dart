import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/files.dart';
import '../../core/location.dart';
import '../me/workspace_data.dart';

/// The local market (TradeMaster), as the web's api/trademaster and
/// types/trademaster read it: shops, what they offer, the map, and the
/// shop owner's side. Buying stays off, as on the web.

int? _int(Object? v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}');

double? _double(Object? v) => v is num ? v.toDouble() : null;

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

Map<String, Object?> _map(Object? v) =>
    v is Map<String, Object?> ? v : const {};

List<String> _strings(Object? v) =>
    v is List ? v.whereType<String>().toList() : const [];

/// The radii offered, in kilometres, as the web's RADIUS_OPTIONS_KM.
const radiusOptionsKm = [1, 2, 5, 10, 25, 50, 100, 200];

/// A neighbourhood's worth: wide enough to find something in a city.
const defaultRadiusKm = 10;

const maxProductImages = 12;

/// A shop as the lists and the map show it; the shop page adds a little.
class ShopSummary {
  ShopSummary.fromJson(Map<String, Object?> s)
    : id = '${s['id']}',
      code = '${s['code'] ?? ''}',
      slug = '${s['slug'] ?? ''}',
      name = '${s['name'] ?? ''}',
      summary = '${s['summary'] ?? ''}',
      industry = _text(s['industry']),
      province = _text(s['province']),
      city = _text(s['city']),
      featured = s['featured'] == true,
      logoUrl = _text(s['logoUrl']),
      coverUrl = _text(s['coverUrl']),
      hasCover = s['hasCover'] == true,
      businessCategory = _text(_map(s['businessCategory'])['name']),
      address = _text(s['address']),
      phone = _text(s['phone']),
      email = _text(s['email']),
      website = _text(s['website']),
      description = _text(s['description']),
      productCount = _int(s['productCount']) ?? 0,
      kinds = _strings(s['kinds']),
      latitude = _double(s['latitude']),
      longitude = _double(s['longitude']),
      distanceKm = _double(s['distanceKm']);

  final String id;
  final String code;
  final String slug;
  final String name;
  final String summary;
  final String? industry;
  final String? province;
  final String? city;
  final bool featured;
  final String? logoUrl;
  final String? coverUrl;

  /// True when the cover is the shop's own photograph; otherwise it is a
  /// stand-in (a listing's picture or the logo).
  final bool hasCover;
  final String? businessCategory;
  final String? address;
  final String? phone;
  final String? email;
  final String? website;
  final String? description;
  final int productCount;

  /// PRODUCT, SERVICE or both.
  final List<String> kinds;
  final double? latitude;
  final double? longitude;

  /// Only on a search near a point.
  final double? distanceKm;

  bool get mappable => latitude != null && longitude != null;

  /// What kind of business: the guild's name, or the trade typed earlier.
  String? get trade => businessCategory ?? industry;
}

final shopProvider = FutureProvider.autoDispose.family<ShopSummary, String>(
  (ref, slug) => ref
      .read(apiClientProvider)
      .get(
        '/trademaster/shops/${Uri.encodeComponent(slug)}',
        parse: (d) => ShopSummary.fromJson(_map(d)),
      ),
);

/// A listing on a board or a shop page.
class ProductSummary {
  ProductSummary.fromJson(Map<String, Object?> p)
    : id = '${p['id']}',
      code = '${p['code'] ?? ''}',
      slug = '${p['slug'] ?? ''}',
      kind = '${p['kind'] ?? 'PRODUCT'}',
      title = '${p['title'] ?? ''}',
      price = '${p['price'] ?? '0'}',
      negotiable = p['negotiable'] == true,
      coverUrl = _text(p['coverUrl']),
      available = p['available'] != false,
      distanceKm = _double(p['distanceKm']),
      shopSlug = '${_map(p['business'])['slug'] ?? ''}',
      shopName = '${_map(p['business'])['name'] ?? ''}',
      province = _text(_map(p['business'])['province']),
      city = _text(_map(p['business'])['city']);

  final String id;
  final String code;
  final String slug;
  final String kind;
  final String title;
  final String price;
  final bool negotiable;
  final String? coverUrl;

  /// Decided by the server, which counts options too.
  final bool available;
  final double? distanceKm;
  final String shopSlug;
  final String shopName;
  final String? province;
  final String? city;

  bool get service => kind == 'SERVICE';
}

typedef ProductImage = ({String id, String? caption, String url});
typedef ProductVariant = ({
  String id,
  String label,
  String? sku,
  String? price,
  int stock,
});

List<ProductImage> _images(Object? v) => [
  for (final i in (v as List? ?? const []))
    if (i is Map)
      (id: '${i['id']}', caption: _text(i['caption']), url: '${i['url']}'),
];

List<ProductVariant> _variants(Object? v) => [
  for (final x in (v as List? ?? const []))
    if (x is Map)
      (
        id: '${x['id']}',
        label: '${x['label'] ?? ''}',
        sku: _text(x['sku']),
        price: _text(x['price']),
        stock: _int(x['stock']) ?? 0,
      ),
];

/// A listing's page: `GET /trademaster/products/:shop/:product`.
class ProductDetail {
  ProductDetail.fromJson(Map<String, Object?> p)
    : id = '${p['id']}',
      slug = '${p['slug'] ?? ''}',
      kind = '${p['kind'] ?? 'PRODUCT'}',
      available = p['available'] != false,
      title = '${p['title'] ?? ''}',
      summary = '${p['summary'] ?? ''}',
      description = _text(p['description']),
      price = '${p['price'] ?? '0'}',
      stock = _int(p['stock']) ?? 0,
      negotiable = p['negotiable'] == true,
      views = _int(p['views']) ?? 0,
      category = _text(_map(p['category'])['name']),
      images = _images(p['images']),
      variants = _variants(p['variants']),
      shopSlug = '${_map(p['shop'])['slug'] ?? ''}',
      shopName = '${_map(p['shop'])['name'] ?? ''}',
      shopSummary = '${_map(p['shop'])['summary'] ?? ''}',
      shopProvince = _text(_map(p['shop'])['province']),
      shopCity = _text(_map(p['shop'])['city']),
      shopPhone = _text(_map(p['shop'])['phone']),
      shopEmail = _text(_map(p['shop'])['email']),
      shopLogoUrl = _text(_map(p['shop'])['logoUrl']);

  final String id;
  final String slug;
  final String kind;
  final bool available;
  final String title;
  final String summary;
  final String? description;
  final String price;
  final int stock;
  final bool negotiable;
  final int views;
  final String? category;
  final List<ProductImage> images;
  final List<ProductVariant> variants;
  final String shopSlug;
  final String shopName;
  final String shopSummary;
  final String? shopProvince;
  final String? shopCity;
  final String? shopPhone;
  final String? shopEmail;
  final String? shopLogoUrl;

  bool get service => kind == 'SERVICE';
}

final productProvider = FutureProvider.autoDispose
    .family<ProductDetail, (String, String)>(
      (ref, key) => ref
          .read(apiClientProvider)
          .get(
            '/trademaster/products/${Uri.encodeComponent(key.$1)}/${Uri.encodeComponent(key.$2)}',
            parse: (d) => ProductDetail.fromJson(_map(d)),
          ),
    );

/// A guild: sectors, with their trades under them.
class BusinessCategory {
  BusinessCategory.fromJson(Map<String, Object?> c)
    : id = '${c['id']}',
      name = '${c['name'] ?? ''}',
      parentId = _text(c['parentId']),
      shopCount = _int(c['shopCount']) ?? 0;

  final String id;
  final String name;
  final String? parentId;
  final int shopCount;
}

/// What a listing is filed under, products and services apart.
class ProductCategory {
  ProductCategory.fromJson(Map<String, Object?> c)
    : id = '${c['id']}',
      name = '${c['name'] ?? ''}',
      kind = '${c['kind'] ?? 'PRODUCT'}',
      parentId = _text(c['parentId']),
      productCount = _int(c['productCount']) ?? 0;

  final String id;
  final String name;
  final String kind;
  final String? parentId;
  final int productCount;
}

final businessCategoriesProvider = FutureProvider<List<BusinessCategory>>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/trademaster/business-categories',
        parse: (d) => [
          for (final c in (d as List? ?? const []))
            if (c is Map<String, Object?>) BusinessCategory.fromJson(c),
        ],
      ),
);

final productCategoriesProvider = FutureProvider<List<ProductCategory>>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/trademaster/categories',
        parse: (d) => [
          for (final c in (d as List? ?? const []))
            if (c is Map<String, Object?>) ProductCategory.fromJson(c),
        ],
      ),
);

/// The provinces shops have actually written, so no choice comes back
/// empty.
final shopProvincesProvider = FutureProvider<List<String>>(
  (ref) => ref
      .read(apiClientProvider)
      .get('/trademaster/facets', parse: (d) => _strings(_map(d)['provinces'])),
);

/// A two-level list for a picker, children indented under their parent; a
/// parent finds everything under it.
List<(String, String)> twoLevel<T>(
  List<T> all, {
  required String Function(T) id,
  required String? Function(T) parent,
  required String Function(T) label,
}) => [
  for (final p in all.where((c) => parent(c) == null)) ...[
    (id(p), label(p)),
    for (final c in all.where((c) => parent(c) == id(p)))
      (id(c), '    ${label(c)}'),
  ],
];

/// The chosen category, if it still applies to the kind browsed: one of the
/// other kind could only ever come back empty (the web's categoryForKind).
String categoryForKind(List<ProductCategory>? all, String id, String kind) {
  if (id.isEmpty) return '';
  if (all == null) return id;
  final chosen = all.where((c) => c.id == id).firstOrNull;
  if (chosen == null) return '';
  return kind.isEmpty || chosen.kind == kind ? id : '';
}

/// The shops for the map, with the same filters as the list:
/// `GET /trademaster/map`.
typedef ShopMapResult = ({
  List<ShopSummary> items,
  bool truncated,
  double? nearestKm,
});

final shopMapProvider = FutureProvider.autoDispose
    .family<ShopMapResult, MapQuery>(
      (ref, q) => ref
          .read(apiClientProvider)
          .get(
            '/trademaster/map',
            query: q.params,
            parse: (d) {
              final m = _map(d);
              return (
                items: [
                  for (final s in (m['items'] as List? ?? const []))
                    if (s is Map<String, Object?>) ShopSummary.fromJson(s),
                ],
                truncated: m['truncated'] == true,
                nearestKm: _double(m['nearestKm']),
              );
            },
          ),
    );

/// The map's parameters, equal when they are.
@immutable
class MapQuery {
  const MapQuery(this.params);

  final Map<String, String> params;

  @override
  bool operator ==(Object other) =>
      other is MapQuery && mapEquals(other.params, params);

  @override
  int get hashCode => Object.hashAllUnordered(
    params.entries.map((e) => Object.hash(e.key, e.value)),
  );
}

// ---------------------------------------------------------------------------
// Where the search is centred
// ---------------------------------------------------------------------------

enum LocateStatus { idle, locating, denied, unavailable }

@immutable
class MarketLocation {
  const MarketLocation({
    this.latitude,
    this.longitude,
    this.device = false,
    this.radiusKm = defaultRadiusKm,
    this.status = LocateStatus.idle,
  });

  final double? latitude;
  final double? longitude;

  /// The phone's own fix rather than a point chosen on the map.
  final bool device;
  final int radiusKm;
  final LocateStatus status;

  bool get set => latitude != null && longitude != null;

  /// The query fields for a search near the point, or none.
  Map<String, String> get query => set
      ? {
          'latitude': latitude!.toStringAsFixed(5),
          'longitude': longitude!.toStringAsFixed(5),
          'radiusKm': '$radiusKm',
        }
      : const {};

  MarketLocation copyWith({
    double? latitude,
    double? longitude,
    bool? device,
    int? radiusKm,
    LocateStatus? status,
    bool clear = false,
  }) => MarketLocation(
    latitude: clear ? null : latitude ?? this.latitude,
    longitude: clear ? null : longitude ?? this.longitude,
    device: device ?? this.device,
    radiusKm: radiusKm ?? this.radiusKm,
    status: status ?? this.status,
  );
}

/// One choice for every page of the market, kept for the app's session and
/// never sent anywhere except as the query that asks for it (the web keeps
/// it in the tab's session storage).
final marketLocationProvider =
    NotifierProvider<MarketLocationController, MarketLocation>(
      MarketLocationController.new,
    );

class MarketLocationController extends Notifier<MarketLocation> {
  @override
  MarketLocation build() => const MarketLocation();

  Future<void> locate() async {
    state = state.copyWith(status: LocateStatus.locating);
    try {
      final fix = await currentLocation();
      state = state.copyWith(
        latitude: fix.latitude,
        longitude: fix.longitude,
        device: true,
        status: LocateStatus.idle,
      );
    } on LocationNotReady catch (e) {
      state = state.copyWith(
        status: e.problem == LocationProblem.denied
            ? LocateStatus.denied
            : LocateStatus.unavailable,
      );
    }
  }

  void pick(double latitude, double longitude) => state = state.copyWith(
    latitude: latitude,
    longitude: longitude,
    device: false,
    status: LocateStatus.idle,
  );

  void setRadius(int km) => state = state.copyWith(radiusKm: km);

  void clear() =>
      state = state.copyWith(clear: true, status: LocateStatus.idle);
}

// ---------------------------------------------------------------------------
// The shop owner's side
// ---------------------------------------------------------------------------

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

/// One of the owner's shops: `GET /trademaster/me/shops`.
class OwnShop {
  OwnShop.fromJson(Map<String, Object?> s)
    : id = '${s['id']}',
      code = '${s['code'] ?? ''}',
      slug = '${s['slug'] ?? ''}',
      name = '${s['name'] ?? ''}',
      summary = '${s['summary'] ?? ''}',
      moderationStatus = '${s['moderationStatus'] ?? 'DRAFT'}',
      state = '${s['state'] ?? 'OPEN'}',
      reviewNote = _text(s['reviewNote']),
      featured = s['featured'] == true,
      hasLogo = _text(s['logoUrl']) != null,
      hasCover = _text(s['coverUrl']) != null,
      businessCategoryId = _text(s['businessCategoryId']),
      productCount = _int(s['productCount']) ?? 0;

  final String id;
  final String code;
  final String slug;
  final String name;
  final String summary;
  final String moderationStatus;
  final String state;
  final String? reviewNote;
  final bool featured;
  final bool hasLogo;
  final bool hasCover;
  final String? businessCategoryId;
  final int productCount;

  bool get approved => moderationStatus == 'APPROVED';
  bool get editable =>
      moderationStatus == 'DRAFT' || moderationStatus == 'CHANGES_REQUESTED';
  bool get open => approved && state == 'OPEN';
}

final ownShopsProvider = FutureProvider.autoDispose<List<OwnShop>>((ref) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/trademaster/me/shops',
        parse: (d) => [
          for (final s in (d as List? ?? const []))
            if (s is Map<String, Object?>) OwnShop.fromJson(s),
        ],
      );
});

/// Everything the shop form edits: `GET /trademaster/me/shops/:id`.
final ownShopDetailProvider = FutureProvider.autoDispose
    .family<Map<String, Object?>, String>(
      (ref, id) => ref
          .read(apiClientProvider)
          .get('/trademaster/me/shops/${Uri.encodeComponent(id)}', parse: _map),
    );

/// A listing in the owner's shop.
class OwnProduct {
  OwnProduct.fromJson(Map<String, Object?> p)
    : raw = p,
      id = '${p['id']}',
      kind = '${p['kind'] ?? 'PRODUCT'}',
      title = '${p['title'] ?? ''}',
      price = '${p['price'] ?? '0'}',
      stock = _int(p['stock']) ?? 0,
      negotiable = p['negotiable'] == true,
      available = p['available'] != false,
      moderationStatus = '${p['moderationStatus'] ?? 'DRAFT'}',
      state = '${p['state'] ?? 'OPEN'}',
      reviewNote = _text(p['reviewNote']),
      views = _int(p['views']) ?? 0,
      publishedAt = _date(p['publishedAt']),
      images = _images(p['images']),
      variants = _variants(p['variants']),
      imageCount = _int(p['imageCount']) ?? 0,
      variantCount = _int(p['variantCount']) ?? 0;

  final Map<String, Object?> raw;
  final String id;
  final String kind;
  final String title;
  final String price;
  final int stock;
  final bool negotiable;
  final bool available;
  final String moderationStatus;
  final String state;
  final String? reviewNote;
  final int views;
  final DateTime? publishedAt;
  final List<ProductImage> images;
  final List<ProductVariant> variants;
  final int imageCount;
  final int variantCount;

  bool get service => kind == 'SERVICE';

  /// A live listing is edited in place; one in review is not.
  bool get editable => const {
    'DRAFT',
    'CHANGES_REQUESTED',
    'APPROVED',
  }.contains(moderationStatus);
}

final shopProductsProvider = FutureProvider.autoDispose
    .family<List<OwnProduct>, String>((ref, shopId) async {
      if (ref.watch(_accountProvider) == null) return const [];
      return ref
          .read(apiClientProvider)
          .get(
            '/trademaster/me/shops/${Uri.encodeComponent(shopId)}/products',
            parse: (d) => [
              for (final p in (d as List? ?? const []))
                if (p is Map<String, Object?>) OwnProduct.fromJson(p),
            ],
          );
    });

/// The owner's own copy of a picture, through the sign-in: a shop or
/// listing in review has no public pictures.
final ownMarketImageProvider = FutureProvider.autoDispose
    .family<Uint8List?, String>((ref, path) async {
      final file = await ref.read(apiClientProvider).download(path);
      return file.bytes.isEmpty ? null : Uint8List.fromList(file.bytes);
    });

String ownShopLogoPath(String shopId) =>
    '/trademaster/me/shops/${Uri.encodeComponent(shopId)}/logo';

String ownShopCoverPath(String shopId) =>
    '/trademaster/me/shops/${Uri.encodeComponent(shopId)}/cover';

String ownProductImagePath(String imageId) =>
    '/trademaster/me/products/images/${Uri.encodeComponent(imageId)}';

MultipartFile _webp(PreparedImage image) => MultipartFile.fromBytes(
  image.bytes,
  filename: image.name,
  contentType: DioMediaType('image', 'webp'),
);

/// Every write on the owner's side.
final marketActionsProvider = Provider<MarketActions>(MarketActions.new);

class MarketActions {
  const MarketActions(this._ref);

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  void _shopsChanged() => _ref
    ..invalidate(ownShopsProvider)
    ..invalidate(ownShopDetailProvider)
    ..invalidate(ownMarketImageProvider)
    ..invalidate(workspaceProvider);

  void _productsChanged() => _ref
    ..invalidate(shopProductsProvider)
    ..invalidate(ownShopsProvider);

  /// A new shop, or changes to one, with its pictures already made small.
  Future<void> saveShop(
    Map<String, Object?> payload, {
    String? id,
    PreparedImage? logo,
    PreparedImage? cover,
    void Function(double progress)? onProgress,
  }) async {
    await _api.upload<void>(
      id == null
          ? '/trademaster/me/shops'
          : '/trademaster/me/shops/${Uri.encodeComponent(id)}',
      method: id == null ? 'POST' : 'PATCH',
      form: () => FormData.fromMap({
        'payload': jsonEncode(payload),
        if (logo != null) 'logo': _webp(logo),
        if (cover != null) 'cover': _webp(cover),
      }),
      onProgress: onProgress,
    );
    _shopsChanged();
  }

  /// submit, withdraw, close or reopen.
  Future<void> shop(String id, String action) async {
    await _api.post<void>(
      '/trademaster/me/shops/${Uri.encodeComponent(id)}/$action',
    );
    _shopsChanged();
  }

  /// A new listing in a shop. Returns its id.
  Future<String> createProduct(
    String shopId,
    Map<String, Object?> payload,
  ) async {
    final id = await _api.post<String>(
      '/trademaster/me/shops/${Uri.encodeComponent(shopId)}/products',
      body: payload,
      parse: (d) => '${_map(d)['id']}',
    );
    _productsChanged();
    return id;
  }

  Future<void> updateProduct(String id, Map<String, Object?> payload) async {
    await _api.patch<void>(
      '/trademaster/me/products/${Uri.encodeComponent(id)}',
      body: payload,
    );
    _productsChanged();
  }

  /// To review, or straight live where the server allows. Returns the new
  /// status.
  Future<String> submitProduct(String id) async {
    final status = await _api.post<String>(
      '/trademaster/me/products/${Uri.encodeComponent(id)}/submit',
      parse: (d) => '${_map(d)['moderationStatus'] ?? ''}',
    );
    _productsChanged();
    return status;
  }

  /// withdraw, close or reopen.
  Future<void> product(String id, String action) async {
    await _api.post<void>(
      '/trademaster/me/products/${Uri.encodeComponent(id)}/$action',
    );
    _productsChanged();
  }

  Future<void> deleteProduct(String id) async {
    await _api.delete<void>(
      '/trademaster/me/products/${Uri.encodeComponent(id)}',
    );
    _productsChanged();
  }

  Future<void> addImages(
    String productId,
    List<PreparedImage> images, {
    void Function(double progress)? onProgress,
  }) async {
    await _api.upload<void>(
      '/trademaster/me/products/${Uri.encodeComponent(productId)}/images',
      form: () => FormData.fromMap({'images': images.map(_webp).toList()}),
      onProgress: onProgress,
    );
    _productsChanged();
  }

  Future<void> setCaption(String imageId, String caption) async {
    await _api.patch<void>(
      '/trademaster/me/products/images/${Uri.encodeComponent(imageId)}',
      body: {'caption': caption},
    );
    _productsChanged();
  }

  Future<void> removeImage(String imageId) async {
    await _api.delete<void>(
      '/trademaster/me/products/images/${Uri.encodeComponent(imageId)}',
    );
    _productsChanged();
  }

  Future<void> saveVariant(
    Map<String, Object?> payload, {
    String? productId,
    String? id,
  }) async {
    if (id == null) {
      await _api.post<void>(
        '/trademaster/me/products/${Uri.encodeComponent(productId!)}/variants',
        body: payload,
      );
    } else {
      await _api.patch<void>(
        '/trademaster/me/products/variants/${Uri.encodeComponent(id)}',
        body: payload,
      );
    }
    _productsChanged();
  }

  Future<void> removeVariant(String id) async {
    await _api.delete<void>(
      '/trademaster/me/products/variants/${Uri.encodeComponent(id)}',
    );
    _productsChanged();
  }
}
