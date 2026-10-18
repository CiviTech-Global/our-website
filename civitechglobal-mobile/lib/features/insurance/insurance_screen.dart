import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import 'insurance.dart';

/// The insurance catalog, as the web's InsurancePage: search by name or
/// summary, narrow to a category, and open a product.
class InsuranceScreen extends ConsumerStatefulWidget {
  const InsuranceScreen({super.key});

  @override
  ConsumerState<InsuranceScreen> createState() => _InsuranceScreenState();
}

class _InsuranceScreenState extends ConsumerState<InsuranceScreen> {
  final _query = TextEditingController();
  String? _category;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  bool _matches(InsuranceProduct p) {
    final needle = _query.text.trim().toLowerCase();
    if (needle.isEmpty) return true;
    return [
      p.title,
      p.titleEn,
      p.summary,
      p.summaryEn,
    ].any((value) => value.toLowerCase().contains(needle));
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final k = s.insurance;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final catalog = ref.watch(insuranceCatalogProvider);

    return ContentPage(
      title: k.title,
      subtitle: k.subtitle,
      helpId: 'insurance',
      children: [
        const SizedBox(height: BaghSpace.section),
        InfoCard(
          title: s.landing.thirdParty.title,
          body: s.landing.thirdParty.ctaTitle,
          icon: Icons.directions_car_outlined,
          tint: 2,
          onTap: () => context.push('/insurance/third-party'),
        ),
        const SizedBox(height: BaghSpace.gutter),
        TextField(
          controller: _query,
          onChanged: (_) => setState(() {}),
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: k.searchPlaceholder,
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: _query.text.isEmpty
                ? null
                : IconButton(
                    tooltip: s.common.date.clear,
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => setState(_query.clear),
                  ),
          ),
        ),
        const SizedBox(height: BaghSpace.gutter),
        AsyncView(
          value: catalog,
          onRetry: () => ref.invalidate(insuranceCatalogProvider),
          isEmpty: (list) => list.isEmpty,
          empty: k.catalogError,
          data: (categories) {
            final shown = [
              for (final c in categories)
                if (_category == null || c.slug == _category)
                  (category: c, products: c.products.where(_matches).toList()),
            ].where((e) => e.products.isNotEmpty).toList();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Ten categories do not fit across a phone; they scroll.
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  clipBehavior: Clip.none,
                  child: Row(
                    spacing: 8,
                    children: [
                      for (final (slug, label) in [
                        (null, s.common.all),
                        for (final c in categories)
                          (
                            c.slug,
                            [c.emoji, c.titleIn(language)].nonNulls.join(' '),
                          ),
                      ])
                        ChoiceChip(
                          label: Text(label),
                          selected: _category == slug,
                          onSelected: (_) {
                            ref.read(hapticsProvider).selection();
                            setState(() => _category = slug);
                          },
                        ),
                    ],
                  ),
                ),
                if (shown.isEmpty)
                  EmptyNote(message: k.noMatches)
                else
                  for (final (ci, entry) in shown.indexed) ...[
                    const SizedBox(height: BaghSpace.section),
                    Text(
                      [
                        entry.category.emoji,
                        entry.category.titleIn(language),
                      ].nonNulls.join(' '),
                      style: text.titleLarge,
                    ),
                    const SizedBox(height: 12),
                    for (final (pi, product) in entry.products.indexed) ...[
                      if (pi > 0) const SizedBox(height: 12),
                      ProductCard(product: product, tint: ci + pi),
                    ],
                  ],
              ],
            );
          },
        ),
      ],
    );
  }
}

/// One product in the catalog: its name, what it is for, and whether the
/// form is enough or a specialist calls.
class ProductCard extends ConsumerWidget {
  const ProductCard({required this.product, required this.tint, super.key});

  final InsuranceProduct product;
  final int tint;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final title = product.titleIn(language);
    return SoftSurface(
      semanticLabel: title,
      onTap: () => context.push('/insurance/${product.slug}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 8,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: BaghType.weight(text.titleSmall!, 750),
                ),
              ),
              if (product.corporate)
                _Badge(s.insurance.corporate, moduleTint(c, tint)),
            ],
          ),
          Text(
            product.summaryIn(language),
            style: text.bodyMedium?.copyWith(color: c.ink2),
          ),
          IntakeModeLine(callback: product.callback),
        ],
      ),
    );
  }
}

/// "Fill in and send" or "a specialist calls you": the difference that
/// changes what happens next.
class IntakeModeLine extends ConsumerWidget {
  const IntakeModeLine({required this.callback, super.key});

  final bool callback;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = ref.watch(stringsProvider).insurance;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Row(
      spacing: 6,
      children: [
        Icon(
          callback ? Icons.phone_in_talk_outlined : Icons.bolt_rounded,
          size: 16,
          color: callback ? c.accent : c.primary,
        ),
        Flexible(
          child: Text(
            callback ? k.callbackBadge : k.selfServeBadge,
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
        ),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge(this.label, this.tint);

  final String label;
  final GardenTint tint;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: tint.fill,
      borderRadius: BorderRadius.circular(BaghRadius.field),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      child: Text(
        label,
        style: Theme.of(
          context,
        ).textTheme.labelSmall?.copyWith(color: tint.ink),
      ),
    ),
  );
}
