import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';

/// What moves the price of third-party car insurance, as the web's
/// ThirdPartyLandingPage: the factors, the steps to a quote, the common
/// questions, and the way into the catalog.
class ThirdPartyScreen extends ConsumerWidget {
  const ThirdPartyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final k = s.landing.thirdParty;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;

    return ContentPage(
      eyebrow: s.nav.insurance,
      title: k.title,
      subtitle: k.intro,
      helpId: 'insurance',
      children: [
        const SizedBox(height: BaghSpace.gutter),
        BaghKey(
          label: k.ctaPrimary,
          expand: true,
          onPressed: () => context.push('/insurance'),
        ),
        const SizedBox(height: 10),
        BaghKey(
          label: k.ctaSecondary,
          kind: BaghKeyKind.outline,
          expand: true,
          onPressed: () =>
              openLink(context, ref, '/blog/third-party-price-factors'),
        ),
        // The web's two-column table, as one card a row: a phone has no
        // room for the table, and each row reads on its own.
        ContentSection(
          title: k.factorsTitle,
          children: [
            for (final (i, row) in k.factors.indexed)
              SoftSurface(
                tint: moduleTint(c, i),
                radius: BaghRadius.tile,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 4,
                  children: [
                    Text(
                      row.first,
                      style: BaghType.weight(
                        text.titleSmall!,
                        750,
                      ).copyWith(color: moduleTint(c, i).ink),
                    ),
                    if (row.length > 1)
                      Text(
                        row[1],
                        style: text.bodyMedium?.copyWith(
                          color: moduleTint(c, i).ink,
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
        ContentSection(
          title: k.stepsTitle,
          children: [
            StepList(
              language: language,
              steps: [for (final step in k.steps) (step, '')],
            ),
          ],
        ),
        ContentSection(
          title: k.faqTitle,
          children: [
            SoftSurface(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  for (final faq in k.faqs)
                    if (faq.length > 1)
                      ExpansionTile(
                        tilePadding: EdgeInsets.zero,
                        childrenPadding: const EdgeInsets.only(bottom: 12),
                        expandedCrossAxisAlignment: CrossAxisAlignment.start,
                        shape: const Border(),
                        collapsedShape: const Border(),
                        title: Text(faq[0], style: text.titleSmall),
                        children: [
                          Text(
                            faq[1],
                            style: text.bodyMedium?.copyWith(color: c.ink2),
                          ),
                        ],
                      ),
                ],
              ),
            ),
          ],
        ),
        CtaCard(
          title: k.ctaTitle,
          body: k.ctaBody,
          primary: (k.ctaPrimary, () => context.push('/insurance')),
        ),
      ],
    );
  }
}
