import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../jobs/jobs_format.dart' show daysUntil, postedAgo;
import 'freelance_data.dart';

/// The pieces every freelance page shares, as the web's WorkUi and
/// lib/workFormat: budgets in their own currency, the project card, a
/// freelancer's record in a line, the service tile and the talent card.

String? money(String? value, String currency, Strings s, String language) =>
    formatMoneyIn(value, currency, language, s.market.currency);

/// A budget as a card says it: "500 to 900 €", "from 20,000,000 toman",
/// "25 to 40 $ / hr", or "open to offers".
String budgetText(ProjectSummary p, Strings s, String language) => budgetTextOf(
  min: p.budgetMin,
  max: p.budgetMax,
  unknown: p.budgetUnknown,
  currency: p.currency,
  hourly: p.hourly,
  s: s,
  language: language,
);

String budgetTextOf({
  required String? min,
  required String? max,
  required bool unknown,
  required String currency,
  required bool hourly,
  required Strings s,
  required String language,
}) {
  final w = s.work;
  if (unknown || (min == null && max == null)) return w.budgetUnknown;
  final low = money(min, currency, s, language);
  final high = money(max, currency, s, language);
  final range = low != null && high != null && low != high
      ? '$low ${s.market.to} $high'
      : low != null && high != null
      ? low
      : low != null
      ? w.budgetFrom.fill({'amount': low})
      : w.budgetUpTo.fill({'amount': high!});
  return hourly ? w.hourlyRange.fill({'range': range}) : range;
}

/// One amount, with "/ hr" when it is a rate.
String amountText(
  String? amount,
  String currency,
  bool hourly,
  Strings s,
  String language,
) {
  final text = money(amount, currency, s, language) ?? '—';
  return hourly ? '$text ${s.work.perHour}' : text;
}

String percentText(int? value, String language) =>
    value == null ? '—' : '${localDigits(value, language)}%';

/// The bid deadline as a card says it.
String? deadlineText(DateTime? closesAt, Strings s, String language) {
  if (closesAt == null) return null;
  if (!closesAt.isAfter(DateTime.now())) return s.work.closed;
  final left = daysUntil(closesAt);
  if (left == null) return null;
  return left == 0
      ? s.work.closesToday
      : s.work.closesIn.fill({'days': localDigits(left, language)});
}

/// "★ 4.8 (12)".
String starsText(double avg, int count, String language) =>
    '★ ${localDecimal(avg, 1, language)} (${localDigits(count, language)})';

/// A row of small facts, each an icon and words.
class FactLine extends StatelessWidget {
  const FactLine(this.facts, {super.key});

  final List<(IconData, String)> facts;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Wrap(
      spacing: 12,
      runSpacing: 4,
      children: [
        for (final (icon, words) in facts)
          Row(
            mainAxisSize: MainAxisSize.min,
            spacing: 4,
            children: [
              Icon(icon, size: 14, color: c.ink2),
              Flexible(
                child: Text(
                  words,
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

/// Small rounded skill tags.
class SkillChips extends StatelessWidget {
  const SkillChips(this.skills, {this.matched = const {}, super.key});

  final List<String> skills;

  /// Lower-cased skills the reader has, drawn as matched.
  final Set<String> matched;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final skill in skills)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: ShapeDecoration(
              color: matched.contains(skill.toLowerCase())
                  ? c.tints[0].fill
                  : c.fill,
              shape: const StadiumBorder(),
            ),
            child: Text(
              skill,
              style: text.labelMedium?.copyWith(
                color: matched.contains(skill.toLowerCase())
                    ? c.tints[0].ink
                    : c.ink2,
              ),
            ),
          ),
      ],
    );
  }
}

/// Save or unsave a project. Signed out, it asks for a sign-in that comes
/// back here: a bookmark that does nothing when tapped reads as broken.
class SaveProjectButton extends ConsumerWidget {
  const SaveProjectButton({required this.projectId, super.key});

  final String projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final signedIn = ref.watch(sessionProvider).value != null;
    final saved =
        ref.watch(savedProjectIdsProvider).value?.contains(projectId) ?? false;
    final c = BaghColors.of(context);
    return IconButton(
      tooltip: saved ? s.work.savedProject : s.work.saveProject,
      isSelected: saved,
      icon: Icon(
        saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
        color: saved ? c.primary : c.ink2,
      ),
      onPressed: () async {
        if (!signedIn) {
          final here = GoRouterState.of(context).uri.toString();
          await context.push(
            Uri(path: '/login', queryParameters: {'from': here}).toString(),
          );
          return;
        }
        try {
          await ref
              .read(freelanceActionsProvider)
              .setSaved(projectId, saved: !saved);
        } catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(SnackBar(content: Text(describeError(s, e))));
          }
        }
      },
    );
  }
}

/// One project, the same everywhere a project is listed.
class ProjectCard extends ConsumerWidget {
  const ProjectCard({required this.project, this.footer, super.key});

  final ProjectSummary project;

  /// A line under the card: "saved 3 days ago", the reader's own bid.
  final Widget? footer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final p = project;
    final client = p.client;
    final activity = p.activity;
    String n(int v) => localDigits(v, language);
    final fresh =
        p.publishedAt != null &&
        DateTime.now().difference(p.publishedAt!) < const Duration(days: 2);
    final terms = [
      w.pricing.label(p.pricingType),
      if (p.experienceLevel case final e?) w.experience.label(e),
      if (p.duration case final d?) w.durations.label(d),
      if (p.weeklyHours case final h?) w.weeklyHours.label(h),
    ].join(factSep(language));
    final place = p.onsite
        ? [
            p.city,
            if (p.country case final code?) geo.country(code),
          ].whereType<String>().join('، ')
        : null;
    final deadline = deadlineText(p.closesAt, s, language);

    return SoftSurface(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(BaghRadius.card),
        onTap: () => context.push('/projects/${p.code}'),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 8, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 8,
            children: [
              if (p.urgent || p.featured || p.nda || p.contractToHire || fresh)
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    if (p.urgent) StatusPill(w.urgent, tone: 3),
                    if (p.featured) StatusPill(w.featured, tone: 1),
                    if (p.nda) StatusPill(w.nda, tone: 4),
                    if (p.contractToHire) StatusPill(w.contractToHire, tone: 0),
                    if (fresh) StatusPill(s.jobs.newBadge, tone: 2),
                  ],
                ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        p.title,
                        textDirection: textDirectionOf(
                          p.title,
                          Directionality.of(context),
                        ),
                        style: text.titleMedium,
                      ),
                    ),
                  ),
                  SaveProjectButton(projectId: p.id),
                ],
              ),
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 8,
                  children: [
                    Text(
                      budgetText(p, s, language),
                      style: text.titleSmall?.copyWith(color: c.primary),
                    ),
                    Text(terms, style: text.bodySmall?.copyWith(color: c.ink2)),
                    if (p.excerpt case final excerpt?)
                      Text(
                        excerpt,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        textDirection: textDirectionOf(
                          excerpt,
                          Directionality.of(context),
                        ),
                        style: text.bodyMedium?.copyWith(color: c.ink2),
                      ),
                    if (p.nda)
                      FactLine([(Icons.lock_outline_rounded, w.briefLocked)]),
                    if (p.skills.isNotEmpty)
                      SkillChips([
                        ...p.skills.take(8),
                        if (p.skills.length > 8) '+${n(p.skills.length - 8)}',
                      ]),
                    FactLine([
                      if (client != null)
                        (
                          Icons.verified_user_outlined,
                          client.verified
                              ? w.clientVerified
                              : w.clientUnverified,
                        ),
                      if (client != null && client.ratingCount > 0)
                        (
                          Icons.star_outline_rounded,
                          starsText(
                            client.ratingAvg,
                            client.ratingCount,
                            language,
                          ),
                        ),
                      if (client != null && client.hires > 0)
                        (
                          Icons.group_outlined,
                          w.hiresCount.fill({'count': n(client.hires)}),
                        ),
                      if (client != null)
                        (Icons.place_outlined, geo.country(client.country)),
                      if (place != null && place.isNotEmpty)
                        (Icons.work_outline_rounded, '${w.onsite}: $place'),
                      (
                        Icons.chat_bubble_outline_rounded,
                        activity != null
                            ? '${w.proposals}: ${w.proposalRange.label(activity.proposalRange)}'
                            : w.proposalsCount.fill({'count': n(p.bidCount)}),
                      ),
                      if (activity?.averageBid case final avg?)
                        (
                          Icons.speed_rounded,
                          '${w.averageBid}: ${money(avg, p.currency, s, language) ?? '—'}',
                        ),
                      if (p.publishedAt case final at?)
                        (
                          Icons.schedule_rounded,
                          w.postedAgo.fill({'ago': postedAgo(at, s, language)}),
                        ),
                      if (deadline != null)
                        (Icons.hourglass_bottom_rounded, deadline),
                      if (p.match case final m? when m.total > 0)
                        (
                          Icons.check_circle_outline_rounded,
                          w.yourMatch.fill({
                            'matched': n(m.matched),
                            'total': n(m.total),
                          }),
                        ),
                    ]),
                    ?footer,
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

/// A freelancer's earned record in one line: level, rating, job success,
/// on time, completed, where, rate, languages, last seen.
class FreelancerFacts extends ConsumerWidget {
  const FreelancerFacts(this.stats, {super.key});

  final FreelancerStats stats;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final f = stats;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 6,
      children: [
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            StatusPill(w.levels.label(f.level), tone: levelTone(f.level)),
            if (f.verified) StatusPill(s.market.verifiedBadge, tone: 0),
          ],
        ),
        FactLine([
          if (f.ratingCount > 0)
            (
              Icons.star_outline_rounded,
              starsText(f.ratingAvg, f.ratingCount, language),
            ),
          if (f.jobSuccess != null)
            (
              Icons.trending_up_rounded,
              '${w.jobSuccess}: ${percentText(f.jobSuccess, language)}',
            ),
          if (f.onTime != null)
            (
              Icons.timer_outlined,
              '${w.onTime}: ${percentText(f.onTime, language)}',
            ),
          (
            Icons.layers_outlined,
            w.completedContracts.fill({
              'count': localDigits(f.completed, language),
            }),
          ),
          (Icons.place_outlined, geo.country(f.country)),
          if (f.hourlyRate case final rate?)
            (
              Icons.account_balance_wallet_outlined,
              '${money(rate, f.hourlyCurrency, s, language)} ${w.perHour}',
            ),
          if (f.languages.isNotEmpty)
            (Icons.translate_rounded, f.languages.map(geo.language).join('، ')),
          if (f.lastActiveAt case final at?)
            (
              Icons.visibility_outlined,
              w.activeAgo.fill({'ago': postedAgo(at, s, language)}),
            ),
        ]),
      ],
    );
  }
}

/// The tint a freelancer level wears.
int levelTone(String level) => switch (level) {
  'TOP_RATED' => 1,
  'ESTABLISHED' => 0,
  'RISING' => 2,
  _ => 4,
};

/// One service as the catalogue shows it: cover, seller, rating, "from"
/// price.
class ServiceTile extends ConsumerWidget {
  const ServiceTile({required this.service, super.key});

  final ServiceSummary service;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final v = service;
    return SoftSurface(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(BaghRadius.card),
        onTap: () => context.push('/freelance-services/${v.code}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 16 / 10,
              child: RemoteImage(
                url: switch (v.coverImageId) {
                  final id? => apiAsset(serviceImagePath(id)),
                  null => null,
                },
                radius: BaghRadius.card,
                tint: 3,
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 6,
                children: [
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      if (v.sellerUsername case final name?)
                        Text(
                          name,
                          textDirection: TextDirection.ltr,
                          style: text.labelLarge,
                        ),
                      StatusPill(
                        w.levels.label(v.sellerLevel),
                        tone: levelTone(v.sellerLevel),
                      ),
                      if (v.sellerVerified)
                        Icon(
                          Icons.verified_rounded,
                          size: 16,
                          color: c.primary,
                          semanticLabel: s.market.verifiedBadge,
                        ),
                    ],
                  ),
                  Text(
                    v.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textDirection: textDirectionOf(
                      v.title,
                      Directionality.of(context),
                    ),
                    style: text.titleSmall,
                  ),
                  Text(
                    [
                      v.ratingCount > 0
                          ? starsText(v.ratingAvg, v.ratingCount, language)
                          : w.noReviewsYet,
                      if (v.ordersCompleted > 0)
                        w.ordersCompleted.fill({
                          'count': localDigits(v.ordersCompleted, language),
                        }),
                    ].join('، '),
                    style: text.bodySmall?.copyWith(color: c.ink2),
                  ),
                  const Divider(height: 8),
                  // Wraps rather than squeezing: a large price in large
                  // text does not fit beside the delivery time.
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 2,
                    children: [
                      if (v.fastestDelivery case final days?)
                        Text(
                          w.deliveryIn.fill({
                            'days': localDigits(days, language),
                          }),
                          style: text.bodySmall?.copyWith(color: c.ink2),
                        ),
                      Text(
                        '${w.startingAt} ${money(v.startingPrice, v.currency, s, language) ?? '—'}',
                        style: text.titleSmall,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One freelancer in the talent directory.
class TalentCard extends ConsumerWidget {
  const TalentCard({required this.row, this.onInvite, super.key});

  final TalentRow row;

  /// Invite them to one of the reader's open projects.
  final VoidCallback? onInvite;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final t = row;
    final available = t.stats.availability;
    return SoftSurface(
      padding: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(BaghRadius.card),
        onTap: () => context.push('/profiles/${t.username}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 8,
            children: [
              Row(
                spacing: 12,
                children: [
                  RemoteImage(
                    url: null,
                    width: 48,
                    height: 48,
                    radius: 24,
                    tint: 2,
                    initials: initialsOf(t.displayName),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 2,
                      children: [
                        Text(t.displayName, style: text.titleMedium),
                        Text(
                          '@${t.username}${factSep(language)}${w.availability.label(available)}',
                          style: text.bodySmall?.copyWith(
                            color: available == 'AVAILABLE'
                                ? c.primary
                                : c.ink2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (t.headline case final headline?)
                Text(
                  headline,
                  textDirection: textDirectionOf(
                    headline,
                    Directionality.of(context),
                  ),
                  style: text.bodyMedium?.copyWith(color: c.ink2),
                ),
              FreelancerFacts(t.stats),
              if (t.stats.skills.isNotEmpty)
                SkillChips(t.stats.skills.take(10).toList()),
              Wrap(
                spacing: 8,
                children: [
                  if (t.serviceCount > 0)
                    TextButton(
                      onPressed: () => context.push(
                        Uri(
                          path: '/freelance-services',
                          queryParameters: {'sellerUsername': t.username},
                        ).toString(),
                      ),
                      child: Text(
                        w.servicesCount.fill({
                          'count': localDigits(t.serviceCount, language),
                        }),
                      ),
                    ),
                  if (onInvite != null)
                    OutlinedButton.icon(
                      icon: const Icon(Icons.person_add_alt_rounded),
                      label: Text(w.invite),
                      onPressed: onInvite,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
