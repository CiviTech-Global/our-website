import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/links.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/content_page.dart';
import '../../l10n/l10n.dart';

/// Services: software first, then the process, why choose us, insurance as
/// the secondary line, and the way to start, as the web's ServicesPage.
class ServicesScreen extends ConsumerWidget {
  const ServicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final v = s.services;
    void open(String path) => openLink(context, ref, path);

    return ContentPage(
      title: v.title,
      subtitle: v.subtitle,
      helpId: 'services',
      children: [
        ContentSection(
          title: v.groupSoftwareTitle,
          subtitle: v.groupSoftwareSubtitle,
          children: [
            for (final (i, (icon, title, body)) in [
              (Icons.code_rounded, v.software1Title, v.software1Desc),
              (Icons.smartphone_rounded, v.software2Title, v.software2Desc),
              (
                Icons.account_balance_outlined,
                v.software3Title,
                v.software3Desc,
              ),
              (Icons.bar_chart_rounded, v.software4Title, v.software4Desc),
            ].indexed)
              InfoCard(title: title, body: body, icon: icon, tint: i),
            BaghKey(
              label: s.nav.startProject,
              onPressed: () => open('/start-project'),
              expand: true,
            ),
          ],
        ),
        ContentSection(
          title: v.processTitle,
          subtitle: v.processSubtitle,
          children: [
            StepList(
              language: language,
              steps: [
                (v.process1Title, v.process1Desc),
                (v.process2Title, v.process2Desc),
                (v.process3Title, v.process3Desc),
                (v.process4Title, v.process4Desc),
              ],
            ),
          ],
        ),
        ContentSection(
          title: v.whyTitle,
          children: [
            for (final (icon, title, body) in [
              (Icons.verified_outlined, v.why1Title, v.why1Desc),
              (Icons.bolt_rounded, v.why2Title, v.why2Desc),
              (Icons.account_balance_wallet_outlined, v.why3Title, v.why3Desc),
              (Icons.lock_open_rounded, v.why4Title, v.why4Desc),
            ])
              InfoCard(title: title, body: body, icon: icon),
          ],
        ),
        ContentSection(
          title: v.groupInsuranceTitle,
          subtitle: v.groupInsuranceSubtitle,
          children: [
            for (final (i, (icon, title, body)) in [
              (Icons.how_to_reg_outlined, v.service1Title, v.service1Desc),
              (Icons.assignment_outlined, v.service2Title, v.service2Desc),
              (Icons.monitor_heart_outlined, v.service3Title, v.service3Desc),
              (Icons.support_agent_outlined, v.service4Title, v.service4Desc),
            ].indexed)
              InfoCard(title: title, body: body, icon: icon, tint: i + 2),
            BaghKey(
              label: s.home.alsoInsuranceCta,
              kind: BaghKeyKind.outline,
              onPressed: () => open('/insurance'),
              expand: true,
            ),
          ],
        ),
        CtaCard(
          title: v.ctaTitle,
          body: v.ctaSubtitle,
          primary: (s.nav.startProject, () => open('/start-project')),
          secondary: (s.home.heroCtaSecondary, () => open('/contact')),
        ),
      ],
    );
  }
}
