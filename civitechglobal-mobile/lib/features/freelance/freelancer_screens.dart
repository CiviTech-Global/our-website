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
import '../../design/widgets/date_field.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../jobs/jobs_format.dart' show postedAgo;
import '../jobs/seeker_screens.dart' show MemberListPage, StageTracker;
import 'freelance_data.dart';
import 'freelance_ui.dart';
import 'freelancer_data.dart';

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

Future<bool> _confirm(
  BuildContext context,
  WidgetRef ref, {
  required String title,
  required String body,
  required String action,
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
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(action),
        ),
      ],
    ),
  );
  return sure == true;
}

/// "hh:mm" from whole minutes, in the reader's digits.
String hoursText(int minutes, String language) =>
    '${localDigits(minutes ~/ 60, language)}:'
    '${localDigits((minutes % 60).toString().padLeft(2, '0'), language)}';

/// The freelancer's proposals, as the web's MyProposalsPage: active ones,
/// each under its project, with where it stands and the moves left.
class MyProposalsScreen extends ConsumerStatefulWidget {
  const MyProposalsScreen({super.key});

  @override
  ConsumerState<MyProposalsScreen> createState() => _MyProposalsScreenState();
}

class _MyProposalsScreenState extends ConsumerState<MyProposalsScreen> {
  bool _active = true;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final proposals = ref.watch(myProposalsProvider);
    final shown = [
      for (final p in proposals.value ?? const <MyProposal>[])
        if (p.live == _active) p,
    ];
    return MemberListPage(
      title: w.proposalsTitle,
      helpId: 'my-proposals',
      onRefresh: () => ref.refresh(myProposalsProvider.future),
      children: [
        Wrap(
          spacing: 8,
          children: [
            ChoiceChip(
              label: Text(w.activeProposals),
              selected: _active,
              onSelected: (_) => setState(() => _active = true),
            ),
            ChoiceChip(
              label: Text(w.archivedProposals),
              selected: !_active,
              onSelected: (_) => setState(() => _active = false),
            ),
          ],
        ),
        const SizedBox(height: BaghSpace.gutter),
        AsyncView(
          value: proposals,
          onRetry: () => ref.invalidate(myProposalsProvider),
          isEmpty: (_) => shown.isEmpty,
          empty: w.proposalsEmpty,
          data: (_) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              for (final p in shown)
                ProjectCard(project: p.project, footer: _ProposalFooter(p)),
            ],
          ),
        ),
        if (proposals.value?.isEmpty ?? false)
          BaghKey(
            label: w.findWork,
            kind: BaghKeyKind.outline,
            expand: true,
            onPressed: () => context.push('/projects'),
          ),
      ],
    );
  }
}

class _ProposalFooter extends ConsumerWidget {
  const _ProposalFooter(this.p);

  final MyProposal p;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final b = p.bid;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 8,
      children: [
        const Divider(height: 4),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              amountText(b.amount, b.currency, p.project.hourly, s, language),
              style: text.titleSmall,
            ),
            if (b.deliveryDays case final d?)
              Text(w.daysCount.fill({'count': localDigits(d, language)})),
            StatusPill(
              w.bidStage.label(b.outcome),
              tone: switch (b.outcome) {
                'ACCEPTED' => 0,
                'DECLINED' => 3,
                _ => 2,
              },
            ),
            if (p.invited) StatusPill(w.invitedBadge, tone: 4),
          ],
        ),
        Text(
          [
            if (p.createdAt case final at?) postedAgo(at, s, language),
            b.clientSeenAt != null ? w.seenByClient : w.notSeenYet,
          ].join(factSep(language)),
          style: text.bodySmall?.copyWith(color: c.ink2),
        ),
        if (b.outcome != 'WITHDRAWN')
          StageTracker.of(outcome: b.outcome, seenAt: b.clientSeenAt),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (p.awardId != null)
              BaghKey(
                label: w.openContract,
                icon: Icons.handshake_outlined,
                onPressed: () => context.push('/dashboard/awards'),
              )
            else
              BaghKey(
                label: p.live ? w.editProposal : w.viewProject,
                icon: p.live ? Icons.edit_outlined : Icons.visibility_outlined,
                kind: BaghKeyKind.outline,
                onPressed: () => context.push('/projects/${p.project.code}'),
              ),
            if (p.live)
              TextButton(
                onPressed: () async {
                  final sure = await _confirm(
                    context,
                    ref,
                    title: w.withdraw,
                    body: w.withdrawConfirm,
                    action: w.withdraw,
                  );
                  if (!sure || !context.mounted) return;
                  await _run(
                    context,
                    ref,
                    () => ref.read(freelancerActionsProvider).withdraw(b.id),
                    done: w.proposalWithdrawn,
                  );
                },
                child: Text(w.withdraw),
              ),
          ],
        ),
      ],
    );
  }
}

/// Invitations to bid, as the web's ProjectInvitesPage.
class ProjectInvitesScreen extends ConsumerWidget {
  const ProjectInvitesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final invites = ref.watch(myInvitesProvider);
    return MemberListPage(
      title: w.navInvites,
      subtitle: w.invitesIntro,
      helpId: 'my-proposals',
      onRefresh: () => ref.refresh(myInvitesProvider.future),
      children: [
        AsyncView(
          value: invites,
          onRetry: () => ref.invalidate(myInvitesProvider),
          isEmpty: (list) => list.isEmpty,
          empty: w.invitesEmpty,
          data: (list) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              for (final i in list)
                ProjectCard(
                  project: i.project,
                  footer: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 8,
                    children: [
                      const Divider(height: 4),
                      if (i.message case final m?)
                        Text(
                          language == 'fa' ? '«$m»' : '“$m”',
                          style: text.bodyMedium?.copyWith(color: c.ink2),
                        ),
                      Wrap(
                        spacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          StatusPill(
                            w.inviteStatus.label(i.status),
                            tone: switch (i.status) {
                              'ACCEPTED' => 0,
                              'DECLINED' => 3,
                              _ => 2,
                            },
                          ),
                          if (i.createdAt case final at?)
                            Text(
                              postedAgo(at, s, language),
                              style: text.bodySmall?.copyWith(color: c.ink2),
                            ),
                        ],
                      ),
                      if (i.status == 'PENDING' && i.project.state == 'OPEN')
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            BaghKey(
                              label: w.sendProposal,
                              icon: Icons.send_rounded,
                              onPressed: () =>
                                  context.push('/projects/${i.project.code}'),
                            ),
                            TextButton(
                              onPressed: () => _run(
                                context,
                                ref,
                                () => ref
                                    .read(freelancerActionsProvider)
                                    .declineInvite(i.id),
                                done: w.inviteDeclined,
                              ),
                              child: Text(w.declineInvite),
                            ),
                          ],
                        ),
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

/// The projects the freelancer bookmarked; closed ones stay, marked.
class SavedProjectsScreen extends ConsumerWidget {
  const SavedProjectsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final saved = ref.watch(savedProjectsProvider);
    return MemberListPage(
      title: w.navSavedProjects,
      helpId: 'my-proposals',
      onRefresh: () => ref.refresh(savedProjectsProvider.future),
      children: [
        AsyncView(
          value: saved,
          onRetry: () => ref.invalidate(savedProjectsProvider),
          isEmpty: (list) => list.isEmpty,
          empty: w.savedEmpty,
          data: (list) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              for (final item in list)
                Opacity(
                  opacity: item.project.state == 'OPEN' ? 1 : 0.7,
                  child: ProjectCard(
                    project: item.project,
                    footer: Text(
                      [
                        w.savedProject,
                        if (item.savedAt case final at?)
                          postedAgo(at, s, language),
                        if (item.project.state != 'OPEN') w.closed,
                      ].join(factSep(language)),
                      style: text.bodySmall?.copyWith(color: c.ink2),
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (saved.value?.isEmpty ?? false)
          BaghKey(
            label: w.findWork,
            kind: BaghKeyKind.outline,
            expand: true,
            onPressed: () => context.push('/projects'),
          ),
      ],
    );
  }
}

/// The saved project searches that notify, and the switches to pause or
/// drop them, as the web's ProjectAlertsPage.
class ProjectAlertsScreen extends ConsumerWidget {
  const ProjectAlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final j = s.jobs;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.watch(workCategoriesProvider).value ?? const [];
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final alerts = ref.watch(projectAlertsProvider);
    final actions = ref.read(freelancerActionsProvider);

    List<String> describe(ProjectAlert a) {
      final q = a.query;
      return [
        if (q['search'] case final search?)
          language == 'fa' ? '«$search»' : '“$search”',
        if (q['workCategoryId'] case final id?)
          for (final cat in categories)
            if (cat.id == id) cat.label(language),
        if (q['pricingType'] case final p?) w.pricing.label(p),
        if (q['experienceLevel'] case final e?) w.experience.label(e),
        if (q['budgetMin'] case final floor?)
          '≥ ${money(floor, 'IRT', s, language)}',
        if (q['country'] case final code?) geo.country(code),
        if (q['language'] case final code?) geo.language(code),
        ...a.skills,
      ];
    }

    return MemberListPage(
      title: w.alertsTitle,
      subtitle: w.alertsIntro,
      helpId: 'my-proposals',
      onRefresh: () => ref.refresh(projectAlertsProvider.future),
      children: [
        AsyncView(
          value: alerts,
          onRetry: () => ref.invalidate(projectAlertsProvider),
          isEmpty: (list) => list.isEmpty,
          empty: w.alertsEmpty,
          data: (list) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              for (final a in list)
                SoftSurface(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 10,
                    children: [
                      Row(
                        spacing: 8,
                        children: [
                          Icon(
                            a.active
                                ? Icons.notifications_active_outlined
                                : Icons.notifications_off_outlined,
                            color: a.active ? c.primary : c.ink2,
                          ),
                          Expanded(
                            child: Text(a.name, style: text.titleMedium),
                          ),
                          StatusPill(
                            a.active ? j.alertActive : j.alertPaused,
                            tone: a.active ? 0 : 4,
                          ),
                        ],
                      ),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (final part in describe(a))
                            Chip(
                              label: Text(part),
                              visualDensity: VisualDensity.compact,
                            ),
                        ],
                      ),
                      Text(
                        '${j.lastNotified}: ${a.lastNotifiedAt == null ? j.never : formatDate(a.lastNotifiedAt!.toLocal(), language)}',
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
                              Uri(
                                path: '/projects',
                                queryParameters: a.query.isEmpty
                                    ? null
                                    : a.query,
                              ).toString(),
                            ),
                          ),
                          TextButton(
                            onPressed: () => _run(
                              context,
                              ref,
                              () => actions.setAlertActive(
                                a.id,
                                active: !a.active,
                              ),
                            ),
                            child: Text(a.active ? j.pause : j.resume),
                          ),
                          TextButton.icon(
                            icon: const Icon(Icons.delete_outline_rounded),
                            label: Text(j.delete),
                            onPressed: () => _run(
                              context,
                              ref,
                              () => actions.deleteAlert(a.id),
                            ),
                          ),
                        ],
                      ),
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

/// The collaborations the member is part of, on either side, as the web's
/// MyAwardsPage: what each is, who the other side is, the plan and its
/// state, the hours on an hourly contract, and the moves each role has.
class AwardsScreen extends ConsumerStatefulWidget {
  const AwardsScreen({super.key});

  @override
  ConsumerState<AwardsScreen> createState() => _AwardsScreenState();
}

class _AwardsScreenState extends ConsumerState<AwardsScreen> {
  String _role = '';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final awards = ref.watch(myAwardsProvider);
    final all = awards.value ?? const <AwardView>[];
    final shown = [
      for (final a in all)
        if (_role.isEmpty || (_role == 'author') == a.mine) a,
    ];
    return MemberListPage(
      title: m.myAwards,
      subtitle: s.app.memberDescriptions.myAwards,
      helpId: 'my-proposals',
      onRefresh: () => ref.refresh(myAwardsProvider.future),
      children: [
        if (all.isNotEmpty) ...[
          Wrap(
            spacing: 8,
            children: [
              for (final (value, label) in [
                ('', s.list.allOption),
                ('author', m.awardsIGave),
                ('counterparty', m.awardsIReceived),
              ])
                ChoiceChip(
                  label: Text(label),
                  selected: _role == value,
                  onSelected: (_) => setState(() => _role = value),
                ),
            ],
          ),
          const SizedBox(height: BaghSpace.gutter),
        ],
        AsyncView(
          value: awards,
          onRetry: () => ref.invalidate(myAwardsProvider),
          isEmpty: (_) => shown.isEmpty,
          empty: all.isEmpty ? m.awardsEmpty : s.list.noResults,
          data: (_) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              for (final a in shown) _AwardCard(a, key: ValueKey(a.id)),
            ],
          ),
        ),
      ],
    );
  }
}

class _AwardCard extends ConsumerWidget {
  const _AwardCard(this.a, {super.key});

  final AwardView a;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final disputed = a.disputeStatus == 'OPEN';
    return SoftSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          InkWell(
            onTap: () => context.push(a.listingPath),
            child: Text(
              a.title,
              textDirection: textDirectionOf(
                a.title,
                Directionality.of(context),
              ),
              style: text.titleMedium?.copyWith(color: c.primary),
            ),
          ),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              StatusPill(switch (a.kind) {
                'job' => m.awardKindJob,
                'book' => s.bookshop.kindBook,
                'service' => w.serviceOrderContract,
                _ => m.awardKindProject,
              }, tone: 2),
              if (a.hourly) StatusPill(w.hourlyContract, tone: 2),
              StatusPill(
                disputed
                    ? m.disputeOpenBadge
                    : switch (a.status) {
                        'COMPLETED' => m.awardCompleted,
                        'CANCELLED' => m.awardCancelled,
                        _ => m.awardActive,
                      },
                tone: disputed
                    ? 3
                    : a.status == 'COMPLETED'
                    ? 0
                    : 4,
              ),
            ],
          ),
          Text(
            [
              a.mine ? m.awardRoleAuthor : m.awardRoleCounterparty,
              if (a.agreedAmount case final amount?)
                '${m.agreedAmountLabel}: ${money(amount, a.currency, s, language)}',
            ].join(factSep(language)),
            style: text.bodyMedium?.copyWith(color: c.ink2),
          ),
          if (a.counterparty case final user?)
            Wrap(
              spacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                InkWell(
                  onTap: () => context.push('/profiles/$user'),
                  child: Text(
                    '@$user',
                    textDirection: TextDirection.ltr,
                    style: text.bodyMedium?.copyWith(color: c.primary),
                  ),
                ),
                if (a.counterpartyVerified)
                  Icon(
                    Icons.verified_rounded,
                    size: 16,
                    color: c.primary,
                    semanticLabel: m.verifiedBadge,
                  ),
                if (a.counterpartyRatings > 0)
                  Text(
                    starsText(
                      a.counterpartyRating,
                      a.counterpartyRatings,
                      language,
                    ),
                    style: text.bodySmall?.copyWith(color: c.ink2),
                  ),
              ],
            ),
          if (disputed)
            SoftSurface(
              tint: c.tints[3],
              elevated: false,
              padding: const EdgeInsets.all(12),
              child: Text(
                [m.disputeOpenBadge, ?a.disputeReason].join('\n'),
                style: text.bodyMedium?.copyWith(color: c.tints[3].ink),
              ),
            ),
          if (a.hourly) _Timesheets(a),
          if (a.milestones.isNotEmpty) ...[
            Text(m.milestones, style: text.labelLarge),
            for (final step in a.milestones)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: c.fill,
                  borderRadius: BorderRadius.circular(BaghRadius.tile),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 4,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(step.title, style: text.titleSmall),
                        StatusPill(
                          switch (step.status) {
                            'APPROVED' => m.approvedState,
                            'IN_REVIEW' => m.milestoneInReview,
                            _ => m.milestonePending,
                          },
                          tone: switch (step.status) {
                            'APPROVED' => 0,
                            'IN_REVIEW' => 1,
                            _ => 4,
                          },
                        ),
                      ],
                    ),
                    if (step.dueDate case final due?)
                      Text(
                        '${m.milestoneDue}: ${formatDate(due.toLocal(), language)}',
                        style: text.bodySmall?.copyWith(color: c.ink2),
                      ),
                    if (step.deliveredAt case final at?)
                      Text(
                        '${m.deliveredLabel}: ${formatDate(at.toLocal(), language)}',
                        style: text.bodySmall?.copyWith(color: c.ink2),
                      ),
                    if (step.deliveryName case final file?)
                      Text(file, style: text.bodySmall),
                    if (step.deliveryNote case final note?)
                      Text(note, style: text.bodyMedium),
                  ],
                ),
              ),
          ],
          if (a.active && !disputed) _AwardActions(a),
          if (a.status == 'COMPLETED' && !a.reviewed) _ReviewForm(a.id),
          if (a.reviewed)
            Row(
              spacing: 6,
              children: [
                Icon(
                  Icons.check_circle_outline_rounded,
                  size: 18,
                  color: c.primary,
                ),
                Expanded(child: Text(m.reviewSubmitted)),
              ],
            ),
          if (a.theirRating case final r?)
            Text(
              '${m.theirRating}: ★ ${localDigits(r, language)}',
              style: text.bodyMedium?.copyWith(color: c.ink2),
            ),
          if (a.active && !disputed)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                icon: const Icon(Icons.flag_outlined),
                label: Text(m.openDispute),
                onPressed: () => _dispute(context, ref),
              ),
            ),
        ],
      ),
    );
  }

  /// A dispute with a reason of ten letters at least, behind one question.
  Future<void> _dispute(BuildContext context, WidgetRef ref) async {
    final s = ref.read(stringsProvider);
    final m = s.market;
    final reason = TextEditingController();
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(m.openDispute),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            spacing: 12,
            children: [
              Text(m.disputeConfirm),
              TextField(
                controller: reason,
                minLines: 3,
                maxLines: 6,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(labelText: m.disputeReasonLabel),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(s.common.cancel),
            ),
            FilledButton(
              onPressed: reason.text.trim().length < 10
                  ? null
                  : () => Navigator.of(context).pop(true),
              child: Text(m.openDispute),
            ),
          ],
        ),
      ),
    );
    final text = reason.text;
    reason.dispose();
    if (sure != true || !context.mounted) return;
    await _run(
      context,
      ref,
      () => ref.read(freelancerActionsProvider).dispute(a.id, text),
      done: m.disputeOpenedToast,
    );
  }
}

/// The moves a role has on an active contract: deliver a step (the one who
/// does the work), approve one or add one (the one who gave it out), and
/// complete it once every step is approved.
class _AwardActions extends ConsumerStatefulWidget {
  const _AwardActions(this.a);

  final AwardView a;

  @override
  ConsumerState<_AwardActions> createState() => _AwardActionsState();
}

class _AwardActionsState extends ConsumerState<_AwardActions> {
  String? _delivering;
  final _note = TextEditingController();
  List<PickedFile> _file = const [];
  bool _adding = false;
  final _title = TextEditingController();
  DateTime? _due;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _note.addListener(() => setState(() {}));
    _title.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _note.dispose();
    _title.dispose();
    super.dispose();
  }

  Future<void> _go(Future<void> Function() action, String done) async {
    setState(() => _busy = true);
    final ok = await _run(context, ref, action, done: done);
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (ok) {
        _delivering = null;
        _note.clear();
        _file = const [];
        _adding = false;
        _title.clear();
        _due = null;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final a = widget.a;
    final actions = ref.read(freelancerActionsProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 10,
      children: [
        const Divider(height: 4),
        if (!a.mine)
          for (final step in a.milestones.where((x) => x.status == 'PENDING'))
            if (_delivering == step.id) ...[
              TextField(
                controller: _note,
                minLines: 3,
                maxLines: 6,
                decoration: InputDecoration(
                  labelText: m.deliveryNoteLabel,
                  alignLabelWithHint: true,
                ),
              ),
              AttachmentsField(
                files: _file,
                onChanged: (f) => setState(() => _file = f),
                maxFiles: 1,
                chooseLabel: m.deliveryAttachment,
                rulesText: s.join.fileRules,
                removeLabel: s.join.removeFile,
                tooManyText: s.join.errFileBig,
                tooBigText: s.join.errFileBig,
                totalTooBigText: s.join.errFileBig,
                language: language,
              ),
              Wrap(
                spacing: 8,
                children: [
                  BaghKey(
                    label: m.deliverSubmit,
                    loading: _busy,
                    onPressed: _note.text.trim().isEmpty
                        ? null
                        : () => _go(
                            () => actions.deliver(
                              step.id,
                              _note.text,
                              attachment: _file.firstOrNull,
                            ),
                            m.milestoneDelivered,
                          ),
                  ),
                  TextButton(
                    onPressed: () => setState(() => _delivering = null),
                    child: Text(s.common.cancel),
                  ),
                ],
              ),
            ] else
              // The title above a short key: a long title inside the key
              // made it several lines tall.
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 4,
                children: [
                  Text(
                    step.title,
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  BaghKey(
                    label: m.deliverMilestone,
                    kind: BaghKeyKind.outline,
                    expand: true,
                    onPressed: () => setState(() => _delivering = step.id),
                  ),
                ],
              ),
        if (a.mine)
          for (final step in a.milestones.where((x) => x.status == 'IN_REVIEW'))
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 4,
              children: [
                Text(step.title, style: Theme.of(context).textTheme.labelLarge),
                BaghKey(
                  label: m.approveMilestone,
                  expand: true,
                  loading: _busy,
                  onPressed: () =>
                      _go(() => actions.approve(step.id), m.milestoneApproved),
                ),
              ],
            ),
        if (a.mine)
          if (_adding) ...[
            TextField(
              controller: _title,
              decoration: InputDecoration(labelText: m.milestoneTitle),
            ),
            DateField(
              label: m.milestoneDue,
              value: _due,
              firstDate: DateTime.now(),
              onChanged: (v) => setState(() => _due = v),
            ),
            Wrap(
              spacing: 8,
              children: [
                BaghKey(
                  label: m.addMilestone,
                  loading: _busy,
                  onPressed: _title.text.trim().isEmpty
                      ? null
                      : () => _go(
                          () => actions.addMilestone(
                            a.id,
                            _title.text,
                            dueDate: _due,
                          ),
                          m.milestoneAdded,
                        ),
                ),
                TextButton(
                  onPressed: () => setState(() => _adding = false),
                  child: Text(s.common.cancel),
                ),
              ],
            ),
          ] else
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                icon: const Icon(Icons.add_rounded),
                label: Text(m.addMilestone),
                onPressed: () => setState(() => _adding = true),
              ),
            ),
        if (a.allApproved || a.milestones.isEmpty)
          BaghKey(
            label: m.completeAward,
            icon: Icons.check_circle_outline_rounded,
            expand: true,
            loading: _busy,
            onPressed: () async {
              final sure = await _confirm(
                context,
                ref,
                title: m.completeAward,
                body: m.completeAwardConfirm,
                action: m.completeAward,
              );
              if (!sure || !context.mounted) return;
              await _go(() => actions.complete(a.id), m.awardCompletedToast);
            },
          ),
      ],
    );
  }
}

/// An hourly contract's weeks: rate and limit, what is approved and owed,
/// every week, and the form to log one or the moves to approve or query.
class _Timesheets extends ConsumerStatefulWidget {
  const _Timesheets(this.a);

  final AwardView a;

  @override
  ConsumerState<_Timesheets> createState() => _TimesheetsState();
}

class _TimesheetsState extends ConsumerState<_Timesheets> {
  DateTime _week = DateTime.now();
  final _hours = TextEditingController();
  final _minutes = TextEditingController(text: '0');
  final _memo = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    for (final c in [_hours, _minutes, _memo]) {
      c.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    for (final c in [_hours, _minutes, _memo]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _log() async {
    final s = ref.read(stringsProvider);
    final total =
        (int.tryParse(toLatinDigits(_hours.text)) ?? 0) * 60 +
        (int.tryParse(toLatinDigits(_minutes.text)) ?? 0);
    setState(() => _busy = true);
    final ok = await _run(
      context,
      ref,
      () => ref
          .read(freelancerActionsProvider)
          .logHours(widget.a.id, week: _week, minutes: total, memo: _memo.text),
      done: s.work.hoursLogged,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) {
      _hours.clear();
      _minutes.text = '0';
      _memo.clear();
    }
  }

  Future<void> _query(String sheetId) async {
    final s = ref.read(stringsProvider);
    final note = TextEditingController();
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(s.work.query),
          content: TextField(
            controller: note,
            minLines: 2,
            maxLines: 5,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: s.work.queryNote),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(s.common.cancel),
            ),
            FilledButton(
              onPressed: note.text.trim().isEmpty
                  ? null
                  : () => Navigator.of(context).pop(true),
              child: Text(s.work.query),
            ),
          ],
        ),
      ),
    );
    final text = note.text;
    note.dispose();
    if (sure != true || !mounted) return;
    await _run(
      context,
      ref,
      () => ref
          .read(freelancerActionsProvider)
          .reviewTimesheet(sheetId, 'QUERIED', note: text),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final a = widget.a;
    final approved = a.timesheets
        .where((t) => t.status == 'APPROVED')
        .fold(0, (sum, t) => sum + t.minutes);
    final rate = BigInt.tryParse(a.hourlyRate ?? '');
    // Whole minutes times a whole rate, divided once at the end.
    final owed = rate == null
        ? null
        : '${(rate * BigInt.from(approved)) ~/ BigInt.from(60)}';
    final active = a.active && a.disputeStatus != 'OPEN';
    final digits = [FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]'))];
    final minutes =
        (int.tryParse(toLatinDigits(_hours.text)) ?? 0) * 60 +
        (int.tryParse(toLatinDigits(_minutes.text)) ?? 0);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: c.edge.withValues(alpha: 0.4)),
        borderRadius: BorderRadius.circular(BaghRadius.tile),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          Text(w.timesheets, style: text.titleSmall),
          Text(
            '${w.hourlyRate}: ${money(a.hourlyRate, a.currency, s, language) ?? '—'} ${w.perHour}${factSep(language)}'
            '${a.weeklyHourLimit == null ? w.noWeeklyLimit : w.weeklyLimit.fill({'hours': localDigits(a.weeklyHourLimit!, language)})}',
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
          Text(
            w.totalApproved.fill({
              'hours': hoursText(approved, language),
              'amount': money(owed, a.currency, s, language) ?? '—',
            }),
            style: text.labelLarge,
          ),
          if (a.timesheets.isEmpty)
            Text(w.noTimesheets, style: text.bodySmall?.copyWith(color: c.ink2))
          else
            for (final sheet in a.timesheets)
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: c.fill,
                  borderRadius: BorderRadius.circular(BaghRadius.tile),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 4,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          w.weekOf.fill({
                            'date': sheet.weekStart == null
                                ? '—'
                                : formatDate(sheet.weekStart!, language),
                          }),
                          style: text.labelLarge,
                        ),
                        Text(hoursText(sheet.minutes, language)),
                        StatusPill(
                          w.timesheetStatus.label(sheet.status),
                          tone: switch (sheet.status) {
                            'APPROVED' => 0,
                            'QUERIED' => 1,
                            _ => 2,
                          },
                        ),
                      ],
                    ),
                    Text(sheet.memo, style: text.bodyMedium),
                    if (sheet.clientNote case final note?)
                      Text(
                        note,
                        style: text.bodySmall?.copyWith(color: c.error),
                      ),
                    if (active && a.mine && sheet.status == 'SUBMITTED')
                      Wrap(
                        spacing: 8,
                        children: [
                          BaghKey(
                            label: w.approve,
                            icon: Icons.check_rounded,
                            onPressed: () => _run(
                              context,
                              ref,
                              () => ref
                                  .read(freelancerActionsProvider)
                                  .reviewTimesheet(sheet.id, 'APPROVED'),
                            ),
                          ),
                          TextButton(
                            onPressed: () => _query(sheet.id),
                            child: Text(w.query),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
          if (active && !a.mine) ...[
            const Divider(height: 8),
            Text(w.logHours, style: text.labelLarge),
            DateField(
              label: w.weekOf.fill({'date': ''}).trim(),
              value: _week,
              firstDate: DateTime.now().subtract(const Duration(days: 365)),
              lastDate: DateTime.now(),
              onChanged: (v) => setState(() => _week = v ?? _week),
            ),
            Row(
              spacing: 8,
              children: [
                Expanded(
                  child: TextField(
                    controller: _hours,
                    keyboardType: TextInputType.number,
                    textDirection: TextDirection.ltr,
                    inputFormatters: digits,
                    decoration: InputDecoration(labelText: w.hours),
                  ),
                ),
                Expanded(
                  child: TextField(
                    controller: _minutes,
                    keyboardType: TextInputType.number,
                    textDirection: TextDirection.ltr,
                    inputFormatters: digits,
                    decoration: InputDecoration(labelText: w.minutes),
                  ),
                ),
              ],
            ),
            TextField(
              controller: _memo,
              minLines: 2,
              maxLines: 5,
              maxLength: 2000,
              decoration: InputDecoration(
                labelText: w.workMemo,
                alignLabelWithHint: true,
              ),
            ),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: BaghKey(
                label: w.logHours,
                loading: _busy,
                onPressed: minutes > 0 && _memo.text.trim().length >= 5
                    ? _log
                    : null,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// The one-direction-per-contract rating: stars and a few words.
class _ReviewForm extends ConsumerStatefulWidget {
  const _ReviewForm(this.awardId);

  final String awardId;

  @override
  ConsumerState<_ReviewForm> createState() => _ReviewFormState();
}

class _ReviewFormState extends ConsumerState<_ReviewForm> {
  int _rating = 0;
  final _text = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 8,
      children: [
        const Divider(height: 4),
        Text(m.reviewAward, style: text.labelLarge),
        Semantics(
          label: m.ratingLabel,
          child: Row(
            children: [
              for (var star = 1; star <= 5; star++)
                IconButton(
                  tooltip: '$star',
                  isSelected: star <= _rating,
                  icon: Icon(
                    star <= _rating
                        ? Icons.star_rounded
                        : Icons.star_border_rounded,
                    color: star <= _rating ? c.tints[1].ink : c.ink2,
                  ),
                  onPressed: () => setState(() => _rating = star),
                ),
            ],
          ),
        ),
        TextField(
          controller: _text,
          minLines: 2,
          maxLines: 5,
          decoration: InputDecoration(labelText: m.reviewTextLabel),
        ),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: BaghKey(
            label: m.reviewAward,
            loading: _busy,
            onPressed: _rating == 0
                ? null
                : () async {
                    setState(() => _busy = true);
                    await _run(
                      context,
                      ref,
                      () => ref
                          .read(freelancerActionsProvider)
                          .review(widget.awardId, _rating, _text.text),
                      done: m.reviewSubmitted,
                    );
                    if (mounted) setState(() => _busy = false);
                  },
          ),
        ),
      ],
    );
  }
}
