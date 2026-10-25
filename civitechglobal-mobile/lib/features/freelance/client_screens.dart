import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/files.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/attachments_field.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/date_field.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/step_keys.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../jobs/jobs_format.dart' show postedAgo;
import '../jobs/seeker_screens.dart' show ReviewNote, statusTone;
import 'client_data.dart';
import 'freelance_data.dart';
import 'freelance_ui.dart';
import 'project_form.dart';

/// Shows what went wrong with a write, or the words for it going through.
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

/// Small readouts in a grid, as the web's gauges.
class Gauges extends StatelessWidget {
  const Gauges(this.items, {super.key});

  /// Label, value, and whether it wants attention.
  final List<(String, String, bool)> items;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return LayoutBuilder(
      builder: (context, box) {
        final columns = box.maxWidth < 300 ? 2 : 3;
        final width = ((box.maxWidth - 8 * (columns - 1)) / columns)
            .floorToDouble();
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final (label, value, attention) in items)
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

/// The client's projects, as the web's ClientProjectsPage: gauges across
/// everything, then each project with its own and the way to its
/// proposals.
class ClientProjectsScreen extends ConsumerStatefulWidget {
  const ClientProjectsScreen({super.key});

  @override
  ConsumerState<ClientProjectsScreen> createState() =>
      _ClientProjectsScreenState();
}

class _ClientProjectsScreenState extends ConsumerState<ClientProjectsScreen> {
  String _tab = 'all';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final projects = ref.watch(ownProjectsProvider);
    final pipeline = ref.watch(clientPipelineProvider).value;
    String n(int v) => localDigits(v, language);
    final shown = [
      for (final p in projects.value ?? const <OwnProject>[])
        if (switch (_tab) {
          'open' => p.live && p.state == 'OPEN',
          'drafts' => !p.live,
          'closed' => p.live && p.state != 'OPEN',
          _ => true,
        })
          p,
    ];

    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(w.navMyProjects),
        actions: [
          IconButton(
            tooltip: w.findTalent,
            icon: const Icon(Icons.groups_outlined),
            onPressed: () => context.push('/freelancers'),
          ),
          const HelpAction('client-projects'),
        ],
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: c.primary,
          onRefresh: () {
            ref.invalidate(clientPipelineProvider);
            return ref.refresh(ownProjectsProvider.future);
          },
          child: ListView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            children: [
              BaghKey(
                label: w.postProject,
                icon: Icons.add_rounded,
                expand: true,
                onPressed: () => context.push('/dashboard/projects/new'),
              ),
              const SizedBox(height: BaghSpace.gutter),
              if (pipeline != null) ...[
                Gauges([
                  (w.openProjects, n(pipeline.projects['OPEN'] ?? 0), false),
                  (
                    w.pipelineNew,
                    n(pipeline.unseenBids),
                    pipeline.unseenBids > 0,
                  ),
                  (
                    w.pipelineShortlisted,
                    n(pipeline.bids['SHORTLISTED'] ?? 0),
                    false,
                  ),
                  (
                    w.pipelineInterviewing,
                    n(pipeline.bids['INTERVIEW'] ?? 0),
                    false,
                  ),
                  (w.pipelineHired, n(pipeline.bids['ACCEPTED'] ?? 0), false),
                  (w.invitesSent, n(pipeline.invites), false),
                ]),
                const SizedBox(height: BaghSpace.gutter),
              ],
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  spacing: 8,
                  children: [
                    for (final (value, label) in [
                      ('all', w.allStages),
                      ('open', w.openProjects),
                      ('drafts', w.awaitingReview),
                      ('closed', w.closed),
                    ])
                      ChoiceChip(
                        label: Text(label),
                        selected: _tab == value,
                        onSelected: (_) => setState(() => _tab = value),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: BaghSpace.gutter),
              AsyncView(
                value: projects,
                onRetry: () => ref.invalidate(ownProjectsProvider),
                isEmpty: (_) => shown.isEmpty,
                empty: s.market.noProjects,
                data: (_) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 12,
                  children: [for (final p in shown) _OwnProjectCard(p)],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OwnProjectCard extends ConsumerWidget {
  const _OwnProjectCard(this.p);

  final OwnProject p;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final activity = p.activity;
    String n(int v) => localDigits(v, language);
    final bids = activity?.bidCount ?? p.bidCount;
    final actions = ref.read(clientActionsProvider);

    return SoftSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              StatusPill(
                p.live ? m.label(p.state) : m.label(p.moderationStatus),
                tone: p.live
                    ? (p.state == 'OPEN' ? 0 : 4)
                    : statusTone(p.moderationStatus),
              ),
              StatusPill(w.pricing.label(p.pricingType), tone: 4),
              if (p.nda) StatusPill(w.nda, tone: 4),
              if (p.visibility != 'PUBLIC')
                StatusPill(w.visibility.label(p.visibility), tone: 2),
              if (p.unseenBids > 0)
                StatusPill(
                  w.newProposals.fill({'count': n(p.unseenBids)}),
                  tone: 1,
                ),
            ],
          ),
          InkWell(
            onTap: p.live ? () => context.push('/projects/${p.code}') : null,
            child: Text(
              p.title,
              textDirection: textDirectionOf(
                p.title,
                Directionality.of(context),
              ),
              style: text.titleMedium?.copyWith(
                color: p.live ? c.primary : c.ink,
              ),
            ),
          ),
          Text(
            budgetText(p, s, language),
            style: text.bodyMedium?.copyWith(color: c.ink2),
          ),
          if (p.reviewNote case final note? when !p.live) ReviewNote(note),
          if (p.live)
            Gauges([
              (
                s.jobs.viewsCount.fill({'count': ''}).trim(),
                n(p.viewCount),
                false,
              ),
              (w.proposals, n(bids), false),
              (w.pipelineNew, n(p.unseenBids), p.unseenBids > 0),
              (w.interviewing, n(activity?.interviewing ?? 0), false),
              (w.invitesSent, n(activity?.invitesSent ?? 0), false),
              (
                w.hired,
                '${n(activity?.hired ?? 0)} / ${n(p.freelancersNeeded)}',
                false,
              ),
            ]),
          if (p.editable) ...[
            BaghKey(
              label: s.common.edit,
              icon: Icons.edit_outlined,
              kind: BaghKeyKind.outline,
              expand: true,
              onPressed: () => context.push(
                '/dashboard/projects/${Uri.encodeComponent(p.id)}/edit',
              ),
            ),
            BaghKey(
              label: w.submitForReview,
              icon: Icons.send_rounded,
              expand: true,
              onPressed: () => _run(
                context,
                ref,
                () => actions.submit(p.id),
                done: w.submitted,
              ),
            ),
          ],
          if (p.live)
            BaghKey(
              label: '${w.inboxTitle} (${n(bids)})',
              icon: Icons.forum_outlined,
              kind: p.unseenBids > 0
                  ? BaghKeyKind.primary
                  : BaghKeyKind.outline,
              expand: true,
              onPressed: () => context.push(
                Uri(
                  path:
                      '/dashboard/projects/${Uri.encodeComponent(p.id)}/inbox',
                ).toString(),
              ),
            ),
          if (p.live && p.state == 'OPEN')
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                icon: const Icon(Icons.block_rounded),
                label: Text(w.closeProject),
                onPressed: () async {
                  final sure = await _confirm(
                    context,
                    ref,
                    title: w.closeProject,
                    body: '${p.title}\n\n${w.closeProjectConfirm}',
                    action: w.closeProject,
                  );
                  if (!sure || !context.mounted) return;
                  await _run(
                    context,
                    ref,
                    () => actions.close(p.id),
                    done: w.projectClosed,
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

/// One project's proposals, as its client works through them (the web's
/// ProposalInbox, as a page): stage tabs with counts, sorting, each proposal
/// with the freelancer's record, the plan and answers, a private note and
/// the moves; then invitations sent and NDA signatures.
class ProjectInboxScreen extends ConsumerStatefulWidget {
  const ProjectInboxScreen({required this.projectId, super.key});

  final String projectId;

  @override
  ConsumerState<ProjectInboxScreen> createState() => _ProjectInboxScreenState();
}

class _ProjectInboxScreenState extends ConsumerState<ProjectInboxScreen> {
  String _stage = 'ALL';
  String _sort = 'best';

  static const _stages = [
    'ALL',
    'PENDING',
    'SHORTLISTED',
    'INTERVIEW',
    'ACCEPTED',
    'DECLINED',
  ];

  bool _in(InboxBid b, String stage) =>
      stage == 'ALL' ? b.outcome != 'WITHDRAWN' : b.outcome == stage;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final id = widget.projectId;
    final project = ref
        .watch(ownProjectsProvider)
        .value
        ?.where((p) => p.id == id)
        .firstOrNull;
    final inbox = ref.watch(projectInboxProvider(id));
    final invites = ref.watch(projectInvitesProvider(id)).value ?? const [];
    final signatures = project?.nda ?? false
        ? ref.watch(ndaSignaturesProvider(id)).value ?? const []
        : const <NdaSignature>[];
    final all = inbox.value ?? const <InboxBid>[];
    String n(int v) => localDigits(v, language);
    final shown =
        [
          for (final b in all)
            if (_in(b, _stage)) b,
        ]..sort(
          (a, b) => switch (_sort) {
            'lowest' => (BigInt.tryParse(a.amount) ?? BigInt.zero).compareTo(
              BigInt.tryParse(b.amount) ?? BigInt.zero,
            ),
            'fastest' => (a.deliveryDays ?? 9999).compareTo(
              b.deliveryDays ?? 9999,
            ),
            'newest' => (b.createdAt ?? DateTime(0)).compareTo(
              a.createdAt ?? DateTime(0),
            ),
            _ => b.score.compareTo(a.score),
          },
        );

    return Scaffold(
      appBar: AppBar(
        title: Text(w.inboxTitle),
        actions: const [HelpAction('client-projects')],
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: c.primary,
          onRefresh: () => ref.refresh(projectInboxProvider(id).future),
          child: ListView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            children: [
              if (project != null) ...[
                Text(project.title, style: text.titleMedium),
                const SizedBox(height: BaghSpace.gutter),
              ],
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  spacing: 8,
                  children: [
                    for (final stage in _stages)
                      ChoiceChip(
                        label: Text(
                          '${stage == 'ALL' ? w.allStages : w.bidStage.label(stage)} '
                          '(${n(all.where((b) => _in(b, stage)).length)})',
                        ),
                        selected: _stage == stage,
                        onSelected: (_) => setState(() => _stage = stage),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  PopupMenuButton<String>(
                    tooltip: w.sortProposals,
                    initialValue: _sort,
                    onSelected: (v) => setState(() => _sort = v),
                    itemBuilder: (_) => [
                      for (final (v, label) in [
                        ('best', w.sortBest),
                        ('lowest', w.sortLowest),
                        ('fastest', w.sortFastest),
                        ('newest', w.sortNewest),
                      ])
                        PopupMenuItem(value: v, child: Text(label)),
                    ],
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        spacing: 4,
                        children: [
                          const Icon(Icons.sort_rounded, size: 18),
                          Flexible(
                            child: Text(switch (_sort) {
                              'lowest' => w.sortLowest,
                              'fastest' => w.sortFastest,
                              'newest' => w.sortNewest,
                              _ => w.sortBest,
                            }),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (project?.state == 'OPEN')
                    ActionChip(
                      avatar: const Icon(
                        Icons.person_add_alt_rounded,
                        size: 18,
                      ),
                      label: Text(w.inviteFreelancers),
                      onPressed: () => showInviteSheet(context, projectId: id),
                    ),
                ],
              ),
              const SizedBox(height: BaghSpace.gutter),
              AsyncView(
                value: inbox,
                onRetry: () => ref.invalidate(projectInboxProvider(id)),
                isEmpty: (_) => shown.isEmpty,
                empty: w.inboxEmpty,
                data: (_) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 12,
                  children: [
                    for (final b in shown)
                      _BidCard(
                        bid: b,
                        project: project,
                        projectId: id,
                        key: ValueKey(b.id),
                      ),
                  ],
                ),
              ),
              if (invites.isNotEmpty) ...[
                const SizedBox(height: BaghSpace.section),
                Text(w.invitesTitle, style: text.titleMedium),
                const SizedBox(height: 8),
                for (final i in invites)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      i.username == null ? '—' : '@${i.username}',
                      textDirection: TextDirection.ltr,
                      textAlign: Directionality.of(context) == TextDirection.rtl
                          ? TextAlign.right
                          : TextAlign.left,
                    ),
                    subtitle: i.createdAt == null
                        ? null
                        : Text(postedAgo(i.createdAt, s, language)),
                    trailing: StatusPill(
                      w.inviteStatus.label(i.status),
                      tone: switch (i.status) {
                        'ACCEPTED' => 0,
                        'DECLINED' => 3,
                        _ => 4,
                      },
                    ),
                    onTap: i.username == null
                        ? null
                        : () => context.push('/profiles/${i.username}'),
                  ),
              ],
              if (signatures.isNotEmpty) ...[
                const SizedBox(height: BaghSpace.section),
                Text(w.ndaSignatures, style: text.titleMedium),
                const SizedBox(height: 8),
                for (final sig in signatures)
                  Text(
                    [
                      sig.name,
                      if (sig.username case final u?) '(@$u)',
                      if (sig.signedAt case final at?)
                        formatDate(at.toLocal(), language),
                    ].join(factSep(language)),
                    style: text.bodyMedium?.copyWith(color: c.ink2),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _BidCard extends ConsumerStatefulWidget {
  const _BidCard({
    required this.bid,
    required this.project,
    required this.projectId,
    super.key,
  });

  final InboxBid bid;
  final OwnProject? project;
  final String projectId;

  @override
  ConsumerState<_BidCard> createState() => _BidCardState();
}

class _BidCardState extends ConsumerState<_BidCard> {
  late bool _expanded = widget.bid.clientSeenAt == null;
  late final _note = TextEditingController(text: widget.bid.clientNote ?? '');
  late String _savedNote = widget.bid.clientNote ?? '';
  String? _moving;

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

  Future<void> _move(String outcome) async {
    setState(() => _moving = outcome);
    await _run(
      context,
      ref,
      () => ref
          .read(clientActionsProvider)
          .setStage(widget.projectId, widget.bid.id, outcome),
    );
    if (mounted) setState(() => _moving = null);
  }

  Future<void> _hire() async {
    final s = ref.read(stringsProvider);
    final w = s.work;
    final name = widget.bid.name(w.companyOffer);
    final sure = await _confirm(
      context,
      ref,
      title: w.hire,
      body: w.hireConfirm.fill({'name': name}),
      action: w.hire,
    );
    if (!sure || !mounted) return;
    setState(() => _moving = 'ACCEPTED');
    await _run(
      context,
      ref,
      () =>
          ref.read(clientActionsProvider).hire(widget.projectId, widget.bid.id),
      done: w.hiredToast,
    );
    if (mounted) setState(() => _moving = null);
  }

  Future<void> _saveNote() async {
    final s = ref.read(stringsProvider);
    final note = _note.text;
    final ok = await _run(
      context,
      ref,
      () => ref.read(clientActionsProvider).setNote(widget.bid.id, note),
      done: s.work.noteSaved,
    );
    if (ok && mounted) setState(() => _savedNote = note);
  }

  Future<void> _openAttachment() async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final got = await ref
          .read(clientActionsProvider)
          .bidAttachment(widget.bid.id);
      final opened = await openDownloaded(
        bytes: got.bytes,
        name: widget.bid.attachmentName ?? 'file',
        mimeType: got.mimeType,
      );
      if (!opened) {
        messenger.showSnackBar(SnackBar(content: Text(s.mobile.noFileViewer)));
      }
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final b = widget.bid;
    final p = widget.project;
    final hourly = p?.hourly ?? false;
    final name = b.name(w.companyOffer);
    final open = p?.state == 'OPEN';
    String n(int v) => localDigits(v, language);

    Widget move(String outcome, String label, IconData icon) => BaghKey(
      label: label,
      icon: icon,
      kind: BaghKeyKind.outline,
      loading: _moving == outcome,
      onPressed: _moving == null ? () => _move(outcome) : null,
    );

    return SoftSurface(
      // An unread proposal is tinted, as the web rings it: a "new" badge sat
      // beside the stage chip, which for a fresh proposal also reads "new".
      tint: b.clientSeenAt == null && !b.decided
          ? c.accentSoft
          : b.isCompanyOffer
          ? c.tints[0]
          : null,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          // The amount under the name, not beside it: a large amount in a
          // large text left the name no room on a narrow phone.
          InkWell(
            onTap: b.username == null
                ? null
                : () => context.push('/profiles/${b.username}'),
            child: Text(name, style: text.titleMedium),
          ),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              if (b.invited) StatusPill(w.invitedBadge, tone: 2),
              StatusPill(
                w.bidStage.label(b.outcome),
                tone: statusTone(b.outcome),
              ),
            ],
          ),
          Wrap(
            spacing: 10,
            runSpacing: 2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                amountText(b.amount, b.currency, hourly, s, language),
                style: text.titleSmall,
              ),
              if (b.deliveryDays case final d?)
                Text(
                  w.daysCount.fill({'count': n(d)}),
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
              if (b.createdAt case final at?)
                Text(
                  postedAgo(at, s, language),
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
            ],
          ),
          if (b.headline case final h?)
            Text(h, style: text.bodyMedium?.copyWith(color: c.ink2)),
          if (b.stats case final st?) FreelancerFacts(st),
          Text(
            b.message,
            maxLines: _expanded ? null : 3,
            overflow: _expanded ? null : TextOverflow.ellipsis,
            textDirection: textDirectionOf(
              b.message,
              Directionality.of(context),
            ),
            style: text.bodyMedium,
          ),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton(
              onPressed: () => setState(() => _expanded = !_expanded),
              child: Text(_expanded ? w.hideDetails : w.showDetails),
            ),
          ),
          if (_expanded) ...[
            if (b.milestones.isNotEmpty) ...[
              Text(w.proposedPlan, style: text.labelLarge),
              for (final (i, m) in b.milestones.indexed)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: c.fill,
                    borderRadius: BorderRadius.circular(BaghRadius.tile),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 2,
                    children: [
                      Text('${n(i + 1)}. ${m.title}'),
                      Text(
                        '${money(m.amount, b.currency, s, language) ?? '—'}${factSep(language)}'
                        '${w.daysCount.fill({'count': n(m.days)})}',
                        style: text.labelMedium,
                      ),
                    ],
                  ),
                ),
            ],
            if ((p?.screeningQuestions.isNotEmpty ?? false) &&
                b.screeningAnswers.isNotEmpty) ...[
              Text(w.answers, style: text.labelLarge),
              for (final (i, q) in p!.screeningQuestions.indexed) ...[
                Text(q, style: text.bodySmall?.copyWith(color: c.ink2)),
                Text(
                  i < b.screeningAnswers.length ? b.screeningAnswers[i] : '—',
                  style: text.bodyMedium,
                ),
              ],
            ],
            if (b.attachmentName case final file?)
              OutlinedButton.icon(
                icon: const Icon(Icons.attach_file_rounded),
                label: Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Text(file, overflow: TextOverflow.ellipsis),
                ),
                onPressed: _openAttachment,
              ),
            if (!b.isCompanyOffer) ...[
              TextField(
                controller: _note,
                minLines: 2,
                maxLines: 6,
                maxLength: 2000,
                decoration: InputDecoration(
                  labelText: w.privateNote,
                  hintText: w.privateNoteHint,
                  alignLabelWithHint: true,
                  counterText: '',
                ),
              ),
              if (_note.text.trim() != _savedNote.trim())
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: BaghKey(
                    label: s.jobs.saveNote,
                    icon: Icons.save_outlined,
                    kind: BaghKeyKind.outline,
                    onPressed: _saveNote,
                  ),
                ),
            ],
          ],
          const Divider(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (!b.decided && open) ...[
                if (b.outcome != 'SHORTLISTED' && b.outcome != 'DECLINED')
                  move('SHORTLISTED', w.shortlist, Icons.star_outline_rounded),
                if (b.outcome != 'INTERVIEW' && b.outcome != 'DECLINED')
                  move('INTERVIEW', w.interview, Icons.forum_outlined),
                if (b.outcome == 'DECLINED')
                  move('PENDING', w.restore, Icons.undo_rounded)
                else ...[
                  move('DECLINED', w.decline, Icons.block_rounded),
                  BaghKey(
                    label: w.hire,
                    icon: Icons.how_to_reg_outlined,
                    loading: _moving == 'ACCEPTED',
                    onPressed: _moving == null ? _hire : null,
                  ),
                ],
              ],
              if (!b.isCompanyOffer)
                TextButton.icon(
                  icon: const Icon(Icons.chat_bubble_outline_rounded),
                  label: Text(s.market.messagesNav),
                  onPressed: () =>
                      context.push('/dashboard/messages/b/${b.id}'),
                ),
              if (b.outcome == 'ACCEPTED')
                TextButton.icon(
                  icon: const Icon(Icons.visibility_outlined),
                  label: Text(w.openContract),
                  onPressed: () => context.push('/dashboard/awards'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Invite one freelancer to one of the reader's open projects, as the web's
/// InviteModal: from a project's inbox (the project known) or a talent card
/// (the freelancer known).
Future<void> showInviteSheet(
  BuildContext context, {
  String? projectId,
  String? username,
}) => showBaghSheet<void>(
  context,
  isScrollControlled: true,
  builder: (_) => _InviteSheet(projectId: projectId, username: username),
);

class _InviteSheet extends ConsumerStatefulWidget {
  const _InviteSheet({this.projectId, this.username});

  final String? projectId;
  final String? username;

  @override
  ConsumerState<_InviteSheet> createState() => _InviteSheetState();
}

class _InviteSheetState extends ConsumerState<_InviteSheet> {
  late String _project = widget.projectId ?? '';
  late final _handle = TextEditingController(text: widget.username ?? '');
  final _message = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _handle.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _handle.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final s = ref.read(stringsProvider);
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(clientActionsProvider)
          .invite(_project, _handle.text, _message.text);
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.work.inviteSent)));
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
    final w = s.work;
    final text = Theme.of(context).textTheme;
    final signedIn = ref.watch(sessionProvider).value != null;
    final open = [
      for (final p
          in ref.watch(ownProjectsProvider).value ?? const <OwnProject>[])
        if (p.live && p.state == 'OPEN') p,
    ];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 14,
          children: [
            Text(w.inviteToProject, style: text.titleLarge),
            if (!signedIn)
              BaghKey(
                label: s.nav.login,
                expand: true,
                onPressed: () {
                  Navigator.of(context).pop();
                  context.push('/login');
                },
              )
            else if (widget.projectId == null && open.isEmpty) ...[
              Text(w.noOpenProjects, style: text.bodyMedium),
              BaghKey(
                label: w.postProject,
                expand: true,
                onPressed: () {
                  Navigator.of(context).pop();
                  context.push('/dashboard/projects/new');
                },
              ),
            ] else ...[
              if (widget.projectId == null)
                DropdownButtonFormField<String>(
                  initialValue: _project.isEmpty ? null : _project,
                  isExpanded: true,
                  decoration: InputDecoration(labelText: w.chooseProject),
                  items: [
                    for (final p in open)
                      DropdownMenuItem(
                        value: p.id,
                        child: Text(p.title, overflow: TextOverflow.ellipsis),
                      ),
                  ],
                  onChanged: (v) => setState(() => _project = v ?? ''),
                ),
              if (widget.username == null)
                TextField(
                  controller: _handle,
                  textDirection: TextDirection.ltr,
                  decoration: InputDecoration(labelText: w.inviteByUsername),
                ),
              TextField(
                controller: _message,
                minLines: 3,
                maxLines: 6,
                maxLength: 1000,
                decoration: InputDecoration(
                  labelText: w.inviteMessage,
                  alignLabelWithHint: true,
                ),
              ),
              if (_error case final e?) FormMessage(e),
              BaghKey(
                label: w.invite,
                icon: Icons.person_add_alt_rounded,
                loading: _sending,
                expand: true,
                onPressed: _project.isEmpty || _handle.text.trim().isEmpty
                    ? null
                    : _send,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Posting a project, one question at a time, as the web's PostProjectPage:
/// title and category, scope, budget, the brief, who may see it, and a
/// review that shows the card as freelancers will. The same form edits a
/// draft or a project sent back for changes.
class PostProjectScreen extends ConsumerWidget {
  const PostProjectScreen({this.projectId, super.key});

  final String? projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    if (projectId == null) return const _ProjectWizard();
    final own = ref.watch(ownProjectsProvider);
    return own.hasValue
        ? switch (own.value!.where((p) => p.id == projectId).firstOrNull) {
            final p? when p.editable => _ProjectWizard(project: p),
            _ => Scaffold(
              appBar: AppBar(title: Text(w.editProjectTitle)),
              body: EmptyNote(message: s.list.noResults),
            ),
          }
        : Scaffold(
            appBar: AppBar(title: Text(w.editProjectTitle)),
            body: AsyncView(
              value: own,
              onRetry: () => ref.invalidate(ownProjectsProvider),
              data: (_) => const SizedBox.shrink(),
            ),
          );
  }
}

class _ProjectWizard extends ConsumerStatefulWidget {
  const _ProjectWizard({this.project});

  final OwnProject? project;

  @override
  ConsumerState<_ProjectWizard> createState() => _ProjectWizardState();
}

class _ProjectWizardState extends ConsumerState<_ProjectWizard> {
  late final ProjectDraft _d = widget.project == null
      ? ProjectDraft()
      : ProjectDraft.fromProject(widget.project!.raw);
  late final String _start;
  int _step = 0;
  List<PickedFile> _files = const [];
  late String? _savedId = widget.project?.id;
  bool _sending = false;
  double? _progress;
  String? _error;

  @override
  void initState() {
    super.initState();
    _start = _snapshot();
  }

  String _snapshot() => '${_d.toPayload()}${_files.length}';

  void _set(VoidCallback apply) => setState(apply);

  Future<void> _save({required bool submit}) async {
    final s = ref.read(stringsProvider);
    final w = s.work;
    setState(() {
      _sending = true;
      _progress = null;
      _error = null;
    });
    final actions = ref.read(clientActionsProvider);
    try {
      var id = _savedId;
      if (id != null) {
        await actions.update(id, _d.toPayload());
      } else {
        id = await actions.create(
          _d.toPayload(),
          attachments: _files,
          onProgress: (p) => setState(() => _progress = p),
        );
        _savedId = id;
      }
      if (submit) await actions.submit(id);
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(submit ? w.submitted : w.draftSaved)),
      );
      // Off the form either way: the list shows where it now stands.
      context.pop();
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String _problemText(ProjectProblem p, Strings s) => switch (p) {
    ProjectProblem.title => s.work.titleHint,
    ProjectProblem.budgetNeeded => s.work.budgetNeeded,
    ProjectProblem.budgetOrder => s.work.budgetOrder,
    ProjectProblem.description => s.work.descriptionHint,
  };

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.watch(workCategoriesProvider).value ?? const [];
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final d = _d;
    final name = projectSteps[_step];
    final problems = d.problems();
    final last = _step == projectSteps.length - 1;
    String n(int v) => localDigits(v, language);
    final digits = [FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]'))];
    final stepLabels = {
      'basics': w.stepBasics,
      'scope': w.stepScope,
      'budget': w.stepBudget,
      'details': w.stepDetails,
      'options': w.stepOptions,
      'review': w.stepReview,
    };

    Widget toggle(
      String label,
      bool value,
      ValueChanged<bool> on, {
      String? hint,
    }) => SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label, style: text.bodyMedium),
      subtitle: hint == null ? null : Text(hint, style: text.bodySmall),
      value: value,
      onChanged: (v) => _set(() => on(v)),
    );

    Widget cards(
      String label,
      List<(String, String, String?)> options,
      String current,
      ValueChanged<String> on,
    ) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 8,
      children: [
        Text(label, style: text.labelLarge),
        for (final (value, title, hint) in options)
          Material(
            color: current == value ? c.tints[0].fill : c.fill,
            borderRadius: BorderRadius.circular(BaghRadius.tile),
            child: InkWell(
              borderRadius: BorderRadius.circular(BaghRadius.tile),
              onTap: () => _set(() => on(value)),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  spacing: 10,
                  children: [
                    Icon(
                      current == value
                          ? Icons.radio_button_checked_rounded
                          : Icons.radio_button_off_rounded,
                      color: current == value ? c.tints[0].ink : c.ink2,
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: text.titleSmall),
                          if (hint != null) Text(hint, style: text.bodySmall),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );

    final body = switch (name) {
      'basics' => [
        TextFormField(
          key: const ValueKey('title'),
          initialValue: d.title,
          maxLength: 160,
          textDirection: textDirectionOf(d.title, Directionality.of(context)),
          onChanged: (v) => _set(() => d.title = v),
          decoration: InputDecoration(
            labelText: w.titleLabel,
            helperText: w.titleHint,
            helperMaxLines: 3,
            counterText: '',
          ),
        ),
        OutlinedButton.icon(
          icon: const Icon(Icons.arrow_drop_down_rounded),
          label: Align(
            alignment: AlignmentDirectional.centerStart,
            child: Text(
              categories
                      .where((cat) => cat.id == d.workCategoryId)
                      .firstOrNull
                      ?.label(language) ??
                  w.chooseCategory,
            ),
          ),
          onPressed: () async {
            final picked = await pickFromList(
              context,
              title: w.categoryLabel,
              all: w.chooseCategory,
              searchable: true,
              options: workCategoryOptions(categories, language),
            );
            FocusManager.instance.primaryFocus?.unfocus();
            if (picked != null) _set(() => d.workCategoryId = picked);
          },
        ),
        TextFormField(
          key: const ValueKey('skills'),
          initialValue: d.skills,
          onChanged: (v) => _set(() => d.skills = v),
          decoration: InputDecoration(
            labelText: w.skillsLabel,
            helperText: w.skillsHint,
            helperMaxLines: 3,
            hintText: 'React, Node.js, Figma',
          ),
        ),
      ],
      'scope' => [
        cards(
          w.experienceLabel,
          [
            for (final e in experienceLevels)
              (e, w.experience.label(e), w.experienceHint.label(e)),
          ],
          d.experienceLevel,
          (v) => d.experienceLevel = v,
        ),
        cards(
          w.durationLabel,
          [for (final v in projectDurations) (v, w.durations.label(v), null)],
          d.duration,
          (v) => d.duration = v,
        ),
        Row(
          children: [
            Expanded(
              child: Text(w.freelancersNeededLabel, style: text.labelLarge),
            ),
            IconButton(
              tooltip: '−',
              icon: const Icon(Icons.remove_circle_outline_rounded),
              onPressed: d.freelancersNeeded > 1
                  ? () => _set(() => d.freelancersNeeded--)
                  : null,
            ),
            Text(n(d.freelancersNeeded), style: text.titleMedium),
            IconButton(
              tooltip: '+',
              icon: const Icon(Icons.add_circle_outline_rounded),
              onPressed: d.freelancersNeeded < 50
                  ? () => _set(() => d.freelancersNeeded++)
                  : null,
            ),
          ],
        ),
        toggle(
          w.contractToHireLabel,
          d.contractToHire,
          (v) => d.contractToHire = v,
        ),
      ],
      'budget' => [
        cards(
          w.pricingLabel,
          [
            for (final p in const ['FIXED', 'HOURLY'])
              (p, w.pricing.label(p), null),
          ],
          d.pricingType,
          (v) => d.pricingType = v,
        ),
        Text(
          d.hourly ? w.budgetHourlyLabel : w.budgetFixedLabel,
          style: text.labelLarge,
        ),
        Row(
          spacing: 8,
          children: [
            for (final (key, hint, value) in [
              ('budgetMin', w.budgetMinLabel, d.budgetMin),
              ('budgetMax', w.budgetMaxLabel, d.budgetMax),
            ])
              Expanded(
                child: TextFormField(
                  key: ValueKey(key),
                  initialValue: groupThousands(value),
                  enabled: !d.budgetUnknown,
                  keyboardType: TextInputType.number,
                  textDirection: TextDirection.ltr,
                  inputFormatters: [...digits, const ThousandsFormatter()],
                  onChanged: (v) => _set(
                    () => key == 'budgetMin'
                        ? d.budgetMin = plainDigits(v)
                        : d.budgetMax = plainDigits(v),
                  ),
                  decoration: InputDecoration(labelText: hint),
                ),
              ),
          ],
        ),
        OutlinedButton.icon(
          icon: const Icon(Icons.arrow_drop_down_rounded),
          label: Align(
            alignment: AlignmentDirectional.centerStart,
            child: Text(geo.currency(d.currency, s.market.currency)),
          ),
          onPressed: d.budgetUnknown
              ? null
              : () async {
                  final picked = await pickFromList(
                    context,
                    title: w.currencyLabel,
                    all: geo.currency('IRT', s.market.currency),
                    searchable: true,
                    options: [
                      for (final code in currencyCodes)
                        (code, geo.currency(code, s.market.currency)),
                    ],
                  );
                  FocusManager.instance.primaryFocus?.unfocus();
                  if (picked != null) {
                    _set(() => d.currency = picked.isEmpty ? 'IRT' : picked);
                  }
                },
        ),
        toggle(
          w.budgetUnknownLabel,
          d.budgetUnknown,
          (v) => d.budgetUnknown = v,
        ),
        if (d.hourly)
          cards(
            w.weeklyHoursLabel,
            [
              for (final h in weeklyHoursOptions)
                (h, w.weeklyHours.label(h), null),
            ],
            d.weeklyHours,
            (v) => d.weeklyHours = v,
          ),
      ],
      'details' => [
        TextFormField(
          key: const ValueKey('description'),
          initialValue: d.description,
          minLines: 8,
          maxLines: 20,
          maxLength: 10000,
          keyboardType: TextInputType.multiline,
          textDirection: textDirectionOf(
            d.description,
            Directionality.of(context),
          ),
          onChanged: (v) => _set(() => d.description = v),
          decoration: InputDecoration(
            labelText: w.descriptionLabel,
            helperText:
                '${w.descriptionHint} ${n(d.description.trim().length)} / ${n(10000)}',
            helperMaxLines: 3,
            alignLabelWithHint: true,
            counterText: '',
          ),
        ),
        SoftSurface(
          tint: c.tints[2],
          elevated: false,
          padding: const EdgeInsets.all(12),
          child: Text(
            w.descriptionTips,
            style: text.bodySmall?.copyWith(color: c.tints[2].ink),
          ),
        ),
        if (_savedId == null)
          AttachmentsField(
            files: _files,
            onChanged: (f) => _set(() => _files = f),
            maxFiles: maxProjectFiles,
            chooseLabel: w.attachmentsLabel,
            rulesText: s.join.fileRules,
            removeLabel: s.join.removeFile,
            tooManyText: s.join.errFileBig,
            tooBigText: s.join.errFileBig,
            totalTooBigText: s.join.errFileBig,
            language: language,
          ),
        DateField(
          label: w.deliverByLabel,
          value: d.deliverBy,
          firstDate: DateTime.now(),
          onChanged: (v) => _set(() => d.deliverBy = v),
        ),
        DateField(
          label: w.closesAtLabel,
          value: d.closesAt,
          firstDate: DateTime.now().add(const Duration(days: 1)),
          onChanged: (v) => _set(() => d.closesAt = v),
        ),
        Text(w.questionsLabel, style: text.labelLarge),
        Text(w.questionsHint, style: text.bodySmall?.copyWith(color: c.ink2)),
        for (final (i, q) in d.screeningQuestions.indexed)
          Row(
            key: ObjectKey((i, d.screeningQuestions.length)),
            spacing: 8,
            children: [
              Expanded(
                child: TextFormField(
                  initialValue: q,
                  maxLength: 300,
                  onChanged: (v) => d.screeningQuestions[i] = v,
                  decoration: InputDecoration(
                    hintText: w.questionPlaceholder,
                    counterText: '',
                  ),
                ),
              ),
              IconButton(
                tooltip: s.common.delete,
                icon: const Icon(Icons.delete_outline_rounded),
                onPressed: () => _set(
                  () =>
                      d.screeningQuestions = [...d.screeningQuestions]
                        ..removeAt(i),
                ),
              ),
            ],
          ),
        if (d.screeningQuestions.length < maxScreeningQuestions)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              icon: const Icon(Icons.add_rounded),
              label: Text(w.addQuestion),
              onPressed: () => _set(
                () => d.screeningQuestions = [...d.screeningQuestions, ''],
              ),
            ),
          ),
      ],
      'options' => [
        cards(
          w.visibilityLabel,
          [
            for (final v in const ['PUBLIC', 'SIGNED_IN', 'INVITE_ONLY'])
              (v, w.visibility.label(v), w.visibilityHint.label(v)),
          ],
          d.visibility,
          (v) => d.visibility = v,
        ),
        toggle(
          w.sealedLabel,
          d.sealed,
          (v) => d.sealed = v,
          hint: w.sealedHint,
        ),
        toggle(w.ndaLabel, d.nda, (v) => d.nda = v, hint: w.ndaLabelHint),
        toggle(
          w.urgentLabel,
          d.urgent,
          (v) => d.urgent = v,
          hint: w.urgentHint,
        ),
        toggle(
          w.companyOfferLabel,
          d.openToCompanyOffer,
          (v) => d.openToCompanyOffer = v,
        ),
        Text(w.locationLabel, style: text.labelLarge),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final (onsite, label) in [
              (false, w.remoteWork),
              (true, w.onsiteWork),
            ])
              ChoiceChip(
                label: Text(label),
                selected: d.onsite == onsite,
                onSelected: (_) => _set(() => d.onsite = onsite),
              ),
          ],
        ),
        if (d.onsite) ...[
          OutlinedButton.icon(
            icon: const Icon(Icons.arrow_drop_down_rounded),
            label: Align(
              alignment: AlignmentDirectional.centerStart,
              child: Text(geo.country(d.country)),
            ),
            onPressed: () async {
              final picked = await pickFromList(
                context,
                title: s.jobs.country,
                all: '—',
                searchable: true,
                options: geo.countryOptions(),
              );
              FocusManager.instance.primaryFocus?.unfocus();
              if (picked != null && picked.isNotEmpty) {
                _set(() {
                  d.country = picked;
                  d.province = '';
                });
              }
            },
          ),
          if (d.country == homeCountry)
            OutlinedButton.icon(
              icon: const Icon(Icons.arrow_drop_down_rounded),
              label: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(
                  d.province.isEmpty
                      ? s.jobs.allProvinces
                      : displayProvince(d.province, language),
                ),
              ),
              onPressed: () async {
                final picked = await pickFromList(
                  context,
                  title: s.market.province,
                  all: s.jobs.allProvinces,
                  searchable: true,
                  options: [
                    for (final p in iranProvinces)
                      (p.fa, provinceLabel(p, language)),
                  ],
                );
                FocusManager.instance.primaryFocus?.unfocus();
                if (picked != null) _set(() => d.province = picked);
              },
            )
          else
            TextFormField(
              key: ValueKey('region-${d.country}'),
              initialValue: d.province,
              onChanged: (v) => d.province = v,
              decoration: InputDecoration(labelText: s.market.province),
            ),
          TextFormField(
            key: const ValueKey('city'),
            initialValue: d.city,
            onChanged: (v) => d.city = v,
            decoration: InputDecoration(labelText: s.market.city),
          ),
        ],
        Text(w.countriesLabel, style: text.labelLarge),
        Text(w.countriesHint, style: text.bodySmall?.copyWith(color: c.ink2)),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final code in d.preferredCountries)
              InputChip(
                label: Text(geo.country(code)),
                onDeleted: () => _set(
                  () => d.preferredCountries = [
                    for (final x in d.preferredCountries)
                      if (x != code) x,
                  ],
                ),
              ),
            ActionChip(
              avatar: const Icon(Icons.add_rounded, size: 18),
              label: Text(s.jobs.country),
              onPressed: () async {
                final picked = await pickFromList(
                  context,
                  title: w.countriesLabel,
                  all: '—',
                  searchable: true,
                  options: geo.countryOptions(),
                );
                FocusManager.instance.primaryFocus?.unfocus();
                if (picked != null && picked.isNotEmpty) {
                  _set(
                    () => d.preferredCountries = {
                      ...d.preferredCountries,
                      picked,
                    }.toList(),
                  );
                }
              },
            ),
          ],
        ),
        Text(w.workLanguagesLabel, style: text.labelLarge),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final code in workLanguages)
              FilterChip(
                label: Text(geo.language(code)),
                selected: d.languages.contains(code),
                onSelected: (on) => _set(
                  () => d.languages = on
                      ? [...d.languages, code]
                      : [
                          for (final x in d.languages)
                            if (x != code) x,
                        ],
                ),
              ),
          ],
        ),
      ],
      _ => [
        Text(w.reviewSummary, style: text.bodyMedium?.copyWith(color: c.ink2)),
        for (final MapEntry(key: step, value: problem) in problems.entries)
          TextButton.icon(
            style: TextButton.styleFrom(foregroundColor: c.error),
            icon: const Icon(Icons.error_outline_rounded),
            label: Align(
              alignment: AlignmentDirectional.centerStart,
              child: Text(_problemText(problem, s)),
            ),
            onPressed: () => _set(() => _step = projectSteps.indexOf(step)),
          ),
        ProjectCard(
          project: ProjectSummary.fromJson({
            'id': 'preview',
            'code': '',
            ...d.toPayload(),
            'excerpt': d.nda
                ? null
                : d.description.substring(
                    0,
                    d.description.length < 320 ? d.description.length : 320,
                  ),
            'workCategory': null,
            'budgetMin': plainDigits(d.budgetMin),
            'budgetMax': plainDigits(d.budgetMax),
            'publishedAt': DateTime.now().toIso8601String(),
            'closesAt': d.closesAt?.toIso8601String(),
            '_count': {'bids': 0},
          }),
        ),
        if (_sending && _progress != null)
          LinearProgressIndicator(
            value: _progress,
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
      ],
    };

    return LeaveGuard(
      isDirty: () => _snapshot() != _start,
      busy: _sending,
      stepBack: () {
        if (_step == 0) return false;
        setState(() => _step--);
        return true;
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            widget.project == null ? w.wizardTitle : w.editProjectTitle,
          ),
          actions: const [HelpAction('client-projects')],
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: BaghSpace.gutter,
              children: [
                Text(
                  '${w.stepOf.fill({'step': n(_step + 1), 'total': n(projectSteps.length)})}${factSep(language)}${stepLabels[name]}',
                  style: text.labelLarge?.copyWith(color: c.ink2),
                ),
                LinearProgressIndicator(
                  value: (_step + 1) / projectSteps.length,
                  minHeight: 6,
                  borderRadius: BorderRadius.circular(3),
                ),
                SoftSurface(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 14,
                    children: body,
                  ),
                ),
                if (_error case final e?) FormMessage(e),
                StepKeys(
                  backLabel: _step == 0 ? s.common.cancel : s.common.previous,
                  onBack: _sending
                      ? null
                      : () => _step == 0
                            ? Navigator.of(context).maybePop()
                            : setState(() => _step--),
                  forward: last
                      ? BaghKey(
                          label: w.submitForReview,
                          icon: Icons.send_rounded,
                          loading: _sending,
                          onPressed: problems.isEmpty
                              ? () => _save(submit: true)
                              : null,
                        )
                      : BaghKey(
                          label: s.common.next,
                          icon: Icons.arrow_forward_rounded,
                          onPressed: () => setState(() => _step++),
                        ),
                ),
                if (d.savable)
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: TextButton.icon(
                      icon: const Icon(Icons.save_outlined),
                      label: Text(w.saveDraft),
                      onPressed: _sending ? null : () => _save(submit: false),
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
