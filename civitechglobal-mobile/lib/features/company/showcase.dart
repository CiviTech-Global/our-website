import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';

// ---- Data --------------------------------------------------------------------

class ShowcaseOrganization {
  const ShowcaseOrganization(this.j);

  final Map<String, Object?> j;

  String get name => '${j['name'] ?? ''}';
  String? get description => j['description'] as String?;
  String? get industry => j['industry'] as String?;
  String? get website => j['website'] as String?;
  bool get featured => j['featured'] == true;
  bool get active => j['active'] != false;
  int? get sinceYear => (j['sinceYear'] as num?)?.toInt();
  String? get partnershipType => j['partnershipType'] as String?;
  String? get quote => j['testimonialQuote'] as String?;
  String? get quoteAuthor => j['testimonialAuthor'] as String?;
  String? get quoteRole => j['testimonialRole'] as String?;
  String? get logoUrl => j['logoUrl'] as String?;
}

class ShowcaseProject {
  const ShowcaseProject(this.j);

  final Map<String, Object?> j;

  String get title => '${j['title'] ?? ''}';
  String get summary => '${j['summary'] ?? ''}';
  String? get description => j['description'] as String?;
  String get status => '${j['status'] ?? ''}';
  List<String> get technologies => [
    for (final t in (j['technologies'] as List? ?? const [])) '$t',
  ];
  String? get projectUrl => j['projectUrl'] as String?;
  String? get repositoryUrl => j['repositoryUrl'] as String?;
  String? get startedAt => j['startedAt'] as String?;
  String? get completedAt => j['completedAt'] as String?;
  String? get coverUrl => j['coverUrl'] as String?;
  String? get clientName => (j['client'] as Map?)?['name'] as String?;
  List<(String, String?)> get shots => [
    for (final s in (j['screenshots'] as List? ?? const []))
      ('${(s as Map)['url']}', s['caption'] as String?),
  ];
}

/// `GET /showcase/customers` or `/showcase/partners`.
final organizationsProvider =
    FutureProvider.family<List<ShowcaseOrganization>, bool>((ref, customers) {
      return ref
          .read(apiClientProvider)
          .get(
            customers ? '/showcase/customers' : '/showcase/partners',
            parse: (d) => [
              for (final o in (d as List? ?? const []))
                ShowcaseOrganization(o as Map<String, Object?>),
            ],
          );
    });

/// `GET /showcase/projects?filter=...`: the server decides what is current.
final projectsProvider = FutureProvider.family<List<ShowcaseProject>, String>((
  ref,
  filter,
) {
  return ref
      .read(apiClientProvider)
      .get(
        '/showcase/projects',
        query: {'filter': filter == 'all' ? null : filter},
        parse: (d) => [
          for (final p in (d as List? ?? const []))
            ShowcaseProject(p as Map<String, Object?>),
        ],
      );
});

// ---- Customers and partners ---------------------------------------------------

/// Customers or partners: the best-known first, then everyone current, then
/// former relationships, as the web's OrganizationsPage lays them out.
class OrganizationsScreen extends ConsumerWidget {
  const OrganizationsScreen({required this.customers, super.key});

  final bool customers;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final v = s.showcase;
    final orgs = ref.watch(organizationsProvider(customers));
    return ContentPage(
      title: customers ? v.customersTitle : v.partnersTitle,
      subtitle: customers ? v.customersSubtitle : v.partnersSubtitle,
      helpId: customers ? 'customers' : 'partners',
      children: [
        AsyncView(
          value: orgs,
          onRetry: () => ref.invalidate(organizationsProvider(customers)),
          isEmpty: (list) => list.isEmpty,
          empty: customers ? v.customersEmpty : v.partnersEmpty,
          data: (all) {
            final featured = all.where((o) => o.featured && o.active).toList();
            final current = all.where((o) => !o.featured && o.active).toList();
            final former = all.where((o) => !o.active).toList();
            Widget group(String title, List<ShowcaseOrganization> list) =>
                ContentSection(
                  title: title,
                  children: [
                    for (final (i, o) in list.indexed)
                      _OrganizationCard(org: o, tint: i),
                  ],
                );
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (featured.isNotEmpty)
                  group(customers ? v.bestCustomers : v.keyPartners, featured),
                if (current.isNotEmpty)
                  group(
                    customers ? v.currentCustomers : v.currentPartners,
                    current,
                  ),
                if (former.isNotEmpty)
                  group(
                    customers ? v.formerCustomers : v.formerPartners,
                    former,
                  ),
              ],
            );
          },
        ),
        CtaCard(
          title: v.ctaTitle,
          body: v.ctaBody,
          primary: (
            s.nav.startProject,
            () => openLink(context, ref, '/start-project'),
          ),
        ),
      ],
    );
  }
}

class _OrganizationCard extends ConsumerWidget {
  const _OrganizationCard({required this.org, required this.tint});

  final ShowcaseOrganization org;
  final int tint;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final facts = [
      ?org.industry,
      if (org.partnershipType case final type?)
        s.showcase.partnershipTypes.label(type),
      if (org.sinceYear case final year?)
        '${s.showcase.since} ${localDigits(year, language)}',
    ];
    return SoftSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Row(
            spacing: 14,
            children: [
              RemoteImage(
                url: apiAsset(org.logoUrl),
                width: 56,
                height: 56,
                fit: BoxFit.contain,
                tint: tint,
                initials: initialsOf(org.name),
                semanticLabel: org.name,
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(org.name, style: text.titleMedium),
                    if (facts.isNotEmpty)
                      Text(facts.join(' · '), style: text.bodySmall),
                  ],
                ),
              ),
            ],
          ),
          if (org.description case final d? when d.isNotEmpty)
            Text(d, style: text.bodyMedium?.copyWith(color: c.ink2)),
          if (org.quote case final q? when q.isNotEmpty)
            SoftSurface(
              tint: moduleTint(c, tint),
              radius: BaghRadius.tile,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 6,
                children: [
                  Text('«$q»', style: text.bodyMedium),
                  if (org.quoteAuthor case final a? when a.isNotEmpty)
                    Text(
                      [a, ?org.quoteRole].join(' · '),
                      style: BaghType.weight(
                        text.labelMedium!,
                        700,
                      ).copyWith(color: moduleTint(c, tint).ink),
                    ),
                ],
              ),
            ),
          if (org.website case final w? when w.isNotEmpty)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                icon: const Icon(Icons.open_in_new_rounded, size: 18),
                label: Text(s.showcase.visitWebsite),
                onPressed: () => launchUrl(
                  Uri.parse(w),
                  mode: LaunchMode.externalApplication,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ---- Portfolio -------------------------------------------------------------------

/// Our projects, filtered as the server judges current or completed.
class PortfolioScreen extends ConsumerStatefulWidget {
  const PortfolioScreen({super.key});

  @override
  ConsumerState<PortfolioScreen> createState() => _PortfolioScreenState();
}

class _PortfolioScreenState extends ConsumerState<PortfolioScreen> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final v = s.showcase;
    final filter = _filter;
    final projects = ref.watch(projectsProvider(filter));
    return ContentPage(
      title: v.projectsTitle,
      subtitle: v.projectsSubtitle,
      helpId: 'portfolio',
      children: [
        const SizedBox(height: BaghSpace.section),
        SegmentedButton<String>(
          showSelectedIcon: false,
          segments: [
            ButtonSegment(value: 'all', label: Text(v.filterAll)),
            ButtonSegment(value: 'current', label: Text(v.filterCurrent)),
            ButtonSegment(value: 'completed', label: Text(v.filterCompleted)),
          ],
          selected: {filter},
          onSelectionChanged: (value) {
            ref.read(hapticsProvider).selection();
            setState(() => _filter = value.first);
          },
        ),
        const SizedBox(height: BaghSpace.gutter),
        AsyncView(
          value: projects,
          onRetry: () => ref.invalidate(projectsProvider(filter)),
          isEmpty: (list) => list.isEmpty,
          empty: v.projectsEmpty,
          data: (list) => Column(
            spacing: 12,
            children: [
              for (final (i, p) in list.indexed)
                _ProjectCard(project: p, tint: i),
            ],
          ),
        ),
      ],
    );
  }
}

class _ProjectCard extends ConsumerWidget {
  const _ProjectCard({required this.project, required this.tint});

  final ShowcaseProject project;
  final int tint;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    return SoftSurface(
      padding: EdgeInsets.zero,
      semanticLabel: project.title,
      onTap: () => _showProject(context, project, tint),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          RemoteImage(
            url: apiAsset(project.coverUrl),
            height: 150,
            radius: BaghRadius.card,
            tint: tint,
            semanticLabel: project.title,
          ),
          Padding(
            padding: const EdgeInsets.all(BaghSpace.gutter),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 6,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(project.title, style: text.titleMedium),
                    _Pill(
                      s.showcase.projectStatuses.label(project.status),
                      moduleTint(c, tint),
                    ),
                  ],
                ),
                if (project.clientName case final client?)
                  Text('${s.showcase.client}: $client', style: text.bodySmall),
                Text(
                  project.summary,
                  style: text.bodyMedium?.copyWith(color: c.ink2),
                ),
                if (project.technologies.isNotEmpty)
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final t in project.technologies.take(6))
                        _Pill(t, c.tints[2]),
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

class _Pill extends StatelessWidget {
  const _Pill(this.label, this.tint);

  final String label;
  final GardenTint tint;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
    decoration: ShapeDecoration(color: tint.fill, shape: const StadiumBorder()),
    child: Text(
      label,
      style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tint.ink),
    ),
  );
}

Future<void> _showProject(
  BuildContext context,
  ShowcaseProject project,
  int tint,
) => showBaghSheet<void>(
  context,
  isScrollControlled: true,
  useSafeArea: true,
  framed: false,
  builder: (_) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.75,
    minChildSize: 0.4,
    maxChildSize: 0.95,
    builder: (context, scroll) => SheetFrame(
      child: Consumer(
        builder: (context, ref, _) {
          final s = ref.watch(stringsProvider);
          final language = ref.watch(l10nProvider).language;
          final text = Theme.of(context).textTheme;
          final c = BaghColors.of(context);
          String? date(String? iso) {
            final parsed = iso == null ? null : DateTime.tryParse(iso);
            return parsed == null ? null : formatDate(parsed, language);
          }

          return ListView(
            controller: scroll,
            padding: BaghLayout.readablePadding(
              context,
              bottom:
                  BaghSpace.section * 2 +
                  MediaQuery.viewPaddingOf(context).bottom,
            ),
            children: [
              Text(project.title, style: text.headlineSmall),
              const SizedBox(height: 6),
              Text(
                project.summary,
                style: text.bodyLarge?.copyWith(color: c.ink2),
              ),
              const SizedBox(height: BaghSpace.gutter),
              Wrap(
                spacing: 12,
                runSpacing: 4,
                children: [
                  if (date(project.startedAt) case final d?)
                    Text('${s.showcase.startedAt}: $d', style: text.bodySmall),
                  if (date(project.completedAt) case final d?)
                    Text(
                      '${s.showcase.completedAt}: $d',
                      style: text.bodySmall,
                    ),
                ],
              ),
              if (project.description case final d? when d.isNotEmpty) ...[
                const SizedBox(height: BaghSpace.gutter),
                Text(d, style: text.bodyLarge),
              ],
              if (project.technologies.isNotEmpty) ...[
                const SizedBox(height: BaghSpace.gutter),
                Text(s.showcase.builtWith, style: text.titleSmall),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final t in project.technologies) _Pill(t, c.tints[2]),
                  ],
                ),
              ],
              if (project.shots.isNotEmpty) ...[
                const SizedBox(height: BaghSpace.section),
                Text(s.showcase.gallery, style: text.titleSmall),
                const SizedBox(height: 8),
                for (final (url, caption) in project.shots)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 4,
                      children: [
                        RemoteImage(
                          url: apiAsset(url),
                          fit: BoxFit.contain,
                          tint: tint,
                          semanticLabel: caption,
                        ),
                        if (caption != null && caption.isNotEmpty)
                          Text(caption, style: text.bodySmall),
                      ],
                    ),
                  ),
              ],
              const SizedBox(height: BaghSpace.gutter),
              if (project.projectUrl case final u? when u.isNotEmpty)
                BaghKey(
                  label: s.showcase.visitProject,
                  icon: Icons.open_in_new_rounded,
                  expand: true,
                  onPressed: () => launchUrl(
                    Uri.parse(u),
                    mode: LaunchMode.externalApplication,
                  ),
                ),
              if (project.repositoryUrl case final u? when u.isNotEmpty) ...[
                const SizedBox(height: 10),
                BaghKey(
                  label: s.showcase.sourceCode,
                  icon: Icons.code_rounded,
                  kind: BaghKeyKind.outline,
                  expand: true,
                  onPressed: () => launchUrl(
                    Uri.parse(u),
                    mode: LaunchMode.externalApplication,
                  ),
                ),
              ],
            ],
          );
        },
      ),
    ),
  ),
);
