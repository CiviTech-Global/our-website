import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'plans_data.dart';

/// The price list: three kinds of holder, four tiers each, every item with
/// its own limit and monthly price. Read-only in the app: plans are bought
/// on the website.
class PricingScreen extends ConsumerStatefulWidget {
  const PricingScreen({this.subject, super.key});

  final String? subject;

  @override
  ConsumerState<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends ConsumerState<PricingScreen> {
  late String _subject = planSubjects.contains(widget.subject)
      ? widget.subject!
      : 'USER';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final language = ref.watch(l10nProvider).language;
    final catalog = ref.watch(planCatalogProvider);
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(p.pricingTitle),
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: c.primary,
          onRefresh: () => ref.refresh(planCatalogProvider.future),
          child: ListView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            children: [
              Text(
                p.pricingIntro,
                style: text.bodyLarge?.copyWith(color: c.ink2),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 8,
                children: [
                  Icon(Icons.check_rounded, size: 18, color: c.primary),
                  Expanded(child: Text(p.alwaysFree, style: text.bodyMedium)),
                ],
              ),
              const SizedBox(height: BaghSpace.gutter),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final subject in planSubjects)
                    ChoiceChip(
                      label: Text(p.subjects.label(subject)),
                      selected: _subject == subject,
                      onSelected: (_) => setState(() => _subject = subject),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                p.subjectHints.label(_subject),
                style: text.bodySmall?.copyWith(color: c.ink2),
              ),
              const SizedBox(height: BaghSpace.gutter),
              AsyncView(
                value: catalog,
                onRetry: () => ref.invalidate(planCatalogProvider),
                data: (data) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: BaghSpace.gutter,
                  children: [
                    for (final tier in planTiers)
                      _TierCard(
                        tier: tier,
                        features: data.features
                            .where((f) => f.subject == _subject)
                            .toList(),
                        total: data.tiers[_subject]
                            ?.where((t) => t.tier == tier)
                            .firstOrNull,
                        language: language,
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TierCard extends ConsumerWidget {
  const _TierCard({
    required this.tier,
    required this.features,
    required this.total,
    required this.language,
  });

  final String tier;
  final List<PlanFeature> features;
  final TierTotal? total;
  final String language;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final free = tier == 'FREE';
    final monthly = total?.monthlyIrt;

    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              Text(p.tiers.label(tier), style: text.titleMedium),
              if (!free)
                Text(
                  monthly == null
                      ? p.notPriced
                      : p.perMonth.fill({'amount': toman(monthly, language)}),
                  style: text.titleSmall?.copyWith(color: c.primary),
                ),
            ],
          ),
          if (!free && total?.monthlyUsdt != null)
            Text(
              p.perMonthUsdt.fill({'amount': total!.monthlyUsdt!}),
              style: text.bodySmall?.copyWith(color: c.ink2),
            ),
          const Divider(height: 8),
          for (final feature in features)
            if (feature.levels.where((l) => l.tier == tier).firstOrNull
                case final level?)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 12,
                children: [
                  Expanded(
                    child: Text(
                      featureName(s, feature.key, feature.name),
                      style: text.bodyMedium,
                    ),
                  ),
                  Flexible(
                    child: Text(
                      describeLimit(s, (
                        kind: level.kind,
                        limit: level.limit,
                        liveDays: level.liveDays,
                      ), language),
                      textAlign: TextAlign.end,
                      style: text.bodyMedium?.copyWith(color: c.ink2),
                    ),
                  ),
                ],
              ),
        ],
      ),
    );
  }
}

/// What the account has in each part, how much of it is used, and its
/// subscriptions. Buying and renewing happen on the website.
class BillingScreen extends ConsumerWidget {
  const BillingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final language = ref.watch(l10nProvider).language;
    final billing = ref.watch(ownBillingProvider);
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(p.billingTitle),
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: c.primary,
          onRefresh: () => ref.refresh(ownBillingProvider.future),
          child: ListView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            children: [
              Text(
                p.billingIntro,
                style: text.bodyLarge?.copyWith(color: c.ink2),
              ),
              const SizedBox(height: BaghSpace.gutter),
              AsyncView(
                value: billing,
                onRetry: () => ref.invalidate(ownBillingProvider),
                data: (data) => data == null
                    ? const SizedBox.shrink()
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: BaghSpace.gutter,
                        children: [
                          if (!data.enforced)
                            SoftSurface(
                              tint: c.tints[1],
                              radius: BaghRadius.tile,
                              padding: const EdgeInsets.all(14),
                              child: Text(
                                p.measuringOnly,
                                style: text.bodyMedium?.copyWith(
                                  color: c.tints[1].ink,
                                ),
                              ),
                            ),
                          for (final plan in data.plans)
                            _SubjectCard(
                              plan: plan,
                              title:
                                  plan.subject == 'COMPANY' &&
                                      data.companyName != null
                                  ? p.companyPlanFor.fill({
                                      'name': data.companyName!,
                                    })
                                  : p.subjects.label(plan.subject),
                              language: language,
                            ),
                          BaghKey(
                            label: p.seePlans,
                            icon: Icons.auto_awesome_outlined,
                            kind: BaghKeyKind.outline,
                            expand: true,
                            onPressed: () => context.push('/pricing'),
                          ),
                          _History(items: data.history, language: language),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SubjectCard extends ConsumerWidget {
  const _SubjectCard({
    required this.plan,
    required this.title,
    required this.language,
  });

  final SubjectPlan plan;
  final String title;
  final String language;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final active = plan.active.firstOrNull;

    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Text(title, style: text.titleMedium),
          Text(
            active == null
                ? p.noActive
                : [
                    '${p.currentTier}: '
                        '${active.tier == null ? p.custom : p.tiers.label(active.tier!)}',
                    if (active.endsAt case final ends?)
                      p.activeUntil.fill({
                        'date': formatDate(ends.toLocal(), language),
                      }),
                  ].join(' · '),
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
          const Divider(height: 8),
          for (final u in plan.usage)
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 4,
              children: [
                Row(
                  spacing: 12,
                  children: [
                    Expanded(
                      child: Text(
                        featureName(s, u.featureKey, u.name),
                        style: text.bodyMedium,
                      ),
                    ),
                    Flexible(
                      child: Text(
                        textAlign: TextAlign.end,
                        u.limit == null
                            ? p.usedUnlimited.fill({
                                'used': localDigits(u.used, language),
                              })
                            : p.used.fill({
                                'used': localDigits(u.used, language),
                                'limit': localDigits(u.limit!, language),
                              }),
                        style: text.labelLarge,
                      ),
                    ),
                  ],
                ),
                if (u.limit case final limit? when limit > 0)
                  LinearProgressIndicator(
                    value: (u.used / limit).clamp(0, 1).toDouble(),
                    borderRadius: BorderRadius.circular(4),
                    color: u.used >= limit ? c.tints[3].ink : c.primary,
                  ),
                Text(
                  '${p.tiers.label(u.tier)} · '
                  '${describeLimit(s, (kind: u.kind, limit: u.limit, liveDays: u.liveDays), language)}',
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _History extends ConsumerWidget {
  const _History({required this.items, required this.language});

  final List<Subscription> items;
  final String language;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Text(p.history, style: text.titleMedium),
          if (items.isEmpty)
            Text(p.noHistory, style: text.bodyMedium?.copyWith(color: c.ink2)),
          for (final sub in items)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 12,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 2,
                    children: [
                      Text(
                        '${p.subjects.label(sub.subject)} · '
                        '${sub.tier == null ? p.custom : p.tiers.label(sub.tier!)}',
                        style: text.bodyMedium,
                      ),
                      Text(
                        [
                          sub.code,
                          p.monthsOption.fill({
                            'count': localDigits(sub.months, language),
                          }),
                          '${toman(sub.total, language)} ${p.toman}',
                          p.sources.label(sub.source),
                        ].join(' · '),
                        style: text.bodySmall?.copyWith(color: c.ink2),
                      ),
                    ],
                  ),
                ),
                Flexible(
                  child: StatusPill(
                    p.statuses.label(sub.status),
                    tone: switch (sub.status) {
                      'ACTIVE' => 0,
                      'PENDING_PAYMENT' => 1,
                      'CANCELLED' => 3,
                      _ => 2,
                    },
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// The offer to see the plans, for an action refused for a plan limit
/// (402 `QUOTA_EXCEEDED`). Shown once for the whole app from the API
/// client's report, so no form has to know about plans.
Future<void> showQuotaPrompt(
  BuildContext context,
  WidgetRef ref,
  ApiException hit,
) {
  final s = ref.read(stringsProvider);
  final p = s.plans;
  final language = ref.read(l10nProvider).language;
  final data = hit.data is Map ? hit.data! as Map : const <Object?, Object?>{};
  final feature = '${data['feature'] ?? ''}';
  final limit = data['limit'] is num ? (data['limit'] as num).toInt() : null;
  final resets = data['resetsAt'] is String
      ? DateTime.tryParse(data['resetsAt'] as String)
      : null;
  final signedIn = ref.read(sessionProvider).value != null;

  return showDialog<void>(
    context: context,
    builder: (dialog) => AlertDialog(
      title: Text(p.limitTitle),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 10,
        children: [
          Text(
            '${featureName(s, feature, feature)} — '
            '${describeLimit(s, (kind: '${data['kind'] ?? ''}', limit: limit, liveDays: null), language)}',
          ),
          if (hit.message.isNotEmpty) Text(hit.message),
          if (resets != null)
            Text(
              p.limitResets.fill({
                'date': formatDate(resets.toLocal(), language),
              }),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialog).pop(),
          child: Text(s.common.close),
        ),
        FilledButton(
          onPressed: () {
            Navigator.of(dialog).pop();
            context.push(signedIn ? '/dashboard/billing' : '/pricing');
          },
          child: Text(p.seePlans),
        ),
      ],
    ),
  );
}
