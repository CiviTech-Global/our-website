import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_user.dart';
import '../../core/auth/session.dart';
import '../../core/capabilities.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import 'workspace_data.dart';

/// The member home's panels, one per part a member plays, as the web's
/// DashboardPage and WorkspacePanels: what needs doing first, then a panel
/// for each part they play, then the parts they do not play yet offered
/// together, and what happened lately. A panel for a part nobody plays is a
/// reminder of a thing they did not ask to do, so it is not shown.
///
/// Figures open the screen they count. Most of those are the job board,
/// freelance work and books, which arrive in the app in later phases; until
/// then they open on the website.
class WorkspacePanels extends ConsumerWidget {
  const WorkspacePanels({
    required this.user,
    required this.workspace,
    super.key,
  });

  final AuthUser user;
  final Workspace workspace;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.workspace;
    final d = workspace;
    final caps = ref.watch(capabilitiesProvider).value;
    final canEmail = caps?.email ?? false;
    // The second-generation job board counts new applicants and interviews.
    final jobsV2 = caps?.feature('jobsV2') ?? false;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: BaghSpace.gutter,
      children: [
        _NextSteps(user: user, workspace: d, canEmail: canEmail),
        if (d.hiringPostings > 0)
          _Panel(
            title: w.hiringTitle,
            viewAll: '/dashboard/jobs',
            figures: [
              (w.openPostings, d.hiringOpen, '/dashboard/jobs', false),
              (w.applicants, d.hiringApplicants, '/dashboard/jobs', false),
              if (jobsV2)
                (w.newApplicants, d.hiringUnseen, '/dashboard/jobs', true),
              (
                w.shortlisted,
                d.hiringByOutcome['SHORTLISTED'] ?? 0,
                '/dashboard/jobs',
                false,
              ),
              if (jobsV2)
                (
                  w.interviews,
                  d.hiringByOutcome['INTERVIEW'] ?? 0,
                  '/dashboard/jobs',
                  false,
                ),
            ].take(4).toList(),
          ),
        if (d.jobApplications > 0 || d.savedJobs > 0 || d.activeAlerts > 0)
          _Panel(
            title: w.jobSearchTitle,
            viewAll: '/dashboard/applications',
            figures: jobsV2
                ? [
                    (
                      w.applications,
                      d.jobApplications,
                      '/dashboard/applications',
                      false,
                    ),
                    (
                      w.interviewing,
                      d.jobByOutcome['INTERVIEW'] ?? 0,
                      '/dashboard/applications',
                      false,
                    ),
                    (w.savedJobs, d.savedJobs, '/dashboard/saved-jobs', false),
                    (
                      w.activeAlerts,
                      d.activeAlerts,
                      '/dashboard/job-alerts',
                      false,
                    ),
                  ]
                : [
                    (
                      w.applications,
                      d.jobApplications,
                      '/dashboard/applications',
                      false,
                    ),
                    (
                      w.underReview,
                      (d.jobByOutcome['PENDING'] ?? 0) +
                          (d.jobByOutcome['SHORTLISTED'] ?? 0),
                      '/dashboard/applications',
                      false,
                    ),
                    (
                      w.accepted,
                      d.jobByOutcome['ACCEPTED'] ?? 0,
                      '/dashboard/applications',
                      false,
                    ),
                  ],
          ),
        if (d.clientProjects > 0)
          _Panel(
            title: w.clientTitle,
            viewAll: '/dashboard/projects',
            figures: [
              (w.openProjects, d.clientOpen, '/dashboard/projects', false),
              (w.bidsAwaiting, d.bidsAwaiting, '/dashboard/projects', true),
              (
                w.inReview,
                d.clientByStatus['PENDING_REVIEW'] ?? 0,
                '/dashboard/projects',
                false,
              ),
            ],
          ),
        if (d.freelanceBids > 0)
          _Panel(
            title: w.freelanceTitle,
            viewAll: '/dashboard/bids',
            figures: [
              (w.bidsSent, d.freelanceBids, '/dashboard/bids', false),
              (
                w.shortlisted,
                d.freelanceByOutcome['SHORTLISTED'] ?? 0,
                '/dashboard/bids',
                false,
              ),
              (
                w.accepted,
                d.freelanceByOutcome['ACCEPTED'] ?? 0,
                '/dashboard/bids',
                false,
              ),
              (
                w.activeLabel,
                d.collaborationsActive,
                '/dashboard/awards',
                false,
              ),
            ],
          ),
        if (d.books > 0)
          _Panel(
            title: w.sellingTitle,
            viewAll: '/dashboard/books',
            figures: [
              (
                w.booksListed,
                d.booksByStatus['APPROVED'] ?? 0,
                '/dashboard/books',
                false,
              ),
              (
                w.inReview,
                d.booksByStatus['PENDING_REVIEW'] ?? 0,
                '/dashboard/books',
                false,
              ),
            ],
          ),
        _GetStarted(workspace: d),
        _Activity(workspace: d),
      ],
    );
  }
}

/// A titled soft card.
class _Card extends StatelessWidget {
  const _Card({required this.title, required this.child, this.trailing});

  final String title;
  final Widget? trailing;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return SoftSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              Text(title, style: text.titleMedium),
              ?trailing,
            ],
          ),
          child,
        ],
      ),
    );
  }
}

/// "View all", for a panel whose list lives on another screen.
class _ViewAll extends ConsumerWidget {
  const _ViewAll(this.href);

  final String href;

  @override
  Widget build(BuildContext context, WidgetRef ref) => TextButton(
    onPressed: () => openLink(context, ref, href),
    child: Text(ref.watch(stringsProvider).workspace.viewAll),
  );
}

/// A part the member plays: its figures, each opening what it counts.
class _Panel extends ConsumerWidget {
  const _Panel({
    required this.title,
    required this.viewAll,
    required this.figures,
  });

  final String title;
  final String viewAll;

  /// Label, value, where it opens, and whether a non-zero value is waiting
  /// on the member.
  final List<(String, int, String, bool)> figures;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return _Card(
      title: title,
      trailing: _ViewAll(viewAll),
      child: LayoutBuilder(
        builder: (context, box) {
          final columns = box.maxWidth > 480 ? 4 : 2;
          final width = (box.maxWidth - 8 * (columns - 1)) / columns;
          return Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final (label, value, href, attention) in figures)
                SizedBox(
                  width: width,
                  child: SoftSurface(
                    elevated: false,
                    radius: BaghRadius.tile,
                    tint: attention && value > 0 ? c.tints[1] : c.tints[2],
                    padding: const EdgeInsets.all(12),
                    semanticLabel: '$label: $value',
                    onTap: () => openLink(context, ref, href),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 2,
                      children: [
                        Text(
                          localDigits(value, language),
                          style: BaghType.weight(text.headlineSmall!, 800)
                              .copyWith(
                                color:
                                    (attention && value > 0
                                            ? c.tints[1]
                                            : c.tints[2])
                                        .ink,
                              ),
                        ),
                        Text(
                          label,
                          style: text.labelMedium?.copyWith(
                            color:
                                (attention && value > 0
                                        ? c.tints[1]
                                        : c.tints[2])
                                    .ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

enum _Step { done, pending, todo }

/// One thing to do next: a label, and where to do it or what does it.
typedef _Next = ({IconData icon, String label, String? href, bool email});

/// "Your next steps", as the web's NextStepsPanel: what is waiting on them
/// first, then what is left of setting the account up, in one list. The
/// first step is set apart with its own button, so somebody who opens the
/// app not knowing where to start is told. Resending the verification email
/// happens right here, where the step is.
class _NextSteps extends ConsumerStatefulWidget {
  const _NextSteps({
    required this.user,
    required this.workspace,
    required this.canEmail,
  });

  final AuthUser user;
  final Workspace workspace;
  final bool canEmail;

  @override
  ConsumerState<_NextSteps> createState() => _NextStepsState();
}

class _NextStepsState extends ConsumerState<_NextSteps> {
  bool _sending = false;

  Future<void> _sendEmail() async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _sending = true);
    try {
      await ref.read(accountRecoveryProvider).sendVerificationEmail();
      messenger.showSnackBar(SnackBar(content: Text(s.auth.verifyBannerSent)));
    } catch (e) {
      // The server explains a refusal (no mail service, too soon) itself.
      messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _go(_Next item) {
    if (item.email) {
      _sendEmail();
    } else if (item.href != null) {
      openLink(context, ref, item.href!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.workspace;
    final n = s.dashNav;
    final d = widget.workspace;
    final user = widget.user;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    String num(int v) => localDigits(v, language);
    final forward = Directionality.of(context) == TextDirection.rtl
        ? Icons.chevron_left_rounded
        : Icons.chevron_right_rounded;

    final setup = <(String, _Step, String?, bool)>[
      (
        s.app.setupPhone,
        (user.phone ?? '').isNotEmpty ? _Step.done : _Step.todo,
        '/dashboard/profile',
        false,
      ),
      if (widget.canEmail)
        (
          s.app.setupEmail,
          user.emailVerified ? _Step.done : _Step.todo,
          null,
          true,
        ),
      (
        s.app.setupIdentity,
        switch (d.verification) {
          'APPROVED' => _Step.done,
          'PENDING' => _Step.pending,
          _ => _Step.todo,
        },
        '/dashboard/verification',
        false,
      ),
    ];
    final changes = d.changesRequested;
    final items = <_Next>[
      if (d.unreadMessages > 0)
        (
          icon: Icons.forum_outlined,
          label: w.attentionMessages.fill({'count': num(d.unreadMessages)}),
          href: '/dashboard/messages',
          email: false,
        ),
      if (d.hiringUnseen > 0)
        (
          icon: Icons.group_outlined,
          label: w.attentionApplicants.fill({'count': num(d.hiringUnseen)}),
          href: '/dashboard/jobs',
          email: false,
        ),
      if (d.bidsAwaiting > 0)
        (
          icon: Icons.gavel_rounded,
          label: w.attentionBids.fill({'count': num(d.bidsAwaiting)}),
          href: '/dashboard/projects',
          email: false,
        ),
      if (changes > 0)
        (
          icon: Icons.error_outline_rounded,
          label: w.attentionChanges.fill({'count': num(changes)}),
          href: (d.hiringByStatus['CHANGES_REQUESTED'] ?? 0) > 0
              ? '/dashboard/jobs'
              : (d.clientByStatus['CHANGES_REQUESTED'] ?? 0) > 0
              ? '/dashboard/projects'
              : '/dashboard/books',
          email: false,
        ),
      for (final (label, state, href, email) in setup)
        if (state == _Step.todo)
          (
            icon: email
                ? Icons.mark_email_unread_outlined
                : Icons.verified_user_outlined,
            label: label,
            href: href,
            email: email,
          ),
    ];
    final pending = [
      for (final (label, state, _, _) in setup)
        if (state == _Step.pending) label,
    ];
    final done = setup.where((x) => x.$2 == _Step.done).length;

    return _Card(
      title: n.nextTitle,
      trailing: done < setup.length
          ? Text(
              n.nextProgress.fill({
                'done': num(done),
                'total': num(setup.length),
              }),
              style: text.labelMedium?.copyWith(color: c.ink2),
            )
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 4,
        children: [
          if (items.isEmpty && pending.isEmpty)
            Text(w.allClear, style: text.bodyMedium?.copyWith(color: c.ink2)),
          if (items.isNotEmpty)
            SoftSurface(
              tint: c.primarySoft,
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 10,
                children: [
                  Row(
                    spacing: 10,
                    children: [
                      Icon(items.first.icon, color: c.primarySoft.ink),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              n.nextFirst,
                              style: text.labelMedium?.copyWith(
                                color: c.primarySoft.ink,
                              ),
                            ),
                            Text(items.first.label, style: text.titleSmall),
                          ],
                        ),
                      ),
                    ],
                  ),
                  Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: BaghKey(
                      label: items.first.email
                          ? s.auth.verifyBannerAction
                          : n.nextGo,
                      loading: items.first.email && _sending,
                      onPressed: () => _go(items.first),
                    ),
                  ),
                ],
              ),
            ),
          for (final item in items.skip(1))
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(item.icon, color: c.tints[1].ink),
              title: Text(item.label),
              trailing: item.email && _sending
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(forward),
              onTap: () => _go(item),
            ),
          for (final label in pending)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.schedule_rounded, color: c.tints[1].ink),
              title: Text(
                label,
                style: text.bodyMedium?.copyWith(color: c.ink2),
              ),
              trailing: Text(
                s.app.setupPending,
                style: text.labelMedium?.copyWith(color: c.tints[1].ink),
              ),
            ),
        ],
      ),
    );
  }
}

/// The parts this member does not play yet, offered once, together.
class _GetStarted extends ConsumerWidget {
  const _GetStarted({required this.workspace});

  final Workspace workspace;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final w = ref.watch(stringsProvider).workspace;
    final d = workspace;
    final offers = <(bool, IconData, String, String, String)>[
      (
        d.hiringPostings == 0,
        Icons.work_outline_rounded,
        w.startHiring,
        w.startHiringBody,
        '/dashboard/jobs',
      ),
      (
        d.jobApplications == 0 && d.savedJobs == 0,
        Icons.description_outlined,
        w.startJobSearch,
        w.startJobSearchBody,
        '/jobs',
      ),
      (
        d.freelanceBids == 0,
        Icons.gavel_rounded,
        w.startFreelance,
        w.startFreelanceBody,
        '/projects',
      ),
      (
        d.clientProjects == 0,
        Icons.folder_outlined,
        w.startClient,
        w.startClientBody,
        '/dashboard/projects',
      ),
      (
        d.books == 0,
        Icons.menu_book_outlined,
        w.startSelling,
        w.startSellingBody,
        '/dashboard/books',
      ),
    ].where((o) => o.$1).toList();
    if (offers.isEmpty) return const SizedBox.shrink();
    return _Card(
      title: w.getStartedTitle,
      child: Column(
        children: [
          for (final (_, icon, title, body, href) in offers)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(icon),
              title: Text(title),
              subtitle: Text(body),
              onTap: () => openLink(context, ref, href),
            ),
        ],
      ),
    );
  }
}

/// What happened lately: the newest notifications.
class _Activity extends ConsumerWidget {
  const _Activity({required this.workspace});

  final Workspace workspace;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final w = ref.watch(stringsProvider).workspace;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return _Card(
      title: w.activityTitle,
      trailing: const _ViewAll('/dashboard/notifications'),
      child: workspace.recent.isEmpty
          ? Text(w.noActivity, style: text.bodyMedium?.copyWith(color: c.ink2))
          : Column(
              children: [
                for (final item in workspace.recent)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    // The dot keeps its place on read rows too, so every title lines up.
                    leading: Icon(
                      Icons.circle,
                      size: 10,
                      color: item.read ? Colors.transparent : c.primary,
                    ),
                    minLeadingWidth: 10,
                    title: Text(item.title),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (item.createdAt case final at?)
                          Text(
                            formatDate(at, language),
                            style: text.labelSmall?.copyWith(color: c.ink2),
                          ),
                      ],
                    ),
                    onTap: item.link == null
                        ? null
                        : () => openLink(context, ref, item.link!),
                  ),
              ],
            ),
    );
  }
}
