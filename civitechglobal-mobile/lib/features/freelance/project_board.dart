import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/sheet.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../browse/browse.dart';
import 'freelance_data.dart';
import 'freelance_ui.dart';

const _maxBids = ['5', '10', '20'];
const _postedWithin = ['1', '3', '7', '14', '30'];

/// The project board, second generation, as the web's ProjectBoardPage: one
/// screen for the board (/projects) and a category's landing page
/// (/projects/category/:slug), with the filters the leading freelance
/// boards offer.
class ProjectBoardScreen extends ConsumerWidget {
  const ProjectBoardScreen({
    this.categorySlug,
    this.initial = const {},
    super.key,
  });

  final String? categorySlug;

  /// A link's own parameters, where the reader's choices start.
  final Map<String, String> initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.watch(workCategoriesProvider);
    final signedIn = ref.watch(sessionProvider).value != null;

    WorkCategory? fixed;
    if (categorySlug case final slug?) {
      // A category page waits for the list that says which id its slug is,
      // so it never shows the whole board for a moment first.
      if (!categories.hasValue) {
        return Scaffold(
          appBar: AppBar(title: Text(w.boardTitle)),
          body: AsyncView(
            value: categories,
            onRetry: () => ref.invalidate(workCategoriesProvider),
            data: (_) => const SizedBox.shrink(),
          ),
        );
      }
      fixed = categories.value!.where((c) => c.slug == slug).firstOrNull;
      if (fixed == null) {
        return Scaffold(
          appBar: AppBar(title: Text(w.boardTitle)),
          body: EmptyNote(
            message: s.errors.notFoundBody,
            action: (w.boardTitle, () => context.go('/projects')),
          ),
        );
      }
    }
    final fixedLabel = fixed?.label(language);

    return BrowseScreen(
      title: fixedLabel == null ? w.boardTitle : '${w.boardTitle}: $fixedLabel',
      subtitle: w.boardSubtitle,
      path: '/market/projects',
      helpId: 'projects',
      searchHint: w.searchProjects,
      emptyText: s.market.noProjects,
      countText: w.projectsCount,
      fixed: {'workCategoryId': ?fixed?.id},
      initial: initial,
      sorts: [
        ('newest', s.market.sortNewest),
        ('fewestBids', w.fewestProposals),
        ('budgetDesc', s.market.sortBudgetDesc),
        ('budgetAsc', s.market.sortBudgetAsc),
        ('closingSoon', s.market.sortClosingSoon),
      ],
      actions: [
        IconButton(
          tooltip: w.servicesTitle,
          icon: const Icon(Icons.layers_outlined),
          onPressed: () => context.push('/freelance-services'),
        ),
        IconButton(
          tooltip: w.talentTitle,
          icon: const Icon(Icons.groups_outlined),
          onPressed: () => context.push('/freelancers'),
        ),
      ],
      header: [
        ActionChip(
          avatar: const Icon(Icons.add_circle_outline_rounded, size: 18),
          label: Text(w.postProject),
          onPressed: () => openLink(context, ref, '/dashboard/projects/new'),
        ),
      ],
      belowCount: signedIn && fixed == null ? const _Recommended() : null,
      onSaveSearch: (context, query) => showBaghSheet<void>(
        context,
        isScrollControlled: true,
        builder: (_) => _SaveSearchSheet(
          query: query,
          defaultName: query.params['search'] ?? fixedLabel ?? w.boardTitle,
        ),
      ),
      filters: (query) {
        final hourly = query.params['pricingType'] == 'HOURLY';
        return [
          if (fixed == null)
            PickerFilter(
              w.categoryLabel,
              'workCategoryId',
              workCategoryOptions(
                categories.value ?? const [],
                language,
                counts: 'projects',
              ),
              all: j.allCategories,
            ),
          ChoiceFilter(w.pricingLabel, 'pricingType', [
            for (final p in const ['FIXED', 'HOURLY']) (p, w.pricing.label(p)),
          ], all: s.list.allOption),
          ChoiceFilter(w.experienceLabel, 'experienceLevel', [
            for (final e in experienceLevels) (e, w.experience.label(e)),
          ], all: s.list.allOption),
          MoneyRangeFilter(
            hourly ? w.budgetHourlyLabel : w.budgetFixedLabel,
            minKey: 'budgetMin',
            maxKey: 'budgetMax',
            minLabel: w.budgetMinLabel,
            maxLabel: w.budgetMaxLabel,
            currencyKey: 'currency',
          ),
          PickerFilter(
            w.durationLabel,
            'duration',
            [for (final d in projectDurations) (d, w.durations.label(d))],
            all: s.list.allOption,
            searchable: false,
          ),
          if (hourly)
            ChoiceFilter(w.weeklyHoursLabel, 'weeklyHours', [
              for (final h in weeklyHoursOptions) (h, w.weeklyHours.label(h)),
            ], all: s.list.allOption),
          ChoiceFilter(w.proposals, 'maxBids', [
            for (final b in _maxBids)
              (b, w.maxProposals.fill({'count': localDigits(b, language)})),
          ], all: s.list.allOption),
          ChoiceFilter(j.postedWithin, 'postedWithinDays', [
            for (final d in _postedWithin)
              (
                d,
                d == '1'
                    ? j.last24h
                    : j.lastDays.fill({'n': localDigits(d, language)}),
              ),
          ], all: j.anyTime),
          PickerFilter(
            w.countriesLabel.replaceAll(RegExp(r'\s*\([^)]*\)'), ''),
            'country',
            geo.countryOptions(),
            all: w.anywhere,
          ),
          PickerFilter(w.languagesLabel, 'language', [
            for (final code in workLanguages) (code, geo.language(code)),
          ], all: s.list.allOption),
          SwitchFilter(w.clientVerified, 'clientVerified'),
          SwitchFilter(w.clientHasHired, 'clientHired'),
          SwitchFilter(w.urgent, 'urgent'),
          SwitchFilter(w.featured, 'featured'),
          SwitchFilter(w.nda, 'nda'),
          SwitchFilter(w.onsite, 'onsite'),
          SwitchFilter(w.contractToHire, 'contractToHire'),
        ];
      },
      itemBuilder: (_, row) =>
          ProjectCard(project: ProjectSummary.fromJson(row)),
    );
  }
}

/// Picked for a member: from their skills, from what they have looked at,
/// or a prompt to add skills when there is nothing to go on.
class _Recommended extends ConsumerWidget {
  const _Recommended();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final picked = ref.watch(recommendedProjectsProvider).value;
    if (picked == null) return const SizedBox.shrink();
    if (picked.basis == 'none') {
      return Padding(
        padding: const EdgeInsets.only(bottom: BaghSpace.gutter),
        child: Row(
          spacing: 8,
          children: [
            Icon(Icons.auto_awesome_outlined, color: c.primary, size: 18),
            Expanded(child: Text(w.addSkillsPrompt, style: text.bodySmall)),
            TextButton(
              onPressed: () => context.push('/dashboard/profile'),
              child: Text(s.jobs.editProfile),
            ),
          ],
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
          Text(w.recommendedTitle, style: text.titleMedium),
          Text(
            picked.basis == 'skills'
                ? w.recommendedBasisSkills
                : w.recommendedBasisActivity,
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
          for (final p in picked.items.take(3)) ProjectCard(project: p),
        ],
      ),
    );
  }
}

/// The current search as a project alert. Signed out, a sign-in first.
class _SaveSearchSheet extends ConsumerStatefulWidget {
  const _SaveSearchSheet({required this.query, required this.defaultName});

  final BrowseQuery query;
  final String defaultName;

  @override
  ConsumerState<_SaveSearchSheet> createState() => _SaveSearchSheetState();
}

class _SaveSearchSheetState extends ConsumerState<_SaveSearchSheet> {
  late final _name = TextEditingController(
    text: widget.defaultName.length > 80
        ? widget.defaultName.substring(0, 80)
        : widget.defaultName,
  );
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  /// What an alert can carry, as the web's ProjectAlertQuery: a budget
  /// floor only in toman, the one currency alerts compare in.
  Map<String, Object?> _alertQuery() {
    final p = widget.query.params;
    return {
      for (final key in const [
        'search',
        'workCategoryId',
        'pricingType',
        'experienceLevel',
        'country',
        'language',
      ])
        if ((p[key] ?? '').isNotEmpty) key: p[key],
      if ((p['budgetMin'] ?? '').isNotEmpty &&
          (p['currency'] ?? 'IRT') == 'IRT')
        'budgetMin': p['budgetMin'],
    };
  }

  Future<void> _save() async {
    final s = ref.read(stringsProvider);
    if (_name.text.trim().isEmpty) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(freelanceActionsProvider)
          .createProjectAlert(_name.text, _alertQuery());
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.work.alertCreated)));
      Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final text = Theme.of(context).textTheme;
    final signedIn = ref.watch(sessionProvider).value != null;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 14,
          children: [
            Text(w.saveSearch, style: text.titleLarge),
            if (!signedIn) ...[
              Text(s.jobs.signInToSave, style: text.bodyMedium),
              BaghKey(
                label: s.nav.login,
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
                decoration: InputDecoration(labelText: w.alertName),
              ),
              if (_error case final e?) FormMessage(e),
              BaghKey(
                label: w.saveSearch,
                icon: Icons.notification_add_outlined,
                loading: _sending,
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
