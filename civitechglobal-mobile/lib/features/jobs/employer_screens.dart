import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/capabilities.dart';
import '../../core/files.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../profile/profile_data.dart';
import 'employer_data.dart';
import 'jobs_format.dart';
import 'seeker_screens.dart';

const _moderationStatuses = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'CHANGES_REQUESTED',
  'REJECTED',
];

/// Shows what went wrong with a write, or nothing when it went through.
Future<bool> _run(
  BuildContext context,
  WidgetRef ref,
  Future<void> Function() action, {
  String? done,
}) async {
  final s = ref.read(stringsProvider);
  final messenger = ScaffoldMessenger.of(context);
  try {
    await action();
    await ref.read(hapticsProvider).success();
    if (done != null) messenger.showSnackBar(SnackBar(content: Text(done)));
    return true;
  } catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
    return false;
  }
}

/// Asked once before anything somebody else hears about.
Future<bool> _confirm(
  BuildContext context,
  WidgetRef ref, {
  required String title,
  required String body,
  required String action,
  bool danger = false,
}) async {
  final s = ref.read(stringsProvider);
  final sure = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(body),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(s.common.cancel),
        ),
        FilledButton(
          style: danger
              ? FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.error,
                  foregroundColor: Theme.of(context).colorScheme.onError,
                )
              : null,
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(action),
        ),
      ],
    ),
  );
  return sure == true;
}

/// What an employer sees of their own postings, as the web's MyJobsPage:
/// drafts included, with the review state, the reviewer's note, and where
/// each live posting's applicants stand. Writing a posting is the next
/// slice; this one reads, sends for review, closes, and opens applicants.
class MyJobsScreen extends ConsumerStatefulWidget {
  const MyJobsScreen({super.key});

  @override
  ConsumerState<MyJobsScreen> createState() => _MyJobsScreenState();
}

class _MyJobsScreenState extends ConsumerState<MyJobsScreen> {
  String _search = '';
  String _status = '';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final jobs = ref.watch(ownJobsProvider);
    final verification = ref.watch(ownVerificationProvider).value;
    final all = jobs.value ?? const <OwnJob>[];
    final needle = _search.trim().toLowerCase();
    final shown = [
      for (final job in all)
        if ((_status.isEmpty || job.moderationStatus == _status) &&
            (needle.isEmpty ||
                job.title.toLowerCase().contains(needle) ||
                job.code.toLowerCase().contains(needle)))
          job,
    ];
    final filtering = needle.isNotEmpty || _status.isNotEmpty;

    return MemberListPage(
      title: m.myJobs,
      subtitle: s.app.memberDescriptions.myJobs,
      helpId: 'my-jobs',
      onRefresh: () {
        ref.invalidate(pipelineProvider);
        return ref.refresh(ownJobsProvider.future);
      },
      children: [
        // Posting needs a verified identity, as on the web; what was posted
        // before stays readable either way.
        if (verification != null && verification.status != 'APPROVED') ...[
          _VerifyFirst(status: verification.status),
          const SizedBox(height: BaghSpace.gutter),
        ],
        if (all.isNotEmpty) ...[
          TextField(
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: m.searchMyJobs,
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
                  if (all.any((j) => j.moderationStatus == status))
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
          value: jobs,
          onRetry: () => ref.invalidate(ownJobsProvider),
          isEmpty: (_) => shown.isEmpty,
          empty: filtering ? s.list.noResults : m.noJobs,
          data: (_) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [for (final job in shown) _PostingCard(job)],
          ),
        ),
      ],
    );
  }
}

class _VerifyFirst extends ConsumerWidget {
  const _VerifyFirst({required this.status});

  final String status;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final m = ref.watch(stringsProvider).market;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final t = c.tints[1];
    return SoftSurface(
      tint: t,
      elevated: false,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Text(
            m.verificationRequired,
            style: text.bodyMedium?.copyWith(color: t.ink),
          ),
          // Under review already: nothing to do but wait, so no key.
          if (status != 'PENDING')
            BaghKey(
              label: m.goToVerification,
              icon: Icons.verified_user_outlined,
              kind: BaghKeyKind.outline,
              expand: true,
              onPressed: () => context.push('/dashboard/verification'),
            ),
        ],
      ),
    );
  }
}

class _PostingCard extends ConsumerWidget {
  const _PostingCard(this.job);

  final OwnJob job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final v2 =
        ref.watch(capabilitiesProvider).value?.feature('jobsV2') ?? false;
    final pipeline = ref.watch(pipelineProvider).value?[job.id];
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final p = job.posting;
    final direction = Directionality.of(context);

    final facts = [
      placeText(p, geo, language),
      m.label(p.employmentType),
      if (p.workArrangement != 'ONSITE') m.label(p.workArrangement),
      if (p.seniority case final level?) j.seniorityLevels.label(level),
      ?salaryText(p, s, language),
    ].where((part) => part.isNotEmpty).join(' · ');
    final applicants = pipeline?.total ?? job.applicationCount;
    final unseen = pipeline?.unseen ?? 0;

    return SoftSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          // Only a live posting has a page to open.
          InkWell(
            onTap: job.approved
                ? () => context.push('/jobs/${job.code}')
                : null,
            child: Text(
              job.title,
              textDirection: textDirectionOf(job.title, direction),
              textAlign: direction == TextDirection.rtl
                  ? TextAlign.right
                  : TextAlign.left,
              style: text.titleMedium?.copyWith(
                color: job.approved ? c.primary : c.ink,
              ),
            ),
          ),
          Text(
            [
              job.code,
              if (job.createdAt case final at?)
                formatDate(at.toLocal(), language),
            ].join(' · '),
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
          if (facts.isNotEmpty)
            Text(facts, style: text.bodyMedium?.copyWith(color: c.ink2)),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              StatusPill(
                m.label(job.moderationStatus),
                tone: statusTone(job.moderationStatus),
              ),
              StatusPill(m.label(job.state), tone: job.state == 'OPEN' ? 0 : 4),
            ],
          ),
          if (v2 && job.approved) _Gauges(job: job, pipeline: pipeline),
          if (job.reviewNote case final note?) ReviewNote(note),
          if (job.editable)
            BaghKey(
              label: m.submitForReview,
              icon: Icons.send_rounded,
              expand: true,
              onPressed: () => _run(
                context,
                ref,
                () => ref.read(employerActionsProvider).submit(job.id),
                done: m.sentForReview,
              ),
            ),
          if (job.approved)
            BaghKey(
              // A comma before the count, not a middle dot: beside a Persian
              // digit the dot reads as a zero, and "· ۱ new" became "۱۰".
              label: [
                '${m.applicants} (${localDigits(applicants, language)})',
                if (unseen > 0)
                  j.newApplicants.fill({
                    'count': localDigits(unseen, language),
                  }),
              ].join(language == 'fa' ? '، ' : ', '),
              icon: Icons.people_alt_outlined,
              kind: unseen > 0 ? BaghKeyKind.primary : BaghKeyKind.outline,
              expand: true,
              onPressed: () => context.push(
                Uri(
                  path:
                      '/dashboard/jobs/${Uri.encodeComponent(job.id)}/applicants',
                  queryParameters: {'title': job.title},
                ).toString(),
              ),
            ),
          if (job.closable)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                icon: const Icon(Icons.block_rounded),
                label: Text(m.closeListing),
                onPressed: () async {
                  final sure = await _confirm(
                    context,
                    ref,
                    title: m.closeListing,
                    body: '${job.title}\n\n${s.mobile.closePostingConfirm}',
                    action: m.closeListing,
                    danger: true,
                  );
                  if (!sure || !context.mounted) return;
                  await _run(
                    context,
                    ref,
                    () => ref.read(employerActionsProvider).close(job.id),
                    done: m.label('CLOSED'),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

/// A live posting's figures as small readouts, as the web's PostingGauges:
/// views, applicants, how many are new, shortlisted, invited, and the time
/// left.
class _Gauges extends ConsumerWidget {
  const _Gauges({required this.job, required this.pipeline});

  final OwnJob job;
  final Pipeline? pipeline;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final w = s.workspace;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    String n(int v) => localDigits(v, language);
    final closesAt = job.posting.closesAt;
    final left = daysUntil(closesAt);
    final unseen = pipeline?.unseen ?? 0;
    final gauges = <(String, String, bool)>[
      (j.viewsCount.fill({'count': ''}).trim(), n(job.viewCount), false),
      (w.applicants, n(pipeline?.total ?? job.applicationCount), false),
      (w.newApplicants, n(unseen), unseen > 0),
      (w.shortlisted, n(pipeline?.byOutcome['SHORTLISTED'] ?? 0), false),
      (w.interviews, n(pipeline?.byOutcome['INTERVIEW'] ?? 0), false),
      (
        s.market.closesAt,
        closesAt == null
            ? j.noDeadline
            : left == null
            ? s.market.label('CLOSED')
            : left == 0
            ? j.closesToday
            : j.closesIn.fill({'n': n(left)}),
        false,
      ),
    ];

    return LayoutBuilder(
      builder: (context, box) {
        // Three to a row, two on the narrowest phones and the largest text.
        final columns = box.maxWidth < 300 ? 2 : 3;
        // Rounded down: an exact third can add up to a hair over the row,
        // and Wrap then drops the third gauge onto a line of its own.
        final width = ((box.maxWidth - 8 * (columns - 1)) / columns)
            .floorToDouble();
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final (label, value, attention) in gauges)
              SizedBox(
                width: width,
                child: Semantics(
                  label: '$label: $value',
                  excludeSemantics: true,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: attention ? c.tints[1].fill : c.fill,
                      borderRadius: BorderRadius.circular(BaghRadius.tile),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 2,
                      children: [
                        Text(
                          label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: text.labelSmall?.copyWith(
                            color: attention ? c.tints[1].ink : c.ink2,
                          ),
                        ),
                        Text(
                          value,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: text.titleSmall?.copyWith(
                            color: attention ? c.tints[1].ink : c.ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

/// The employer's inbox for one posting, as the web's ApplicantsModal: a
/// page of its own here. Reviewed applications only; opening it marks them
/// seen, which is what tells the applicant somebody has looked.
class ApplicantsScreen extends ConsumerWidget {
  const ApplicantsScreen({required this.jobId, this.title, super.key});

  final String jobId;

  /// The posting's title, carried in the link so the bar can say it at once.
  final String? title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final applicants = ref.watch(jobApplicantsProvider(jobId));
    return MemberListPage(
      title: m.applicants,
      subtitle: title,
      helpId: 'my-jobs',
      onRefresh: () => ref.refresh(jobApplicantsProvider(jobId).future),
      children: [
        AsyncView(
          value: applicants,
          onRetry: () => ref.invalidate(jobApplicantsProvider(jobId)),
          isEmpty: (list) => list.isEmpty,
          empty: m.noApplicants,
          data: (list) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              for (final a in list)
                _ApplicantCard(
                  jobId: jobId,
                  application: a,
                  key: ValueKey(a.id),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ApplicantCard extends ConsumerStatefulWidget {
  const _ApplicantCard({
    required this.jobId,
    required this.application,
    super.key,
  });

  final String jobId;
  final EmployerApplication application;

  @override
  ConsumerState<_ApplicantCard> createState() => _ApplicantCardState();
}

class _ApplicantCardState extends ConsumerState<_ApplicantCard> {
  /// Which stage key is waiting on the server, so only that one spins.
  String? _deciding;
  bool _opening = false;

  EmployerApplication get a => widget.application;

  Future<void> _decide(String outcome) async {
    final s = ref.read(stringsProvider);
    final mobile = s.mobile;
    // A hire and a no both reach the applicant, and a hire can close the
    // posting for everyone else: asked once, with the name in it.
    if (outcome == 'ACCEPTED' || outcome == 'DECLINED') {
      final sure = await _confirm(
        context,
        ref,
        title: s.market.label(outcome == 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED'),
        body:
            (outcome == 'ACCEPTED' ? mobile.hireConfirm : mobile.declineConfirm)
                .fill({'name': a.name}),
        action: outcome == 'ACCEPTED' ? s.market.accept : s.market.decline,
        danger: outcome == 'DECLINED',
      );
      if (!sure || !mounted) return;
    }
    setState(() => _deciding = outcome);
    await _run(
      context,
      ref,
      () => ref
          .read(employerActionsProvider)
          .setOutcome(widget.jobId, a.id, outcome),
      done: s.jobs.stageUpdated,
    );
    if (mounted) setState(() => _deciding = null);
  }

  /// The CV comes with the sign-in, so the app fetches it and hands it to
  /// whatever on the phone reads that kind of file.
  Future<void> _openCv() async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _opening = true);
    try {
      final file = await ref.read(employerActionsProvider).cv(a.id);
      final opened = await openDownloaded(
        bytes: file.bytes,
        name: a.cvOriginalName ?? 'cv',
        mimeType: file.mimeType,
      );
      if (!opened) {
        messenger.showSnackBar(SnackBar(content: Text(s.mobile.noFileViewer)));
      }
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final v2 =
        ref.watch(capabilitiesProvider).value?.feature('jobsV2') ?? false;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final direction = Directionality.of(context);

    Widget stage(String outcome, String label, {BaghKeyKind? kind}) => BaghKey(
      label: label,
      kind: kind ?? BaghKeyKind.outline,
      loading: _deciding == outcome,
      // Where they already are is not a step to take again.
      onPressed: _deciding != null || a.outcome == outcome
          ? null
          : () => _decide(outcome),
    );

    return SoftSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Text(
            a.name,
            textDirection: textDirectionOf(a.name, direction),
            textAlign: direction == TextDirection.rtl
                ? TextAlign.right
                : TextAlign.left,
            style: text.titleMedium,
          ),
          if (a.email case final email?)
            Text(
              email,
              textDirection: TextDirection.ltr,
              textAlign: direction == TextDirection.rtl
                  ? TextAlign.right
                  : TextAlign.left,
              style: text.bodySmall?.copyWith(color: c.ink2),
            ),
          if (a.username case final username?)
            Wrap(
              spacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                InkWell(
                  onTap: () => context.push('/profiles/$username'),
                  child: Text(
                    '@$username',
                    textDirection: TextDirection.ltr,
                    style: text.bodyMedium?.copyWith(
                      color: c.primary,
                      decoration: TextDecoration.underline,
                      decorationColor: c.primary,
                    ),
                  ),
                ),
                if (a.verified)
                  Tooltip(
                    message: m.verifiedBadge,
                    child: Icon(
                      Icons.verified_rounded,
                      size: 16,
                      color: c.primary,
                      semanticLabel: m.verifiedBadge,
                    ),
                  ),
                if (a.ratingCount > 0)
                  Text(
                    '★ ${localDecimal(a.ratingAvg, 1, language)} '
                    '(${localDigits(a.ratingCount, language)})',
                    style: text.bodySmall?.copyWith(color: c.ink2),
                  ),
              ],
            ),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              if (v2 && a.isNew) StatusPill(j.newBadge, tone: 1),
              if (a.skillFit case final fit? when v2)
                StatusPill(
                  j.skillFit.fill({
                    'matched': localDigits(fit.matched, language),
                    'total': localDigits(fit.total, language),
                  }),
                  tone: fit.matched > 0 ? 0 : 4,
                ),
              StatusPill(m.label(a.outcome), tone: statusTone(a.outcome)),
            ],
          ),
          if (a.expectedSalary case final pay?)
            Text(
              '${m.expectedSalary}: '
              '${formatMoneyIn(pay, 'IRT', language, m.currency)}',
              style: text.bodyMedium?.copyWith(color: c.ink2),
            ),
          if (a.coverLetter case final letter?)
            Text(
              letter,
              textDirection: textDirectionOf(letter, direction),
              style: text.bodyMedium,
            ),
          // The file's name under the key, not on it: names run long, and a
          // key several lines tall stops reading as a key.
          if (a.cvOriginalName case final cv?)
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 4,
              children: [
                BaghKey(
                  label: j.viewCv,
                  icon: Icons.description_outlined,
                  kind: BaghKeyKind.outline,
                  loading: _opening,
                  expand: true,
                  onPressed: _openCv,
                ),
                Text(
                  cv,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  textDirection: textDirectionOf(cv, direction),
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
              ],
            ),
          if (v2) _EmployerNote(application: a),
          if (!a.withdrawn) ...[
            BaghKey(
              label: m.sendMessageCta,
              icon: Icons.chat_bubble_outline_rounded,
              kind: BaghKeyKind.tonal,
              expand: true,
              onPressed: () => context.push('/dashboard/messages/a/${a.id}'),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                stage('SHORTLISTED', m.shortlist),
                if (v2) stage('INTERVIEW', j.inviteInterview),
                stage('ACCEPTED', m.accept, kind: BaghKeyKind.primary),
                stage('DECLINED', m.decline),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// The employer's private note on one candidate: saved on demand, never
/// shown to them.
class _EmployerNote extends ConsumerStatefulWidget {
  const _EmployerNote({required this.application});

  final EmployerApplication application;

  @override
  ConsumerState<_EmployerNote> createState() => _EmployerNoteState();
}

class _EmployerNoteState extends ConsumerState<_EmployerNote> {
  late final _note = TextEditingController(
    text: widget.application.employerNote ?? '',
  );
  late String _saved = widget.application.employerNote ?? '';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _note.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final j = ref.read(stringsProvider).jobs;
    final note = _note.text;
    setState(() => _saving = true);
    final ok = await _run(
      context,
      ref,
      () => ref
          .read(employerActionsProvider)
          .saveNote(widget.application.id, note),
      done: j.noteSaved,
    );
    if (!mounted) return;
    setState(() {
      _saving = false;
      if (ok) _saved = note;
    });
  }

  @override
  Widget build(BuildContext context) {
    final j = ref.watch(stringsProvider).jobs;
    final dirty = _note.text.trim() != _saved.trim();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 8,
      children: [
        TextField(
          controller: _note,
          minLines: 2,
          maxLines: 6,
          maxLength: 2000,
          keyboardType: TextInputType.multiline,
          decoration: InputDecoration(
            labelText: j.employerNote,
            helperText: j.employerNoteHint,
            alignLabelWithHint: true,
            counterText: '',
          ),
        ),
        if (dirty)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: BaghKey(
              label: j.saveNote,
              icon: Icons.save_outlined,
              kind: BaghKeyKind.outline,
              loading: _saving,
              onPressed: _save,
            ),
          ),
      ],
    );
  }
}
