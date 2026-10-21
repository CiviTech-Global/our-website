import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../core/links.dart';
import '../../core/settings.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../profile/profile_data.dart';
import 'jobs_data.dart';
import 'jobs_format.dart';

/// The postings this device has opened, newest first, so cards elsewhere
/// say "Viewed": the web keeps the same per browser.
final viewedJobsProvider = NotifierProvider<ViewedJobs, List<String>>(
  ViewedJobs.new,
);

class ViewedJobs extends Notifier<List<String>> {
  static const _key = 'jobs.viewed';

  /// Enough to cover a long search, few enough to stay small.
  static const _keep = 300;

  @override
  List<String> build() =>
      ref.read(sharedPreferencesProvider).getStringList(_key) ?? const [];

  void mark(String code) {
    if (state.isNotEmpty && state.first == code) return;
    state = [code, ...state.where((c) => c != code)].take(_keep).toList();
    ref.read(sharedPreferencesProvider).setStringList(_key, state);
  }
}

/// Save or unsave a posting. Signed out, it is the way to sign in that comes
/// back here: a bookmark that does nothing when tapped reads as broken.
class SaveJobButton extends ConsumerWidget {
  const SaveJobButton({required this.jobId, this.withLabel = false, super.key});

  final String jobId;
  final bool withLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final c = BaghColors.of(context);
    final signedIn = ref.watch(sessionProvider).value != null;
    final saved = signedIn && ref.watch(isJobSavedProvider(jobId));
    final icon = Icon(
      saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
      color: saved ? c.primary : c.ink2,
    );

    Future<void> onTap() async {
      if (!signedIn) {
        final here = GoRouterState.of(context).uri.toString();
        await context.push(
          Uri(path: '/login', queryParameters: {'from': here}).toString(),
        );
        return;
      }
      await ref.read(hapticsProvider).selection();
      try {
        await ref.read(jobActionsProvider).setSaved(jobId, saved: !saved);
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(describeError(s, e))));
        }
      }
    }

    final label = !signedIn
        ? j.signInToSave
        : saved
        ? j.unsave
        : j.save;
    if (withLabel) {
      return TextButton.icon(
        onPressed: onTap,
        icon: icon,
        label: Text(saved ? j.saved : j.save),
      );
    }
    return Semantics(
      toggled: saved,
      child: IconButton(tooltip: label, onPressed: onTap, icon: icon),
    );
  }
}

/// One posting as a card, the same everywhere a job is listed: the web's
/// JobRow. Detailed by default, since readers decide from the card whether
/// to open the posting at all; [compact] keeps the first lines, for narrow
/// places (similar jobs).
class JobCard extends ConsumerWidget {
  const JobCard({required this.job, this.compact = false, super.key});

  final JobSummary job;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final signedIn = ref.watch(sessionProvider).value != null;
    final applied =
        signedIn &&
        applicationTo(
              ref.watch(ownApplicationsProvider).value ?? const [],
              job.code,
            ) !=
            null;
    final seen = !applied && ref.watch(viewedJobsProvider).contains(job.code);
    final mine = {
      for (final skill
          in ref.watch(ownProfileProvider).value?.skills ?? const <String>[])
        skillKey(skill),
    };
    final pay = salaryText(job, s, language);
    final place = wherePosting(job, s, geo, language);
    final closing = closingText(job.closesAt, s, language);
    String n(int v) => localDigits(v, language);

    final facts = <(IconData, String)>[
      (Icons.work_outline_rounded, s.market.label(job.employmentType)),
      if (job.workArrangement != 'ONSITE')
        (Icons.home_work_outlined, s.market.label(job.workArrangement)),
      if (job.seniority case final level?)
        (Icons.layers_outlined, j.seniorityLevels.label(level)),
      if (experienceText(job, s, language) case final years?)
        (Icons.timer_outlined, years),
      if (job.openings > 1)
        (
          Icons.group_outlined,
          j.openingsCount.fill({'count': n(job.openings)}),
        ),
    ];
    final signals = <(IconData, String, int)>[
      if (job.responsiveEmployer)
        (Icons.verified_outlined, j.responsiveEmployer, 0),
      if (job.reviewingNow) (Icons.visibility_outlined, j.reviewingNow, 2),
      if (job.employmentType == 'INTERNSHIP' || job.seniority == 'INTERN')
        (Icons.school_outlined, j.internsWelcome, 4),
      if (job.amriehEligible) (Icons.shield_outlined, j.amrieh, 4),
      if (job.disabilityFriendly)
        (Icons.accessible_rounded, j.disabilityFriendly, 4),
    ];
    final benefits = [for (final b in job.benefits) ?j.benefitLabels[b]];
    final fitted = job.skills.where((x) => mine.contains(skillKey(x))).length;

    return Semantics(
      container: true,
      child: SoftSurface(
        onTap: () => context.push('/jobs/${job.code}'),
        semanticLabel: job.title,
        padding: EdgeInsets.all(compact ? 12 : 16),
        // An urgent posting is marked down its leading edge, a featured one
        // with a tint; the badges say so in words as well.
        tint: job.featured && !job.urgent ? c.tints[1] : null,
        child: Container(
          decoration: job.urgent
              ? BoxDecoration(
                  border: BorderDirectional(
                    start: BorderSide(color: c.error, width: 3),
                  ),
                )
              : null,
          padding: job.urgent
              ? const EdgeInsetsDirectional.only(start: 10)
              : EdgeInsets.zero,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              RemoteImage(
                url: apiAsset(job.companyLogo),
                width: compact ? 40 : 48,
                height: compact ? 40 : 48,
                fit: BoxFit.contain,
                radius: 10,
                initials: job.company?.characters.firstOrNull,
                tint: 2,
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 6,
                  children: [
                    if (job.urgent ||
                        job.featured ||
                        job.isNew ||
                        applied ||
                        seen)
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          if (job.urgent)
                            _Badge(j.urgent, Icons.bolt_rounded, tone: 3),
                          if (job.featured)
                            _Badge(
                              s.market.featuredBadge,
                              Icons.star_rounded,
                              tone: 1,
                            ),
                          if (job.isNew) _Badge(j.newBadge, null, tone: 2),
                          if (applied)
                            _Badge(
                              j.appliedBadge,
                              Icons.check_circle_rounded,
                              tone: 0,
                            ),
                          if (seen)
                            Text(
                              j.viewedBadge,
                              style: text.labelSmall?.copyWith(color: c.ink2),
                            ),
                        ],
                      ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            job.title,
                            textDirection: textDirectionOf(
                              job.title,
                              Directionality.of(context),
                            ),
                            // Against the page's own edge, whatever way the
                            // title reads: an English title on a Persian
                            // page otherwise sits across from its bookmark.
                            textAlign:
                                Directionality.of(context) == TextDirection.rtl
                                ? TextAlign.right
                                : TextAlign.left,
                            style: BaghType.weight(
                              compact ? text.titleSmall! : text.titleMedium!,
                              700,
                            ),
                          ),
                        ),
                        SaveJobButton(jobId: job.id),
                      ],
                    ),
                    if (job.company case final company?)
                      Wrap(
                        spacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          // The employer's own page, where there is one.
                          if (job.companySlug case final slug?)
                            InkWell(
                              borderRadius: BorderRadius.circular(6),
                              onTap: () => context.push(
                                '/companies/${Uri.encodeComponent(slug)}',
                              ),
                              child: Text(
                                company,
                                style: text.bodyMedium?.copyWith(
                                  color: c.ink2,
                                  decoration: TextDecoration.underline,
                                  decorationColor: c.edge,
                                ),
                              ),
                            )
                          else
                            Text(
                              company,
                              style: text.bodyMedium?.copyWith(color: c.ink2),
                            ),
                          if (job.authorVerified)
                            Tooltip(
                              message: j.verifiedEmployer,
                              child: Icon(
                                Icons.verified_rounded,
                                size: 16,
                                color: c.primary,
                                semanticLabel: j.verifiedEmployer,
                              ),
                            ),
                          if (job.authorRatingCount > 0)
                            Text(
                              '★ ${localDecimal(job.authorRating, 1, language)} '
                              '(${n(job.authorRatingCount)})',
                              style: text.bodySmall?.copyWith(color: c.ink2),
                            ),
                          if (!compact && job.category != null)
                            Text(
                              categoryName(job.category, language),
                              style: text.bodySmall?.copyWith(color: c.ink2),
                            ),
                        ],
                      ),
                    if (place.isNotEmpty || pay != null)
                      Wrap(
                        spacing: 14,
                        runSpacing: 4,
                        children: [
                          if (place.isNotEmpty)
                            _Fact(Icons.place_outlined, place),
                          if (pay != null)
                            _Fact(
                              Icons.account_balance_wallet_outlined,
                              pay,
                              strong: true,
                            ),
                        ],
                      ),
                    if (!compact)
                      Wrap(
                        spacing: 12,
                        runSpacing: 4,
                        children: [
                          for (final (icon, label) in facts)
                            _Fact(icon, label, small: true),
                        ],
                      ),
                    if (!compact && signals.isNotEmpty)
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (final (icon, label, tone) in signals)
                            _Badge(label, icon, tone: tone),
                        ],
                      ),
                    if (!compact && benefits.isNotEmpty)
                      _Fact(
                        Icons.card_giftcard_rounded,
                        [
                          benefits.take(3).join(language == 'fa' ? '، ' : ', '),
                          if (benefits.length > 3) '+${n(benefits.length - 3)}',
                        ].join(' '),
                        small: true,
                      ),
                    if (!compact && job.skills.isNotEmpty)
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          for (final skill in job.skills.take(5))
                            _Skill(skill, have: mine.contains(skillKey(skill))),
                          if (job.skills.length > 5)
                            Text(
                              '+${n(job.skills.length - 5)}',
                              style: text.labelSmall?.copyWith(color: c.ink2),
                            ),
                          if (mine.isNotEmpty)
                            Text(
                              j.skillFit.fill({
                                'matched': n(fitted),
                                'total': n(job.skills.length),
                              }),
                              style: text.labelSmall?.copyWith(
                                color: c.primary,
                              ),
                            ),
                        ],
                      ),
                    Wrap(
                      spacing: 12,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        if (job.publishedAt != null)
                          _Fact(
                            Icons.schedule_rounded,
                            postedAgo(job.publishedAt, s, language),
                            small: true,
                          ),
                        if (job.applicantCount case final count? when !compact)
                          _Fact(
                            Icons.groups_outlined,
                            count == 0
                                ? j.earlyApplicant
                                : count == 1
                                ? j.applicantsOne
                                : j.applicantsCount.fill({'count': n(count)}),
                            small: true,
                          ),
                        if (closing != null)
                          _Fact(
                            Icons.hourglass_bottom_rounded,
                            closing,
                            small: true,
                            color: c.tints[1].ink,
                          ),
                      ],
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

class _Fact extends StatelessWidget {
  const _Fact(
    this.icon,
    this.label, {
    this.small = false,
    this.strong = false,
    this.color,
  });

  final IconData icon;
  final String label;
  final bool small;
  final bool strong;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final base = small ? text.bodySmall! : text.bodyMedium!;
    final style = strong
        ? BaghType.weight(base, 700).copyWith(color: color ?? c.ink)
        : base.copyWith(color: color ?? c.ink2);
    return Row(
      mainAxisSize: MainAxisSize.min,
      spacing: 4,
      children: [
        Icon(icon, size: small ? 14 : 16, color: color ?? c.ink2),
        Flexible(child: Text(label, style: style)),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge(this.label, this.icon, {required this.tone});

  final String label;
  final IconData? icon;
  final int tone;

  @override
  Widget build(BuildContext context) {
    final t = BaghColors.of(context).tints[tone];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: ShapeDecoration(color: t.fill, shape: const StadiumBorder()),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 4,
        children: [
          if (icon != null) Icon(icon, size: 13, color: t.ink),
          Flexible(
            child: Text(
              label,
              style: Theme.of(
                context,
              ).textTheme.labelSmall?.copyWith(color: t.ink),
            ),
          ),
        ],
      ),
    );
  }
}

class _Skill extends StatelessWidget {
  const _Skill(this.skill, {required this.have});

  final String skill;
  final bool have;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final t = c.primarySoft;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: have ? t.fill : null,
        border: Border.all(color: have ? t.fill : c.edge),
        borderRadius: BorderRadius.circular(BaghRadius.field / 2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 3,
        children: [
          if (have) Icon(Icons.check_rounded, size: 12, color: t.ink),
          // A long skill wraps inside its chip rather than past the card.
          Flexible(
            child: Text(
              skill,
              style: Theme.of(
                context,
              ).textTheme.labelSmall?.copyWith(color: have ? t.ink : c.ink2),
            ),
          ),
        ],
      ),
    );
  }
}
