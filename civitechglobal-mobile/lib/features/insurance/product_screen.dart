import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import 'insurance.dart';
import 'insurance_screen.dart';

/// One insurance product, as the web's InsuranceProductPage: what it is,
/// the facts that matter, what it covers and leaves out, how a claim goes,
/// what to have ready, and its questions answered; the request itself is
/// one key away, kept under the page.
class InsuranceProductScreen extends ConsumerWidget {
  const InsuranceProductScreen({required this.slug, super.key});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final k = s.insurance;
    final language = ref.watch(l10nProvider).language;
    final product = ref.watch(insuranceProductProvider(slug));
    final detail = product.value;

    return ContentPage(
      eyebrow: detail == null
          ? null
          : [
              detail.category.emoji,
              detail.category.titleIn(language),
            ].nonNulls.join(' '),
      title: detail?.product.titleIn(language) ?? s.nav.insurance,
      helpId: 'insurance-product',
      bottom: detail == null
          ? null
          : BaghKey(
              label: s.mobile.insuranceApply,
              icon: detail.product.callback
                  ? Icons.phone_in_talk_outlined
                  : Icons.edit_note_rounded,
              expand: true,
              onPressed: () => context.push('/insurance/$slug/apply'),
            ),
      children: [
        AsyncView(
          value: product,
          onRetry: () => ref.invalidate(insuranceProductProvider(slug)),
          data: _Details.new,
        ),
        if (product.hasError) ...[
          const SizedBox(height: BaghSpace.gutter),
          Center(
            child: TextButton(
              onPressed: () => context.go('/insurance'),
              child: Text(k.backToCatalog),
            ),
          ),
        ],
      ],
    );
  }
}

class _Details extends ConsumerWidget {
  const _Details(this.p);

  final InsuranceProductDetail p;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final k = s.insurance;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final ink2 = text.bodyMedium?.copyWith(color: c.ink2);

    Widget chips(List<String> items) => Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final item in items)
          DecoratedBox(
            decoration: BoxDecoration(
              border: Border.all(color: c.edge),
              borderRadius: BorderRadius.circular(BaghRadius.field),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Text(item, style: text.bodySmall),
            ),
          ),
      ],
    );

    Widget marked(List<String> items, IconData icon, Color color) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 10,
      children: [
        for (final item in items)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 10,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Icon(icon, size: 18, color: color),
              ),
              Expanded(child: Text(item, style: ink2)),
            ],
          ),
      ],
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: BaghSpace.gutter,
      children: [
        const SizedBox(height: 4),
        IntakeModeLine(callback: p.product.callback),
        if (p.keyFacts.isNotEmpty)
          SoftSurface(
            tint: c.primarySoft,
            child: Wrap(
              runSpacing: 14,
              children: [
                for (final fact in p.keyFacts)
                  LayoutBuilder(
                    builder: (context, box) => SizedBox(
                      // Two facts a row where they fit, one where they do not.
                      width: box.maxWidth >= 320
                          ? box.maxWidth / 2
                          : box.maxWidth,
                      child: Padding(
                        padding: const EdgeInsetsDirectional.only(end: 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          spacing: 2,
                          children: [
                            Text(
                              fact.label,
                              style: text.bodySmall?.copyWith(
                                color: c.primarySoft.ink,
                              ),
                            ),
                            Text(
                              fact.value,
                              style: BaghType.weight(
                                text.bodyMedium!,
                                700,
                              ).copyWith(color: c.primarySoft.ink),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        if (p.product.callback) InfoCard(title: k.callbackExplainer, body: ''),
        _Card(
          title: s.mobile.insuranceAbout,
          icon: Icons.info_outline_rounded,
          child: Text(p.descriptionIn(language), style: ink2),
        ),
        if (p.coverages.isNotEmpty)
          _Card(
            title: k.coverages,
            icon: Icons.verified_user_outlined,
            child: marked(
              p.coverages,
              Icons.check_circle_outline_rounded,
              c.primary,
            ),
          ),
        if (p.optionalCoverages.isNotEmpty)
          _Card(
            title: k.optionalCoverages,
            icon: Icons.add_circle_outline_rounded,
            child: chips(p.optionalCoverages),
          ),
        if (p.exclusions.isNotEmpty)
          _Card(
            title: k.exclusions,
            hint: k.exclusionsHint,
            icon: Icons.block_rounded,
            child: marked(p.exclusions, Icons.highlight_off_rounded, c.error),
          ),
        if (p.claimSteps.isNotEmpty)
          _Card(
            title: k.claimSteps,
            icon: Icons.checklist_rounded,
            child: StepList(
              language: language,
              steps: [for (final step in p.claimSteps) (step, '')],
            ),
          ),
        if (p.requiredDocuments.isNotEmpty)
          _Card(
            title: k.requiredDocuments,
            icon: Icons.description_outlined,
            child: marked(p.requiredDocuments, Icons.circle, c.primary),
          ),
        if (p.premiumFactors.isNotEmpty)
          _Card(
            title: k.premiumFactors,
            hint: k.premiumFactorsHint,
            icon: Icons.tune_rounded,
            child: chips(p.premiumFactors),
          ),
        if (p.faq.isNotEmpty)
          _Card(
            title: k.faq,
            icon: Icons.help_outline_rounded,
            child: Column(
              children: [
                for (final entry in p.faq)
                  ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    childrenPadding: const EdgeInsets.only(bottom: 12),
                    expandedCrossAxisAlignment: CrossAxisAlignment.start,
                    shape: const Border(),
                    collapsedShape: const Border(),
                    title: Text(entry.question, style: text.titleSmall),
                    children: [Text(entry.answer, style: ink2)],
                  ),
              ],
            ),
          ),
        if (p.notes.isNotEmpty)
          _Card(
            title: k.goodToKnow,
            icon: Icons.lightbulb_outline_rounded,
            child: marked(p.notes, Icons.circle, c.ink2),
          ),
      ],
    );
  }
}

/// A titled card of the product page.
class _Card extends StatelessWidget {
  const _Card({
    required this.title,
    required this.icon,
    required this.child,
    this.hint,
  });

  final String title;
  final IconData icon;
  final String? hint;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return SoftSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Row(
            spacing: 10,
            children: [
              Icon(icon, size: 20, color: c.primary),
              Expanded(child: Text(title, style: text.titleMedium)),
            ],
          ),
          if (hint != null)
            Text(hint!, style: text.bodySmall?.copyWith(color: c.ink2)),
          child,
        ],
      ),
    );
  }
}
