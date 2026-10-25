import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../core/links.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../browse/browse.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../profile/profile_data.dart';
import 'book_data.dart';
import 'book_ui.dart';

/// The book market, as the web's BookshopPage: one tile per book, for the
/// whole market (/books) and each shelf's page (/books/shelf/:slug).
class BookBoardScreen extends ConsumerWidget {
  const BookBoardScreen({this.shelfSlug, this.initial = const {}, super.key});

  final String? shelfSlug;

  /// A link's own search (a tag on a book's page is `/books?q=tag`).
  final Map<String, String> initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final language = ref.watch(l10nProvider).language;
    final categories = ref.watch(bookCategoriesProvider);
    final all = categories.value ?? const <BookCategory>[];
    final shelf = shelfSlug == null
        ? null
        : all.where((c) => c.slug == shelfSlug).firstOrNull;
    if (shelfSlug != null && shelf == null) {
      return Scaffold(
        appBar: AppBar(title: Text(b.title)),
        body: categories.hasValue
            ? EmptyNote(
                message: s.errors.notFoundBody,
                action: (b.title, () => context.go('/books')),
              )
            : AsyncView(
                value: categories,
                onRetry: () => ref.invalidate(bookCategoriesProvider),
                data: (_) => const SizedBox.shrink(),
              ),
      );
    }
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final w = s.work;
    final parents = all.where((c) => c.parentId == null).toList();

    return BrowseScreen(
      key: ValueKey(shelf?.id),
      title: shelf?.label(language) ?? b.title,
      subtitle: b.subtitle,
      path: '/bookshop/board',
      searchHint: b.searchPlaceholder,
      helpId: 'books',
      countText: b.booksCount,
      emptyText: b.emptyBoard,
      tiles: true,
      initial: initial,
      fixed: {'categoryId': ?shelf?.id},
      actions: [
        IconButton(
          tooltip: b.sellBook,
          icon: const Icon(Icons.add_circle_outline_rounded),
          onPressed: () => context.push('/dashboard/books/sell'),
        ),
      ],
      header: [
        if (parents.isNotEmpty)
          ActionChip(
            avatar: const Icon(Icons.shelves, size: 18),
            label: Text(shelf?.label(language) ?? b.allShelves),
            onPressed: () async {
              final picked = await pickFromList(
                context,
                title: b.shelves,
                all: b.allShelves,
                searchable: parents.length > 8,
                options: [
                  for (final p in parents)
                    (
                      p.slug,
                      p.bookCount > 0
                          ? '${p.label(language)} (${localDigits(p.bookCount, language)})'
                          : p.label(language),
                    ),
                ],
              );
              if (picked == null || !context.mounted) return;
              context.go(picked.isEmpty ? '/books' : '/books/shelf/$picked');
            },
          ),
      ],
      sorts: [
        ('newest', b.sortNewest),
        ('priceAsc', b.sortPriceAsc),
        ('priceDesc', b.sortPriceDesc),
        ('discount', b.sortDiscount),
        ('mostOffers', b.sortMostOffers),
        ('popular', b.sortPopular),
        ('title', b.sortTitle),
      ],
      filters: (_) => [
        if (shelf == null)
          PickerFilter(
            b.shelves,
            'categoryId',
            shelfOptions(all, language, counts: true),
            all: b.allShelves,
          ),
        ChoiceFilter(b.conditionAtLeast, 'grade', [
          for (final g in bookGrades) (g, b.grades.label(g)),
        ], all: b.anyCondition),
        MoneyRangeFilter(
          b.price,
          minKey: 'priceMin',
          maxKey: 'priceMax',
          minLabel: w.budgetMinLabel,
          maxLabel: w.budgetMaxLabel,
        ),
        ChoiceFilter(b.language, 'language', [
          for (final code in bookLanguages) (code, geo.language(code)),
        ], all: s.list.allOption),
        ChoiceFilter(b.binding, 'binding', [
          for (final v in bookBindings) (v, b.bindings.label(v)),
        ], all: s.list.allOption),
        ChoiceFilter(b.trimSize, 'trimSize', [
          for (final v in bookTrimSizes) (v, b.trimSizes.label(v)),
        ], all: s.list.allOption),
        ChoiceFilter(b.deliveryMethod, 'delivery', [
          for (final v in bookDelivery) (v, b.delivery.label(v)),
        ], all: s.list.allOption),
        PickerFilter(b.province, 'province', [
          for (final p in iranProvinces) (p.fa, provinceLabel(p, language)),
        ], all: s.jobs.allProvinces),
        TextFilter(b.author, 'author'),
        TextFilter(b.translator, 'translator'),
        TextFilter(b.publisher, 'publisher'),
        NumberRangeFilter(
          b.yearFrom,
          minKey: 'yearFrom',
          maxKey: 'yearTo',
          minLabel: b.yearFrom,
          maxLabel: b.yearTo,
        ),
        SwitchFilter(b.onlyDiscounted, 'discounted'),
        SwitchFilter(b.onlyTranslated, 'translated'),
        SwitchFilter(b.onlyFreeShipping, 'freeShipping'),
      ],
      itemBuilder: (context, row) => BookTile(BookCard.fromJson(row)),
    );
  }
}

/// One book, as the web's BookPage: the cover and the people, the price,
/// the details, the description and shelves, then every copy for sale,
/// cheapest first, with a request to buy; other editions and more books
/// close it.
class BookScreen extends ConsumerWidget {
  const BookScreen({required this.code, super.key});

  final String code;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final book = ref.watch(bookProvider(code));
    return Scaffold(
      appBar: AppBar(
        title: Text(s.bookshop.title),
        actions: [
          IconButton(
            tooltip: s.work.share,
            icon: const Icon(Icons.link_rounded),
            onPressed: () async {
              final url = AppConfig.website(
                '/books/$code',
                ref.read(l10nProvider).language,
              ).toString();
              await Clipboard.setData(ClipboardData(text: url));
              if (context.mounted) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text(s.work.linkCopied)));
              }
            },
          ),
          const HelpAction('books'),
        ],
      ),
      body: book.hasError && ApiException.from(book.error!).status == 404
          ? EmptyNote(
              message: s.books.notFound,
              action: (s.bookshop.title, () => context.go('/books')),
            )
          : AsyncView(
              value: book,
              onRetry: () => ref.invalidate(bookProvider(code)),
              data: _Body.new,
            ),
    );
  }
}

class _Body extends ConsumerStatefulWidget {
  const _Body(this.book);

  final BookDetail book;

  @override
  ConsumerState<_Body> createState() => _BodyState();
}

class _BodyState extends ConsumerState<_Body> {
  final _copies = GlobalKey();

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final book = widget.book;
    String n(int v) => localDigits(v, language);

    final details = <(String, String)>[
      if (book.publisher case final p?) (b.publisher, p),
      if (book.publishYear case final y?)
        (
          b.publishYear,
          '${yearText(y, language)} (${b.calendars.label(book.yearCalendar)})',
        ),
      if (book.edition case final e?)
        (b.edition, b.editionNth.fill({'n': n(e)})),
      if (book.printRun case final r?)
        (
          b.printRun,
          b.copiesPrinted.fill({'n': groupedNumber('$r', language)}),
        ),
      if (book.pageCount case final p?) (b.pages, n(p)),
      (b.language, geo.language(book.language)),
      if (book.originalTitle case final o?)
        (
          b.original,
          book.originalLanguage == null
              ? o
              : '$o (${geo.language(book.originalLanguage!)})',
        ),
      if (book.binding case final v?) (b.binding, b.bindings.label(v)),
      if (book.trimSize case final v?) (b.trimSize, b.trimSizes.label(v)),
      if (book.series case final v?)
        (
          b.series,
          book.seriesNumber == null
              ? v
              : '$v — ${b.seriesNumber.fill({'n': n(book.seriesNumber!)})}',
        ),
      if (book.weightGrams case final v?) (b.weight, b.grams.fill({'n': n(v)})),
      if (bookMoney(book.listPrice, book.currency, s, language) case final v?)
        (b.listPrice, v),
      if (book.isbn case final v?) (b.isbn, v),
    ];

    return RefreshIndicator(
      color: c.primary,
      onRefresh: () => ref.refresh(bookProvider(book.code).future),
      // Built whole: the "copies for sale" key scrolls to a section that a
      // lazy list would not have built yet.
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
            if (book.category case final cat?)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton.icon(
                  icon: const Icon(Icons.shelves, size: 18),
                  label: Text(shelfName(cat, language)),
                  onPressed: () => context.push('/books/shelf/${cat['slug']}'),
                ),
              ),
            Center(
              child: SizedBox(
                width: 180,
                child: BookCover(url: book.coverUrl, title: book.title),
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 6,
              children: [
                Text(
                  book.title,
                  style: text.headlineSmall,
                  textDirection: textDirectionOf(
                    book.title,
                    Directionality.of(context),
                  ),
                ),
                if (book.subtitle case final sub?)
                  Text(sub, style: text.titleMedium?.copyWith(color: c.ink2)),
                if (book.authors.isNotEmpty)
                  Text(
                    b.by.fill({'names': namesText(book.authors, language)}),
                    style: text.bodyLarge?.copyWith(color: c.ink2),
                  ),
                if (book.translators.isNotEmpty)
                  Text(
                    b.translatedBy.fill({
                      'names': namesText(book.translators, language),
                    }),
                    style: text.bodyMedium?.copyWith(color: c.ink2),
                  ),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    if (book.verified) StatusPill(b.verifiedBook, tone: 0),
                    if (book.binding case final v?)
                      StatusPill(b.bindings.label(v), tone: 4),
                    if (book.trimSize case final v?)
                      StatusPill(b.trimSizes.label(v), tone: 4),
                    Text(
                      b.views.fill({'n': n(book.viewCount)}),
                      style: text.bodySmall?.copyWith(color: c.ink2),
                    ),
                  ],
                ),
              ],
            ),
            SoftSurface(
              padding: const EdgeInsets.all(16),
              child: book.lowestPrice == null
                  ? Text(b.noCopies, style: text.bodyMedium)
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      spacing: 6,
                      children: [
                        Text(
                          b.lowestPrice,
                          style: text.bodySmall?.copyWith(color: c.ink2),
                        ),
                        BookPriceLine(
                          price: book.lowestPrice,
                          listPrice: book.listPrice,
                          currency: book.currency,
                          discountPercent: book.discountPercent,
                          large: true,
                        ),
                        Text(
                          b.offersCount.fill({'count': n(book.offers.length)}),
                          style: text.bodyMedium?.copyWith(color: c.ink2),
                        ),
                        const SizedBox(height: 4),
                        BaghKey(
                          label: b.copiesForSale,
                          icon: Icons.shopping_bag_outlined,
                          expand: true,
                          onPressed: () {
                            final target = _copies.currentContext;
                            if (target != null) {
                              Scrollable.ensureVisible(
                                target,
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeOutCubic,
                              );
                            }
                          },
                        ),
                      ],
                    ),
            ),
            if (book.description case final d?)
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 6,
                children: [
                  Text(b.description, style: text.titleSmall),
                  Text(
                    d,
                    style: text.bodyMedium?.copyWith(color: c.ink2),
                    textDirection: textDirectionOf(
                      d,
                      Directionality.of(context),
                    ),
                  ),
                ],
              ),
            if (book.category != null || book.tags.isNotEmpty)
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 8,
                children: [
                  Text(b.shelvesTitle, style: text.titleSmall),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      if (book.category case final cat?)
                        ActionChip(
                          label: Text(shelfName(cat, language)),
                          onPressed: () =>
                              context.push('/books/shelf/${cat['slug']}'),
                        ),
                      for (final tag in book.tags)
                        ActionChip(
                          label: Text(tag),
                          onPressed: () => context.push(
                            Uri(
                              path: '/books',
                              queryParameters: {'q': tag},
                            ).toString(),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            SoftSurface(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(b.details, style: text.titleSmall),
                  const SizedBox(height: 6),
                  for (final (i, (label, value)) in details.indexed) ...[
                    if (i > 0) Divider(height: 1, color: c.edge),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        spacing: 12,
                        runSpacing: 2,
                        children: [
                          Text(
                            label,
                            style: text.bodyMedium?.copyWith(color: c.ink2),
                          ),
                          Text(
                            value,
                            style: text.bodyMedium,
                            textDirection: label == b.isbn
                                ? TextDirection.ltr
                                : null,
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Column(
              key: _copies,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 10,
              children: [
                Text(b.copiesForSale, style: text.titleLarge),
                Text(
                  b.copiesForSaleHint,
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
                if (book.offers.isEmpty)
                  Text(b.noCopies, style: text.bodyMedium)
                else
                  for (final offer in book.offers) _OfferCard(offer, book),
              ],
            ),
            if (book.editions.isNotEmpty)
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 10,
                children: [
                  Text(b.otherEditions, style: text.titleMedium),
                  for (final e in book.editions) _EditionRow(e),
                ],
              ),
            if (book.authors.isNotEmpty)
              BookStrip(
                title: b.moreByAuthor.fill({'name': book.authors.first}),
                books: book.moreByAuthor,
              ),
            BookStrip(title: b.similarBooks, books: book.similar),
          ],
        ),
      ),
    );
  }
}

class _EditionRow extends ConsumerWidget {
  const _EditionRow(this.e);

  final BookEdition e;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final facts = [
      if (e.publishYear case final y?) yearText(y, language),
      if (e.edition case final x?)
        b.editionNth.fill({'n': localDigits(x, language)}),
      if (e.binding case final v?) b.bindings.label(v),
      if (e.trimSize case final v?) b.trimSizes.label(v),
    ];
    return SoftSurface(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(BaghRadius.card),
        onTap: () => context.push('/books/${e.code}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 4,
            children: [
              Text(e.publisher ?? e.title, style: text.titleSmall),
              if (e.translators.isNotEmpty)
                Text(
                  b.translatedBy.fill({
                    'names': namesText(e.translators, language),
                  }),
                  style: small,
                ),
              if (facts.isNotEmpty)
                Text(facts.join(factSep(language)), style: small),
              Text(
                switch (bookMoney(e.lowestPrice, 'IRT', s, language)) {
                  final p? =>
                    '${b.from} $p${factSep(language)}${b.offersCount.fill({'count': localDigits(e.offerCount, language)})}',
                  null => b.noCopies,
                },
                style: text.bodyMedium?.copyWith(
                  fontWeight: e.lowestPrice == null ? null : FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One copy for sale: its photos, condition, seller and delivery, the
/// price and the request to buy.
class _OfferCard extends ConsumerStatefulWidget {
  const _OfferCard(this.offer, this.book);

  final BookOffer offer;
  final BookDetail book;

  @override
  ConsumerState<_OfferCard> createState() => _OfferCardState();
}

class _OfferCardState extends ConsumerState<_OfferCard> {
  int _photo = 0;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final o = widget.offer;
    final book = widget.book;
    final mine = ref.watch(ownProfileProvider).value?.username;
    final own = o.seller != null && mine == o.seller!.username;
    String n(int v) => localDigits(v, language);
    final list = BigInt.tryParse(book.listPrice ?? '');
    final price = BigInt.tryParse(o.price);
    final discount =
        list != null && list > BigInt.zero && price != null && price < list
        ? ((list - price) * BigInt.from(100) ~/ list).toInt()
        : 0;
    final shipping = o.shippingCost == null
        ? b.shippingAsk
        : o.shippingCost == '0'
        ? b.shippingFree
        : bookMoney(o.shippingCost, o.currency, s, language) ?? b.shippingAsk;
    final place = placeText(o.city, o.province, language);

    return SoftSurface(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              SizedBox(
                width: 88,
                child: Column(
                  spacing: 6,
                  children: [
                    if (o.photoIds.isEmpty)
                      BookCover(
                        url: book.coverUrl,
                        title: book.title,
                        small: true,
                      )
                    else
                      AspectRatio(
                        aspectRatio: 3 / 4,
                        child: RemoteImage(
                          url: apiAsset(bookPhotoPath(o.photoIds[_photo])),
                          radius: BaghRadius.tile / 2,
                          tint: 4,
                          semanticLabel: '${b.photos} ${n(_photo + 1)}',
                        ),
                      ),
                    if (o.photoIds.length > 1)
                      Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: [
                          for (final (i, id) in o.photoIds.indexed)
                            Semantics(
                              button: true,
                              selected: i == _photo,
                              label: '${b.photos} ${n(i + 1)}',
                              child: GestureDetector(
                                onTap: () => setState(() => _photo = i),
                                child: Container(
                                  width: 26,
                                  height: 26,
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: i == _photo ? c.primary : c.edge,
                                      width: i == _photo ? 2 : 1,
                                    ),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: RemoteImage(
                                    url: apiAsset(bookPhotoPath(id)),
                                    radius: 3,
                                    tint: 4,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 6,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        GradePill(o.grade),
                        if (o.negotiable) StatusPill(b.negotiable, tone: 2),
                      ],
                    ),
                    Text(b.gradeHints.label(o.grade), style: small),
                    if (o.quantity > 1 || o.soldCount > 0)
                      Text(
                        [
                          if (o.quantity > 1)
                            b.quantityLeft.fill({'n': n(o.quantity)}),
                          if (o.soldCount > 0)
                            b.sold.fill({'n': n(o.soldCount)}),
                        ].join(factSep(language)),
                        style: small,
                      ),
                  ],
                ),
              ),
            ],
          ),
          if (o.conditionNotes case final notes?)
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: '${b.sellerNotes}: ',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  TextSpan(text: notes),
                ],
              ),
              style: text.bodyMedium,
            ),
          Wrap(
            spacing: 14,
            runSpacing: 4,
            children: [
              if (place.isNotEmpty) _Fact(Icons.place_outlined, place),
              _Fact(
                Icons.inventory_2_outlined,
                [
                  for (final d in o.deliveryOptions) b.delivery.label(d),
                ].join('، '),
              ),
              if (o.ships)
                _Fact(
                  Icons.local_shipping_outlined,
                  '${b.shipping}: $shipping',
                ),
            ],
          ),
          Divider(height: 1, color: c.edge),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (o.postedByCompany)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: 4,
                  children: [
                    Icon(
                      Icons.verified_user_outlined,
                      size: 18,
                      color: c.primary,
                    ),
                    Flexible(
                      child: Text(b.companySeller, style: text.titleSmall),
                    ),
                  ],
                )
              else if (o.seller case final seller?) ...[
                InkWell(
                  onTap: () => context.push('/profiles/${seller.username}'),
                  child: Text(
                    '@${seller.username}',
                    textDirection: TextDirection.ltr,
                    style: text.titleSmall,
                  ),
                ),
                if (seller.verified)
                  Icon(
                    Icons.verified_user_outlined,
                    size: 18,
                    color: c.primary,
                    semanticLabel: s.market.verifiedBadge,
                  ),
                if (seller.ratingCount > 0)
                  Text(
                    '★ ${localDecimal(seller.ratingAvg, 1, language)} (${n(seller.ratingCount)})',
                    style: small,
                  ),
              ],
              Text(
                o.sellerSales > 0
                    ? b.sales.fill({'n': n(o.sellerSales)})
                    : b.noSalesYet,
                style: small,
              ),
            ],
          ),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    bookMoney(o.price, o.currency, s, language) ?? '',
                    style: text.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (discount > 0)
                    Text(
                      b.discountOff.fill({'percent': n(discount)}),
                      style: small?.copyWith(
                        color: c.tints[3].ink,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
              if (own)
                StatusPill(b.yourCopy, tone: 4)
              else
                BaghKey(
                  label: b.requestToBuy,
                  icon: Icons.shopping_bag_outlined,
                  onPressed: () => showBaghSheet<void>(
                    context,
                    isScrollControlled: true,
                    useSafeArea: true,
                    builder: (_) => _RequestSheet(offer: o, book: book),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact(this.icon, this.words);

  final IconData icon;
  final String words;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      spacing: 4,
      children: [
        Icon(icon, size: 15, color: c.ink2),
        Flexible(
          child: Text(words, style: text.bodySmall?.copyWith(color: c.ink2)),
        ),
      ],
    );
  }
}

/// Asking to buy one copy, as the web's RequestModal: how many, how it
/// reaches the buyer, a price of their own when the seller will talk, a
/// note, and the total.
class _RequestSheet extends ConsumerStatefulWidget {
  const _RequestSheet({required this.offer, required this.book});

  final BookOffer offer;
  final BookDetail book;

  @override
  ConsumerState<_RequestSheet> createState() => _RequestSheetState();
}

class _RequestSheetState extends ConsumerState<_RequestSheet> {
  int _quantity = 1;
  late String _delivery =
      widget.offer.deliveryOptions.firstOrNull ?? 'IN_PERSON';
  String _offered = '';
  String _note = '';
  bool _sending = false;
  String? _error;

  Future<void> _send() async {
    final s = ref.read(stringsProvider);
    final o = widget.offer;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(bookActionsProvider)
          .request(
            o.id,
            quantity: _quantity,
            deliveryMethod: _delivery,
            offeredPrice: o.negotiable && plainDigits(_offered).isNotEmpty
                ? plainDigits(_offered)
                : null,
            note: _note.trim().isEmpty ? null : _note.trim(),
          );
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      final router = GoRouter.of(context);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.bookshop.requestSent)));
      Navigator.of(context).pop();
      unawaited(router.push('/dashboard/book-purchases'));
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final o = widget.offer;
    final book = widget.book;
    final signedIn = ref.watch(sessionProvider).value != null;
    final offered = plainDigits(_offered);
    final unit =
        BigInt.tryParse(offered.isEmpty ? o.price : offered) ?? BigInt.zero;
    final shipping = _delivery == 'IN_PERSON'
        ? BigInt.zero
        : BigInt.tryParse(o.shippingCost ?? '') ?? BigInt.zero;
    final total = unit * BigInt.from(_quantity) + shipping;
    String n(int v) => localDigits(v, language);

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 14,
          children: [
            Text(b.requestTitle, style: text.titleLarge),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 12,
              children: [
                SizedBox(
                  width: 56,
                  child: o.photoIds.isEmpty
                      ? BookCover(
                          url: book.coverUrl,
                          title: book.title,
                          small: true,
                        )
                      : AspectRatio(
                          aspectRatio: 2 / 3,
                          child: RemoteImage(
                            url: apiAsset(bookPhotoPath(o.photoIds.first)),
                            radius: BaghRadius.tile / 2,
                            tint: 4,
                          ),
                        ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 4,
                    children: [
                      Text(book.title, style: text.titleSmall),
                      if (book.authors.isNotEmpty)
                        Text(
                          namesText(book.authors, language),
                          style: text.bodySmall?.copyWith(color: c.ink2),
                        ),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          GradePill(o.grade),
                          Text(
                            bookMoney(o.price, o.currency, s, language) ?? '',
                            style: text.titleSmall,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (!signedIn)
              BaghKey(
                label: b.signInToBuy,
                expand: true,
                onPressed: () {
                  Navigator.of(context).pop();
                  context.push(
                    Uri(
                      path: '/login',
                      queryParameters: {'from': '/books/${book.code}'},
                    ).toString(),
                  );
                },
              )
            else ...[
              Text(
                b.requestIntro,
                style: text.bodySmall?.copyWith(color: c.ink2),
              ),
              if (o.quantity > 1)
                Row(
                  children: [
                    Expanded(child: Text(b.quantity, style: text.titleSmall)),
                    IconButton.outlined(
                      tooltip: '−',
                      icon: const Icon(Icons.remove_rounded),
                      onPressed: _quantity > 1
                          ? () => setState(() => _quantity--)
                          : null,
                    ),
                    SizedBox(
                      width: 44,
                      child: Text(
                        n(_quantity),
                        textAlign: TextAlign.center,
                        style: text.titleMedium,
                      ),
                    ),
                    IconButton.outlined(
                      tooltip: '+',
                      icon: const Icon(Icons.add_rounded),
                      onPressed: _quantity < o.quantity
                          ? () => setState(() => _quantity++)
                          : null,
                    ),
                  ],
                ),
              Text(b.chooseDelivery, style: text.titleSmall),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final d in o.deliveryOptions)
                    ChoiceChip(
                      label: Text(b.delivery.label(d)),
                      selected: _delivery == d,
                      onSelected: (_) => setState(() => _delivery = d),
                    ),
                ],
              ),
              if (o.negotiable)
                TextField(
                  keyboardType: TextInputType.number,
                  textDirection: TextDirection.ltr,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]')),
                    const ThousandsFormatter(),
                  ],
                  onChanged: (v) => setState(() => _offered = v),
                  decoration: InputDecoration(
                    labelText: b.yourPrice,
                    helperText: b.yourPriceHint,
                    helperMaxLines: 3,
                  ),
                ),
              TextField(
                minLines: 2,
                maxLines: 5,
                maxLength: 1000,
                onChanged: (v) => _note = v,
                decoration: InputDecoration(
                  labelText: b.noteToSeller,
                  alignLabelWithHint: true,
                  counterText: '',
                ),
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: c.fill,
                  borderRadius: BorderRadius.circular(BaghRadius.tile),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 6,
                  children: [
                    if (_delivery != 'IN_PERSON')
                      _SumRow(
                        b.shipping,
                        o.shippingCost == null
                            ? b.shippingAsk
                            : shipping == BigInt.zero
                            ? b.shippingFree
                            : bookMoney('$shipping', o.currency, s, language) ??
                                  '',
                      ),
                    _SumRow(
                      b.total,
                      bookMoney('$total', o.currency, s, language) ?? '',
                      strong: true,
                    ),
                  ],
                ),
              ),
              if (_error case final e?) FormMessage(e),
              BaghKey(
                label: b.sendRequest,
                icon: Icons.send_rounded,
                loading: _sending,
                expand: true,
                onPressed: _send,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SumRow extends StatelessWidget {
  const _SumRow(this.label, this.value, {this.strong = false});

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final style = strong
        ? text.titleSmall?.copyWith(fontWeight: FontWeight.w700)
        : text.bodyMedium;
    return Wrap(
      alignment: WrapAlignment.spaceBetween,
      spacing: 12,
      children: [
        Text(label, style: style),
        Text(value, style: style),
      ],
    );
  }
}
