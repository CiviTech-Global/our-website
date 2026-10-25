import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/files.dart';
import '../../core/format.dart';
import '../me/workspace_data.dart';

/// The book market, as the web's api/bookshop and types/bookshop read it:
/// one page per book, many copies for sale on it, and requests to buy a
/// copy that the seller answers.

int? _int(Object? v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}');

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

Map<String, Object?> _map(Object? v) =>
    v is Map<String, Object?> ? v : const {};

List<String> _strings(Object? v) =>
    v is List ? v.whereType<String>().toList() : const [];

const bookGrades = ['NEW', 'LIKE_NEW', 'VERY_GOOD', 'GOOD', 'ACCEPTABLE'];
const bookBindings = [
  'PAPERBACK',
  'HARDCOVER',
  'SPIRAL',
  'BOARD',
  'LEATHER',
  'OTHER',
];
const bookTrimSizes = [
  'POCKET',
  'PALTOI',
  'ROGHEI',
  'VAZIRI',
  'KHESHTI',
  'RAHLI',
  'OTHER',
];
const bookDelivery = ['IN_PERSON', 'POST', 'COURIER'];
const bookLanguages = ['fa', 'en', 'ar', 'fr', 'de', 'tr', 'ru', 'es'];

/// The languages a translated book is most often translated from.
const bookOriginalLanguages = [
  'en',
  'fr',
  'de',
  'ru',
  'es',
  'it',
  'ar',
  'tr',
  'ja',
  'he',
  'zh',
];

/// A copy's photo: public once the copy is live, the seller's own through
/// the sign-in until then.
String bookPhotoPath(String id, {bool own = false}) => own
    ? '/bookshop/me/photos/${Uri.encodeComponent(id)}'
    : '/bookshop/photos/${Uri.encodeComponent(id)}';

/// A shelf: `GET /bookshop/categories`.
class BookCategory {
  BookCategory.fromJson(Map<String, Object?> c)
    : id = '${c['id']}',
      slug = '${c['slug'] ?? ''}',
      name = '${c['name'] ?? ''}',
      nameEn = '${c['nameEn'] ?? ''}',
      parentId = _text(c['parentId']),
      bookCount = _int(c['bookCount']) ?? 0;

  final String id;
  final String slug;
  final String name;
  final String nameEn;
  final String? parentId;
  final int bookCount;

  String label(String language) =>
      language == 'fa' || nameEn.isEmpty ? name : nameEn;
}

/// A shelf name from a book's own `category`.
String shelfName(Map<String, Object?> category, String language) {
  final en = '${category['nameEn'] ?? ''}';
  return language == 'fa' || en.isEmpty ? '${category['name'] ?? ''}' : en;
}

final bookCategoriesProvider = FutureProvider<List<BookCategory>>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/bookshop/categories',
        parse: (d) => [
          for (final c in (d as List? ?? const []))
            if (c is Map<String, Object?>) BookCategory.fromJson(c),
        ],
      ),
);

/// Shelves for a picker: each parent, then its children indented under it.
/// Choosing a parent matches its children, as on the web.
List<(String, String)> shelfOptions(
  List<BookCategory> all,
  String language, {
  bool counts = false,
}) {
  String label(BookCategory c) => counts && c.bookCount > 0
      ? '${c.label(language)} (${localDigits(c.bookCount, language)})'
      : c.label(language);
  return [
    for (final parent in all.where((c) => c.parentId == null)) ...[
      (parent.id, label(parent)),
      for (final child in all.where((c) => c.parentId == parent.id))
        (child.id, '    ${label(child)}'),
    ],
  ];
}

/// What every book row says about the book itself.
class BookFacts {
  BookFacts.fromJson(Map<String, Object?> b)
    : id = '${b['id']}',
      code = '${b['code'] ?? ''}',
      title = '${b['title'] ?? ''}',
      subtitle = _text(b['subtitle']),
      authors = _strings(b['authors']),
      translators = _strings(b['translators']),
      publisher = _text(b['publisher']),
      isbn = _text(b['isbn']),
      publishYear = _int(b['publishYear']),
      yearCalendar = '${b['yearCalendar'] ?? 'SOLAR'}',
      edition = _int(b['edition']),
      pageCount = _int(b['pageCount']),
      language = '${b['language'] ?? 'fa'}',
      binding = _text(b['binding']),
      trimSize = _text(b['trimSize']),
      listPrice = _text(b['listPrice']),
      currency = '${b['currency'] ?? 'IRT'}',
      verified = b['verified'] == true,
      coverUrl = _text(b['coverUrl']);

  final String id;
  final String code;
  final String title;
  final String? subtitle;
  final List<String> authors;
  final List<String> translators;
  final String? publisher;
  final String? isbn;
  final int? publishYear;
  final String yearCalendar;
  final int? edition;
  final int? pageCount;
  final String language;
  final String? binding;
  final String? trimSize;
  final String? listPrice;
  final String currency;
  final bool verified;
  final String? coverUrl;
}

/// One tile on the board: the book, summed up from every copy for sale.
class BookCard extends BookFacts {
  BookCard.fromJson(super.b)
    : lowestPrice = _text(b['lowestPrice']),
      offerCount = _int(b['offerCount']) ?? 0,
      bestGrade = _text(b['bestGrade']),
      discountPercent = _int(b['discountPercent']) ?? 0,
      featured = b['featured'] == true,
      freeShipping = b['freeShipping'] == true,
      super.fromJson();

  final String? lowestPrice;
  final int offerCount;
  final String? bestGrade;
  final int discountPercent;
  final bool featured;
  final bool freeShipping;
}

/// A seller as a copy names them.
typedef BookSeller = ({
  String username,
  bool verified,
  double ratingAvg,
  int ratingCount,
});

BookSeller? _seller(Object? v) {
  final m = _map(v);
  final name = _text(m['username']);
  if (name == null) return null;
  return (
    username: name,
    verified: m['verified'] == true,
    ratingAvg: (m['ratingAvg'] as num?)?.toDouble() ?? 0,
    ratingCount: _int(m['ratingCount']) ?? 0,
  );
}

List<String> _photoIds(Object? v) => [
  for (final p in (v as List? ?? const []))
    if (p is Map) '${p['id']}',
];

/// One copy for sale, on the book's page.
class BookOffer {
  BookOffer.fromJson(Map<String, Object?> o)
    : id = '${o['id']}',
      code = '${o['code'] ?? ''}',
      grade = '${o['grade'] ?? 'GOOD'}',
      conditionNotes = _text(o['conditionNotes']),
      price = '${o['price'] ?? '0'}',
      currency = '${o['currency'] ?? 'IRT'}',
      negotiable = o['negotiable'] == true,
      quantity = _int(o['quantity']) ?? 1,
      soldCount = _int(o['soldCount']) ?? 0,
      deliveryOptions = _strings(o['deliveryOptions']),
      shippingCost = o['shippingCost'] == null ? null : '${o['shippingCost']}',
      province = _text(o['province']),
      city = _text(o['city']),
      postedByCompany = o['postedByCompany'] == true,
      photoIds = _photoIds(o['photos']),
      seller = _seller(o['seller']),
      sellerSales = _int(o['sellerSales']) ?? 0;

  final String id;
  final String code;
  final String grade;
  final String? conditionNotes;
  final String price;
  final String currency;
  final bool negotiable;
  final int quantity;
  final int soldCount;
  final List<String> deliveryOptions;

  /// Null when the seller says to ask; "0" when shipping is free.
  final String? shippingCost;
  final String? province;
  final String? city;
  final bool postedByCompany;
  final List<String> photoIds;
  final BookSeller? seller;
  final int sellerSales;

  bool get ships => deliveryOptions.any((d) => d != 'IN_PERSON');
}

/// A book in a strip ("more by", "similar").
class BookStripItem {
  BookStripItem.fromJson(Map<String, Object?> b)
    : id = '${b['id']}',
      code = '${b['code'] ?? ''}',
      title = '${b['title'] ?? ''}',
      authors = _strings(b['authors']),
      coverUrl = _text(b['coverUrl']),
      lowestPrice = _text(b['lowestPrice']);

  final String id;
  final String code;
  final String title;
  final List<String> authors;
  final String? coverUrl;
  final String? lowestPrice;
}

/// Another edition of the same work.
class BookEdition {
  BookEdition.fromJson(Map<String, Object?> e)
    : code = '${e['code'] ?? ''}',
      title = '${e['title'] ?? ''}',
      publisher = _text(e['publisher']),
      translators = _strings(e['translators']),
      publishYear = _int(e['publishYear']),
      edition = _int(e['edition']),
      binding = _text(e['binding']),
      trimSize = _text(e['trimSize']),
      lowestPrice = _text(e['lowestPrice']),
      offerCount = _int(e['offerCount']) ?? 0;

  final String code;
  final String title;
  final String? publisher;
  final List<String> translators;
  final int? publishYear;
  final int? edition;
  final String? binding;
  final String? trimSize;
  final String? lowestPrice;
  final int offerCount;
}

/// The book's page: `GET /bookshop/books/:code`.
class BookDetail extends BookFacts {
  BookDetail.fromJson(super.b)
    : printRun = _int(b['printRun']),
      originalTitle = _text(b['originalTitle']),
      originalLanguage = _text(b['originalLanguage']),
      series = _text(b['series']),
      seriesNumber = _int(b['seriesNumber']),
      weightGrams = _int(b['weightGrams']),
      description = _text(b['description']),
      tags = _strings(b['tags']),
      viewCount = _int(b['viewCount']) ?? 0,
      category = b['category'] is Map<String, Object?>
          ? b['category']! as Map<String, Object?>
          : null,
      lowestPrice = _text(b['lowestPrice']),
      discountPercent = _int(b['discountPercent']) ?? 0,
      offers = [
        for (final o in (b['offers'] as List? ?? const []))
          if (o is Map<String, Object?>) BookOffer.fromJson(o),
      ],
      editions = [
        for (final e in (b['editions'] as List? ?? const []))
          if (e is Map<String, Object?>) BookEdition.fromJson(e),
      ],
      moreByAuthor = [
        for (final x in (b['moreByAuthor'] as List? ?? const []))
          if (x is Map<String, Object?>) BookStripItem.fromJson(x),
      ],
      similar = [
        for (final x in (b['similar'] as List? ?? const []))
          if (x is Map<String, Object?>) BookStripItem.fromJson(x),
      ],
      super.fromJson();

  final int? printRun;
  final String? originalTitle;
  final String? originalLanguage;
  final String? series;
  final int? seriesNumber;
  final int? weightGrams;
  final String? description;
  final List<String> tags;
  final int viewCount;
  final Map<String, Object?>? category;
  final String? lowestPrice;
  final int discountPercent;
  final List<BookOffer> offers;
  final List<BookEdition> editions;
  final List<BookStripItem> moreByAuthor;
  final List<BookStripItem> similar;
}

final bookProvider = FutureProvider.autoDispose.family<BookDetail, String>(
  (ref, code) => ref
      .read(apiClientProvider)
      .get(
        '/bookshop/books/${Uri.encodeComponent(code)}',
        parse: (d) => BookDetail.fromJson(_map(d)),
      ),
);

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

/// A catalogue hit while selling: `GET /bookshop/me/catalog?q=`.
class CatalogHit extends BookFacts {
  CatalogHit.fromJson(super.b)
    : listings = _int(_map(b['_count'])['listings']) ?? 0,
      super.fromJson();

  final int listings;
}

final catalogSearchProvider = FutureProvider.autoDispose
    .family<List<CatalogHit>, String>((ref, q) async {
      if (q.trim().length < 2) return const [];
      return ref
          .read(apiClientProvider)
          .get(
            '/bookshop/me/catalog',
            query: {'q': q.trim()},
            parse: (d) => [
              for (final h in (d as List? ?? const []))
                if (h is Map<String, Object?>) CatalogHit.fromJson(h),
            ],
          );
    });

/// One of the seller's own copies: `GET /bookshop/me/offers`.
class OwnOffer {
  OwnOffer.fromJson(Map<String, Object?> o)
    : id = '${o['id']}',
      code = '${o['code'] ?? ''}',
      grade = _text(o['grade']),
      conditionNotes = _text(o['conditionNotes']),
      price = '${o['price'] ?? '0'}',
      currency = '${o['currency'] ?? 'IRT'}',
      negotiable = o['negotiable'] == true,
      quantity = _int(o['quantity']) ?? 0,
      soldCount = _int(o['soldCount']) ?? 0,
      deliveryOptions = _strings(o['deliveryOptions']),
      shippingCost = o['shippingCost'] == null ? null : '${o['shippingCost']}',
      province = _text(o['province']),
      city = _text(o['city']),
      moderationStatus = '${o['moderationStatus'] ?? 'DRAFT'}',
      reviewNote = _text(o['reviewNote']),
      state = '${o['state'] ?? 'OPEN'}',
      viewCount = _int(o['viewCount']) ?? 0,
      photoIds = _photoIds(o['photos']),
      book = o['book'] is Map<String, Object?>
          ? BookFacts.fromJson(o['book']! as Map<String, Object?>)
          : null,
      requests = {
        for (final MapEntry(:key, :value) in _map(o['requests']).entries)
          if (value is num) key: value.toInt(),
      };

  final String id;
  final String code;
  final String? grade;
  final String? conditionNotes;
  final String price;
  final String currency;
  final bool negotiable;
  final int quantity;
  final int soldCount;
  final List<String> deliveryOptions;
  final String? shippingCost;
  final String? province;
  final String? city;
  final String moderationStatus;
  final String? reviewNote;
  final String state;
  final int viewCount;
  final List<String> photoIds;
  final BookFacts? book;
  final Map<String, int> requests;

  bool get live => moderationStatus == 'APPROVED';

  /// What the server takes (back) to review: a draft, or a copy sent back
  /// for changes. A rejected copy is final.
  bool get submittable =>
      moderationStatus == 'DRAFT' || moderationStatus == 'CHANGES_REQUESTED';

  bool get ships => deliveryOptions.any((d) => d != 'IN_PERSON');
}

final ownOffersProvider = FutureProvider.autoDispose<List<OwnOffer>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/bookshop/me/offers',
        parse: (d) => [
          for (final o in (d as List? ?? const []))
            if (o is Map<String, Object?>) OwnOffer.fromJson(o),
        ],
      );
});

/// The seller's own photo, through the sign-in.
final ownBookPhotoProvider = FutureProvider.autoDispose
    .family<Uint8List?, String>((ref, id) async {
      final file = await ref
          .read(apiClientProvider)
          .download(bookPhotoPath(id, own: true));
      return file.bytes.isEmpty ? null : Uint8List.fromList(file.bytes);
    });

/// A request to buy, from either side: `GET /bookshop/me/requests?side=`.
class BookRequestRow {
  BookRequestRow.fromJson(Map<String, Object?> r)
    : id = '${r['id']}',
      code = '${r['code'] ?? ''}',
      quantity = _int(r['quantity']) ?? 1,
      deliveryMethod = '${r['deliveryMethod'] ?? 'IN_PERSON'}',
      unitPrice = '${r['unitPrice'] ?? '0'}',
      shippingCost = r['shippingCost'] == null ? null : '${r['shippingCost']}',
      offeredPrice = _text(r['offeredPrice']),
      currency = '${r['currency'] ?? 'IRT'}',
      note = _text(r['note']),
      status = '${r['status'] ?? 'REQUESTED'}',
      declineReason = _text(r['declineReason']),
      createdAt = _date(r['createdAt']),
      total = '${r['total'] ?? '0'}',
      awardId = _text(_map(r['award'])['id']),
      grade = _text(_map(r['listing'])['grade']),
      city = _text(_map(r['listing'])['city']),
      province = _text(_map(r['listing'])['province']),
      bookCode = _text(_map(r['book'])['code']),
      bookTitle = _text(_map(r['book'])['title']),
      bookAuthors = _strings(_map(r['book'])['authors']),
      coverUrl = _text(_map(r['book'])['coverUrl']),
      counterparty = _seller(r['counterparty']),
      unreadMessages = _int(r['unreadMessages']) ?? 0;

  final String id;
  final String code;
  final int quantity;
  final String deliveryMethod;
  final String unitPrice;
  final String? shippingCost;
  final String? offeredPrice;
  final String currency;
  final String? note;

  /// REQUESTED, ACCEPTED, DECLINED, CANCELLED or COMPLETED.
  final String status;
  final String? declineReason;
  final DateTime? createdAt;
  final String total;
  final String? awardId;
  final String? grade;
  final String? city;
  final String? province;
  final String? bookCode;
  final String? bookTitle;
  final List<String> bookAuthors;
  final String? coverUrl;
  final BookSeller? counterparty;
  final int unreadMessages;

  bool get open => status == 'REQUESTED' || status == 'ACCEPTED';
}

final bookRequestsProvider = FutureProvider.autoDispose
    .family<List<BookRequestRow>, String>((ref, side) async {
      if (ref.watch(_accountProvider) == null) return const [];
      return ref
          .read(apiClientProvider)
          .get(
            '/bookshop/me/requests',
            query: {'side': side},
            parse: (d) => [
              for (final r in (d as List? ?? const []))
                if (r is Map<String, Object?>) BookRequestRow.fromJson(r),
            ],
          );
    });

/// Every write in the book market, buyer's and seller's.
final bookActionsProvider = Provider<BookActions>(BookActions.new);

class BookActions {
  const BookActions(this._ref);

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  void _offersChanged() => _ref
    ..invalidate(ownOffersProvider)
    ..invalidate(workspaceProvider);

  void _requestsChanged() => _ref
    ..invalidate(bookRequestsProvider)
    ..invalidate(ownOffersProvider)
    ..invalidate(workspaceProvider);

  /// A request to buy one copy. Returns its id.
  Future<String> request(
    String offerId, {
    required int quantity,
    required String deliveryMethod,
    String? offeredPrice,
    String? note,
  }) async {
    final id = await _api.post<String>(
      '/bookshop/me/offers/${Uri.encodeComponent(offerId)}/requests',
      body: {
        'quantity': quantity,
        'deliveryMethod': deliveryMethod,
        'offeredPrice': ?offeredPrice,
        'note': ?note,
      },
      parse: (d) => '${_map(d)['id']}',
    );
    _requestsChanged();
    return id;
  }

  /// accept, cancel or complete; decline with a reason.
  Future<void> answer(String requestId, String action, {String? reason}) async {
    await _api.post<void>(
      '/bookshop/me/requests/${Uri.encodeComponent(requestId)}/$action',
      body: reason == null ? null : {'reason': reason.trim()},
    );
    _requestsChanged();
  }

  /// A new copy, or changes to one, with new photos already made small:
  /// multipart, as the web sends it. Returns its id.
  Future<String> save(
    Map<String, Object?> payload, {
    String? id,
    List<PreparedImage> photos = const [],
    void Function(double progress)? onProgress,
  }) async {
    final saved = await _api.upload<String>(
      id == null
          ? '/bookshop/me/offers'
          : '/bookshop/me/offers/${Uri.encodeComponent(id)}',
      method: id == null ? 'POST' : 'PUT',
      form: () => FormData.fromMap({
        'payload': jsonEncode(payload),
        'photos': [
          for (final photo in photos)
            MultipartFile.fromBytes(
              photo.bytes,
              filename: photo.name,
              contentType: DioMediaType('image', 'webp'),
            ),
        ],
      }),
      onProgress: onProgress,
      parse: (d) => '${_map(d)['id']}',
    );
    _offersChanged();
    return saved;
  }

  Future<void> submit(String id) async {
    await _api.post<void>(
      '/bookshop/me/offers/${Uri.encodeComponent(id)}/submit',
    );
    _offersChanged();
  }

  Future<void> setOpen(String id, {required bool open}) async {
    await _api.post<void>(
      '/bookshop/me/offers/${Uri.encodeComponent(id)}/state',
      body: {'open': open},
    );
    _offersChanged();
  }

  /// Price, stock and shipping on a live copy, without another review.
  Future<void> quickEdit(
    String id, {
    required String price,
    required int quantity,
    required bool negotiable,
    String? shippingCost,
  }) async {
    await _api.patch<void>(
      '/bookshop/me/offers/${Uri.encodeComponent(id)}/quick',
      body: {
        'price': price,
        'quantity': quantity,
        'negotiable': negotiable,
        'shippingCost': shippingCost,
      },
    );
    _offersChanged();
  }
}
