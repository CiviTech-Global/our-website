import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/attachments_field.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'job_card.dart';
import 'jobs_data.dart';
import 'seeker_data.dart';

/// The frame the seeker's lists share: a title, a line under it, the guide
/// one tap away, and a list that refreshes on pull.
class _ListPage extends ConsumerWidget {
  const _ListPage({
    required this.title,
    required this.onRefresh,
    required this.children,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final Future<void> Function() onRefresh;
  final List<Widget> children;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(title),
        actions: const [HelpAction('my-applications')],
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: c.primary,
          onRefresh: onRefresh,
          child: ListView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            children: [
              if (subtitle != null) ...[
                Text(
                  subtitle!,
                  style: text.bodyMedium?.copyWith(color: c.ink2),
                ),
                const SizedBox(height: BaghSpace.gutter),
              ],
              ...children,
            ],
          ),
        ),
      ),
    );
  }
}

const _moderationStatuses = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'CHANGES_REQUESTED',
  'REJECTED',
];

/// The garden tint for a review state or an outcome: settled well (0),
/// waiting on somebody (1), under way (2), a no (3).
int _tone(String status) => switch (status) {
  'APPROVED' || 'ACCEPTED' => 0,
  'PENDING_REVIEW' || 'CHANGES_REQUESTED' || 'DRAFT' => 1,
  'SHORTLISTED' || 'INTERVIEW' => 2,
  'REJECTED' || 'DECLINED' => 3,
  _ => 4,
};

/// Everything the member has applied to and where it got to, as the web's
/// MyApplicationsPage. The employer's verdict shows only once the platform's
/// review has passed it on: until then "pending" is about the review, and
/// reading it as the employer's would tell somebody they had been passed
/// over when nobody has read them yet.
class MyApplicationsScreen extends ConsumerStatefulWidget {
  const MyApplicationsScreen({super.key});

  @override
  ConsumerState<MyApplicationsScreen> createState() =>
      _MyApplicationsScreenState();
}

class _MyApplicationsScreenState extends ConsumerState<MyApplicationsScreen> {
  String _search = '';
  String _status = '';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final applications = ref.watch(ownApplicationsProvider);
    final all = applications.value ?? const <OwnApplication>[];
    final needle = _search.trim().toLowerCase();
    final shown = [
      for (final a in all)
        if ((_status.isEmpty || a.moderationStatus == _status) &&
            (needle.isEmpty ||
                a.jobTitle.toLowerCase().contains(needle) ||
                a.jobCode.toLowerCase().contains(needle)))
          a,
    ];
    final filtering = needle.isNotEmpty || _status.isNotEmpty;

    return _ListPage(
      title: m.myApplications,
      subtitle: s.app.memberDescriptions.myApplications,
      onRefresh: () => ref.refresh(ownApplicationsProvider.future),
      children: [
        if (all.isNotEmpty) ...[
          TextField(
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: m.searchMyApplications,
              prefixIcon: const Icon(Icons.search_rounded),
            ),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: Text(s.list.allOption),
                  selected: _status.isEmpty,
                  onSelected: (_) => setState(() => _status = ''),
                ),
                for (final status in _moderationStatuses)
                  if (all.any((a) => a.moderationStatus == status))
                    ChoiceChip(
                      label: Text(m.label(status)),
                      selected: _status == status,
                      onSelected: (_) => setState(
                        () => _status = _status == status ? '' : status,
                      ),
                    ),
              ],
            ),
          ),
          const SizedBox(height: BaghSpace.gutter),
        ],
        AsyncView(
          value: applications,
          onRetry: () => ref.invalidate(ownApplicationsProvider),
          isEmpty: (_) => shown.isEmpty,
          empty: filtering ? s.list.noResults : s.common.noResults,
          data: (_) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [for (final a in shown) _ApplicationCard(a)],
          ),
        ),
      ],
    );
  }
}

class _ApplicationCard extends ConsumerWidget {
  const _ApplicationCard(this.application);

  final OwnApplication application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final a = application;
    final approved = a.moderationStatus == 'APPROVED';
    final meta = [
      ?a.companyName,
      a.jobCode,
      if (a.createdAt case final at?) formatDate(at.toLocal(), language),
    ].join(' · ');

    return SoftSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          InkWell(
            onTap: () => context.push('/jobs/${a.jobCode}'),
            child: Text(
              a.jobTitle,
              textDirection: textDirectionOf(
                a.jobTitle,
                Directionality.of(context),
              ),
              textAlign: Directionality.of(context) == TextDirection.rtl
                  ? TextAlign.right
                  : TextAlign.left,
              style: text.titleMedium?.copyWith(color: c.primary),
            ),
          ),
          Text(meta, style: text.bodySmall?.copyWith(color: c.ink2)),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              StatusPill(
                m.label(a.moderationStatus),
                tone: _tone(a.moderationStatus),
              ),
              if (approved)
                StatusPill(m.label(a.outcome), tone: _tone(a.outcome)),
              if (a.employerSeenAt != null && a.outcome != 'WITHDRAWN')
                StatusPill(j.seenByEmployer, tone: 2),
            ],
          ),
          if (approved && a.outcome != 'WITHDRAWN') StageTracker(a),
          if (a.expectedSalary case final pay?)
            Text(
              '${m.expectedSalary}: '
              '${formatMoneyIn(pay, 'IRT', language, m.currency)}',
              style: text.bodyMedium?.copyWith(color: c.ink2),
            ),
          if (a.reviewNote case final note?) _ReviewNote(note),
          if (a.moderationStatus == 'CHANGES_REQUESTED')
            BaghKey(
              label: m.revise,
              icon: Icons.edit_note_rounded,
              expand: true,
              onPressed: () => showBaghSheet<void>(
                context,
                isScrollControlled: true,
                builder: (_) => _ReviseSheet(a),
              ),
            ),
          if (a.withdrawable)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                icon: const Icon(Icons.undo_rounded),
                label: Text(j.withdraw),
                onPressed: () => _withdraw(context, ref),
              ),
            ),
        ],
      ),
    );
  }

  /// Asked once: the employer sees it go.
  Future<void> _withdraw(BuildContext context, WidgetRef ref) async {
    final s = ref.read(stringsProvider);
    final j = s.jobs;
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(j.withdraw),
        content: Text('${application.jobTitle}\n\n${j.withdrawConfirm}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(s.common.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(j.withdraw),
          ),
        ],
      ),
    );
    if (sure != true || !context.mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(seekerActionsProvider).withdraw(application.id);
      messenger.showSnackBar(SnackBar(content: Text(j.withdrawn)));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
    }
  }
}

class _ReviewNote extends ConsumerWidget {
  const _ReviewNote(this.note);

  final String note;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final m = ref.watch(stringsProvider).market;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final t = c.tints[1];
    return SoftSurface(
      tint: t,
      radius: BaghRadius.tile,
      elevated: false,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 4,
        children: [
          Text(m.reviewNote, style: text.labelLarge?.copyWith(color: t.ink)),
          Text(note, style: text.bodyMedium?.copyWith(color: t.ink)),
        ],
      ),
    );
  }
}

/// Where an application has got to, as a row of lamps: sent, seen by the
/// employer, shortlisted, interview, decision. "Has anyone even looked?"
/// answered at a glance, and a no said as plainly as a yes.
class StageTracker extends ConsumerWidget {
  const StageTracker(this.application, {super.key});

  final OwnApplication application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final outcome = application.outcome;
    final declined = outcome == 'DECLINED';
    final reached = [
      true,
      application.employerSeenAt != null || outcome != 'PENDING',
      const {'SHORTLISTED', 'INTERVIEW', 'ACCEPTED'}.contains(outcome),
      outcome == 'INTERVIEW' || outcome == 'ACCEPTED',
      outcome == 'ACCEPTED' || declined,
    ];
    final labels = [
      j.stageApplied,
      j.stageSeen,
      j.stageShortlisted,
      j.stageInterview,
      outcome == 'ACCEPTED'
          ? s.market.label('ACCEPTED')
          : declined
          ? j.stageNotSelected
          : j.stageDecision,
    ];
    final current = reached.lastIndexOf(true);
    Color lamp(int i) => !reached[i]
        ? c.edge.withValues(alpha: 0.35)
        : i == labels.length - 1 && declined
        ? c.error
        : c.primary;

    return Semantics(
      label: '${j.stageProgress}: ${labels[current]}',
      excludeSemantics: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < labels.length; i++)
            Expanded(
              child: Column(
                spacing: 4,
                children: [
                  SizedBox(
                    height: 12,
                    // The whole column, so the lines reach the lamps either side.
                    width: double.infinity,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // The line to the next lamp, only when both were
                        // reached: a decline skips the middle.
                        if (i < labels.length - 1)
                          PositionedDirectional(
                            start: 0,
                            end: 0,
                            child: FractionallySizedBox(
                              alignment: AlignmentDirectional.centerEnd,
                              widthFactor: 0.5,
                              child: Container(
                                height: 2,
                                color: reached[i] && reached[i + 1]
                                    ? c.primary
                                    : c.edge.withValues(alpha: 0.35),
                              ),
                            ),
                          ),
                        if (i > 0)
                          PositionedDirectional(
                            start: 0,
                            end: 0,
                            child: FractionallySizedBox(
                              alignment: AlignmentDirectional.centerStart,
                              widthFactor: 0.5,
                              child: Container(
                                height: 2,
                                color: reached[i - 1] && reached[i]
                                    ? c.primary
                                    : c.edge.withValues(alpha: 0.35),
                              ),
                            ),
                          ),
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(
                            color: lamp(i),
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    labels[i],
                    textAlign: TextAlign.center,
                    style: text.labelSmall?.copyWith(
                      fontWeight: i == current ? FontWeight.w700 : null,
                      color: i == labels.length - 1 && declined
                          ? c.error
                          : reached[i]
                          ? c.ink
                          : c.ink2,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Answering the reviewer: the note above, the letter and pay to change, and
/// a CV only if it changes (empty keeps the one on file).
class _ReviseSheet extends ConsumerStatefulWidget {
  const _ReviseSheet(this.application);

  final OwnApplication application;

  @override
  ConsumerState<_ReviseSheet> createState() => _ReviseSheetState();
}

class _ReviseSheetState extends ConsumerState<_ReviseSheet> {
  late final _cover = TextEditingController(
    text: widget.application.coverLetter ?? '',
  );
  late final _salary = TextEditingController(
    text: groupThousands(widget.application.expectedSalary ?? ''),
  );
  List<PickedFile> _cv = const [];
  bool _sending = false;
  double? _progress;
  String? _error;

  @override
  void dispose() {
    _cover.dispose();
    _salary.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final s = ref.read(stringsProvider);
    setState(() {
      _sending = true;
      _progress = 0;
      _error = null;
    });
    try {
      await ref
          .read(seekerActionsProvider)
          .revise(
            applicationId: widget.application.id,
            coverLetter: _cover.text,
            expectedSalary: plainDigits(_salary.text),
            cv: _cv.firstOrNull,
            onProgress: (p) => setState(() => _progress = p),
          );
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.market.revised)));
      Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 14,
          children: [
            Text(m.revise, style: text.titleLarge),
            if (widget.application.reviewNote case final note?)
              _ReviewNote(note),
            TextField(
              controller: _cover,
              minLines: 4,
              maxLines: 10,
              keyboardType: TextInputType.multiline,
              decoration: InputDecoration(
                labelText: m.coverLetter,
                alignLabelWithHint: true,
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
              onChanged: (files) => setState(() => _cv = files),
              extensions: cvExtensions,
              maxFiles: 1,
              chooseLabel: m.cv,
              rulesText: widget.application.cvOriginalName == null
                  ? s.join.fileRules
                  : '${widget.application.cvOriginalName} · ${s.join.fileRules}',
              removeLabel: s.join.removeFile,
              tooManyText: s.join.errFileBig,
              tooBigText: s.join.errFileBig,
              totalTooBigText: s.join.errFileBig,
              language: language,
            ),
            if (_error != null) FormMessage(_error!),
            if (_sending)
              LinearProgressIndicator(
                value: _progress,
                minHeight: 6,
                borderRadius: BorderRadius.circular(3),
              ),
            BaghKey(
              label: m.revise,
              icon: Icons.send_rounded,
              loading: _sending,
              expand: true,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}

/// The postings a member bookmarked, as the web's SavedJobsPage.
class SavedJobsScreen extends ConsumerWidget {
  const SavedJobsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final saved = ref.watch(savedJobsProvider);
    return _ListPage(
      title: j.savedJobsTitle,
      onRefresh: () => ref.refresh(savedJobsProvider.future),
      children: [
        AsyncView(
          value: saved,
          onRetry: () => ref.invalidate(savedJobsProvider),
          isEmpty: (list) => list.isEmpty,
          empty: j.savedEmpty,
          data: (list) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 16,
            children: [
              for (final entry in list)
                Opacity(
                  opacity: entry.open ? 1 : 0.7,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 6,
                    children: [
                      Wrap(
                        spacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          if (entry.savedAt case final at?)
                            Text(
                              j.savedOn.fill({
                                'date': formatDate(at.toLocal(), language),
                              }),
                              style: text.labelMedium?.copyWith(color: c.ink2),
                            ),
                          if (!entry.open) StatusPill(j.closedBadge, tone: 4),
                        ],
                      ),
                      JobCard(job: entry.job),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// The saved searches that notify, and the switches to pause or drop them,
/// as the web's JobAlertsPage.
class JobAlertsScreen extends ConsumerWidget {
  const JobAlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final alerts = ref.watch(jobAlertsProvider);
    final count = alerts.value?.length ?? 0;
    return _ListPage(
      title: j.alertsTitle,
      subtitle: j.alertsIntro,
      onRefresh: () => ref.refresh(jobAlertsProvider.future),
      children: [
        AsyncView(
          value: alerts,
          onRetry: () => ref.invalidate(jobAlertsProvider),
          isEmpty: (list) => list.isEmpty,
          empty: j.alertsEmpty,
          data: (list) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              for (final alert in list) _AlertCard(alert),
              Text(
                '${localDigits(count, language)} / ${localDigits(maxJobAlerts, language)}',
                style: text.labelMedium?.copyWith(color: c.ink2),
              ),
            ],
          ),
        ),
        if (alerts.value?.isEmpty ?? false)
          Padding(
            padding: const EdgeInsets.only(top: BaghSpace.gutter),
            child: BaghKey(
              label: s.market.jobsTitle,
              icon: Icons.work_outline_rounded,
              kind: BaghKeyKind.outline,
              expand: true,
              onPressed: () => context.push('/jobs'),
            ),
          ),
      ],
    );
  }
}

class _AlertCard extends ConsumerWidget {
  const _AlertCard(this.alert);

  final JobAlert alert;

  /// The filters an alert runs, in words.
  List<String> _describe(WidgetRef ref) {
    final s = ref.read(stringsProvider);
    final language = ref.read(l10nProvider).language;
    final geo = ref.read(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.read(jobCategoriesProvider).value ?? const [];
    final q = alert.query;
    return [
      // Persian quotes with guillemets; curly English ones turn around in
      // right-to-left text.
      if (q['search'] case final search?)
        language == 'fa' ? '«$search»' : '“$search”',
      if (q['jobCategoryId'] case final id?)
        for (final cat in categories)
          if (cat.id == id)
            categoryName((name: cat.name, nameEn: cat.nameEn), language),
      if (q['country'] case final code?) geo.country(code),
      if (q['province'] case final p?) displayProvince(p, language),
      if (q['employmentType'] case final t?) s.market.label(t),
      if (q['workArrangement'] case final w?) s.market.label(w),
      if (q['seniority'] case final l?) s.jobs.seniorityLevels.label(l),
      if (q['salaryMin'] case final floor?)
        '≥ ${formatMoneyIn(floor, 'IRT', language, s.market.currency)}',
    ];
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    // Names arrive after the list; the words follow them.
    ref
      ..watch(geoNamesProvider)
      ..watch(jobCategoriesProvider);
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final actions = ref.read(seekerActionsProvider);

    Future<void> run(Future<void> Function() action) async {
      try {
        await action();
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(describeError(s, e))));
        }
      }
    }

    return SoftSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Row(
            spacing: 8,
            children: [
              Icon(
                alert.active
                    ? Icons.notifications_active_outlined
                    : Icons.notifications_off_outlined,
                color: alert.active ? c.primary : c.ink2,
              ),
              Expanded(child: Text(alert.name, style: text.titleMedium)),
              StatusPill(
                alert.active ? j.alertActive : j.alertPaused,
                tone: alert.active ? 0 : 4,
              ),
              IconButton(
                tooltip: j.delete,
                icon: const Icon(Icons.delete_outline_rounded),
                onPressed: () => run(() => actions.deleteAlert(alert.id)),
              ),
            ],
          ),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final part in _describe(ref))
                Chip(label: Text(part), visualDensity: VisualDensity.compact),
            ],
          ),
          Text(
            '${j.lastNotified}: ${alert.lastNotifiedAt == null ? j.never : formatDate(alert.lastNotifiedAt!.toLocal(), language)}',
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
          Wrap(
            spacing: 4,
            runSpacing: 4,
            children: [
              TextButton.icon(
                icon: const Icon(Icons.search_rounded),
                label: Text(j.openSearch),
                onPressed: () => context.push(
                  Uri(path: '/jobs', queryParameters: alert.query).toString(),
                ),
              ),
              TextButton.icon(
                icon: Icon(
                  alert.active
                      ? Icons.pause_circle_outline_rounded
                      : Icons.play_circle_outline_rounded,
                ),
                label: Text(alert.active ? j.pause : j.resume),
                onPressed: () => run(
                  () => actions.setAlertActive(alert.id, active: !alert.active),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
