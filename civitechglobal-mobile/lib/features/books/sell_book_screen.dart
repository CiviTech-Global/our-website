import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/files.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import 'book_data.dart';
import 'book_ui.dart';

const _maxPhotos = 6;

List<String> _lines(String value) => [
  for (final x in value.split(RegExp('[\n,،]')))
    if (x.trim().isNotEmpty) x.trim(),
];

/// Selling a copy, as the web's SellBookPage. First the book, by ISBN or
/// title, so a copy joins the page the book already has; only a book
/// nobody has listed needs its details typed. Then the copy: its
/// condition, price against the cover price, delivery, and photos of this
/// copy.
class SellBookScreen extends ConsumerWidget {
  const SellBookScreen({this.offerId, super.key});

  final String? offerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    if (offerId == null) return const _SellForm();
    final own = ref.watch(ownOffersProvider);
    return own.hasValue
        ? switch (own.value!.where((o) => o.id == offerId).firstOrNull) {
            final o? when o.submittable => _SellForm(offer: o),
            _ => Scaffold(
              appBar: AppBar(title: Text(s.bookshop.editOfferTitle)),
              body: EmptyNote(message: s.list.noResults),
            ),
          }
        : Scaffold(
            appBar: AppBar(title: Text(s.bookshop.editOfferTitle)),
            body: AsyncView(
              value: own,
              onRetry: () => ref.invalidate(ownOffersProvider),
              data: (_) => const SizedBox.shrink(),
            ),
          );
  }
}

class _SellForm extends ConsumerStatefulWidget {
  const _SellForm({this.offer});

  final OwnOffer? offer;

  @override
  ConsumerState<_SellForm> createState() => _SellFormState();
}

class _SellFormState extends ConsumerState<_SellForm> {
  Timer? _debounce;
  String _query = '';
  String _search = '';
  late BookFacts? _picked = widget.offer?.book;
  bool _newBook = false;

  // The book's details, for one the catalogue does not have.
  String _title = '';
  String _subtitle = '';
  String _authors = '';
  String _translators = '';
  String _publisher = '';
  String _isbn = '';
  String _year = '';
  String _calendar = 'SOLAR';
  String _edition = '';
  String _printRun = '';
  String _pages = '';
  String _language = 'fa';
  String _originalTitle = '';
  String _originalLanguage = '';
  String _binding = '';
  String _trimSize = '';
  String _listPrice = '';
  String _currency = 'IRT';
  String _series = '';
  String _seriesNumber = '';
  String _weight = '';
  String _categoryId = '';
  String _tags = '';
  String _description = '';

  // The copy.
  late String _grade = widget.offer?.grade ?? 'VERY_GOOD';
  late String _notes = widget.offer?.conditionNotes ?? '';
  late String _price = widget.offer?.price ?? '';
  late bool _negotiable = widget.offer?.negotiable ?? false;
  late int _quantity = switch (widget.offer?.quantity) {
    final q? when q > 0 => q,
    _ => 1,
  };
  late List<String> _delivery = switch (widget.offer?.deliveryOptions) {
    final d? when d.isNotEmpty => [...d],
    null => ['IN_PERSON', 'POST'],
    _ => ['IN_PERSON'],
  };
  late String _shipping = widget.offer?.shippingCost ?? '';
  late String _province = widget.offer?.province ?? '';
  late String _city = widget.offer?.city ?? '';
  late final List<String> _kept = [...?widget.offer?.photoIds];
  final List<String> _removed = [];
  List<PreparedImage> _photos = const [];

  late final String _start;
  bool _sending = false;
  bool _shrinking = false;
  double? _progress;
  String? _error;

  @override
  void initState() {
    super.initState();
    _start = _snapshot();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  String _snapshot() =>
      '${_picked?.id}$_newBook${_payload()}${_photos.length}${_removed.length}';

  bool get _bookReady =>
      _picked != null ||
      (_newBook && _title.trim().isNotEmpty && _lines(_authors).isNotEmpty);

  bool get _ships => _delivery.any((d) => d != 'IN_PERSON');

  /// What the form sends, as the web's payload().
  Map<String, Object?> _payload() {
    String? digits(String v) => plainDigits(v).isEmpty ? null : plainDigits(v);
    String? text(String v) => v.trim().isEmpty ? null : v.trim();
    final base = <String, Object?>{
      'grade': _grade,
      'conditionNotes': ?text(_notes),
      'price': plainDigits(_price),
      'negotiable': _negotiable,
      'quantity': _quantity,
      'deliveryOptions': _delivery,
      'shippingCost': ?digits(_shipping),
      'province': ?text(_province),
      'city': ?text(_city),
      'removePhotoIds': _removed,
    };
    if (_picked case final book?) return {...base, 'bookId': book.id};
    return {
      ...base,
      'book': {
        'title': _title.trim(),
        'subtitle': ?text(_subtitle),
        'authors': _lines(_authors),
        'translators': _lines(_translators),
        'publisher': ?text(_publisher),
        'isbn': ?text(_isbn),
        'publishYear': ?digits(_year),
        'yearCalendar': _calendar,
        'edition': ?digits(_edition),
        'printRun': ?digits(_printRun),
        'pageCount': ?digits(_pages),
        'language': _language,
        'originalTitle': ?text(_originalTitle),
        'originalLanguage': ?text(_originalLanguage),
        'series': ?text(_series),
        'seriesNumber': ?digits(_seriesNumber),
        'binding': ?text(_binding),
        'trimSize': ?text(_trimSize),
        'weightGrams': ?digits(_weight),
        'listPrice': ?digits(_listPrice),
        'currency': _currency,
        'description': ?text(_description),
        'tags': _lines(_tags),
        'categoryId': ?text(_categoryId),
      },
    };
  }

  void _onQuery(String value) {
    _query = value;
    if (_newBook) setState(() => _newBook = false);
    _debounce?.cancel();
    _debounce = Timer(
      const Duration(milliseconds: 350),
      () => setState(() => _search = value.trim()),
    );
  }

  void _notListed() => setState(() {
    _newBook = true;
    final digits = plainDigits(_query);
    if (RegExp(r'\d{9,}').hasMatch(digits)) {
      _isbn = digits;
    } else {
      _title = _query.trim();
    }
  });

  Future<void> _addPhotos() async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    final room = _maxPhotos - _kept.length - _photos.length;
    if (room <= 0) return;
    final picked = await FilePicker.pickFiles(type: FileType.image);
    if (picked.isEmpty || !mounted) return;
    setState(() => _shrinking = true);
    final ready = <PreparedImage>[];
    for (final f in picked.take(room)) {
      try {
        ready.add(await prepareImage(f.xFile.path, f.name));
      } on ImageNotReady catch (e) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              e.problem == ImageProblem.tooLarge
                  ? s.upload.errors.imageTooLarge
                  : s.upload.errors.unreadableImage,
            ),
          ),
        );
      }
    }
    if (mounted) {
      setState(() {
        _photos = [..._photos, ...ready];
        _shrinking = false;
      });
    }
  }

  Future<void> _save({required bool submit}) async {
    final s = ref.read(stringsProvider);
    final b = s.bookshop;
    setState(() {
      _sending = true;
      _error = null;
      _progress = null;
    });
    final actions = ref.read(bookActionsProvider);
    try {
      final id = await actions.save(
        _payload(),
        id: widget.offer?.id,
        photos: _photos,
        onProgress: _photos.isEmpty
            ? null
            : (p) => setState(() => _progress = p),
      );
      if (submit) await actions.submit(id);
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(submit ? b.submitted : b.draftSaved)),
      );
      // Still marked busy, so the leave guard has nothing to ask.
      context.go('/dashboard/books');
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
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.watch(bookCategoriesProvider).value ?? const [];
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final digitsOnly = [
      FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]')),
    ];
    final money = [...digitsOnly, const ThousandsFormatter()];
    final editing = widget.offer != null;
    final room = _maxPhotos - _kept.length - _photos.length;
    final hits = _picked == null && !_newBook
        ? ref.watch(catalogSearchProvider(_search))
        : null;
    final described = _newBook && _picked == null;
    String n(int v) => localDigits(v, language);

    // A copy is priced in toman; only a toman cover price compares with it.
    final cover = (_picked?.currency ?? _currency) == 'IRT'
        ? BigInt.tryParse(plainDigits(_picked?.listPrice ?? _listPrice))
        : null;
    final price = BigInt.tryParse(plainDigits(_price));
    final belowCover =
        cover != null && cover > BigInt.zero && price != null && price < cover
        ? ((cover - price) * BigInt.from(100) ~/ cover).toInt()
        : 0;
    final canSave = plainDigits(_price).isNotEmpty && _delivery.isNotEmpty;
    final canSubmit = canSave && _kept.length + _photos.length > 0;

    Widget section(String title, List<Widget> children, {String? hint}) =>
        SoftSurface(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              Text(title, style: text.titleMedium),
              if (hint != null) Text(hint, style: small),
              ...children,
            ],
          ),
        );

    Widget field(
      String label,
      String value,
      ValueChanged<String> onChanged, {
      bool number = false,
      bool ltr = false,
      String? helper,
      int maxLines = 1,
    }) => TextFormField(
      // Typed numbers stay in Latin digits, as every money box does.
      initialValue: number ? plainDigits(value) : value,
      keyboardType: number
          ? TextInputType.number
          : maxLines > 1
          ? TextInputType.multiline
          : null,
      inputFormatters: number ? digitsOnly : null,
      textDirection: number || ltr ? TextDirection.ltr : null,
      minLines: maxLines > 1 ? 2 : null,
      maxLines: maxLines,
      onChanged: (v) => setState(() => onChanged(v)),
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        helperMaxLines: 3,
        alignLabelWithHint: maxLines > 1,
      ),
    );

    Widget picker(
      String label,
      String value,
      List<(String, String)> options,
      ValueChanged<String> onPicked, {
      bool searchable = true,
    }) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 6,
      children: [
        Text(label, style: text.labelLarge),
        OutlinedButton.icon(
          icon: const Icon(Icons.arrow_drop_down_rounded),
          label: Align(
            alignment: AlignmentDirectional.centerStart,
            child: Text(
              options.where((o) => o.$1 == value).firstOrNull?.$2.trim() ?? '—',
              overflow: TextOverflow.ellipsis,
            ),
          ),
          onPressed: () async {
            final picked = await pickFromList(
              context,
              title: label,
              all: '—',
              options: options,
              searchable: searchable,
            );
            FocusManager.instance.primaryFocus?.unfocus();
            if (picked != null) setState(() => onPicked(picked));
          },
        ),
      ],
    );

    Widget chips(
      String label,
      List<(String, String)> options,
      bool Function(String) selected,
      ValueChanged<String> onTap,
    ) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 6,
      children: [
        Text(label, style: text.labelLarge),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final (value, name) in options)
              ChoiceChip(
                label: Text(name),
                selected: selected(value),
                onSelected: (_) => setState(() => onTap(value)),
              ),
          ],
        ),
      ],
    );

    final pickedBook = _picked;
    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: BaghSpace.gutter,
      children: [
        section('${n(1)}. ${b.stepFind}', [
          if (pickedBook != null)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 12,
              children: [
                SizedBox(
                  width: 64,
                  child: BookCover(
                    url: pickedBook.coverUrl,
                    title: pickedBook.title,
                    small: true,
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 3,
                    children: [
                      Text(b.pickedBook, style: small),
                      Text(pickedBook.title, style: text.titleSmall),
                      if (pickedBook.authors.isNotEmpty)
                        Text(
                          namesText(pickedBook.authors, language),
                          style: text.bodyMedium,
                        ),
                      Text(
                        [
                          ?pickedBook.publisher,
                          ?pickedBook.isbn,
                          if (bookMoney(
                                pickedBook.listPrice,
                                pickedBook.currency,
                                s,
                                language,
                              )
                              case final p?)
                            '${b.listPrice}: $p',
                        ].join(factSep(language)),
                        style: small,
                      ),
                      if (!editing)
                        Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: TextButton(
                            onPressed: () => setState(() => _picked = null),
                            child: Text(b.changeBook),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            )
          else ...[
            Text(b.findHint, style: small),
            TextFormField(
              initialValue: _query,
              onChanged: _onQuery,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: b.findPlaceholder,
                prefixIcon: const Icon(Icons.search_rounded),
              ),
            ),
            if (hits != null && !_newBook)
              hits.when(
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(8),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (e, _) => FormMessage(describeError(s, e)),
                data: (list) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 8,
                  children: [for (final hit in list) _hit(hit)],
                ),
              ),
            if (!_newBook)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton.icon(
                  icon: const Icon(Icons.add_rounded),
                  label: Text(b.notListed),
                  onPressed: _notListed,
                ),
              ),
          ],
        ]),
        if (described)
          section('${n(2)}. ${b.stepFacts}', [
            field(b.titleLabel, _title, (v) => _title = v),
            field(b.subtitleLabel, _subtitle, (v) => _subtitle = v),
            field(
              b.authorsLabel,
              _authors,
              (v) => _authors = v,
              helper: b.namesHint,
              maxLines: 3,
            ),
            field(
              b.translatorsLabel,
              _translators,
              (v) => _translators = v,
              helper: b.namesHint,
              maxLines: 3,
            ),
            field(b.publisher, _publisher, (v) => _publisher = v),
            field(
              b.isbn,
              _isbn,
              (v) => _isbn = v,
              ltr: true,
              helper: b.isbnHint,
            ),
            field(b.yearLabel, _year, (v) => _year = v, number: true),
            chips(
              b.calendarLabel,
              [
                for (final v in const ['SOLAR', 'GREGORIAN'])
                  (v, b.calendars.label(v)),
              ],
              (v) => _calendar == v,
              (v) => _calendar = v,
            ),
            field(b.editionLabel, _edition, (v) => _edition = v, number: true),
            field(
              b.printRunLabel,
              _printRun,
              (v) => _printRun = v,
              number: true,
            ),
            field(b.pagesLabel, _pages, (v) => _pages = v, number: true),
            chips(
              b.languageLabel,
              [for (final code in bookLanguages) (code, geo.language(code))],
              (v) => _language == v,
              (v) => _language = v,
            ),
            if (_translators.trim().isNotEmpty) ...[
              field(
                b.originalTitleLabel,
                _originalTitle,
                (v) => _originalTitle = v,
              ),
              picker(
                b.originalLanguageLabel,
                _originalLanguage,
                [
                  for (final code in bookOriginalLanguages)
                    (code, geo.language(code)),
                ],
                (v) => _originalLanguage = v,
                searchable: false,
              ),
            ],
            chips(
              b.binding,
              [for (final v in bookBindings) (v, b.bindings.label(v))],
              (v) => _binding == v,
              (v) => _binding = _binding == v ? '' : v,
            ),
            chips(
              b.trimSize,
              [for (final v in bookTrimSizes) (v, b.trimSizes.label(v))],
              (v) => _trimSize == v,
              (v) => _trimSize = _trimSize == v ? '' : v,
            ),
            TextFormField(
              initialValue: groupThousands(_listPrice),
              keyboardType: TextInputType.number,
              textDirection: TextDirection.ltr,
              inputFormatters: money,
              onChanged: (v) => setState(() => _listPrice = v),
              decoration: InputDecoration(labelText: b.listPriceLabel),
            ),
            picker(s.work.currencyLabel, _currency, [
              for (final code in currencyCodes)
                (code, geo.currency(code, s.market.currency)),
            ], (v) => _currency = v.isEmpty ? 'IRT' : v),
            field(b.seriesLabel, _series, (v) => _series = v),
            field(
              b.seriesNumberLabel,
              _seriesNumber,
              (v) => _seriesNumber = v,
              number: true,
            ),
            field(b.weightLabel, _weight, (v) => _weight = v, number: true),
            picker(
              b.shelfLabel,
              _categoryId,
              shelfOptions(categories, language),
              (v) => _categoryId = v,
            ),
            field(b.tagsLabel, _tags, (v) => _tags = v, helper: b.tagsHint),
            field(
              b.descriptionLabel,
              _description,
              (v) => _description = v,
              maxLines: 8,
            ),
          ]),
        if (_bookReady) ...[
          section('${n(described ? 3 : 2)}. ${b.stepCopy}', [
            Text(b.gradeLabel, style: text.labelLarge),
            for (final g in bookGrades)
              _GradeOption(
                title: b.grades.label(g),
                hint: b.gradeHints.label(g),
                selected: _grade == g,
                onTap: () => setState(() => _grade = g),
              ),
            field(
              b.conditionNotesLabel,
              _notes,
              (v) => _notes = v,
              helper: b.conditionNotesHint,
              maxLines: 5,
            ),
            TextFormField(
              initialValue: groupThousands(_price),
              keyboardType: TextInputType.number,
              textDirection: TextDirection.ltr,
              inputFormatters: money,
              onChanged: (v) => setState(() => _price = v),
              decoration: InputDecoration(
                labelText: b.priceLabel,
                helperText: belowCover > 0
                    ? b.priceVsCover.fill({'percent': n(belowCover)})
                    : null,
              ),
            ),
            Row(
              children: [
                Expanded(child: Text(b.quantityLabel, style: text.labelLarge)),
                IconButton.outlined(
                  tooltip: '−',
                  icon: const Icon(Icons.remove_rounded),
                  onPressed: _quantity > 1
                      ? () => setState(() => _quantity--)
                      : null,
                ),
                SizedBox(
                  width: 52,
                  child: Text(
                    n(_quantity),
                    textAlign: TextAlign.center,
                    style: text.titleMedium,
                  ),
                ),
                IconButton.outlined(
                  tooltip: '+',
                  icon: const Icon(Icons.add_rounded),
                  onPressed: _quantity < 999
                      ? () => setState(() => _quantity++)
                      : null,
                ),
              ],
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(b.negotiableLabel),
              value: _negotiable,
              onChanged: (v) => setState(() => _negotiable = v),
            ),
            Text(b.deliveryLabel, style: text.labelLarge),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final d in bookDelivery)
                  FilterChip(
                    label: Text(b.delivery.label(d)),
                    selected: _delivery.contains(d),
                    onSelected: (on) => setState(
                      () => _delivery = on
                          ? [..._delivery, d]
                          : [
                              for (final x in _delivery)
                                if (x != d) x,
                            ],
                    ),
                  ),
              ],
            ),
            if (_ships)
              TextFormField(
                initialValue: groupThousands(_shipping),
                keyboardType: TextInputType.number,
                textDirection: TextDirection.ltr,
                inputFormatters: money,
                onChanged: (v) => setState(() => _shipping = v),
                decoration: InputDecoration(
                  labelText: b.shippingLabel,
                  helperText: b.shippingHint,
                  helperMaxLines: 3,
                ),
              ),
            picker(s.market.province, _province, [
              for (final p in iranProvinces) (p.fa, provinceLabel(p, language)),
            ], (v) => _province = v),
            field(b.cityLabel, _city, (v) => _city = v),
          ]),
          section(
            '${n(described ? 4 : 3)}. ${b.photosLabel}',
            hint: b.photosHint,
            [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final id in _kept)
                    _Thumb(
                      onRemove: () => setState(() {
                        _kept.remove(id);
                        _removed.add(id);
                      }),
                      child: _OwnPhoto(id),
                    ),
                  for (final photo in _photos)
                    _Thumb(
                      onRemove: () => setState(
                        () => _photos = [
                          for (final x in _photos)
                            if (x != photo) x,
                        ],
                      ),
                      child: Image.memory(photo.bytes, fit: BoxFit.cover),
                    ),
                  if (room > 0)
                    SizedBox(
                      width: 84,
                      height: 112,
                      child: OutlinedButton(
                        onPressed: _shrinking ? null : _addPhotos,
                        child: _shrinking
                            ? const CircularProgressIndicator()
                            : Icon(
                                Icons.add_photo_alternate_outlined,
                                semanticLabel: b.photosLabel,
                              ),
                      ),
                    ),
                ],
              ),
            ],
          ),
          if (_sending && _progress != null)
            LinearProgressIndicator(
              value: _progress,
              minHeight: 6,
              borderRadius: BorderRadius.circular(3),
            ),
          if (_error case final e?) FormMessage(e),
          BaghKey(
            label: b.submitForReview,
            icon: Icons.send_rounded,
            loading: _sending,
            expand: true,
            onPressed: canSubmit ? () => _save(submit: true) : null,
          ),
          BaghKey(
            label: b.saveDraft,
            icon: Icons.save_outlined,
            kind: BaghKeyKind.outline,
            loading: _sending,
            expand: true,
            onPressed: canSave ? () => _save(submit: false) : null,
          ),
        ],
      ],
    );

    return LeaveGuard(
      isDirty: () => _snapshot() != _start,
      busy: _sending,
      child: Scaffold(
        appBar: AppBar(
          title: Text(editing ? b.editOfferTitle : b.sellTitle),
          actions: const [HelpAction('my-books')],
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            child: body,
          ),
        ),
      ),
    );
  }

  Widget _hit(CatalogHit hit) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        border: Border.all(color: c.edge),
        borderRadius: BorderRadius.circular(BaghRadius.tile),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 10,
        children: [
          SizedBox(
            width: 48,
            child: BookCover(url: hit.coverUrl, title: hit.title, small: true),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 3,
              children: [
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(text: hit.title),
                      if (hit.verified)
                        WidgetSpan(
                          alignment: PlaceholderAlignment.middle,
                          child: Padding(
                            padding: const EdgeInsetsDirectional.only(start: 4),
                            child: Icon(
                              Icons.verified_rounded,
                              size: 15,
                              color: c.primary,
                              semanticLabel: b.verifiedBook,
                            ),
                          ),
                        ),
                    ],
                  ),
                  style: text.titleSmall,
                ),
                if (hit.authors.isNotEmpty)
                  Text(
                    namesText(hit.authors, language),
                    style: text.bodyMedium,
                  ),
                Text(
                  [
                    ?hit.publisher,
                    if (hit.publishYear case final y?) yearText(y, language),
                    ?hit.isbn,
                    b.offersCount.fill({
                      'count': localDigits(hit.listings, language),
                    }),
                  ].join(factSep(language)),
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: OutlinedButton(
                    onPressed: () {
                      FocusManager.instance.primaryFocus?.unfocus();
                      setState(() => _picked = hit);
                    },
                    child: Text(b.pickThis),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A condition on the trade's scale, with what it means.
class _GradeOption extends StatelessWidget {
  const _GradeOption({
    required this.title,
    required this.hint,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String hint;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Semantics(
      selected: selected,
      button: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(BaghRadius.tile),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: selected ? c.primarySoft.fill : null,
            border: Border.all(
              color: selected ? c.primary : c.edge,
              width: selected ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(BaghRadius.tile),
          ),
          child: Row(
            spacing: 10,
            children: [
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_unchecked_rounded,
                color: selected ? c.primary : c.ink2,
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 2,
                  children: [
                    Text(title, style: text.titleSmall),
                    Text(hint, style: text.bodySmall?.copyWith(color: c.ink2)),
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

class _OwnPhoto extends ConsumerWidget {
  const _OwnPhoto(this.id);

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = BaghColors.of(context);
    final bytes = ref.watch(ownBookPhotoProvider(id)).value;
    return Container(
      color: c.fill,
      child: bytes == null
          ? Icon(Icons.image_outlined, color: c.ink2)
          : Image.memory(bytes, fit: BoxFit.cover, gaplessPlayback: true),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.child, required this.onRemove});

  final Widget child;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 84,
    height: 112,
    child: Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(BaghRadius.tile),
          child: child,
        ),
        PositionedDirectional(
          top: 2,
          end: 2,
          child: IconButton.filledTonal(
            visualDensity: VisualDensity.compact,
            tooltip: MaterialLocalizations.of(context).deleteButtonTooltip,
            icon: const Icon(Icons.close_rounded, size: 16),
            onPressed: onRemove,
          ),
        ),
      ],
    ),
  );
}
