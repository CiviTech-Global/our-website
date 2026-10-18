import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/widgets/content_page.dart';
import '../../l10n/l10n.dart';

/// About: mission and vision, what we do, our values, and the rest of the
/// company's pages, as the web's AboutPage.
class AboutScreen extends ConsumerWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final a = s.about;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    void open(String path) => openLink(context, ref, path);

    return ContentPage(
      title: a.title,
      subtitle: a.subtitle,
      helpId: 'about',
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(a.legalNote, style: text.bodySmall),
        ),
        ContentSection(
          title: a.missionTitle,
          children: [
            InfoCard(title: a.missionTitle, body: a.missionBody, tint: 0),
            InfoCard(title: a.visionTitle, body: a.visionBody, tint: 2),
          ],
        ),
        ContentSection(
          title: a.whatWeDoTitle,
          children: [
            Text(
              a.whatWeDoBody,
              style: text.bodyLarge?.copyWith(color: c.ink2),
            ),
          ],
        ),
        ContentSection(
          title: a.valuesTitle,
          children: [
            for (final (i, (title, body)) in [
              (a.value1Title, a.value1Desc),
              (a.value2Title, a.value2Desc),
              (a.value3Title, a.value3Desc),
              (a.value4Title, a.value4Desc),
            ].indexed)
              InfoCard(title: title, body: body, tint: i),
          ],
        ),
        ContentSection(
          title: a.moreTitle,
          children: [
            for (final (icon, label, path) in [
              (Icons.design_services_outlined, s.nav.services, '/services'),
              (Icons.groups_outlined, s.nav.team, '/team'),
              (
                Icons.collections_bookmark_outlined,
                s.nav.portfolio,
                '/portfolio',
              ),
              (Icons.handshake_outlined, s.nav.customers, '/customers'),
              (Icons.diversity_3_outlined, s.nav.partners, '/partners'),
              (Icons.article_outlined, s.nav.blog, '/blog'),
            ])
              _LinkRow(icon: icon, label: label, onTap: () => open(path)),
          ],
        ),
        CtaCard(
          title: s.home.ctaTitle,
          body: s.home.ctaSubtitle,
          primary: (s.nav.startProject, () => open('/start-project')),
          secondary: (s.home.heroCtaPrimary, () => open('/services')),
        ),
      ],
    );
  }
}

class _LinkRow extends StatelessWidget {
  const _LinkRow({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) =>
      InfoCard(title: label, body: '', icon: icon, onTap: onTap);
}
