import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/geo.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/remote_image.dart';
import '../../l10n/l10n.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'book_data.dart';

/// The pieces every book page shares, as the web's BookUi: the cover, the
/// condition pill, the price against the cover price, the tile a book is
/// listed as and a strip of books.

String? bookMoney(String? value, String currency, Strings s, String language) =>
    formatMoneyIn(value, currency, language, s.market.currency);

/// Names in a line, joined as the language joins them.
String namesText(List<String> names, String language) =>
    names.join(language == 'fa' ? '، ' : ', ');

/// A year as a book gives it: never grouped like an amount.
String yearText(int year, String language) => localDigits(year, language);

int gradeTone(String grade) => switch (grade) {
  'NEW' || 'LIKE_NEW' => 0,
  'VERY_GOOD' => 2,
  'ACCEPTABLE' => 1,
  _ => 4,
};

class GradePill extends ConsumerWidget {
  const GradePill(this.grade, {super.key});

  final String grade;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final b = ref.watch(stringsProvider).bookshop;
    return StatusPill(b.grades.label(grade), tone: gradeTone(grade));
  }
}

/// A cover, or a quiet placeholder with the title on it.
class BookCover extends StatelessWidget {
  const BookCover({
    required this.url,
    required this.title,
    this.small = false,
    super.key,
  });

  final String? url;
  final String title;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final radius = small ? BaghRadius.tile / 2 : BaghRadius.tile;
    return AspectRatio(
      aspectRatio: 2 / 3,
      child: url == null
          ? Container(
              decoration: BoxDecoration(
                color: c.fill,
                borderRadius: BorderRadius.circular(radius),
                border: Border.all(color: c.edge.withValues(alpha: 0.5)),
              ),
              padding: const EdgeInsets.all(8),
              alignment: Alignment.center,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                spacing: 6,
                children: [
                  Icon(
                    Icons.menu_book_outlined,
                    size: small ? 20 : 32,
                    color: c.ink2,
                  ),
                  if (!small)
                    Flexible(
                      child: Text(
                        title,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: text.bodySmall?.copyWith(color: c.ink2),
                      ),
                    ),
                ],
              ),
            )
          : RemoteImage(
              url: apiAsset(url),
              radius: radius,
              tint: 4,
              semanticLabel: title,
            ),
    );
  }
}

/// The lowest price, the cover price struck through and the saving.
class BookPriceLine extends ConsumerWidget {
  const BookPriceLine({
    required this.price,
    required this.currency,
    this.listPrice,
    this.discountPercent = 0,
    this.prefix,
    this.large = false,
    super.key,
  });

  final String? price;
  final String? listPrice;
  final String currency;
  final int discountPercent;
  final String? prefix;
  final bool large;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final amount = bookMoney(price, 'IRT', s, language);
    if (amount == null) return const SizedBox.shrink();
    final small = text.bodySmall?.copyWith(color: c.ink2);
    return Wrap(
      spacing: 8,
      runSpacing: 2,
      crossAxisAlignment: WrapCrossAlignment.end,
      children: [
        if (prefix case final p?) Text(p, style: small),
        Text(
          amount,
          style: (large ? text.headlineSmall : text.titleSmall)?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        if (discountPercent > 0 && listPrice != null) ...[
          Text(
            bookMoney(listPrice, currency, s, language) ?? '',
            style: small?.copyWith(decoration: TextDecoration.lineThrough),
          ),
          Text(
            s.bookshop.discountOff.fill({
              'percent': localDigits(discountPercent, language),
            }),
            style: small?.copyWith(
              color: c.tints[3].ink,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ],
    );
  }
}

/// A book on the board, as the web's BookTile: the cover is most of it,
/// then title and author, then the price.
class BookTile extends ConsumerWidget {
  const BookTile(this.book, {super.key});

  final BookCard book;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    return Semantics(
      container: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(BaghRadius.tile),
        onTap: () => context.push('/books/${book.code}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 4,
          children: [
            Stack(
              children: [
                BookCover(url: book.coverUrl, title: book.title),
                PositionedDirectional(
                  top: 6,
                  start: 6,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 4,
                    children: [
                      if (book.discountPercent > 0)
                        _Flag(
                          b.discountOff.fill({
                            'percent': localDigits(
                              book.discountPercent,
                              language,
                            ),
                          }),
                          tone: 3,
                        ),
                      if (book.featured)
                        const _Flag(null, tone: 1, icon: Icons.star_rounded),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              book.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: text.titleSmall,
            ),
            if (book.authors.isNotEmpty)
              Text(
                namesText(book.authors, language),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: small,
              ),
            if (book.translators.isNotEmpty)
              Text(
                b.translatedBy.fill({
                  'names': namesText(book.translators, language),
                }),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: small,
              ),
            BookPriceLine(
              price: book.lowestPrice,
              listPrice: book.listPrice,
              currency: book.currency,
              discountPercent: book.discountPercent,
              prefix: book.offerCount > 1 ? b.from : null,
            ),
            Wrap(
              spacing: 6,
              runSpacing: 2,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  [
                    b.offersCount.fill({
                      'count': localDigits(book.offerCount, language),
                    }),
                    if (book.bestGrade case final g?) b.grades.label(g),
                  ].join(factSep(language)),
                  style: small,
                ),
                if (book.freeShipping)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    spacing: 2,
                    children: [
                      Icon(
                        Icons.local_shipping_outlined,
                        size: 14,
                        color: c.tints[0].ink,
                      ),
                      Text(
                        b.freeShipping,
                        style: small?.copyWith(color: c.tints[0].ink),
                      ),
                    ],
                  ),
                if (book.verified)
                  Icon(
                    Icons.verified_rounded,
                    size: 15,
                    color: c.primary,
                    semanticLabel: b.verifiedBook,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Flag extends StatelessWidget {
  const _Flag(this.label, {required this.tone, this.icon});

  final String? label;
  final int tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final t = BaghColors.of(context).tints[tone];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: t.fill,
        borderRadius: BorderRadius.circular(6),
      ),
      child: label == null
          ? Icon(icon, size: 14, color: t.ink)
          : Text(
              label!,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: t.ink,
                fontWeight: FontWeight.w700,
              ),
            ),
    );
  }
}

/// A row of book links: "more by", "from this shelf".
class BookStrip extends ConsumerWidget {
  const BookStrip({required this.title, required this.books, super.key});

  final String title;
  final List<BookStripItem> books;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (books.isEmpty) return const SizedBox.shrink();
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final scale = MediaQuery.textScalerOf(context).scale(1);
    final width = 112 * scale.clamp(1.0, 1.6);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 10,
      children: [
        Text(title, style: text.titleMedium),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              for (final book in books)
                SizedBox(
                  width: width,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(BaghRadius.tile),
                    onTap: () => context.push('/books/${book.code}'),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      spacing: 4,
                      children: [
                        BookCover(
                          url: book.coverUrl,
                          title: book.title,
                          small: true,
                        ),
                        Text(
                          book.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: text.labelLarge,
                        ),
                        if (book.authors.isNotEmpty)
                          Text(
                            namesText(book.authors, language),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: text.bodySmall?.copyWith(color: c.ink2),
                          ),
                        if (bookMoney(book.lowestPrice, 'IRT', s, language)
                            case final p?)
                          Text(
                            p,
                            style: text.labelMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// A stored province in the reader's language, with the city before it.
String placeText(String? city, String? province, String language) => [
  ?city,
  if (province != null) displayProvince(province, language),
].join('، ');
