import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/kinetic_words.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../help/help_sheet.dart';
import '../start/modules.dart';
import '../start/start_sheet.dart';

/// Home: the company's own words, kinetic, around the garden; then the way
/// in. Phase 1 fills it with what is happening for this person.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final user = ref.watch(sessionProvider).value;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final width = MediaQuery.sizeOf(context).width;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          user == null
              ? ''
              : s.mobile.welcomeName.fill({'name': user.firstName}),
        ),
        actions: const [HelpAction('home')],
      ),
      body: ListView(
        padding: BaghLayout.readablePadding(context, bottom: 120),
        children: [
          Text(
            s.home.heroEyebrow,
            style: BaghType.weight(
              text.labelLarge!,
              700,
            ).copyWith(color: c.primary),
          ),
          const SizedBox(height: 8),
          KineticWords(
            s.home.heroTitle,
            style: text.displayMedium,
            emphasisColor: c.primary,
          ),
          const SizedBox(height: 12),
          Text(
            s.home.heroSubtitle,
            style: text.bodyLarge?.copyWith(color: c.ink2),
          ),
          const SizedBox(height: BaghSpace.section),
          Center(child: GardenMotif(size: (width - 64).clamp(200, 340))),
          const SizedBox(height: BaghSpace.section),
          Row(
            spacing: 10,
            children: [
              Expanded(
                child: BaghKey(
                  label: s.mobile.tabStart,
                  icon: Icons.add_rounded,
                  onPressed: () => showStartSheet(context),
                ),
              ),
              Expanded(
                child: BaghKey(
                  label: s.mobile.tabExplore,
                  kind: BaghKeyKind.outline,
                  onPressed: () => context.go('/explore'),
                ),
              ),
            ],
          ),
          const SizedBox(height: BaghSpace.section),
          Text(s.home.missionTitle, style: text.titleLarge),
          const SizedBox(height: 10),
          SoftSurface(child: Text(s.home.missionBody, style: text.bodyLarge)),
          const SizedBox(height: BaghSpace.section),
          Text(s.home.whatWeDoTitle, style: text.titleLarge),
          const SizedBox(height: 10),
          for (final (i, (title, body)) in [
            (s.home.feature0Title, s.home.feature0Desc),
            (s.home.feature1Title, s.home.feature1Desc),
            (s.home.feature2Title, s.home.feature2Desc),
            (s.home.feature3Title, s.home.feature3Desc),
          ].indexed)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SoftSurface(
                tint: moduleTint(c, i),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 4,
                  children: [
                    Text(
                      title,
                      style: BaghType.weight(
                        text.titleSmall!,
                        750,
                      ).copyWith(color: moduleTint(c, i).ink),
                    ),
                    Text(
                      body,
                      style: text.bodyMedium?.copyWith(
                        color: moduleTint(c, i).ink,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: BaghSpace.section),
          Text(s.nav.companyMenu, style: text.titleLarge),
          const SizedBox(height: 10),
          // The company's pages, as tiles in their garden tints.
          LayoutBuilder(
            builder: (context, box) {
              final columns = (box.maxWidth / 160).floor().clamp(2, 4);
              final width = (box.maxWidth - 10 * (columns - 1)) / columns;
              // Room for two lines of label in every tile, so a label that
              // wraps does not leave its row uneven.
              final label = text.labelLarge!;
              final twoLines =
                  MediaQuery.textScalerOf(context).scale(label.fontSize!) *
                  (label.height ?? 1.4) *
                  2;
              return Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final (i, (icon, label, path)) in [
                    (
                      Icons.design_services_outlined,
                      s.nav.services,
                      '/services',
                    ),
                    (Icons.info_outline_rounded, s.nav.about, '/about'),
                    (Icons.groups_outlined, s.nav.team, '/team'),
                    (
                      Icons.collections_bookmark_outlined,
                      s.nav.portfolio,
                      '/portfolio',
                    ),
                    (Icons.handshake_outlined, s.nav.customers, '/customers'),
                    (Icons.diversity_3_outlined, s.nav.partners, '/partners'),
                    (Icons.article_outlined, s.nav.blog, '/blog'),
                    (Icons.mail_outline_rounded, s.nav.contact, '/contact'),
                    (Icons.badge_outlined, s.nav.joinUs, '/join'),
                    (
                      Icons.volunteer_activism_outlined,
                      s.nav.volunteer,
                      '/volunteer',
                    ),
                  ].indexed)
                    SizedBox(
                      width: width,
                      child: SoftSurface(
                        tint: moduleTint(c, i),
                        radius: BaghRadius.tile,
                        semanticLabel: label,
                        padding: const EdgeInsets.all(14),
                        onTap: () => context.push(path),
                        child: ConstrainedBox(
                          constraints: BoxConstraints(minHeight: twoLines),
                          child: Row(
                            spacing: 10,
                            children: [
                              Icon(icon, size: 22),
                              Expanded(
                                child: Text(
                                  label,
                                  style: BaghType.weight(
                                    text.labelLarge!,
                                    700,
                                  ).copyWith(color: moduleTint(c, i).ink),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: BaghSpace.section),
          SoftSurface(
            onTap: () => showModuleSoon(context, startActions.first),
            semanticLabel: s.home.ctaTitle,
            child: Row(
              spacing: 12,
              children: [
                GirihStar(color: c.accent, size: 34),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.home.ctaTitle, style: text.titleMedium),
                      Text(s.home.ctaSubtitle, style: text.bodySmall),
                    ],
                  ),
                ),
                Icon(
                  Directionality.of(context) == TextDirection.rtl
                      ? Icons.chevron_left_rounded
                      : Icons.chevron_right_rounded,
                  color: c.ink2,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
