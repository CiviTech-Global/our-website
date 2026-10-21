import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../core/links.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/local_counter.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import 'job_card.dart';
import 'jobs_data.dart';
import 'seeker_data.dart';

const _employment = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'FREELANCE',
];
const _arrangement = ['ONSITE', 'HYBRID', 'REMOTE'];
const _seniority = [
  'INTERN',
  'JUNIOR',
  'MID',
  'SENIOR',
  'LEAD',
  'MANAGER',
  'EXECUTIVE',
];
const _experience = ['0', '2', '5', '10'];
const _postedWithin = ['1', '3', '7', '30'];

/// The server's JOB_BENEFITS, in its order: the ones Iranian boards put
/// first come first, and only those show until "show all".
const jobBenefits = [
  'INSURANCE',
  'SUPPLEMENTARY_INSURANCE',
  'LOAN',
  'BONUS',
  'COMMISSION',
  'OVERTIME_PAY',
  'FLEXIBLE_HOURS',
  'REMOTE_DAYS',
  'TRAINING',
  'CAREER_GROWTH',
  'EQUITY',
  'MEALS',
  'SHUTTLE',
  'SPORTS',
  'GIFT_CARDS',
  'OCCASION_GIFTS',
  'FOREIGN_CURRENCY_PAY',
  'HOUSING',
  'CHILDCARE',
  'PARKING',
];
const _topBenefits = 6;

/// The job board, as the web's JobBoardPage: search and place across the
/// top, the filters behind one key so the first result is on screen, and
/// results as cards that page in as the list nears its end.
///
/// One screen for four addresses: the board (/jobs), a province's jobs
/// (/jobs/in/:province), a category's (/jobs/category/:slug) and a
/// country's (/jobs/country/:code). A landing address fixes its filter and
/// names the page after it; one that names nothing we have says so.
class JobBoardScreen extends ConsumerStatefulWidget {
  const JobBoardScreen({
    this.provinceSlug,
    this.categorySlug,
    this.countryCode,
    this.initialParams = const {},
    super.key,
  });

  final String? provinceSlug;
  final String? categorySlug;
  final String? countryCode;

  /// The address's own filters (?q=…&province=…): a saved search opening,
  /// or a link to a filtered board from the website.
  final Map<String, String> initialParams;

  @override
  ConsumerState<JobBoardScreen> createState() => _JobBoardScreenState();
}

class _JobBoardScreenState extends ConsumerState<JobBoardScreen> {
  final _search = TextEditingController();
  final _scroll = ScrollController();
  Timer? _debounce;
  late JobQuery _query = jobQueryOf(widget.initialParams);

  IranProvince? get _fixedProvince => provinceBySlug(widget.provinceSlug);

  /// The address's country when it is one we know: from the names once
  /// they have loaded (the screen rebuilds then), the popular few before.
  String? get _fixedCountry {
    final code = widget.countryCode?.toUpperCase();
    if (code == null) return null;
    final names = ref.read(geoNamesProvider).value?.countries;
    final known = names == null || names.isEmpty
        ? popularCountries.contains(code)
        : names.any((p) => p.$1 == code);
    return known ? code : null;
  }

  bool get _landing =>
      widget.provinceSlug != null ||
      widget.categorySlug != null ||
      widget.countryCode != null;

  @override
  void initState() {
    super.initState();
    _search.text = _query.search;
    _scroll.addListener(() {
      if (_scroll.position.extentAfter < 600) {
        ref.read(jobBoardProvider(_effective()).notifier).loadMore();
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

  /// The query as the server is asked: the address's own filter wins over
  /// the reader's choice, and a province (Iran's) only where the country is.
  JobQuery _effective([JobCategory? category]) {
    final province = _fixedProvince;
    final country = province != null
        ? homeCountry
        : (_fixedCountry ?? _query.country);
    final provinceApplies = country.isEmpty || country == homeCountry;
    return _query.copyWith(
      country: country,
      province: province?.fa ?? (provinceApplies ? _query.province : ''),
      categoryId: category?.id ?? _query.categoryId,
      currency: _query.salaryMin.isEmpty
          ? ''
          : (_query.currency.isNotEmpty
                ? _query.currency
                : defaultCurrency[country] ?? 'IRT'),
    );
  }

  void _set(JobQuery next) {
    setState(() => _query = next);
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  void _onSearch(String value) {
    _debounce?.cancel();
    _debounce = Timer(
      const Duration(milliseconds: 400),
      () => _set(_query.copyWith(search: value)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.watch(jobCategoriesProvider);
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;

    JobCategory? fixedCategory;
    if (widget.categorySlug case final slug?) {
      for (final cat in categories.value ?? const <JobCategory>[]) {
        if (cat.slug == slug) fixedCategory = cat;
      }
    }
    // A category page waits for the list that says which id its slug is,
    // so it never shows the whole board for a moment first.
    final waiting = widget.categorySlug != null && !categories.hasValue;
    final unknown =
        (widget.provinceSlug != null && _fixedProvince == null) ||
        (widget.countryCode != null &&
            geo.countries.isNotEmpty &&
            _fixedCountry == null) ||
        (widget.categorySlug != null &&
            categories.hasValue &&
            fixedCategory == null);

    final place = _fixedProvince == null
        ? ''
        : provinceLabel(_fixedProvince!, language);
    final title = _fixedProvince != null
        ? j.landingProvinceTitle.fill({'province': place})
        : _fixedCountry != null
        ? j.landingCountryTitle.fill({'country': geo.country(_fixedCountry)})
        : fixedCategory != null
        ? j.landingCategoryTitle.fill({
            'category': categoryName((
              name: fixedCategory.name,
              nameEn: fixedCategory.nameEn,
            ), language),
          })
        : j.boardTitle;

    final categoryLabel = fixedCategory == null
        ? ''
        : categoryName((
            name: fixedCategory.name,
            nameEn: fixedCategory.nameEn,
          ), language);
    final subtitle = _fixedProvince != null
        ? j.landingProvinceSubtitle.fill({'province': place})
        : _fixedCountry != null
        ? j.landingCountrySubtitle.fill({'country': geo.country(_fixedCountry)})
        : fixedCategory != null
        ? j.landingCategorySubtitle.fill({'category': categoryLabel})
        : j.boardSubtitle;

    final query = _effective(fixedCategory);
    final board = waiting || unknown
        ? null
        : ref.watch(jobBoardProvider(query));

    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(_landing ? s.market.jobsTitle : j.boardTitle),
        actions: [
          IconButton(
            tooltip: j.companiesTitle,
            icon: const Icon(Icons.business_outlined),
            onPressed: () => openLink(context, ref, '/companies'),
          ),
          const HelpAction('jobs'),
        ],
      ),
      body: SafeArea(
        top: false,
        child: unknown
            ? EmptyNote(
                message: s.errors.notFoundBody,
                action: (
                  s.market.backToJobs,
                  () => openLink(context, ref, '/jobs'),
                ),
              )
            : RefreshIndicator(
                color: c.primary,
                onRefresh: () => ref.refresh(jobBoardProvider(query).future),
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
                          if (_landing) ...[
                            Text(title, style: text.headlineSmall),
                            const SizedBox(height: 4),
                          ],
                          Text(
                            subtitle,
                            style: text.bodyMedium?.copyWith(color: c.ink2),
                          ),
                          const SizedBox(height: BaghSpace.gutter),
                          _SearchBar(
                            controller: _search,
                            onChanged: _onSearch,
                            hint: j.searchPlaceholder,
                          ),
                          const SizedBox(height: 10),
                          _PlaceAndFilters(
                            query: _query,
                            fixedProvince: _fixedProvince != null,
                            fixedCountry: _fixedCountry != null,
                            fixedCategory: fixedCategory != null,
                            onChanged: _set,
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: Semantics(
                                  liveRegion: true,
                                  child: Text(
                                    switch (board?.value) {
                                      final p? => j.resultsCount.fill({
                                        'count': groupedNumber(
                                          '${p.total}',
                                          language,
                                        ),
                                      }),
                                      null => '',
                                    },
                                    style: text.bodySmall?.copyWith(
                                      color: c.ink2,
                                    ),
                                  ),
                                ),
                              ),
                              IconButton(
                                tooltip: j.saveSearch,
                                icon: const Icon(
                                  Icons.notification_add_outlined,
                                ),
                                onPressed: () => showBaghSheet<void>(
                                  context,
                                  isScrollControlled: true,
                                  builder: (_) => _SaveSearchSheet(
                                    query: query,
                                    defaultName: _query.search.trim().isNotEmpty
                                        ? _query.search.trim()
                                        : _landing
                                        ? title
                                        : s.market.jobsTitle,
                                  ),
                                ),
                              ),
                              _SortMenu(
                                value: _query.sort,
                                onChanged: (v) =>
                                    _set(_query.copyWith(sort: v)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          // Picked for a member on the plain board only:
                          // once somebody filters, they have said what they
                          // want, and other things are in the way.
                          if (!_landing &&
                              _query.activeFilters == 0 &&
                              _query.search.trim().isEmpty &&
                              _query.country.isEmpty &&
                              _query.province.isEmpty)
                            const _Recommended(),
                        ],
                      ),
                    ),
                    if (board == null)
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.all(48),
                          child: Center(child: GirihSpinner()),
                        ),
                      )
                    else
                      _Results(
                        board: board,
                        query: query,
                        activeFilters: _query.activeFilters > 0 || _landing,
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
    required this.board,
    required this.query,
    required this.activeFilters,
  });

  final AsyncValue<JobPage> board;
  final JobQuery query;
  final bool activeFilters;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final padding = BaghLayout.readablePadding(
      context,
      top: 0,
      bottom: BaghSpace.section * 4,
    );
    if (board.value case final page?) {
      if (page.items.isEmpty) {
        return SliverPadding(
          padding: padding,
          sliver: SliverToBoxAdapter(
            child: EmptyNote(
              message: activeFilters ? s.list.noResults : s.market.noJobs,
            ),
          ),
        );
      }
      final more = page.page < page.totalPages;
      return SliverPadding(
        padding: padding,
        sliver: SliverList.separated(
          itemCount: page.items.length + (more ? 1 : 0),
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, i) => i < page.items.length
              ? JobCard(job: page.items[i])
              : const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: GirihSpinner()),
                ),
        ),
      );
    }
    return SliverPadding(
      padding: padding,
      sliver: SliverToBoxAdapter(
        child: AsyncView(
          value: board,
          onRetry: () => ref.invalidate(jobBoardProvider(query)),
          data: (_) => const SizedBox.shrink(),
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({
    required this.controller,
    required this.onChanged,
    required this.hint,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final String hint;

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    onChanged: onChanged,
    textInputAction: TextInputAction.search,
    decoration: InputDecoration(
      hintText: hint,
      prefixIcon: const Icon(Icons.search_rounded),
      suffixIcon: ListenableBuilder(
        listenable: controller,
        builder: (context, _) => controller.text.isEmpty
            ? const SizedBox.shrink()
            : IconButton(
                tooltip: MaterialLocalizations.of(context).deleteButtonTooltip,
                icon: const Icon(Icons.close_rounded),
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
              ),
      ),
    ),
  );
}

/// Country, province and the filters key: the place first, since that is
/// what everybody narrows by before anything else.
class _PlaceAndFilters extends ConsumerWidget {
  const _PlaceAndFilters({
    required this.query,
    required this.fixedProvince,
    required this.fixedCountry,
    required this.fixedCategory,
    required this.onChanged,
  });

  final JobQuery query;
  final bool fixedProvince;
  final bool fixedCountry;
  final bool fixedCategory;
  final ValueChanged<JobQuery> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final provinceApplies =
        query.country.isEmpty || query.country == homeCountry;
    final count = query.activeFilters;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (!fixedProvince && !fixedCountry)
          _Chip(
            icon: Icons.public_rounded,
            label: query.country.isEmpty
                ? j.allCountries
                : geo.country(query.country),
            selected: query.country.isNotEmpty,
            onTap: () async {
              final code = await pickFromList(
                context,
                title: j.country,
                all: j.allCountries,
                options: geo.countryOptions(),
                searchable: true,
              );
              if (code == null) return;
              onChanged(
                query.copyWith(
                  country: code,
                  // Provinces are Iran's: one left from before is nothing now.
                  province: code.isEmpty || code == homeCountry
                      ? query.province
                      : '',
                ),
              );
            },
          ),
        if (!fixedProvince && provinceApplies)
          _Chip(
            icon: Icons.place_outlined,
            label: query.province.isEmpty
                ? j.allProvinces
                : displayProvince(query.province, language),
            selected: query.province.isNotEmpty,
            onTap: () async {
              final value = await pickFromList(
                context,
                title: s.market.province,
                all: j.allProvinces,
                options: [
                  for (final p in iranProvinces)
                    (p.fa, provinceLabel(p, language)),
                ],
              );
              if (value != null) onChanged(query.copyWith(province: value));
            },
          ),
        _Chip(
          icon: Icons.tune_rounded,
          label: count > 0
              ? '${j.filters} (${localDigits(count, language)})'
              : j.filters,
          selected: count > 0,
          onTap: () async {
            final next = await showBaghSheet<JobQuery>(
              context,
              isScrollControlled: true,
              builder: (_) =>
                  _FiltersSheet(initial: query, showCategory: !fixedCategory),
            );
            if (next != null) onChanged(next);
          },
        ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => FilterChip(
    avatar: Icon(icon, size: 18),
    label: Text(label),
    selected: selected,
    showCheckmark: false,
    onSelected: (_) => onTap(),
  );
}

class _SortMenu extends ConsumerWidget {
  const _SortMenu({required this.value, required this.onChanged});

  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final m = ref.watch(stringsProvider).market;
    final options = {
      'newest': m.sortNewest,
      'salaryDesc': m.sortSalaryDesc,
      'salaryAsc': m.sortSalaryAsc,
      'closingSoon': m.sortClosingSoon,
    };
    return PopupMenuButton<String>(
      tooltip: m.sortLabel,
      initialValue: value,
      onSelected: onChanged,
      itemBuilder: (_) => [
        for (final MapEntry(:key, value: label) in options.entries)
          PopupMenuItem(value: key, child: Text(label)),
      ],
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          spacing: 4,
          children: [
            const Icon(Icons.sort_rounded, size: 18),
            Text(options[value] ?? value),
          ],
        ),
      ),
    );
  }
}

/// Every filter but search and place, changed together and applied with one
/// key, so the list does not reload on each tap.
class _FiltersSheet extends ConsumerStatefulWidget {
  const _FiltersSheet({required this.initial, required this.showCategory});

  final JobQuery initial;
  final bool showCategory;

  @override
  ConsumerState<_FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends ConsumerState<_FiltersSheet> {
  late JobQuery _q = widget.initial;
  late final _salary = TextEditingController(
    text: groupThousands(widget.initial.salaryMin),
  );
  bool _allBenefits = false;

  @override
  void dispose() {
    _salary.dispose();
    super.dispose();
  }

  void _toggle(String benefit) {
    ref.read(hapticsProvider).selection();
    setState(
      () => _q = _q.copyWith(
        benefits: _q.benefits.contains(benefit)
            ? ([..._q.benefits]..remove(benefit))
            : ([..._q.benefits, benefit]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.watch(jobCategoriesProvider).value ?? const [];
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    String n(int v) => localDigits(v, language);
    final floorCurrency = _q.currency.isNotEmpty
        ? _q.currency
        : defaultCurrency[_q.country] ?? 'IRT';

    Widget section(String title, List<Widget> children) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 8,
      children: [
        Text(title, style: text.titleSmall),
        ...children,
      ],
    );

    Widget choices(
      List<String> values,
      String current,
      String Function(String) label,
      void Function(String) onPick, {
      String? any,
    }) => Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        if (any != null)
          ChoiceChip(
            label: Text(any),
            selected: current.isEmpty,
            onSelected: (_) => onPick(''),
          ),
        for (final v in values)
          ChoiceChip(
            label: Text(label(v)),
            selected: current == v,
            onSelected: (_) => onPick(current == v ? '' : v),
          ),
      ],
    );

    String? categoryLabel;
    for (final cat in categories) {
      if (cat.id == _q.categoryId) {
        categoryLabel = categoryName((
          name: cat.name,
          nameEn: cat.nameEn,
        ), language);
      }
    }

    return SizedBox(
      height: MediaQuery.sizeOf(context).height * 0.85,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 12, 4),
            child: Row(
              children: [
                Expanded(child: Text(j.filters, style: text.titleLarge)),
                if (_q.activeFilters > 0)
                  TextButton(
                    onPressed: () => setState(() {
                      _q = _q.cleared();
                      _salary.clear();
                    }),
                    child: Text(j.clearFilters),
                  ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              children: [
                if (widget.showCategory) ...[
                  section(j.category, [
                    // A field like the others, opening the grouped list.
                    InkWell(
                      borderRadius: BorderRadius.circular(BaghRadius.field),
                      onTap: () async {
                        final id = await pickFromList(
                          context,
                          title: j.category,
                          all: j.allCategories,
                          searchable: true,
                          options: [
                            for (final parent in categories.where(
                              (x) => x.parentId == null,
                            )) ...[
                              (
                                parent.id,
                                categoryName((
                                  name: parent.name,
                                  nameEn: parent.nameEn,
                                ), language),
                              ),
                              for (final child in categories.where(
                                (x) => x.parentId == parent.id,
                              ))
                                (
                                  child.id,
                                  '    ${categoryName((name: child.name, nameEn: child.nameEn), language)}',
                                ),
                            ],
                          ],
                        );
                        if (id != null) {
                          setState(() => _q = _q.copyWith(categoryId: id));
                        }
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          suffixIcon: Icon(Icons.expand_more_rounded),
                        ),
                        child: Text(categoryLabel ?? j.allCategories),
                      ),
                    ),
                  ]),
                  const SizedBox(height: BaghSpace.gutter),
                ],
                section(m.employmentType, [
                  choices(
                    _employment,
                    _q.employmentType,
                    m.label,
                    (v) => setState(() => _q = _q.copyWith(employmentType: v)),
                    any: s.list.allOption,
                  ),
                ]),
                const SizedBox(height: BaghSpace.gutter),
                section(m.workArrangement, [
                  choices(
                    _arrangement,
                    _q.workArrangement,
                    m.label,
                    (v) => setState(() => _q = _q.copyWith(workArrangement: v)),
                    any: s.list.allOption,
                  ),
                ]),
                const SizedBox(height: BaghSpace.gutter),
                section(j.seniority, [
                  choices(
                    _seniority,
                    _q.seniority,
                    j.seniorityLevels.label,
                    (v) => setState(() => _q = _q.copyWith(seniority: v)),
                    any: j.anySeniority,
                  ),
                ]),
                const SizedBox(height: BaghSpace.gutter),
                section(j.experience, [
                  choices(
                    _experience,
                    _q.maxExperience,
                    (v) => v == '0'
                        ? j.noExperience
                        : j.upToYears.fill({'n': n(int.parse(v))}),
                    (v) => setState(() => _q = _q.copyWith(maxExperience: v)),
                    any: j.anyExperience,
                  ),
                ]),
                const SizedBox(height: BaghSpace.gutter),
                // The floor means something only in one currency at a time.
                section(j.minSalary.replaceAll(RegExp(r'\s*\([^)]*\)'), ''), [
                  Row(
                    spacing: 8,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _salary,
                          keyboardType: TextInputType.number,
                          textDirection: TextDirection.ltr,
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                              RegExp('[0-9۰-۹٠-٩]'),
                            ),
                            const ThousandsFormatter(),
                          ],
                          onChanged: (v) => setState(
                            () => _q = _q.copyWith(salaryMin: plainDigits(v)),
                          ),
                        ),
                      ),
                      SizedBox(
                        width: 150,
                        child: DropdownButtonFormField<String>(
                          initialValue: floorCurrency,
                          isExpanded: true,
                          decoration: InputDecoration(
                            labelText: j.currencyLabel,
                          ),
                          items: [
                            for (final code in currencyCodes)
                              DropdownMenuItem(
                                value: code,
                                child: Text(
                                  code == 'IRT' ? m.currency : code,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                          ],
                          selectedItemBuilder: (_) => [
                            for (final code in currencyCodes)
                              Text(
                                geo.currency(code, m.currency),
                                overflow: TextOverflow.ellipsis,
                              ),
                          ],
                          onChanged: (v) =>
                              setState(() => _q = _q.copyWith(currency: v)),
                        ),
                      ),
                    ],
                  ),
                ]),
                const SizedBox(height: BaghSpace.gutter),
                section(j.postedWithin, [
                  choices(
                    _postedWithin,
                    _q.postedWithinDays,
                    (v) => v == '1'
                        ? j.last24h
                        : j.lastDays.fill({'n': n(int.parse(v))}),
                    (v) =>
                        setState(() => _q = _q.copyWith(postedWithinDays: v)),
                    any: j.anyTime,
                  ),
                ]),
                const SizedBox(height: BaghSpace.gutter),
                section(j.benefits, [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final b
                          in _allBenefits
                              ? jobBenefits
                              : jobBenefits.take(_topBenefits))
                        FilterChip(
                          label: Text(j.benefitLabels.label(b)),
                          selected: _q.benefits.contains(b),
                          onSelected: (_) => _toggle(b),
                        ),
                    ],
                  ),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: TextButton(
                      onPressed: () =>
                          setState(() => _allBenefits = !_allBenefits),
                      child: Text(
                        _allBenefits ? j.fewerBenefits : j.moreBenefits,
                      ),
                    ),
                  ),
                ]),
                const SizedBox(height: BaghSpace.gutter),
                section(j.special, [
                  for (final (on, label, set)
                      in <(bool, String, JobQuery Function(bool))>[
                        (
                          _q.urgent,
                          j.urgentOnly,
                          (v) => _q.copyWith(urgent: v),
                        ),
                        (
                          _q.amriehEligible,
                          j.amriehOnly,
                          (v) => _q.copyWith(amriehEligible: v),
                        ),
                        (
                          _q.disabilityFriendly,
                          j.disabilityOnly,
                          (v) => _q.copyWith(disabilityFriendly: v),
                        ),
                        (
                          _q.remoteWorldwide,
                          j.remoteWorldwideOnly,
                          (v) => _q.copyWith(remoteWorldwide: v),
                        ),
                      ])
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(label, style: text.bodyMedium),
                      value: on,
                      onChanged: (v) => setState(() => _q = set(v)),
                    ),
                ]),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: c.edge.withValues(alpha: 0.3)),
                ),
              ),
              child: BaghKey(
                label: s.mobile.showResults,
                icon: Icons.check_rounded,
                expand: true,
                onPressed: () => Navigator.of(context).pop(_q),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Saving the board's current filters as an alert that notifies. Signed
/// out, the way to sign in that comes back to the board.
class _SaveSearchSheet extends ConsumerStatefulWidget {
  const _SaveSearchSheet({required this.query, required this.defaultName});

  final JobQuery query;
  final String defaultName;

  @override
  ConsumerState<_SaveSearchSheet> createState() => _SaveSearchSheetState();
}

class _SaveSearchSheetState extends ConsumerState<_SaveSearchSheet> {
  late final _name = TextEditingController(
    text: widget.defaultName.characters.take(80).toString(),
  );
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final s = ref.read(stringsProvider);
    if (_name.text.trim().isEmpty || _saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(seekerActionsProvider)
          .createAlert(_name.text, alertQueryOf(widget.query));
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.jobs.alertCreated)));
      Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final text = Theme.of(context).textTheme;
    final signedIn = ref.watch(sessionProvider).value != null;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 14,
          children: [
            Text(j.saveSearch, style: text.titleLarge),
            if (!signedIn) ...[
              Text(j.signInToSave),
              BaghKey(
                label: s.nav.login,
                icon: Icons.login_rounded,
                expand: true,
                onPressed: () {
                  final here = GoRouterState.of(context).uri.toString();
                  Navigator.of(context).pop();
                  context.push(
                    Uri(
                      path: '/login',
                      queryParameters: {'from': here},
                    ).toString(),
                  );
                },
              ),
            ] else ...[
              TextField(
                controller: _name,
                maxLength: 80,
                buildCounter: localCounter(ref.watch(l10nProvider).language),
                autofocus: true,
                decoration: InputDecoration(labelText: j.alertName),
                onSubmitted: (_) => _save(),
              ),
              if (_error != null) FormMessage(_error!),
              BaghKey(
                label: j.saveSearch,
                icon: Icons.notification_add_outlined,
                loading: _saving,
                expand: true,
                onPressed: _save,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// "Recommended for you", above the results, for a member we know something
/// about: three postings, and from what they were picked. Somebody with
/// nothing to go on is asked for their skills instead.
class _Recommended extends ConsumerWidget {
  const _Recommended();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final j = ref.watch(stringsProvider).jobs;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final picked = ref.watch(recommendedJobsProvider).value;
    if (picked == null) return const SizedBox.shrink();
    if (picked.basis == 'none') {
      return Padding(
        padding: const EdgeInsets.only(bottom: BaghSpace.gutter),
        child: SoftSurface(
          tint: c.primarySoft,
          padding: const EdgeInsets.all(14),
          onTap: () => context.push('/dashboard/profile'),
          child: Row(
            spacing: 10,
            children: [
              Icon(Icons.auto_awesome_outlined, color: c.primarySoft.ink),
              Expanded(
                child: Text(
                  j.addSkillsPrompt,
                  style: text.bodyMedium?.copyWith(color: c.primarySoft.ink),
                ),
              ),
              Text(
                j.editProfile,
                style: text.labelLarge?.copyWith(color: c.primarySoft.ink),
              ),
            ],
          ),
        ),
      );
    }
    if (picked.items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: BaghSpace.section),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Row(
            spacing: 8,
            children: [
              Icon(Icons.auto_awesome_outlined, color: c.primary, size: 20),
              Expanded(
                child: Text(j.recommendedTitle, style: text.titleMedium),
              ),
            ],
          ),
          Text(
            picked.basis == 'skills'
                ? j.recommendedBasisSkills
                : j.recommendedBasisActivity,
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
          for (final (job, _) in picked.items.take(3)) JobCard(job: job),
          const Divider(),
        ],
      ),
    );
  }
}
