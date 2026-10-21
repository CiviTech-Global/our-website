import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'job_card.dart';
import 'jobs_data.dart';
import 'jobs_format.dart';

/// The server's COMPANY_INDUSTRIES, in its order.
const companyIndustries = [
  'SOFTWARE_INTERNET',
  'TELECOM',
  'ECOMMERCE',
  'FINTECH_BANKING',
  'INSURANCE',
  'INVESTMENT',
  'ACCOUNTING_CONSULTING',
  'MANAGEMENT_CONSULTING',
  'LEGAL_SERVICES',
  'RECRUITMENT_HR',
  'MARKETING_ADVERTISING',
  'MEDIA_PUBLISHING',
  'EDUCATION',
  'HEALTHCARE',
  'PHARMACEUTICAL',
  'MEDICAL_DEVICES',
  'FMCG',
  'FOOD_BEVERAGE',
  'RETAIL',
  'WHOLESALE_TRADE',
  'AUTOMOTIVE',
  'MANUFACTURING',
  'OIL_GAS_PETROCHEMICAL',
  'CHEMICALS',
  'MINING_METALS',
  'ENERGY_UTILITIES',
  'CONSTRUCTION',
  'ARCHITECTURE_DESIGN',
  'REAL_ESTATE',
  'TRANSPORT_LOGISTICS',
  'TRAVEL_HOSPITALITY',
  'RESTAURANTS',
  'AGRICULTURE',
  'TEXTILES',
  'HOME_APPLIANCES',
  'COSMETICS_FASHION',
  'GAMING_ENTERTAINMENT',
  'NONPROFIT',
  'GOVERNMENT',
  'OTHER',
];

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

/// An employer as the directory and its page read it.
class Company {
  Company.fromJson(Map<String, Object?> j)
    : slug = '${j['slug']}',
      name = '${j['name'] ?? ''}',
      tagline = _text(j['tagline']),
      about = _text(j['about']),
      industry = _text(j['industry']),
      size = _text(j['size']),
      foundedYear = (j['foundedYear'] as num?)?.toInt(),
      website = _text(j['website']),
      country = _text(j['country']),
      province = _text(j['province']),
      city = _text(j['city']),
      logoUrl = _text(j['logoUrl']),
      coverUrl = _text(j['coverUrl']),
      openJobs = (j['openJobs'] as num?)?.toInt() ?? 0,
      responsive = (j['responsiveness'] as Map?)?['responsive'] == true,
      hiredCount = (j['hiredCount'] as num?)?.toInt() ?? 0,
      jobs = [
        for (final job in (j['jobs'] as List? ?? const []))
          if (job is Map<String, Object?>)
            // A role carries its company only when it has one to show; on
            // its own company's page it always does.
            JobSummary.fromJson({
              ...job,
              'companyName': job['companyName'] ?? j['name'],
              'company':
                  job['company'] ??
                  {
                    'slug': j['slug'],
                    'name': j['name'],
                    'logoUrl': j['logoUrl'],
                  },
            }),
      ];

  final String slug;
  final String name;
  final String? tagline;
  final String? about;
  final String? industry;
  final String? size;
  final int? foundedYear;
  final String? website;
  final String? country;
  final String? province;
  final String? city;
  final String? logoUrl;
  final String? coverUrl;
  final int openJobs;
  final bool responsive;
  final int hiredCount;
  final List<JobSummary> jobs;

  String place(GeoNames geo, String language) => placeOf(
    city: city,
    province: province,
    country: country,
    geo: geo,
    language: language,
  );
}

@immutable
class CompanyQuery {
  const CompanyQuery({
    this.search = '',
    this.industry = '',
    this.country = '',
    this.province = '',
  });

  final String search;
  final String industry;
  final String country;
  final String province;

  Map<String, Object?> toParams() => {
    if (search.trim().isNotEmpty) 'search': search.trim(),
    if (industry.isNotEmpty) 'industry': industry,
    if (country.isNotEmpty) 'country': country,
    // Provinces are Iran's: one left from before the country changed goes.
    if (province.isNotEmpty && (country.isEmpty || country == homeCountry))
      'province': province,
  };

  @override
  bool operator ==(Object other) =>
      other is CompanyQuery && mapEquals(other.toParams(), toParams());

  @override
  int get hashCode => Object.hashAll(
    toParams().entries.map((e) => Object.hash(e.key, e.value)),
  );
}

typedef CompanyPage = ({List<Company> items, int page, int totalPages});

final companiesProvider = AsyncNotifierProvider.autoDispose
    .family<CompaniesController, CompanyPage, CompanyQuery>(
      CompaniesController.new,
    );

/// The directory for one query, 24 at a time, paging in near the end.
class CompaniesController extends AsyncNotifier<CompanyPage> {
  CompaniesController(this.query);

  final CompanyQuery query;
  bool _loadingMore = false;

  Future<CompanyPage> _fetch(int page) => ref
      .read(apiClientProvider)
      .get(
        '/jobs/companies',
        query: {...query.toParams(), 'page': page, 'pageSize': 24},
        parse: (d) {
          final m = d! as Map;
          return (
            items: [
              for (final c in (m['items'] as List? ?? const []))
                if (c is Map<String, Object?>) Company.fromJson(c),
            ],
            page: (m['page'] as num?)?.toInt() ?? page,
            totalPages: (m['totalPages'] as num?)?.toInt() ?? 1,
          );
        },
      );

  @override
  Future<CompanyPage> build() => _fetch(1);

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || current.page >= current.totalPages || _loadingMore) {
      return;
    }
    _loadingMore = true;
    try {
      final next = await _fetch(current.page + 1);
      final seen = {for (final c in current.items) c.slug};
      state = AsyncData((
        items: [
          ...current.items,
          ...next.items.where((c) => !seen.contains(c.slug)),
        ],
        page: next.page,
        totalPages: next.totalPages,
      ));
    } finally {
      _loadingMore = false;
    }
  }
}

final companyProvider = FutureProvider.autoDispose.family<Company, String>(
  (ref, slug) => ref
      .read(apiClientProvider)
      .get(
        '/jobs/companies/${Uri.encodeComponent(slug)}',
        parse: (d) => Company.fromJson(d! as Map<String, Object?>),
      ),
);

/// The directory of verified employers, those with the most open roles
/// first, as the web's CompaniesPage: where a job-seeker decides whether
/// they want to work somewhere at all, before any one posting.
class CompaniesScreen extends ConsumerStatefulWidget {
  const CompaniesScreen({super.key});

  @override
  ConsumerState<CompaniesScreen> createState() => _CompaniesScreenState();
}

class _CompaniesScreenState extends ConsumerState<CompaniesScreen> {
  final _scroll = ScrollController();
  Timer? _debounce;
  CompanyQuery _query = const CompanyQuery();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.extentAfter < 600) {
        ref.read(companiesProvider(_query).notifier).loadMore();
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  void _set(CompanyQuery next) {
    setState(() => _query = next);
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final page = ref.watch(companiesProvider(_query));
    final provinceApplies =
        _query.country.isEmpty || _query.country == homeCountry;

    Widget chip(
      IconData icon,
      String label,
      bool selected,
      Future<void> Function() onTap,
    ) => FilterChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      selected: selected,
      showCheckmark: false,
      onSelected: (_) => onTap(),
    );

    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(j.companiesTitle),
        actions: const [HelpAction('jobs')],
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: c.primary,
          onRefresh: () => ref.refresh(companiesProvider(_query).future),
          child: ListView(
            controller: _scroll,
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 3,
            ),
            children: [
              Text(
                j.companiesSubtitle,
                style: text.bodyMedium?.copyWith(color: c.ink2),
              ),
              const SizedBox(height: BaghSpace.gutter),
              TextField(
                onChanged: (v) {
                  _debounce?.cancel();
                  _debounce = Timer(
                    const Duration(milliseconds: 400),
                    () => _set(
                      CompanyQuery(
                        search: v,
                        industry: _query.industry,
                        country: _query.country,
                        province: _query.province,
                      ),
                    ),
                  );
                },
                decoration: InputDecoration(
                  hintText: j.searchCompanies,
                  prefixIcon: const Icon(Icons.search_rounded),
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  chip(
                    Icons.category_outlined,
                    _query.industry.isEmpty
                        ? j.allIndustries
                        : j.industries.label(_query.industry),
                    _query.industry.isNotEmpty,
                    () async {
                      final v = await pickFromList(
                        context,
                        title: j.industry,
                        all: j.allIndustries,
                        searchable: true,
                        options: [
                          for (final key in companyIndustries)
                            (key, j.industries.label(key)),
                        ],
                      );
                      if (v != null) {
                        _set(
                          CompanyQuery(
                            search: _query.search,
                            industry: v,
                            country: _query.country,
                            province: _query.province,
                          ),
                        );
                      }
                    },
                  ),
                  chip(
                    Icons.public_rounded,
                    _query.country.isEmpty
                        ? j.allCountries
                        : geo.country(_query.country),
                    _query.country.isNotEmpty,
                    () async {
                      final v = await pickFromList(
                        context,
                        title: j.country,
                        all: j.allCountries,
                        searchable: true,
                        options: geo.countryOptions(),
                      );
                      if (v != null) {
                        _set(
                          CompanyQuery(
                            search: _query.search,
                            industry: _query.industry,
                            country: v,
                            province: _query.province,
                          ),
                        );
                      }
                    },
                  ),
                  if (provinceApplies)
                    chip(
                      Icons.place_outlined,
                      _query.province.isEmpty
                          ? j.allProvinces
                          : displayProvince(_query.province, language),
                      _query.province.isNotEmpty,
                      () async {
                        final v = await pickFromList(
                          context,
                          title: s.market.province,
                          all: j.allProvinces,
                          options: [
                            for (final p in iranProvinces)
                              (p.fa, provinceLabel(p, language)),
                          ],
                        );
                        if (v != null) {
                          _set(
                            CompanyQuery(
                              search: _query.search,
                              industry: _query.industry,
                              country: _query.country,
                              province: v,
                            ),
                          );
                        }
                      },
                    ),
                ],
              ),
              const SizedBox(height: BaghSpace.gutter),
              if (page.value case final p?)
                if (p.items.isEmpty)
                  EmptyNote(message: j.noCompanies)
                else
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 12,
                    children: [
                      for (final company in p.items) _CompanyCard(company),
                      if (p.page < p.totalPages)
                        const Center(child: GirihSpinner()),
                    ],
                  )
              else
                AsyncView(
                  value: page,
                  onRetry: () => ref.invalidate(companiesProvider(_query)),
                  data: (_) => const SizedBox.shrink(),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CompanyCard extends ConsumerWidget {
  const _CompanyCard(this.company);

  final Company company;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final j = ref.watch(stringsProvider).jobs;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final where = company.place(geo, language);
    return SoftSurface(
      onTap: () =>
          context.push('/companies/${Uri.encodeComponent(company.slug)}'),
      semanticLabel: company.name,
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 12,
        children: [
          RemoteImage(
            url: apiAsset(company.logoUrl),
            width: 48,
            height: 48,
            fit: BoxFit.contain,
            radius: 10,
            initials: company.name.characters.firstOrNull,
            tint: 2,
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 4,
              children: [
                Text(company.name, style: text.titleMedium),
                if (company.tagline case final tagline?)
                  Text(
                    tagline,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall?.copyWith(color: c.ink2),
                  ),
                Wrap(
                  spacing: 12,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    if (company.industry case final industry?)
                      Text(
                        j.industries.label(industry),
                        style: text.labelSmall?.copyWith(color: c.ink2),
                      ),
                    if (where.isNotEmpty)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        spacing: 3,
                        children: [
                          Icon(Icons.place_outlined, size: 14, color: c.ink2),
                          Flexible(
                            child: Text(
                              where,
                              style: text.labelSmall?.copyWith(color: c.ink2),
                            ),
                          ),
                        ],
                      ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      spacing: 3,
                      children: [
                        Icon(
                          Icons.work_outline_rounded,
                          size: 14,
                          color: c.primary,
                        ),
                        Flexible(
                          child: Text(
                            j.openJobsCount.fill({
                              'count': localDigits(company.openJobs, language),
                            }),
                            style: text.labelSmall?.copyWith(color: c.primary),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// One employer's page, as the web's CompanyPage: who they are, how they
/// answer, and every role they have open, as the same cards as the board.
class CompanyScreen extends ConsumerWidget {
  const CompanyScreen({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final company = ref.watch(companyProvider(slug));
    final c = BaghColors.of(context);
    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(company.value?.name ?? s.jobs.companiesTitle),
        actions: const [HelpAction('jobs')],
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: c.primary,
          onRefresh: () => ref.refresh(companyProvider(slug).future),
          child: ListView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            children: [
              // Gone is not the same as unreachable: only a 404 says so.
              if (company.hasError &&
                  ApiException.from(company.error!).status == 404)
                EmptyNote(
                  message: s.errors.notFoundBody,
                  action: (
                    s.jobs.companiesTitle,
                    () => context.go('/companies'),
                  ),
                )
              else
                AsyncView(
                  value: company,
                  onRetry: () => ref.invalidate(companyProvider(slug)),
                  data: _CompanyBody.new,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CompanyBody extends ConsumerWidget {
  const _CompanyBody(this.company);

  final Company company;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final j = ref.watch(stringsProvider).jobs;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final where = company.place(geo, language);
    final facts = <(IconData, String, String)>[
      if (company.industry case final i?)
        (Icons.business_outlined, j.industry, j.industries.label(i)),
      if (company.size case final size?)
        (Icons.groups_outlined, j.companySize, j.companySizes.label(size)),
      // A year, not an amount: no grouping.
      if (company.foundedYear case final year?)
        (Icons.event_outlined, j.founded, localDigits(year, language)),
      if (where.isNotEmpty) (Icons.place_outlined, j.location, where),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: BaghSpace.gutter,
      children: [
        SoftSurface(
          padding: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // The cover, with the logo standing on its lower edge.
              SizedBox(
                height: 160,
                child: Stack(
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(BaghRadius.card),
                      ),
                      child: SizedBox(
                        height: 120,
                        width: double.infinity,
                        child: company.coverUrl == null
                            ? ColoredBox(color: c.tints[2].fill)
                            : RemoteImage(
                                url: apiAsset(company.coverUrl),
                                radius: 0,
                                tint: 2,
                              ),
                      ),
                    ),
                    PositionedDirectional(
                      start: 16,
                      bottom: 0,
                      child: Container(
                        decoration: BoxDecoration(
                          color: c.surface,
                          border: Border.all(color: c.surface, width: 4),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: RemoteImage(
                          url: apiAsset(company.logoUrl),
                          width: 72,
                          height: 72,
                          fit: BoxFit.contain,
                          radius: 14,
                          initials: company.name.characters.firstOrNull,
                          tint: 2,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 12,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 8,
                      children: [
                        Text(company.name, style: text.headlineSmall),
                        if (company.tagline case final tagline?)
                          Text(
                            tagline,
                            style: text.bodyMedium?.copyWith(color: c.ink2),
                          ),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            if (company.responsive)
                              StatusPill(j.responsiveEmployer, tone: 0),
                            if (company.hiredCount > 0)
                              StatusPill(
                                j.hiredCount.fill({
                                  'count': localDigits(
                                    company.hiredCount,
                                    language,
                                  ),
                                }),
                                tone: 2,
                              ),
                          ],
                        ),
                      ],
                    ),
                    if (facts.isNotEmpty)
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final (icon, label, value) in facts)
                            _Fact(icon: icon, label: label, value: value),
                        ],
                      ),
                    if (company.website case final site?)
                      TextButton.icon(
                        onPressed: () => openLink(context, ref, site),
                        icon: const Icon(Icons.language_rounded),
                        label: Text(
                          site.replaceFirst(RegExp('^https?://'), ''),
                          textDirection: TextDirection.ltr,
                        ),
                      ),
                    if (company.about case final about?) ...[
                      Text(j.about, style: text.titleMedium),
                      Text(
                        about,
                        textDirection: textDirectionOf(
                          about,
                          Directionality.of(context),
                        ),
                        style: text.bodyMedium?.copyWith(color: c.ink2),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        Text(
          '${j.openRoles} (${localDigits(company.jobs.length, language)})',
          style: text.titleLarge,
        ),
        if (company.jobs.isEmpty)
          EmptyNote(message: j.noOpenRoles)
        else
          for (final job in company.jobs) JobCard(job: job),
      ],
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: c.fill,
        borderRadius: BorderRadius.circular(BaghRadius.field),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        spacing: 2,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 4,
            children: [
              Icon(icon, size: 13, color: c.ink2),
              Flexible(
                child: Text(
                  label,
                  style: text.labelSmall?.copyWith(color: c.ink2),
                ),
              ),
            ],
          ),
          Text(value, style: text.bodyMedium),
        ],
      ),
    );
  }
}
