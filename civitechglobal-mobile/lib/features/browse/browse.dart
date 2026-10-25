import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../help/help_sheet.dart';

/// One kit for every catalogue the app browses (projects, freelancers,
/// services, books, shops, products), as the web's list pages share
/// useListControls: a search box, a sort, filters changed together in a
/// sheet, and pages that load as the list nears its end.
///
/// A query is the request's own parameters, so a filter is just a key: the
/// server's names, exactly as the web sends them.

int? _int(Object? v) => v is num ? v.toInt() : null;

/// What a list endpoint is asked: its path and parameters. Equal when both
/// are, so the same search shares one page cache.
@immutable
class BrowseQuery {
  const BrowseQuery(this.path, this.params);

  final String path;

  /// Only what is set: an empty value is never sent.
  final Map<String, String> params;

  BrowseQuery withParam(String key, String value) => BrowseQuery(
    path,
    {...params, key: value}..removeWhere((_, v) => v.isEmpty),
  );

  BrowseQuery withParams(Map<String, String> next) =>
      BrowseQuery(path, {...next}..removeWhere((_, v) => v.isEmpty));

  @override
  bool operator ==(Object other) =>
      other is BrowseQuery &&
      other.path == path &&
      mapEquals(other.params, params);

  @override
  int get hashCode => Object.hash(
    path,
    Object.hashAllUnordered(
      params.entries.map((e) => Object.hash(e.key, e.value)),
    ),
  );
}

typedef BrowsePage = ({
  List<Map<String, Object?>> items,
  int page,
  int totalPages,
  int total,
});

/// One query's results, a page at a time; the next page loads as the list
/// nears its end. Rows stay as the server sent them, and each screen reads
/// them into its own model.
final browseProvider = AsyncNotifierProvider.autoDispose
    .family<BrowseController, BrowsePage, BrowseQuery>(BrowseController.new);

class BrowseController extends AsyncNotifier<BrowsePage> {
  BrowseController(this.query);

  final BrowseQuery query;
  static const pageSize = 20;
  bool _loadingMore = false;

  Future<BrowsePage> _fetch(int page) => ref
      .read(apiClientProvider)
      .get(
        query.path,
        query: {...query.params, 'page': page, 'pageSize': pageSize},
        parse: (d) {
          final map = (d as Map?) ?? const {};
          return (
            items: [
              for (final row in (map['items'] as List? ?? const []))
                if (row is Map<String, Object?>) row,
            ],
            page: _int(map['page']) ?? page,
            totalPages: _int(map['totalPages']) ?? 1,
            total: _int(map['total']) ?? 0,
          );
        },
      );

  @override
  Future<BrowsePage> build() => _fetch(1);

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || current.page >= current.totalPages) return;
    if (_loadingMore) return;
    _loadingMore = true;
    try {
      final next = await _fetch(current.page + 1);
      // Something published meanwhile moves the pages along; a repeat is
      // dropped rather than shown twice.
      final seen = {for (final row in current.items) '${row['id']}'};
      state = AsyncData((
        items: [
          ...current.items,
          ...next.items.where((row) => !seen.contains('${row['id']}')),
        ],
        page: next.page,
        totalPages: next.totalPages,
        total: next.total,
      ));
    } finally {
      _loadingMore = false;
    }
  }
}

/// A filter, as the sheet offers it. Each one writes the parameters it
/// names; "all" is the empty value, which is not sent.
sealed class BrowseFilter {
  const BrowseFilter(this.label);

  final String label;

  /// The parameters this filter writes, for the count on the filters key.
  List<String> get keys;
}

/// A few values side by side, as chips. One at a time.
class ChoiceFilter extends BrowseFilter {
  const ChoiceFilter(super.label, this.key, this.options, {this.all});

  final String key;
  final List<(String, String)> options;

  /// The chip that clears it; none when a value must stay chosen.
  final String? all;

  @override
  List<String> get keys => [key];
}

/// A long list, in the searchable sheet.
class PickerFilter extends BrowseFilter {
  const PickerFilter(
    super.label,
    this.key,
    this.options, {
    required this.all,
    this.searchable = true,
  });

  final String key;
  final List<(String, String)> options;
  final String all;
  final bool searchable;

  @override
  List<String> get keys => [key];
}

/// An on/off switch: "true" when on, not sent when off.
class SwitchFilter extends BrowseFilter {
  const SwitchFilter(super.label, this.key);

  final String key;

  @override
  List<String> get keys => [key];
}

/// A money range in one currency: the currency travels only with a number,
/// since a budget means something in one currency at a time.
class MoneyRangeFilter extends BrowseFilter {
  const MoneyRangeFilter(
    super.label, {
    required this.minKey,
    required this.maxKey,
    required this.minLabel,
    required this.maxLabel,
    this.currencyKey,
  });

  final String minKey;
  final String maxKey;
  final String minLabel;
  final String maxLabel;

  /// Where the currency goes; null for a list priced in toman only.
  final String? currencyKey;

  @override
  List<String> get keys => [minKey, maxKey];
}

/// Free text, sent as typed (an author, a publisher).
class TextFilter extends BrowseFilter {
  const TextFilter(super.label, this.key);

  final String key;

  @override
  List<String> get keys => [key];
}

/// A range of whole numbers written without grouping (years).
class NumberRangeFilter extends BrowseFilter {
  const NumberRangeFilter(
    super.label, {
    required this.minKey,
    required this.maxKey,
    required this.minLabel,
    required this.maxLabel,
  });

  final String minKey;
  final String maxKey;
  final String minLabel;
  final String maxLabel;

  @override
  List<String> get keys => [minKey, maxKey];
}

/// A list screen over [BrowseQuery], with its search, sort and filters.
class BrowseScreen extends ConsumerStatefulWidget {
  const BrowseScreen({
    required this.title,
    required this.path,
    required this.searchHint,
    required this.sorts,
    required this.filters,
    required this.itemBuilder,
    required this.emptyText,
    required this.countText,
    this.subtitle,
    this.helpId,
    this.fixed = const {},
    this.initial = const {},
    this.actions = const [],
    this.header = const [],
    this.belowCount,
    this.onSaveSearch,
    this.grid = false,
    this.tiles = false,
    super.key,
  });

  final String title;
  final String? subtitle;
  final String path;
  final String searchHint;

  /// The server's sort values and their names; the first is the default.
  final List<(String, String)> sorts;
  final List<BrowseFilter> Function(BrowseQuery query) filters;
  final Widget Function(BuildContext context, Map<String, Object?> row)
  itemBuilder;
  final String emptyText;

  /// The count over the results, with a {count} to fill: each list says
  /// what it counts.
  final String countText;
  final String? helpId;

  /// Parameters the address fixes (a category page's category); never
  /// shown as a filter and never cleared.
  final Map<String, String> fixed;

  /// Where the reader's own choices start, from a link's parameters.
  final Map<String, String> initial;
  final List<Widget> actions;

  /// Between the search row and the results.
  final List<Widget> header;

  /// Shown on the plain first page only: once somebody searches or
  /// filters, they have said what they want.
  final Widget? belowCount;

  /// The bell beside the count: turns the current query into an alert.
  final void Function(BuildContext context, BrowseQuery query)? onSaveSearch;

  /// Two to a row on wider phones, for tiles with a picture.
  final bool grid;

  /// Narrow tiles side by side even on a phone, as many as fit, each row as
  /// tall as its tallest tile (book covers).
  final bool tiles;

  @override
  ConsumerState<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends ConsumerState<BrowseScreen> {
  final _search = TextEditingController();
  final _scroll = ScrollController();
  Timer? _debounce;

  /// The reader's own choices: search, sort and filters.
  late Map<String, String> _params = {
    'sort': widget.sorts.first.$1,
    ...widget.initial,
    // The web's addresses carry the search as ?q= (useListControls).
    'search': ?widget.initial['q'],
  }..removeWhere((k, v) => v.isEmpty || k == 'q');

  BrowseQuery get _query =>
      BrowseQuery(widget.path, {..._params, ...widget.fixed});

  @override
  void initState() {
    super.initState();
    _search.text = _params['search'] ?? '';
    _scroll.addListener(() {
      if (_scroll.position.extentAfter < 600) {
        ref.read(browseProvider(_query).notifier).loadMore();
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _set(Map<String, String> next) {
    setState(() => _params = {...next}..removeWhere((_, v) => v.isEmpty));
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  void _onSearch(String value) {
    _debounce?.cancel();
    _debounce = Timer(
      const Duration(milliseconds: 400),
      () => _set({..._params, 'search': value.trim()}),
    );
  }

  int _activeFilters(List<BrowseFilter> filters) => filters
      .where((f) => f.keys.any((k) => (_params[k] ?? '').isNotEmpty))
      .length;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final query = _query;
    final results = ref.watch(browseProvider(query));
    final filters = widget.filters(query);
    final active = _activeFilters(filters);
    final searching = (_params['search'] ?? '').isNotEmpty;
    final sort = _params['sort'] ?? widget.sorts.first.$1;

    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(widget.title),
        actions: [
          ...widget.actions,
          ?switch (widget.helpId) {
            final id? => HelpAction(id),
            null => null,
          },
        ],
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: c.primary,
          onRefresh: () => ref.refresh(browseProvider(query).future),
          child: CustomScrollView(
            controller: _scroll,
            slivers: [
              SliverPadding(
                padding: BaghLayout.readablePadding(
                  context,
                  top: BaghSpace.gutter,
                  bottom: 0,
                ),
                sliver: SliverList.list(
                  children: [
                    if (widget.subtitle case final sub?) ...[
                      Text(
                        sub,
                        style: text.bodyMedium?.copyWith(color: c.ink2),
                      ),
                      const SizedBox(height: BaghSpace.gutter),
                    ],
                    TextField(
                      controller: _search,
                      onChanged: _onSearch,
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        hintText: widget.searchHint,
                        prefixIcon: const Icon(Icons.search_rounded),
                        suffixIcon: ListenableBuilder(
                          listenable: _search,
                          builder: (context, _) => _search.text.isEmpty
                              ? const SizedBox.shrink()
                              : IconButton(
                                  tooltip: MaterialLocalizations.of(
                                    context,
                                  ).deleteButtonTooltip,
                                  icon: const Icon(Icons.close_rounded),
                                  onPressed: () {
                                    _search.clear();
                                    _onSearch('');
                                  },
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (filters.isNotEmpty)
                          FilterChip(
                            avatar: const Icon(Icons.tune_rounded, size: 18),
                            label: Text(
                              active > 0
                                  ? '${j.filters} (${localDigits(active, language)})'
                                  : j.filters,
                            ),
                            selected: active > 0,
                            showCheckmark: false,
                            onSelected: (_) async {
                              final next =
                                  await showBaghSheet<Map<String, String>>(
                                    context,
                                    isScrollControlled: true,
                                    builder: (_) => _FiltersSheet(
                                      initial: _params,
                                      filters: filters,
                                    ),
                                  );
                              if (next != null) _set(next);
                            },
                          ),
                        ...widget.header,
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Semantics(
                            liveRegion: true,
                            child: Text(switch (results.value) {
                              final p? => widget.countText.fill({
                                'count': groupedNumber('${p.total}', language),
                              }),
                              null => '',
                            }, style: text.bodySmall?.copyWith(color: c.ink2)),
                          ),
                        ),
                        if (widget.onSaveSearch case final save?)
                          IconButton(
                            tooltip: j.saveSearch,
                            icon: const Icon(Icons.notification_add_outlined),
                            onPressed: () => save(context, query),
                          ),
                        if (widget.sorts.length > 1)
                          PopupMenuButton<String>(
                            tooltip: s.market.sortLabel,
                            initialValue: sort,
                            onSelected: (v) => _set({..._params, 'sort': v}),
                            itemBuilder: (_) => [
                              for (final (value, label) in widget.sorts)
                                PopupMenuItem(value: value, child: Text(label)),
                            ],
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                spacing: 4,
                                children: [
                                  const Icon(Icons.sort_rounded, size: 18),
                                  Text(
                                    widget.sorts
                                            .where((o) => o.$1 == sort)
                                            .firstOrNull
                                            ?.$2 ??
                                        sort,
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (active == 0 && !searching) ?widget.belowCount,
                  ],
                ),
              ),
              _Results(
                results: results,
                query: query,
                emptyText: active > 0 || searching
                    ? s.list.noResults
                    : widget.emptyText,
                itemBuilder: widget.itemBuilder,
                grid: widget.grid,
                tiles: widget.tiles,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Results extends ConsumerWidget {
  const _Results({
    required this.results,
    required this.query,
    required this.emptyText,
    required this.itemBuilder,
    required this.grid,
    required this.tiles,
  });

  final AsyncValue<BrowsePage> results;
  final BrowseQuery query;
  final String emptyText;
  final Widget Function(BuildContext, Map<String, Object?>) itemBuilder;
  final bool grid;
  final bool tiles;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final padding = BaghLayout.readablePadding(
      context,
      top: 0,
      bottom: BaghSpace.section * 4,
    );
    if (results.value case final page?) {
      if (page.items.isEmpty) {
        return SliverPadding(
          padding: padding,
          sliver: SliverToBoxAdapter(child: EmptyNote(message: emptyText)),
        );
      }
      final more = page.page < page.totalPages;
      const spinner = Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: GirihSpinner()),
      );
      if (tiles) {
        // As many as fit at about 140 points each, fewer when the text is
        // large: a cover is only useful while its title still fits under it.
        final width = MediaQuery.sizeOf(context).width - padding.horizontal;
        final scale = MediaQuery.textScalerOf(context).scale(1);
        final per = (width / (140 * scale)).floor().clamp(1, 4);
        final rows = (page.items.length / per).ceil();
        return SliverPadding(
          padding: padding,
          sliver: SliverList.separated(
            itemCount: rows + (more ? 1 : 0),
            separatorBuilder: (_, _) => const SizedBox(height: 20),
            itemBuilder: (context, r) => r < rows
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 12,
                    children: [
                      for (var i = r * per; i < (r + 1) * per; i++)
                        Expanded(
                          child: i < page.items.length
                              ? itemBuilder(context, page.items[i])
                              : const SizedBox.shrink(),
                        ),
                    ],
                  )
                : spinner,
          ),
        );
      }
      if (grid && MediaQuery.sizeOf(context).width >= 560) {
        return SliverPadding(
          padding: padding,
          sliver: SliverMainAxisGroup(
            slivers: [
              SliverGrid.builder(
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 320,
                  mainAxisExtent: 330,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: page.items.length,
                itemBuilder: (context, i) =>
                    itemBuilder(context, page.items[i]),
              ),
              if (more) const SliverToBoxAdapter(child: spinner),
            ],
          ),
        );
      }
      return SliverPadding(
        padding: padding,
        sliver: SliverList.separated(
          itemCount: page.items.length + (more ? 1 : 0),
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, i) => i < page.items.length
              ? itemBuilder(context, page.items[i])
              : spinner,
        ),
      );
    }
    return SliverPadding(
      padding: padding,
      sliver: SliverToBoxAdapter(
        child: AsyncView(
          value: results,
          onRetry: () => ref.invalidate(browseProvider(query)),
          data: (_) => const SizedBox.shrink(),
        ),
      ),
    );
  }
}

/// Every filter, changed together and applied with one key, so the list
/// does not reload on each tap.
class _FiltersSheet extends ConsumerStatefulWidget {
  const _FiltersSheet({required this.initial, required this.filters});

  final Map<String, String> initial;
  final List<BrowseFilter> filters;

  @override
  ConsumerState<_FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends ConsumerState<_FiltersSheet> {
  late final Map<String, String> _p = {...widget.initial};

  /// Bumped by "clear", so typed boxes start again empty instead of still
  /// showing what was cleared.
  int _cleared = 0;

  void _put(String key, String value) => setState(() {
    if (value.isEmpty) {
      _p.remove(key);
    } else {
      _p[key] = value;
    }
  });

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final text = Theme.of(context).textTheme;

    Widget section(String title, Widget child) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 8,
      children: [
        Text(title, style: text.titleSmall),
        child,
      ],
    );

    Widget build(BrowseFilter f) => switch (f) {
      ChoiceFilter() => section(
        f.label,
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (f.all case final all?)
              ChoiceChip(
                label: Text(all),
                selected: (_p[f.key] ?? '').isEmpty,
                onSelected: (_) => _put(f.key, ''),
              ),
            for (final (value, label) in f.options)
              ChoiceChip(
                label: Text(label),
                selected: _p[f.key] == value,
                onSelected: (_) {
                  ref.read(hapticsProvider).selection();
                  _put(f.key, _p[f.key] == value && f.all != null ? '' : value);
                },
              ),
          ],
        ),
      ),
      PickerFilter() => section(
        f.label,
        OutlinedButton.icon(
          icon: const Icon(Icons.arrow_drop_down_rounded),
          label: Align(
            alignment: AlignmentDirectional.centerStart,
            child: Text(
              f.options
                      .where((o) => o.$1 == _p[f.key])
                      .firstOrNull
                      ?.$2
                      .trim() ??
                  f.all,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          onPressed: () async {
            final picked = await pickFromList(
              context,
              title: f.label,
              all: f.all,
              options: f.options,
              searchable: f.searchable,
            );
            FocusManager.instance.primaryFocus?.unfocus();
            if (picked != null) _put(f.key, picked);
          },
        ),
      ),
      SwitchFilter() => SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(f.label, style: text.bodyMedium),
        value: _p[f.key] == 'true',
        onChanged: (on) => _put(f.key, on ? 'true' : ''),
      ),
      TextFilter() => TextFormField(
        key: ValueKey((f.key, _cleared)),
        initialValue: _p[f.key] ?? '',
        decoration: InputDecoration(labelText: f.label),
        onChanged: (v) => _p[f.key] = v.trim(),
      ),
      NumberRangeFilter() => section(
        f.label,
        Row(
          spacing: 8,
          children: [
            for (final (key, hint) in [
              (f.minKey, f.minLabel),
              (f.maxKey, f.maxLabel),
            ])
              Expanded(
                child: TextFormField(
                  key: ValueKey((key, _cleared)),
                  initialValue: _p[key] ?? '',
                  keyboardType: TextInputType.number,
                  textDirection: TextDirection.ltr,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]')),
                  ],
                  decoration: InputDecoration(hintText: hint),
                  onChanged: (v) => _p[key] = plainDigits(v),
                ),
              ),
          ],
        ),
      ),
      MoneyRangeFilter() => section(
        f.label,
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
          children: [
            Row(
              spacing: 8,
              children: [
                for (final (key, hint) in [
                  (f.minKey, f.minLabel),
                  (f.maxKey, f.maxLabel),
                ])
                  Expanded(
                    child: TextFormField(
                      key: ValueKey((key, _cleared)),
                      initialValue: groupThousands(_p[key] ?? ''),
                      keyboardType: TextInputType.number,
                      textDirection: TextDirection.ltr,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                          RegExp('[0-9۰-۹٠-٩]'),
                        ),
                        const ThousandsFormatter(),
                      ],
                      decoration: InputDecoration(hintText: hint),
                      onChanged: (v) => _p[key] = plainDigits(v),
                    ),
                  ),
              ],
            ),
            if (f.currencyKey case final key?)
              OutlinedButton.icon(
                icon: const Icon(Icons.arrow_drop_down_rounded),
                label: Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Text(
                    geo.currency(_p[key] ?? 'IRT', s.market.currency),
                  ),
                ),
                onPressed: () async {
                  final picked = await pickFromList(
                    context,
                    title: s.work.currencyLabel,
                    all: geo.currency('IRT', s.market.currency),
                    searchable: true,
                    options: [
                      for (final code in currencyCodes)
                        (code, geo.currency(code, s.market.currency)),
                    ],
                  );
                  FocusManager.instance.primaryFocus?.unfocus();
                  if (picked != null) _put(key, picked);
                },
              ),
          ],
        ),
      ),
    };

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.85,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 12, 8),
              child: Row(
                children: [
                  Expanded(child: Text(j.filters, style: text.titleLarge)),
                  TextButton(
                    onPressed: () => setState(() {
                      _cleared++;
                      for (final f in widget.filters) {
                        f.keys.forEach(_p.remove);
                        if (f is MoneyRangeFilter && f.currencyKey != null) {
                          _p.remove(f.currencyKey);
                        }
                      }
                    }),
                    child: Text(j.clearFilters),
                  ),
                ],
              ),
            ),
            Expanded(
              // Every filter built at once: a few dozen at most, and a lazy
              // list would forget what was typed into a scrolled-off box.
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 18,
                  children: [for (final f in widget.filters) build(f)],
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                12,
                20,
                12 + MediaQuery.paddingOf(context).bottom,
              ),
              child: BaghKey(
                label: s.mobile.showResults,
                icon: Icons.check_rounded,
                expand: true,
                onPressed: () {
                  // A range with no number sends no currency.
                  for (final f
                      in widget.filters.whereType<MoneyRangeFilter>()) {
                    if (f.currencyKey case final key?) {
                      final priced =
                          (_p[f.minKey] ?? '').isNotEmpty ||
                          (_p[f.maxKey] ?? '').isNotEmpty;
                      if (!priced) {
                        _p.remove(key);
                      } else {
                        // Toman unless another was chosen, as the web sends it.
                        _p[key] = _p[key] ?? 'IRT';
                      }
                    }
                  }
                  _p.removeWhere((_, v) => v.isEmpty);
                  Navigator.of(context).pop(_p);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
