import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';

/// One member of the club of experts, as `GET /consult/experts` lists them.
class Expert {
  const Expert({
    required this.slug,
    required this.fullName,
    required this.headline,
    this.bio,
    this.specialities = const [],
    this.languages = const [],
    this.yearsExperience,
    this.linkedin,
    this.github,
    this.website,
    this.acceptsConsultations = false,
    this.photoUrl,
  });

  factory Expert.fromJson(Map<String, Object?> j) {
    List<String> strings(Object? list) => [
      for (final v in (list as List? ?? const [])) '$v',
    ];
    return Expert(
      slug: '${j['slug']}',
      fullName: '${j['fullName'] ?? ''}',
      headline: '${j['headline'] ?? ''}',
      bio: j['bio'] as String?,
      specialities: strings(j['specialities']),
      languages: strings(j['languages']),
      yearsExperience: (j['yearsExperience'] as num?)?.toInt(),
      linkedin: j['linkedinUrl'] as String?,
      github: j['githubUrl'] as String?,
      website: j['websiteUrl'] as String?,
      acceptsConsultations: j['acceptsConsultations'] == true,
      photoUrl: j['photoUrl'] as String?,
    );
  }

  final String slug;
  final String fullName;
  final String headline;
  final String? bio;
  final List<String> specialities;
  final List<String> languages;
  final int? yearsExperience;
  final String? linkedin;
  final String? github;
  final String? website;
  final bool acceptsConsultations;
  final String? photoUrl;
}

/// The club, in the order the staff set: `GET /consult/experts`.
final expertsProvider = FutureProvider<List<Expert>>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/consult/experts',
        parse: (d) => [
          for (final e in (d as List? ?? const []))
            if (e is Map<String, Object?>) Expert.fromJson(e),
        ],
      ),
);

/// One expert's profile: `GET /consult/experts/:slug`.
final expertProvider = FutureProvider.family<Expert, String>(
  (ref, slug) => ref
      .read(apiClientProvider)
      .get(
        '/consult/experts/${Uri.encodeComponent(slug)}',
        parse: (d) => Expert.fromJson(d! as Map<String, Object?>),
      ),
);

/// The club of experts, as the web's ExpertsPage: a directory to act on.
/// Every profile that takes consultations carries the way to ask for one,
/// with that person already chosen. Search covers names, headlines and
/// specialities; the chips narrow to one speciality or to those who consult.
class ExpertsScreen extends ConsumerStatefulWidget {
  const ExpertsScreen({super.key});

  @override
  ConsumerState<ExpertsScreen> createState() => _ExpertsScreenState();
}

class _ExpertsScreenState extends ConsumerState<ExpertsScreen> {
  String _query = '';
  String? _speciality;
  bool _consultsOnly = false;

  bool _matches(Expert e) {
    if (_consultsOnly && !e.acceptsConsultations) return false;
    if (_speciality case final sp? when !e.specialities.contains(sp)) {
      return false;
    }
    if (_query.isEmpty) return true;
    return [
      e.fullName,
      e.headline,
      ...e.specialities,
    ].any((field) => field.toLowerCase().contains(_query));
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final k = s.experts;
    final experts = ref.watch(expertsProvider);
    return ContentPage(
      title: k.title,
      subtitle: k.subtitle,
      helpId: 'experts',
      children: [
        AsyncView(
          value: experts,
          onRetry: () => ref.invalidate(expertsProvider),
          isEmpty: (list) => list.isEmpty,
          empty: k.empty,
          data: (list) {
            // From the people actually listed, so no chip can return nobody.
            final specialities = {
              for (final e in list) ...e.specialities,
            }.toList()..sort();
            final shown = list.where(_matches).toList();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: BaghSpace.section),
                TextField(
                  onChanged: (v) =>
                      setState(() => _query = v.trim().toLowerCase()),
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: k.searchPlaceholder,
                    prefixIcon: const Icon(Icons.search_rounded),
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FilterChip(
                      label: Text(k.takesConsultations),
                      selected: _consultsOnly,
                      onSelected: (v) => setState(() => _consultsOnly = v),
                    ),
                    for (final sp in specialities)
                      ChoiceChip(
                        label: Text(sp),
                        selected: _speciality == sp,
                        onSelected: (v) =>
                            setState(() => _speciality = v ? sp : null),
                      ),
                  ],
                ),
                const SizedBox(height: BaghSpace.section),
                if (shown.isEmpty)
                  EmptyNote(message: s.list.noResults)
                else
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: BaghSpace.gutter,
                    children: [
                      for (final (i, e) in shown.indexed)
                        _ExpertCard(expert: e, tint: i),
                    ],
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _ExpertCard extends ConsumerWidget {
  const _ExpertCard({required this.expert, required this.tint});

  final Expert expert;
  final int tint;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    return SoftSurface(
      onTap: () => context.push('/experts/${expert.slug}'),
      semanticLabel: expert.fullName,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Row(
            spacing: 14,
            children: [
              RemoteImage(
                url: apiAsset(expert.photoUrl),
                width: 64,
                height: 64,
                radius: 32,
                tint: tint,
                initials: initialsOf(expert.fullName),
                semanticLabel: expert.fullName,
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(expert.fullName, style: text.titleMedium),
                    Text(
                      expert.headline,
                      style: text.bodySmall?.copyWith(color: c.ink2),
                    ),
                  ],
                ),
              ),
            ],
          ),
          _Standing(expert: expert),
          if (expert.specialities.isNotEmpty)
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final sp in expert.specialities.take(5))
                  _Tag(sp, c.tints[tint % c.tints.length]),
              ],
            ),
          if (expert.acceptsConsultations)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: BaghKey(
                label: s.experts.consultCta,
                icon: Icons.forum_outlined,
                kind: BaghKeyKind.tonal,
                onPressed: () => context.push(_consultPath(expert)),
              ),
            ),
        ],
      ),
    );
  }
}

/// One expert, as the web's ExpertProfilePage: who they are, what they help
/// with and in which languages, and the consultation key kept in reach.
class ExpertScreen extends ConsumerWidget {
  const ExpertScreen({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final k = s.experts;
    final expert = ref.watch(expertProvider(slug));
    final e = expert.value;
    return ContentPage(
      title: e?.fullName ?? k.title,
      subtitle: e?.headline,
      helpId: 'experts',
      bottom: e == null || !e.acceptsConsultations
          ? null
          : BaghKey(
              // The name is the page's title; with it, the key would wrap
              // to several lines at large text.
              label: k.consultCta,
              icon: Icons.forum_outlined,
              expand: true,
              onPressed: () => context.push(_consultPath(e)),
            ),
      children: [
        // Gone is not the same as unreachable: only a 404 says so, and
        // anything else keeps its retry.
        if (expert.hasError && ApiException.from(expert.error!).status == 404)
          EmptyNote(
            message: k.notFound,
            action: (k.backToClub, () => context.go('/experts')),
          )
        else
          AsyncView(
            value: expert,
            onRetry: () => ref.invalidate(expertProvider(slug)),
            data: _Profile.new,
          ),
      ],
    );
  }
}

class _Profile extends ConsumerWidget {
  const _Profile(this.expert);

  final Expert expert;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final k = s.experts;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final links = <(IconData, String, String)>[
      if (expert.linkedin case final l? when l.isNotEmpty)
        (Icons.work_outline_rounded, 'LinkedIn', l),
      if (expert.github case final g? when g.isNotEmpty)
        (Icons.code_rounded, 'GitHub', g),
      if (expert.website case final w? when w.isNotEmpty)
        (Icons.language_rounded, s.team.websiteLabel, w),
    ];

    Widget tags(String title, List<String> values, int tint) => ContentSection(
      title: title,
      children: [
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [for (final v in values) _Tag(v, c.tints[tint])],
        ),
      ],
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: BaghSpace.section),
        Row(
          spacing: 16,
          children: [
            RemoteImage(
              url: apiAsset(expert.photoUrl),
              width: 96,
              height: 96,
              radius: 48,
              initials: initialsOf(expert.fullName),
              semanticLabel: expert.fullName,
            ),
            Expanded(child: _Standing(expert: expert)),
          ],
        ),
        if (links.isNotEmpty) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 4,
            children: [
              for (final (icon, label, href) in links)
                IconButton(
                  tooltip: label,
                  icon: Icon(icon, size: 20),
                  onPressed: () => openLink(context, ref, href),
                ),
            ],
          ),
        ],
        if (expert.bio case final bio? when bio.isNotEmpty) ...[
          const SizedBox(height: BaghSpace.gutter),
          SoftSurface(
            child: Text(bio, style: text.bodyLarge?.copyWith(color: c.ink2)),
          ),
        ],
        if (expert.specialities.isNotEmpty)
          tags(k.specialities, expert.specialities, 0),
        if (expert.languages.isNotEmpty) tags(k.languages, expert.languages, 2),
      ],
    );
  }
}

/// Whether the expert consults, and for how long they have worked.
class _Standing extends ConsumerWidget {
  const _Standing({required this.expert});

  final Expert expert;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = ref.watch(stringsProvider).experts;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final years = expert.yearsExperience;
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        if (expert.acceptsConsultations)
          _Tag(k.takesConsultations, c.primarySoft)
        else
          _Tag(k.listedOnly, c.tints[3]),
        if (years != null && years > 0)
          _Tag(
            k.experience.fill({'years': localDigits(years, language)}),
            c.tints[1],
          ),
      ],
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.label, this.tint);

  final String label;
  final GardenTint tint;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: ShapeDecoration(color: tint.fill, shape: const StadiumBorder()),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.labelMedium?.copyWith(color: tint.ink),
      ),
    ),
  );
}

String _consultPath(Expert e) =>
    Uri(path: '/consult', queryParameters: {'expert': e.slug}).toString();
