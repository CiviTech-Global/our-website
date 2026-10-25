import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/files.dart';
import '../me/workspace_data.dart';
import 'freelance_data.dart';

/// The seller's side of the service catalogue, as the web's MyServicesPage,
/// ServiceEditorPage and ServiceOrdersPage read it.

int? _int(Object? v) => v is num ? v.toInt() : null;

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

Map<String, Object?> _map(Object? v) =>
    v is Map<String, Object?> ? v : const {};

List<String> _strings(Object? v) =>
    v is List ? v.whereType<String>().toList() : const [];

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

/// One of the seller's own services: `GET /work/me/services`.
class OwnService {
  OwnService.fromJson(Map<String, Object?> s)
    : raw = s,
      id = '${s['id']}',
      code = '${s['code'] ?? ''}',
      title = '${s['title'] ?? ''}',
      moderationStatus = '${s['moderationStatus'] ?? 'DRAFT'}',
      reviewNote = _text(s['reviewNote']),
      state = '${s['state'] ?? 'ACTIVE'}',
      featured = s['featured'] == true,
      viewCount = _int(s['viewCount']) ?? 0,
      orders = {
        for (final MapEntry(:key, :value) in _map(s['orders']).entries)
          if (value is num) key: value.toInt(),
      },
      ratingAvg = (_map(s['rating'])['avg'] as num?)?.toDouble() ?? 0,
      ratingCount = _int(_map(s['rating'])['count']) ?? 0,
      imageIds = [
        for (final i in (s['images'] as List? ?? const []))
          if (i is Map) '${i['id']}',
      ],
      packages = [
        for (final p in (s['packages'] as List? ?? const []))
          if (p is Map)
            (
              tier: '${p['tier'] ?? 'BASIC'}',
              price: '${p['price'] ?? '0'}',
              currency: '${p['currency'] ?? 'IRT'}',
              deliveryDays: _int(p['deliveryDays']) ?? 1,
            ),
      ];

  /// The whole record, for the editor.
  final Map<String, Object?> raw;
  final String id;
  final String code;
  final String title;
  final String moderationStatus;
  final String? reviewNote;

  /// ACTIVE or PAUSED.
  final String state;
  final bool featured;
  final int viewCount;
  final Map<String, int> orders;
  final double ratingAvg;
  final int ratingCount;
  final List<String> imageIds;
  final List<({String tier, String price, String currency, int deliveryDays})>
  packages;

  bool get live => moderationStatus == 'APPROVED';

  /// Everything but a service waiting on its review can be changed.
  bool get editable => moderationStatus != 'PENDING_REVIEW';

  bool get submittable =>
      moderationStatus == 'DRAFT' || moderationStatus == 'CHANGES_REQUESTED';
}

final ownServicesProvider = FutureProvider.autoDispose<List<OwnService>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/work/me/services',
        parse: (d) => [
          for (final s in (d as List? ?? const []))
            if (s is Map<String, Object?>) OwnService.fromJson(s),
        ],
      );
});

/// The seller's own copy of a picture: through the sign-in, since a service
/// still in review has no public pictures.
final ownServiceImageProvider = FutureProvider.autoDispose
    .family<Uint8List?, String>((ref, id) async {
      final file = await ref
          .read(apiClientProvider)
          .download('/work/me/service-images/${Uri.encodeComponent(id)}');
      return file.bytes.isEmpty ? null : Uint8List.fromList(file.bytes);
    });

/// An order, from either side: `GET /work/me/orders?side=`.
class ServiceOrder {
  ServiceOrder.fromJson(Map<String, Object?> o)
    : id = '${o['id']}',
      code = '${o['code'] ?? ''}',
      tier = '${o['tier'] ?? 'BASIC'}',
      packageName = '${o['packageName'] ?? ''}',
      price = '${o['price'] ?? '0'}',
      currency = '${o['currency'] ?? 'IRT'}',
      deliveryDays = _int(o['deliveryDays']) ?? 1,
      revisions = _int(o['revisions']) ?? 0,
      extras = [
        for (final e in (o['extras'] as List? ?? const []))
          if (e is Map)
            (title: '${e['title'] ?? ''}', price: '${e['price'] ?? '0'}'),
      ],
      answers = _strings(o['requirementAnswers']),
      note = _text(o['note']),
      status = '${o['status'] ?? 'REQUESTED'}',
      declineReason = _text(o['declineReason']),
      createdAt = _date(o['createdAt']),
      serviceCode = '${_map(o['service'])['code'] ?? ''}',
      serviceTitle = '${_map(o['service'])['title'] ?? ''}',
      requirements = _strings(_map(o['service'])['requirements']),
      awardId = _text(_map(o['award'])['id']),
      counterparty = _text(_map(o['counterparty'])['username']);

  final String id;
  final String code;
  final String tier;
  final String packageName;
  final String price;
  final String currency;
  final int deliveryDays;
  final int revisions;
  final List<({String title, String price})> extras;
  final List<String> answers;
  final String? note;

  /// REQUESTED, ACCEPTED, DECLINED or CANCELLED.
  final String status;
  final String? declineReason;
  final DateTime? createdAt;
  final String serviceCode;
  final String serviceTitle;
  final List<String> requirements;
  final String? awardId;
  final String? counterparty;
}

final serviceOrdersProvider = FutureProvider.autoDispose
    .family<List<ServiceOrder>, String>((ref, side) async {
      if (ref.watch(_accountProvider) == null) return const [];
      return ref
          .read(apiClientProvider)
          .get(
            '/work/me/orders',
            query: {'side': side},
            parse: (d) => [
              for (final o in (d as List? ?? const []))
                if (o is Map<String, Object?>) ServiceOrder.fromJson(o),
            ],
          );
    });

/// The seller's writes, and the buyer's one (cancelling an order).
final sellerActionsProvider = Provider<SellerActions>(SellerActions.new);

class SellerActions {
  const SellerActions(this._ref);

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  void _servicesChanged() => _ref
    ..invalidate(ownServicesProvider)
    ..invalidate(workspaceProvider);

  /// A new service, or changes to one, with new pictures already made
  /// small: multipart, as the web sends it. Returns its id.
  Future<String> save(
    Map<String, Object?> payload, {
    String? id,
    List<PreparedImage> images = const [],
    void Function(double progress)? onProgress,
  }) async {
    final saved = await _api.upload<String>(
      id == null
          ? '/work/me/services'
          : '/work/me/services/${Uri.encodeComponent(id)}',
      method: id == null ? 'POST' : 'PUT',
      form: () => FormData.fromMap({
        'payload': jsonEncode(payload),
        'images': [
          for (final image in images)
            MultipartFile.fromBytes(
              image.bytes,
              filename: image.name,
              contentType: DioMediaType('image', 'webp'),
            ),
        ],
      }),
      onProgress: onProgress,
      parse: (d) => '${(d! as Map)['id']}',
    );
    _servicesChanged();
    return saved;
  }

  Future<void> submit(String id) async {
    await _api.post<void>(
      '/work/me/services/${Uri.encodeComponent(id)}/submit',
    );
    _servicesChanged();
  }

  Future<void> setActive(String id, {required bool active}) async {
    await _api.patch<void>(
      '/work/me/services/${Uri.encodeComponent(id)}/state',
      body: {'state': active ? 'ACTIVE' : 'PAUSED'},
    );
    _servicesChanged();
  }

  Future<void> delete(String id) async {
    await _api.delete<void>('/work/me/services/${Uri.encodeComponent(id)}');
    _servicesChanged();
  }

  /// accept or cancel; decline with a reason.
  Future<void> order(String orderId, String action, {String? reason}) async {
    await _api.post<void>(
      '/work/me/orders/${Uri.encodeComponent(orderId)}/$action',
      body: reason == null ? null : {'reason': reason.trim()},
    );
    _ref
      ..invalidate(serviceOrdersProvider)
      ..invalidate(workspaceProvider);
  }
}

/// Packages a service can offer, at most one of each tier.
List<ServicePackage> packagesOf(Map<String, Object?> raw) => [
  for (final p in (raw['packages'] as List? ?? const []))
    if (p is Map)
      (
        tier: '${p['tier'] ?? 'BASIC'}',
        name: '${p['name'] ?? ''}',
        description: '${p['description'] ?? ''}',
        price: '${p['price'] ?? ''}',
        currency: '${p['currency'] ?? 'IRT'}',
        deliveryDays: _int(p['deliveryDays']) ?? 1,
        revisions: _int(p['revisions']) ?? 0,
        features: _strings(p['features']),
      ),
];
