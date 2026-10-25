import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../core/links.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/attachments_field.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import '../profile/profile_data.dart';
import 'job_card.dart';
import 'jobs_data.dart';
import 'jobs_format.dart';

/// One posting, and the form to answer it, as the web's JobDetailPage.
///
/// The form is reachable once two things are true, signed in and verified,
/// and each is said plainly with the way out of it, rather than letting
/// somebody write a cover letter and then meet a refusal.
class JobScreen extends ConsumerStatefulWidget {
  const JobScreen({required this.code, this.toApply = false, super.key});

  final String code;

  /// Opened from a card's "Apply": straight to the form.
  final bool toApply;

  @override
  ConsumerState<JobScreen> createState() => _JobScreenState();
}

class _JobScreenState extends ConsumerState<JobScreen> {
  final _applyKey = GlobalKey();
  final _applyForm = GlobalKey<_ApplyFormState>();
  final _scroll = ScrollController();
  bool _scrolledToApply = false;

  /// The apply section is on screen: the pinned key steps aside rather than
  /// stand under the form's own.
  bool _applyInView = false;

  /// Sent from this screen: said in so many words, even after the reader's
  /// applications reload and know about it.
  bool _justApplied = false;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_checkApplyInView);
    // Opened: the cards elsewhere say "Viewed" from now on, on this device.
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => ref.read(viewedJobsProvider.notifier).mark(widget.code),
    );
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _checkApplyInView() {
    final box = _applyKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || !box.attached) return;
    final top = box.localToGlobal(Offset.zero).dy;
    final inView = top < MediaQuery.sizeOf(context).height * 0.85;
    if (inView != _applyInView) setState(() => _applyInView = inView);
  }

  void _toApply() {
    final target = _applyKey.currentContext;
    if (target == null) return;
    Scrollable.ensureVisible(
      target,
      duration: MediaQuery.disableAnimationsOf(context)
          ? Duration.zero
          : const Duration(milliseconds: 400),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final job = ref.watch(jobProvider(widget.code));
    final c = BaghColors.of(context);
    final detail = job.value;
    // The pinned key only where there is something to do: sign in, verify or
    // apply. Not on one's own posting, and not once applied.
    final signedIn = ref.watch(sessionProvider).value != null;
    final applied =
        _justApplied ||
        (detail != null &&
            applicationTo(
                  ref.watch(ownApplicationsProvider).value ?? const [],
                  detail.code,
                ) !=
                null);
    final own =
        detail != null &&
        (ref.watch(ownJobCodesProvider).value ?? const {}).contains(
          detail.code,
        );
    final showKey =
        detail != null && !_applyInView && (!signedIn || (!applied && !own));

    if (detail != null && widget.toApply && !_scrolledToApply) {
      _scrolledToApply = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _toApply());
    }

    return LeaveGuard(
      isDirty: () => _applyForm.currentState?.dirty ?? false,
      busy: _applyForm.currentState?.sending ?? false,
      child: Scaffold(
        appBar: AppBar(
          leading: homeLeading(context),
          actions: [
            if (detail != null) ...[
              IconButton(
                tooltip: s.jobs.share,
                icon: const Icon(Icons.link_rounded),
                onPressed: () async {
                  await Clipboard.setData(
                    ClipboardData(
                      text: AppConfig.website(
                        '/jobs/${detail.code}',
                        ref.read(l10nProvider).language,
                      ).toString(),
                    ),
                  );
                  if (context.mounted) {
                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(SnackBar(content: Text(s.jobs.linkCopied)));
                  }
                },
              ),
              SaveJobButton(jobId: detail.id),
            ],
            const HelpAction('job-detail'),
          ],
        ),
        bottomNavigationBar: !showKey
            ? null
            : SafeArea(
                top: false,
                child: Padding(
                  padding: BaghLayout.readablePadding(
                    context,
                    top: 8,
                    bottom: 12,
                  ),
                  // Its own height, not all the room a bottom bar is offered.
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      BaghKey(
                        label: s.jobs.applyCta,
                        icon: Icons.send_rounded,
                        expand: true,
                        onPressed: _toApply,
                      ),
                    ],
                  ),
                ),
              ),
        body: SafeArea(
          top: false,
          child: RefreshIndicator(
            color: c.primary,
            onRefresh: () => ref.refresh(jobProvider(widget.code).future),
            child: ListView(
              controller: _scroll,
              padding: BaghLayout.readablePadding(
                context,
                top: BaghSpace.gutter,
                bottom: BaghSpace.section * 2,
              ),
              children: [
                // Gone is not the same as unreachable: only a 404 says so.
                if (job.hasError && ApiException.from(job.error!).status == 404)
                  EmptyNote(
                    message: s.errors.notFoundBody,
                    action: (s.market.backToJobs, () => context.go('/jobs')),
                  )
                else
                  AsyncView(
                    value: job,
                    onRetry: () => ref.invalidate(jobProvider(widget.code)),
                    data: (detail) => Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      spacing: BaghSpace.gutter,
                      children: [
                        _Header(detail),
                        _Facts(detail),
                        _Section(
                          title: s.jobs.description,
                          child: Text(
                            detail.description,
                            textDirection: textDirectionOf(
                              detail.description,
                              Directionality.of(context),
                            ),
                            style: Theme.of(context).textTheme.bodyLarge,
                          ),
                        ),
                        if (detail.skills.isNotEmpty) _Skills(detail),
                        _Requirements(detail),
                        _Benefits(detail),
                        _Meta(detail),
                        if (detail.authorUsername case final username?)
                          SoftSurface(
                            onTap: () => context.push('/profiles/$username'),
                            child: Row(
                              spacing: 12,
                              children: [
                                CircleAvatar(
                                  backgroundColor: c.primarySoft.fill,
                                  child: Text(
                                    username.characters.first.toUpperCase(),
                                    style: TextStyle(color: c.primarySoft.ink),
                                  ),
                                ),
                                Expanded(
                                  child: Text(
                                    '@$username',
                                    textDirection: TextDirection.ltr,
                                    textAlign: TextAlign.start,
                                  ),
                                ),
                                if (detail.authorVerified)
                                  Icon(
                                    Icons.verified_rounded,
                                    color: c.primary,
                                  ),
                              ],
                            ),
                          ),
                        if (detail.similar.isNotEmpty)
                          _Section(
                            title: s.market.similarJobs,
                            plain: true,
                            child: Column(
                              spacing: 10,
                              children: [
                                for (final j in detail.similar)
                                  JobCard(job: j, compact: true),
                              ],
                            ),
                          ),
                        KeyedSubtree(
                          key: _applyKey,
                          child: _ApplySection(
                            job: detail,
                            formKey: _applyForm,
                            justApplied: _justApplied,
                            onChanged: () => setState(() {}),
                            onSent: () => setState(() => _justApplied = true),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.child,
    this.plain = false,
  });

  final String title;
  final Widget child;

  /// Without its own surface, for content that brings cards of its own.
  final bool plain;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        Text(title, style: text.titleMedium),
        child,
      ],
    );
    return plain
        ? body
        : SoftSurface(padding: const EdgeInsets.all(20), child: body);
  }
}

class _Header extends ConsumerWidget {
  const _Header(this.job);

  final JobDetail job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final where = wherePosting(job, s, geo, language);
    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 10,
        children: [
          Row(
            spacing: 14,
            children: [
              RemoteImage(
                url: apiAsset(job.companyLogo),
                width: 64,
                height: 64,
                fit: BoxFit.contain,
                radius: 14,
                initials: job.company?.characters.firstOrNull,
                tint: 2,
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 4,
                  children: [
                    if (job.company case final company?)
                      InkWell(
                        onTap: job.companySlug == null
                            ? null
                            : () => openLink(
                                context,
                                ref,
                                '/companies/${Uri.encodeComponent(job.companySlug!)}',
                              ),
                        child: Text(
                          company,
                          style: text.bodyMedium?.copyWith(
                            color: job.companySlug == null ? c.ink2 : c.primary,
                          ),
                        ),
                      ),
                    if (where.isNotEmpty)
                      Text(
                        where,
                        style: text.bodySmall?.copyWith(color: c.ink2),
                      ),
                  ],
                ),
              ),
            ],
          ),
          Text(
            job.title,
            textDirection: textDirectionOf(
              job.title,
              Directionality.of(context),
            ),
            style: text.headlineSmall,
          ),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              if (job.urgent) _Pill(j.urgent, tone: 3),
              if (job.featured) _Pill(s.market.featuredBadge, tone: 1),
              if (job.responsiveRate case final rate?)
                _Pill(
                  '${j.responsiveEmployer}${factSep(language)}${j.responsiveHint.fill({'rate': localDigits((rate * 100).round(), language)})}',
                  tone: 0,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.label, {required this.tone});

  final String label;
  final int tone;

  @override
  Widget build(BuildContext context) {
    final t = BaghColors.of(context).tints[tone];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: ShapeDecoration(color: t.fill, shape: const StadiumBorder()),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(color: t.ink),
      ),
    );
  }
}

/// A label and its value, in a list of facts.
class _Row extends StatelessWidget {
  const _Row(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 12,
        children: [
          Expanded(
            flex: 2,
            child: Text(label, style: text.bodySmall?.copyWith(color: c.ink2)),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              textDirection: textDirectionOf(value, Directionality.of(context)),
              style: text.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _Facts extends ConsumerWidget {
  const _Facts(this.job);

  final JobDetail job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final where = wherePosting(job, s, geo, language);
    final pay = salaryText(job, s, language);
    final years = job.minExperienceYears;
    return _Section(
      title: j.keyFacts,
      child: Column(
        children: [
          if (job.category != null)
            _Row(j.category, categoryName(job.category, language)),
          _Row(m.employmentType, m.label(job.employmentType)),
          _Row(m.workArrangement, m.label(job.workArrangement)),
          if (job.seniority case final level?)
            _Row(j.seniority, j.seniorityLevels.label(level)),
          _Row(
            j.minExperience,
            years == null || years == 0
                ? j.notRequired
                : j.yearsOrMore.fill({'n': localDigits(years, language)}),
          ),
          if (where.isNotEmpty) _Row(j.location, where),
          if (pay != null) _Row(m.salary, pay),
          if (job.workingHours case final hours?) _Row(j.workingHours, hours),
          if (job.openings > 1)
            _Row(j.openings, localDigits(job.openings, language)),
          if (job.closesAt case final at?)
            _Row(m.closesAt, formatDate(at.toLocal(), language)),
        ],
      ),
    );
  }
}

class _Skills extends ConsumerWidget {
  const _Skills(this.job);

  final JobDetail job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final signedIn = ref.watch(sessionProvider).value != null;
    final match = signedIn ? ref.watch(jobMatchProvider(job.id)).value : null;
    final have = {
      for (final x in match?.matched ?? const <String>[]) skillKey(x),
    };
    String n(int v) => localDigits(v, language);
    return _Section(
      title: s.market.skills,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 10,
        children: [
          if (match != null)
            Text(
              match.hasProfileSkills
                  ? j.matchSummary.fill({
                      'matched': n(match.matched.length),
                      'total': n(match.total),
                    })
                  : j.matchNoSkills,
              style: text.bodyMedium?.copyWith(color: c.primary),
            ),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final skill in job.skills)
                Chip(
                  avatar: have.contains(skillKey(skill))
                      ? Icon(
                          Icons.check_rounded,
                          size: 16,
                          color: c.primarySoft.ink,
                        )
                      : null,
                  backgroundColor: have.contains(skillKey(skill))
                      ? c.primarySoft.fill
                      : null,
                  label: Text(skill),
                ),
            ],
          ),
          if (match != null && !match.hasProfileSkills)
            TextButton(
              onPressed: () => context.push('/dashboard/profile'),
              child: Text(j.editProfile),
            ),
        ],
      ),
    );
  }
}

class _Requirements extends ConsumerWidget {
  const _Requirements(this.job);

  final JobDetail job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final j = ref.watch(stringsProvider).jobs;
    final language = ref.watch(l10nProvider).language;
    String n(int v) => localDigits(v, language);
    final rows = <(String, String)>[
      if (job.educationLevel case final level?)
        (
          j.education,
          job.fieldOfStudy == null
              ? j.educationLevels.label(level)
              : '${j.educationLevels.label(level)} — ${job.fieldOfStudy}',
        )
      else if (job.fieldOfStudy case final field?)
        (j.fieldOfStudy, field),
      if (job.genderRequirement case final g? when g != 'ANY')
        (j.gender, j.genders.label(g)),
      if (job.ageMin != null || job.ageMax != null)
        (
          j.age,
          job.ageMin != null && job.ageMax != null
              ? j.ageRange.fill({'min': n(job.ageMin!), 'max': n(job.ageMax!)})
              : job.ageMin != null
              ? j.ageFrom.fill({'min': n(job.ageMin!)})
              : j.ageTo.fill({'max': n(job.ageMax!)}),
        ),
      if (job.militaryService case final ms? when ms != 'ANY')
        (j.militaryService, j.militaryOptions.label(ms)),
    ];
    final notes = [
      if (job.amriehEligible) j.amrieh,
      if (job.disabilityFriendly) j.disabilityFriendly,
    ];
    if (rows.isEmpty && notes.isEmpty) return const SizedBox.shrink();
    return _Section(
      title: j.requirements,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (label, value) in rows) _Row(label, value),
          for (final note in notes)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                spacing: 8,
                children: [
                  const Icon(Icons.check_circle_outline_rounded, size: 18),
                  Expanded(child: Text(note)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Benefits extends ConsumerWidget {
  const _Benefits(this.job);

  final JobDetail job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final j = ref.watch(stringsProvider).jobs;
    final labels = [for (final b in job.benefits) ?j.benefitLabels[b]];
    if (labels.isEmpty) return const SizedBox.shrink();
    return _Section(
      title: j.benefits,
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        children: [
          for (final label in labels)
            Chip(
              avatar: const Icon(Icons.card_giftcard_rounded, size: 16),
              label: Text(label),
            ),
        ],
      ),
    );
  }
}

class _Meta extends ConsumerWidget {
  const _Meta(this.job);

  final JobDetail job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final style = Theme.of(
      context,
    ).textTheme.bodySmall?.copyWith(color: c.ink2);
    String n(int v) => localDigits(v, language);
    return Wrap(
      spacing: 16,
      runSpacing: 6,
      children: [
        Text(s.jobs.viewsCount.fill({'count': n(job.viewCount)}), style: style),
        Text(
          '${s.market.applicationsLabel}: ${n(job.applications)}',
          style: style,
        ),
        if (job.publishedAt case final at?)
          Text(
            '${s.market.postedOn} ${formatDate(at.toLocal(), language)}',
            style: style,
          ),
        Text(job.code, textDirection: TextDirection.ltr, style: style),
      ],
    );
  }
}

/// Where somebody answers the posting: one of six states, each with its way
/// forward.
class _ApplySection extends ConsumerWidget {
  const _ApplySection({
    required this.job,
    required this.formKey,
    required this.justApplied,
    required this.onChanged,
    required this.onSent,
  });

  final JobDetail job;
  final GlobalKey<_ApplyFormState> formKey;
  final bool justApplied;
  final VoidCallback onChanged;
  final VoidCallback onSent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final user = ref.watch(sessionProvider).value;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);

    Widget body;
    if (user == null) {
      body = BaghKey(
        label: m.loginToApply,
        kind: BaghKeyKind.outline,
        icon: Icons.login_rounded,
        expand: true,
        onPressed: () => context.push(
          Uri(
            path: '/login',
            queryParameters: {'from': '/jobs/${job.code}'},
          ).toString(),
        ),
      );
    } else {
      final own = ref.watch(ownJobCodesProvider).value ?? const <String>{};
      final applications = ref.watch(ownApplicationsProvider);
      final verification = ref.watch(ownVerificationProvider);
      final mine = applicationTo(applications.value ?? const [], job.code);
      if (!applications.hasValue || !verification.hasValue) {
        body = const SizedBox(height: 48);
      } else if (own.contains(job.code)) {
        body = _Note(
          j.ownPosting,
          action: (
            j.managePosting,
            () => openLink(context, ref, '/dashboard/jobs'),
          ),
        );
      } else if (justApplied) {
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 10,
          children: [
            FormMessage(j.appliedDirect, positive: true),
            BaghKey(
              label: j.trackApplication,
              kind: BaghKeyKind.outline,
              expand: true,
              onPressed: () =>
                  openLink(context, ref, '/dashboard/applications'),
            ),
          ],
        );
      } else if (mine != null) {
        body = _Note(
          j.alreadyApplied.fill({
            'date': mine.createdAt == null
                ? ''
                : formatDate(mine.createdAt!.toLocal(), language),
          }),
          action: (
            j.trackApplication,
            () => openLink(context, ref, '/dashboard/applications'),
          ),
        );
      } else if (verification.value?.status != 'APPROVED') {
        body = _Note(
          m.verificationRequired,
          icon: Icons.verified_user_outlined,
          action: (
            m.goToVerification,
            () => context.push('/dashboard/verification'),
          ),
        );
      } else {
        body = _ApplyForm(
          key: formKey,
          job: job,
          onChanged: onChanged,
          onSent: onSent,
        );
      }
    }

    return SoftSurface(
      tint: c.primarySoft,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Text(
            j.applyCta,
            style: text.titleMedium?.copyWith(color: c.primarySoft.ink),
          ),
          Text(
            j.applyDirectHint,
            style: text.bodySmall?.copyWith(color: c.primarySoft.ink),
          ),
          body,
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note(this.message, {required this.action, this.icon});

  final String message;
  final (String, VoidCallback) action;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    spacing: 10,
    children: [
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 8,
        children: [
          if (icon != null) Icon(icon, size: 20),
          Expanded(child: Text(message)),
        ],
      ),
      BaghKey(
        label: action.$1,
        kind: BaghKeyKind.outline,
        expand: true,
        onPressed: action.$2,
      ),
    ],
  );
}

class _ApplyForm extends ConsumerStatefulWidget {
  const _ApplyForm({
    required this.job,
    required this.onChanged,
    required this.onSent,
    super.key,
  });

  final JobDetail job;
  final VoidCallback onChanged;
  final VoidCallback onSent;

  @override
  ConsumerState<_ApplyForm> createState() => _ApplyFormState();
}

class _ApplyFormState extends ConsumerState<_ApplyForm> {
  final _cover = TextEditingController();
  final _salary = TextEditingController();
  List<PickedFile> _cv = const [];
  bool sending = false;
  bool sent = false;
  double? _progress;
  String? _error;

  bool get dirty =>
      !sent &&
      (_cover.text.trim().isNotEmpty ||
          _salary.text.trim().isNotEmpty ||
          _cv.isNotEmpty);

  @override
  void dispose() {
    _cover.dispose();
    _salary.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final s = ref.read(stringsProvider);
    if (sending) return;
    setState(() {
      sending = true;
      _progress = 0;
      _error = null;
    });
    widget.onChanged();
    try {
      await ref
          .read(jobActionsProvider)
          .apply(
            jobId: widget.job.id,
            coverLetter: _cover.text,
            expectedSalary: plainDigits(_salary.text),
            cv: _cv.firstOrNull,
            onProgress: (p) => setState(() => _progress = p),
          );
      await ref.read(hapticsProvider).success();
      setState(() => sent = true);
      widget.onSent();
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => sending = false);
      widget.onChanged();
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    if (sent) return FormMessage(s.jobs.appliedDirect, positive: true);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 14,
      children: [
        TextField(
          controller: _cover,
          minLines: 5,
          maxLines: 12,
          maxLength: 5000,
          keyboardType: TextInputType.multiline,
          onChanged: (_) => widget.onChanged(),
          decoration: InputDecoration(
            labelText: m.coverLetter,
            alignLabelWithHint: true,
            counterText: '',
          ),
        ),
        TextField(
          controller: _salary,
          keyboardType: TextInputType.number,
          textDirection: TextDirection.ltr,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]')),
            const ThousandsFormatter(),
          ],
          decoration: InputDecoration(
            labelText: m.expectedSalary,
            suffixText: ' ${m.currency}',
          ),
        ),
        AttachmentsField(
          files: _cv,
          onChanged: (files) {
            setState(() => _cv = files);
            widget.onChanged();
          },
          extensions: cvExtensions,
          maxFiles: 1,
          chooseLabel: m.cv,
          rulesText: s.join.fileRules,
          removeLabel: s.join.removeFile,
          tooManyText: s.join.errFileBig,
          tooBigText: s.join.errFileBig,
          totalTooBigText: s.join.errFileBig,
          language: language,
        ),
        if (_error != null) FormMessage(_error!),
        if (sending)
          LinearProgressIndicator(
            value: _progress,
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
        BaghKey(
          label: m.apply,
          icon: Icons.send_rounded,
          loading: sending,
          expand: true,
          onPressed: _submit,
        ),
      ],
    );
  }
}
