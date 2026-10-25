import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../core/config.dart';
import '../../core/files.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/attachments_field.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../jobs/jobs_format.dart' show daysUntil, postedAgo;
import 'freelance_data.dart';
import 'freelance_ui.dart';

/// One project, second generation, as the web's ProjectPage: the brief and
/// its terms, the one thing to do next, the proposal form beside its price
/// guide, and the two trust panels (about the client, activity).
class ProjectScreen extends ConsumerWidget {
  const ProjectScreen({required this.code, super.key});

  final String code;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final project = ref.watch(projectProvider(code));
    final signedIn = ref.watch(sessionProvider).value != null;
    return Scaffold(
      appBar: AppBar(
        title: Text(s.work.boardTitle),
        actions: [
          IconButton(
            tooltip: s.work.share,
            icon: const Icon(Icons.link_rounded),
            onPressed: () async {
              final url = AppConfig.website(
                '/projects/$code',
                ref.read(l10nProvider).language,
              ).toString();
              await Clipboard.setData(ClipboardData(text: url));
              if (context.mounted) {
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text(s.work.linkCopied)));
              }
            },
          ),
          const HelpAction('project-detail'),
        ],
      ),
      // Gone is not the same as unreachable: only a 404 says so. A
      // members-only brief answers 404 to the public read, so a visitor is
      // offered the sign-in that may open it.
      body: project.hasError && ApiException.from(project.error!).status == 404
          ? EmptyNote(
              message: s.errors.notFoundBody,
              action: signedIn
                  ? (s.work.boardTitle, () => context.go('/projects'))
                  : (
                      s.nav.login,
                      () => context.push(
                        Uri(
                          path: '/login',
                          queryParameters: {'from': '/projects/$code'},
                        ).toString(),
                      ),
                    ),
            )
          : AsyncView(
              value: project,
              onRetry: () => ref.invalidate(projectProvider(code)),
              data: _Body.new,
            ),
    );
  }
}

class _Body extends ConsumerStatefulWidget {
  const _Body(this.p);

  final ProjectDetail p;

  @override
  ConsumerState<_Body> createState() => _BodyState();
}

class _BodyState extends ConsumerState<_Body> {
  final _brief = GlobalKey();
  final _proposal = GlobalKey();

  /// Where the web's #brief and #proposal anchors jump.
  void _reveal(GlobalKey key) {
    final target = key.currentContext;
    if (target == null) return;
    Scrollable.ensureVisible(
      target,
      duration: const Duration(milliseconds: 300),
      alignment: 0.05,
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.p;
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final viewer = p.viewer;
    final left = daysUntil(p.closesAt);
    final closed = p.closesAt != null && !p.closesAt!.isAfter(DateTime.now());
    final matched = {
      for (final m in viewer?.matched ?? const <String>[]) m.toLowerCase(),
    };
    String n(int v) => localDigits(v, language);
    final direction = Directionality.of(context);

    Widget section(String title, List<Widget> children, {Key? key}) =>
        SoftSurface(
          key: key,
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 10,
            children: [
              Text(title, style: text.titleMedium),
              ...children,
            ],
          ),
        );

    return RefreshIndicator(
      color: c.primary,
      onRefresh: () => ref.refresh(projectProvider(p.code).future),
      // Every part built at once, not a lazy list: the next-step key scrolls
      // to a form far down the page, and a form not yet built is nowhere.
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: BaghLayout.readablePadding(
          context,
          top: BaghSpace.gutter,
          bottom: BaghSpace.section * 2,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SoftSurface(
              padding: const EdgeInsets.fromLTRB(18, 14, 8, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 8,
                children: [
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      if (p.urgent) StatusPill(w.urgent, tone: 3),
                      if (p.featured) StatusPill(w.featured, tone: 1),
                      if (p.nda) StatusPill(w.nda, tone: 4),
                      if (p.contractToHire)
                        StatusPill(w.contractToHire, tone: 0),
                      if (p.visibility != 'PUBLIC')
                        StatusPill(w.visibility.label(p.visibility), tone: 2),
                    ],
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          p.title,
                          textDirection: textDirectionOf(p.title, direction),
                          style: text.headlineSmall,
                        ),
                      ),
                      SaveProjectButton(projectId: p.id),
                    ],
                  ),
                  if (p.category case final cat?)
                    Text(
                      cat.label(language),
                      style: text.bodySmall?.copyWith(color: c.ink2),
                    ),
                  Text(
                    budgetText(p, s, language),
                    style: text.titleMedium?.copyWith(color: c.primary),
                  ),
                  FactLine([
                    if (p.publishedAt case final at?)
                      (
                        Icons.schedule_rounded,
                        w.postedAgo.fill({'ago': postedAgo(at, s, language)}),
                      ),
                    if (p.closesAt != null)
                      (
                        Icons.hourglass_bottom_rounded,
                        closed
                            ? w.closed
                            : left == 0
                            ? w.closesToday
                            : w.closesIn.fill({'days': n(left ?? 0)}),
                      ),
                    (
                      Icons.visibility_outlined,
                      w.views.fill({'count': n(p.viewCount)}),
                    ),
                    (Icons.tag_rounded, p.code),
                  ]),
                ],
              ),
            ),
            const SizedBox(height: BaghSpace.gutter),
            _ActionBox(
              p,
              onProposal: () => _reveal(_proposal),
              onBrief: () => _reveal(_brief),
            ),
            const SizedBox(height: BaghSpace.gutter),
            SoftSurface(padding: const EdgeInsets.all(18), child: _Terms(p)),
            const SizedBox(height: BaghSpace.gutter),
            section(key: _brief, s.market.description, [
              if (p.description.isNotEmpty)
                SelectableText(
                  p.description,
                  textDirection: textDirectionOf(p.description, direction),
                  style: text.bodyLarge?.copyWith(color: c.ink2),
                )
              else
                _NdaGate(p),
              if (p.attachmentCount > 0) _Attachments(p),
            ]),
            if (p.skills.isNotEmpty) ...[
              const SizedBox(height: BaghSpace.gutter),
              section(w.skillsRequired, [
                if (viewer != null &&
                    viewer.matched.isNotEmpty &&
                    !viewer.isAuthor)
                  FactLine([
                    (
                      Icons.check_circle_outline_rounded,
                      w.yourMatch.fill({
                        'matched': n(viewer.matched.length),
                        'total': n(viewer.matchTotal),
                      }),
                    ),
                  ]),
                SkillChips(p.skills, matched: matched),
              ]),
            ],
            if (p.screeningQuestions.isNotEmpty) ...[
              const SizedBox(height: BaghSpace.gutter),
              section(w.screeningQuestions, [
                for (final (i, q) in p.screeningQuestions.indexed)
                  Text('${n(i + 1)}. $q', style: text.bodyMedium),
              ]),
            ],
            if (viewer != null &&
                !viewer.isAuthor &&
                viewer.briefOpen &&
                (viewer.canBid || viewer.myBid != null)) ...[
              const SizedBox(height: BaghSpace.gutter),
              KeyedSubtree(
                key: _proposal,
                // Rebuilt once a proposal exists: it was made before, and kept
                // offering to send a second one.
                child: _ProposalForm(p, key: ValueKey(p.viewer?.myBid?.id)),
              ),
            ],
            if (p.client case final client?) ...[
              const SizedBox(height: BaghSpace.gutter),
              _ClientPanel(client, companyName: p.companyName),
            ],
            if (p.activity case final activity?) ...[
              const SizedBox(height: BaghSpace.gutter),
              _ActivityPanel(activity, currency: p.currency),
            ],
            if (p.similar.isNotEmpty) ...[
              const SizedBox(height: BaghSpace.section),
              Text(w.similarProjects, style: text.titleMedium),
              const SizedBox(height: 10),
              for (final item in p.similar)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: SoftSurface(
                    padding: EdgeInsets.zero,
                    child: ListTile(
                      title: Text(item.title),
                      subtitle: Text(
                        '${budgetText(item, s, language)}\n'
                        '${w.proposalsCount.fill({'count': n(item.bidCount)})}',
                      ),
                      isThreeLine: true,
                      onTap: () => context.push('/projects/${item.code}'),
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Pricing, level, duration, hours, people, where, from where, languages,
/// delivery: the web's ProjectTerms.
class _Terms extends ConsumerWidget {
  const _Terms(this.p);

  final ProjectDetail p;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final rows = <(IconData, String, String)>[
      (
        Icons.account_balance_wallet_outlined,
        w.pricingLabel,
        w.pricing.label(p.pricingType),
      ),
      if (p.experienceLevel case final e?)
        (
          Icons.layers_outlined,
          w.experience.label(e),
          w.experienceHint.label(e),
        ),
      if (p.duration case final d?)
        (Icons.event_outlined, w.durationLabel, w.durations.label(d)),
      if (p.weeklyHours case final h?)
        (Icons.schedule_rounded, w.weeklyHoursLabel, w.weeklyHours.label(h)),
      if (p.freelancersNeeded > 1)
        (
          Icons.group_outlined,
          w.freelancersNeededLabel,
          localDigits(p.freelancersNeeded, language),
        ),
      (
        p.onsite ? Icons.place_outlined : Icons.public_rounded,
        w.locationLabel,
        p.onsite
            ? [
                p.city,
                p.province,
                if (p.country case final code?) geo.country(code),
              ].whereType<String>().join('، ')
            : w.remote,
      ),
      (
        Icons.send_outlined,
        w.preferredLocation,
        p.preferredCountries.isEmpty
            ? w.anywhere
            : p.preferredCountries.map(geo.country).join('، '),
      ),
      if (p.languages.isNotEmpty)
        (
          Icons.translate_rounded,
          w.languagesLabel,
          p.languages.map(geo.language).join('، '),
        ),
      if (p.deliverBy case final at?)
        (
          Icons.hourglass_bottom_rounded,
          s.market.deliverBy,
          formatDate(at.toLocal(), language),
        ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        for (final (icon, label, value) in rows)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 10,
            children: [
              Icon(icon, size: 20, color: c.ink2),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: text.labelLarge),
                    Text(
                      value,
                      style: text.bodyMedium?.copyWith(color: c.ink2),
                    ),
                  ],
                ),
              ),
            ],
          ),
      ],
    );
  }
}

/// The one thing to do next, whoever is reading.
class _ActionBox extends ConsumerWidget {
  const _ActionBox(this.p, {required this.onProposal, required this.onBrief});

  final ProjectDetail p;

  /// Down to the proposal form, or to the NDA that stands before it.
  final VoidCallback onProposal;
  final VoidCallback onBrief;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final viewer = p.viewer;

    if (viewer == null) {
      return BaghKey(
        label: w.signInToBid,
        icon: Icons.send_rounded,
        expand: true,
        onPressed: () => context.push(
          Uri(
            path: '/login',
            queryParameters: {'from': '/projects/${p.code}'},
          ).toString(),
        ),
      );
    }
    if (viewer.isAuthor) {
      return SoftSurface(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 10,
          children: [
            Text(w.ownProjectNote, style: text.bodyMedium),
            BaghKey(
              label: w.manageProposals,
              icon: Icons.forum_outlined,
              expand: true,
              onPressed: () => context.push('/dashboard/projects'),
            ),
          ],
        ),
      );
    }
    final bid = viewer.myBid;
    final tint = c.tints[0];
    return SoftSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          if (viewer.inviteStatus == 'PENDING' && bid == null)
            SoftSurface(
              tint: tint,
              elevated: false,
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 6,
                children: [
                  Text(
                    w.invitedToBid,
                    style: text.labelLarge?.copyWith(color: tint.ink),
                  ),
                  if (viewer.inviteMessage case final m?)
                    Text(m, style: text.bodyMedium?.copyWith(color: tint.ink)),
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: TextButton(
                      onPressed: () async {
                        try {
                          await ref
                              .read(freelanceActionsProvider)
                              .declineInvite(p.code, viewer.inviteId!);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(w.inviteDeclined)),
                            );
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(describeError(s, e))),
                            );
                          }
                        }
                      },
                      child: Text(w.declineInvite),
                    ),
                  ),
                ],
              ),
            ),
          if (bid != null) ...[
            Text(
              '${w.bidSentBadge}${factSep(language)}${w.bidStage.label(bid.outcome)}',
              style: text.titleSmall,
            ),
            Text(
              [
                amountText(bid.amount, bid.currency, p.hourly, s, language),
                if (bid.deliveryDays case final d?)
                  w.daysCount.fill({'count': localDigits(d, language)}),
              ].join(factSep(language)),
              style: text.bodyMedium?.copyWith(color: c.ink2),
            ),
            Text(
              bid.clientSeenAt != null ? w.seenByClient : w.notSeenYet,
              style: text.bodySmall?.copyWith(color: c.ink2),
            ),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton(
                onPressed: onProposal,
                child: Text(w.editProposal),
              ),
            ),
          ] else if (viewer.canBid)
            BaghKey(
              label: p.nda && !viewer.briefOpen ? w.ndaSign : w.sendProposal,
              icon: p.nda && !viewer.briefOpen
                  ? Icons.draw_outlined
                  : Icons.send_rounded,
              expand: true,
              onPressed: p.nda && !viewer.briefOpen ? onBrief : onProposal,
            )
          else
            Row(
              spacing: 6,
              children: [
                Icon(Icons.block_rounded, size: 18, color: c.ink2),
                Expanded(child: Text(w.biddingUnavailable)),
              ],
            ),
        ],
      ),
    );
  }
}

/// The NDA in place of the brief, with the form to sign it.
class _NdaGate extends ConsumerStatefulWidget {
  const _NdaGate(this.p);

  final ProjectDetail p;

  @override
  ConsumerState<_NdaGate> createState() => _NdaGateState();
}

class _NdaGateState extends ConsumerState<_NdaGate> {
  final _name = TextEditingController();
  bool _accepted = false;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _name.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _sign() async {
    final s = ref.read(stringsProvider);
    setState(() => _sending = true);
    try {
      await ref
          .read(freelanceActionsProvider)
          .signNda(widget.p.code, widget.p.id, _name.text);
      await ref.read(hapticsProvider).success();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(describeError(s, e))));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final viewer = widget.p.viewer;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 10,
      children: [
        Row(
          spacing: 6,
          children: [
            const Icon(Icons.lock_outline_rounded, size: 18),
            Expanded(child: Text(w.briefLocked, style: text.titleSmall)),
          ],
        ),
        if (viewer == null)
          const SizedBox.shrink()
        else if (viewer.ndaSignedAt case final at?)
          Text(w.ndaSigned.fill({'date': formatDate(at.toLocal(), language)}))
        else ...[
          Text(w.ndaTitle, style: text.titleSmall),
          Text(w.ndaBody, style: text.bodyMedium),
          TextField(
            controller: _name,
            maxLength: 120,
            decoration: InputDecoration(labelText: w.ndaSignedName),
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: _accepted,
            title: Text(w.ndaAccept, style: text.bodyMedium),
            onChanged: (v) => setState(() => _accepted = v ?? false),
          ),
          BaghKey(
            label: w.ndaSign,
            icon: Icons.draw_outlined,
            loading: _sending,
            expand: true,
            onPressed: _accepted && _name.text.trim().length >= 3
                ? _sign
                : null,
          ),
        ],
      ],
    );
  }
}

/// The brief's files: opened with the sign-in, or counted and locked.
class _Attachments extends ConsumerWidget {
  const _Attachments(this.p);

  final ProjectDetail p;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final count = localDigits(p.attachmentCount, language);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 6,
      children: [
        Text(s.market.attachments, style: text.labelLarge),
        if (p.attachments.isEmpty)
          FactLine([
            (
              Icons.lock_outline_rounded,
              w.attachmentsLocked.fill({'count': count}),
            ),
          ])
        else if (p.viewer == null)
          FactLine([
            (
              Icons.attach_file_rounded,
              '$count${factSep(language)}${w.signInToBid}',
            ),
          ])
        else
          for (final file in p.attachments)
            OutlinedButton.icon(
              icon: const Icon(Icons.attach_file_rounded),
              label: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(file.name, overflow: TextOverflow.ellipsis),
              ),
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                try {
                  final got = await ref
                      .read(apiClientProvider)
                      .download('/work/me/project-attachments/${file.id}');
                  final opened = await openDownloaded(
                    bytes: got.bytes,
                    name: file.name,
                    mimeType: got.mimeType,
                  );
                  if (!opened) {
                    messenger.showSnackBar(
                      SnackBar(content: Text(s.mobile.noFileViewer)),
                    );
                  }
                } catch (e) {
                  messenger.showSnackBar(
                    SnackBar(content: Text(describeError(s, e))),
                  );
                }
              },
            ),
      ],
    );
  }
}

/// Writing or revising a proposal: price, delivery, letter, a milestone
/// plan on fixed-price work, the client's screening questions, and the
/// price guide, which says "this looks low" while the number can change.
class _ProposalForm extends ConsumerStatefulWidget {
  const _ProposalForm(this.p, {super.key});

  final ProjectDetail p;

  @override
  ConsumerState<_ProposalForm> createState() => _ProposalFormState();
}

class _ProposalFormState extends ConsumerState<_ProposalForm> {
  final _form = GlobalKey<FormState>();
  late final MyBid? _bid = widget.p.viewer?.myBid;
  late String _amount = _bid?.amount ?? '';
  late String _days = _bid?.deliveryDays?.toString() ?? '';
  late String _message = _bid?.message ?? '';
  late bool _byMilestone = _bid?.milestones?.isNotEmpty ?? false;
  late List<ProposedMilestone> _plan =
      _bid?.milestones ?? [(title: '', amount: '', days: 7)];
  late final List<String> _answers = [
    for (final (i, _) in widget.p.screeningQuestions.indexed)
      i < (_bid?.screeningAnswers.length ?? 0) ? _bid!.screeningAnswers[i] : '',
  ];
  List<PickedFile> _file = const [];
  bool _tried = false;
  bool _sending = false;
  String? _error;

  bool get _hourly => widget.p.hourly;
  bool get _editable => _bid?.editable ?? true;

  BigInt get _planTotal => _plan.fold(
    BigInt.zero,
    (sum, m) => sum + (BigInt.tryParse(plainDigits(m.amount)) ?? BigInt.zero),
  );

  bool get _mismatch =>
      !_hourly &&
      _byMilestone &&
      plainDigits(_amount).isNotEmpty &&
      _planTotal != BigInt.parse(plainDigits(_amount));

  Future<void> _submit() async {
    final s = ref.read(stringsProvider);
    final w = s.work;
    if (!_tried) setState(() => _tried = true);
    if (!_form.currentState!.validate() || _mismatch) {
      revealFirstError(_form);
      return;
    }
    final payload = <String, Object?>{
      'amount': plainDigits(_amount),
      if (!_hourly && plainDigits(_days).isNotEmpty)
        'deliveryDays': int.parse(plainDigits(_days)),
      'message': _message.trim(),
      if (!_hourly && _byMilestone)
        'milestones': [
          for (final m in _plan)
            {
              'title': m.title.trim(),
              'amount': plainDigits(m.amount),
              'days': m.days,
            },
        ],
      if (_answers.isNotEmpty)
        'screeningAnswers': [for (final a in _answers) a.trim()],
    };
    setState(() {
      _sending = true;
      _error = null;
    });
    final actions = ref.read(freelanceActionsProvider);
    try {
      if (_bid case final bid?) {
        await actions.reviseBid(widget.p.code, bid.id, payload);
      } else {
        await actions.placeBid(
          widget.p.code,
          widget.p.id,
          payload,
          attachment: _file.firstOrNull,
        );
      }
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_bid == null ? w.proposalSent : w.proposalUpdated),
        ),
      );
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _withdraw() async {
    final s = ref.read(stringsProvider);
    final w = s.work;
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(w.withdraw),
        content: Text(w.withdrawConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(s.common.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(w.withdraw),
          ),
        ],
      ),
    );
    if (sure != true || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(freelanceActionsProvider)
          .withdrawBid(widget.p.code, _bid!.id);
      messenger.showSnackBar(SnackBar(content: Text(w.proposalWithdrawn)));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final rules = s.mobile.fieldRules;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final p = widget.p;
    final guide = ref.watch(priceGuideProvider(p.id)).value;
    final digits = [FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]'))];
    final unit = p.currency == 'IRT' ? s.market.currency : p.currency;
    String n(int v) => localDigits(v, language);
    String? required(String? v) =>
        (v ?? '').trim().isEmpty ? rules.required : null;

    return SoftSurface(
      padding: const EdgeInsets.all(18),
      child: Form(
        key: _form,
        autovalidateMode: _tried
            ? AutovalidateMode.always
            : AutovalidateMode.disabled,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 14,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _bid == null ? w.sendProposal : w.yourProposal,
                    style: text.titleMedium,
                  ),
                ),
                if (_bid case final bid?)
                  StatusPill(w.bidStage.label(bid.outcome), tone: 2),
              ],
            ),
            if (_bid?.reviewNote case final note?)
              Text(note, style: text.bodyMedium?.copyWith(color: c.error)),
            TextFormField(
              initialValue: groupThousands(_amount),
              enabled: _editable,
              keyboardType: TextInputType.number,
              textDirection: TextDirection.ltr,
              inputFormatters: [...digits, const ThousandsFormatter()],
              validator: required,
              onChanged: (v) => setState(() => _amount = plainDigits(v)),
              decoration: InputDecoration(
                labelText: _hourly ? w.bidAmountHourly : w.bidAmountFixed,
                suffixText: _hourly ? ' $unit ${w.perHour}' : ' $unit',
              ),
            ),
            if (!_hourly)
              TextFormField(
                initialValue: _days,
                enabled: _editable,
                keyboardType: TextInputType.number,
                textDirection: TextDirection.ltr,
                inputFormatters: digits,
                onChanged: (v) => _days = v,
                decoration: InputDecoration(labelText: w.deliveryDays),
              ),
            if (!_hourly) ...[
              Text(w.milestonePlan, style: text.labelLarge),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final (byMilestone, label) in [
                    (false, w.wholeProject),
                    (true, w.byMilestone),
                  ])
                    ChoiceChip(
                      label: Text(label),
                      selected: _byMilestone == byMilestone,
                      onSelected: _editable
                          ? (_) => setState(() => _byMilestone = byMilestone)
                          : null,
                    ),
                ],
              ),
              if (_byMilestone) ...[
                Text(
                  w.milestonePlanHint,
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
                for (final (i, m) in _plan.indexed)
                  Row(
                    key: ObjectKey(m),
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 8,
                    children: [
                      Expanded(
                        flex: 5,
                        child: TextFormField(
                          initialValue: m.title,
                          enabled: _editable,
                          validator: required,
                          onChanged: (v) => _plan[i] = (
                            title: v,
                            amount: _plan[i].amount,
                            days: _plan[i].days,
                          ),
                          decoration: InputDecoration(
                            labelText: '${w.milestoneTitle} ${n(i + 1)}',
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 4,
                        child: TextFormField(
                          initialValue: groupThousands(m.amount),
                          enabled: _editable,
                          keyboardType: TextInputType.number,
                          textDirection: TextDirection.ltr,
                          inputFormatters: [
                            ...digits,
                            const ThousandsFormatter(),
                          ],
                          validator: required,
                          onChanged: (v) => setState(
                            () => _plan[i] = (
                              title: _plan[i].title,
                              amount: plainDigits(v),
                              days: _plan[i].days,
                            ),
                          ),
                          decoration: InputDecoration(
                            labelText: w.milestoneAmount,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: TextFormField(
                          initialValue: '${m.days}',
                          enabled: _editable,
                          keyboardType: TextInputType.number,
                          textDirection: TextDirection.ltr,
                          inputFormatters: digits,
                          onChanged: (v) => _plan[i] = (
                            title: _plan[i].title,
                            amount: _plan[i].amount,
                            days: int.tryParse(plainDigits(v)) ?? 1,
                          ),
                          decoration: InputDecoration(
                            labelText: w.milestoneDays,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: s.common.delete,
                        icon: const Icon(Icons.delete_outline_rounded),
                        onPressed: _plan.length == 1 || !_editable
                            ? null
                            : () => setState(
                                () => _plan = [..._plan]..removeAt(i),
                              ),
                      ),
                    ],
                  ),
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  children: [
                    TextButton.icon(
                      icon: const Icon(Icons.add_rounded),
                      label: Text(w.addMilestone),
                      onPressed: _plan.length >= 10 || !_editable
                          ? null
                          : () => setState(
                              () => _plan = [
                                ..._plan,
                                (title: '', amount: '', days: 7),
                              ],
                            ),
                    ),
                    Text(
                      _mismatch
                          ? w.milestoneMismatch.fill({
                              'total':
                                  money(
                                    '$_planTotal',
                                    p.currency,
                                    s,
                                    language,
                                  ) ??
                                  '0',
                              'amount':
                                  money(_amount, p.currency, s, language) ??
                                  '0',
                            })
                          : w.milestoneTotal.fill({
                              'total':
                                  money(
                                    '$_planTotal',
                                    p.currency,
                                    s,
                                    language,
                                  ) ??
                                  '0',
                            }),
                      style: text.bodySmall?.copyWith(
                        color: _mismatch ? c.error : c.ink2,
                      ),
                    ),
                  ],
                ),
              ],
            ],
            TextFormField(
              initialValue: _message,
              enabled: _editable,
              minLines: 5,
              maxLines: 12,
              maxLength: 5000,
              keyboardType: TextInputType.multiline,
              textDirection: textDirectionOf(
                _message,
                Directionality.of(context),
              ),
              onChanged: (v) => setState(() => _message = v),
              validator: (v) => (v ?? '').trim().length < 20
                  ? rules.minChars.fill({'n': n(20)})
                  : null,
              decoration: InputDecoration(
                labelText: w.coverLetter,
                helperText: w.coverLetterHint,
                helperMaxLines: 3,
                alignLabelWithHint: true,
                counterText: '',
              ),
            ),
            if (p.screeningQuestions.isNotEmpty) ...[
              Text(w.screeningQuestions, style: text.labelLarge),
              for (final (i, q) in p.screeningQuestions.indexed)
                TextFormField(
                  initialValue: _answers[i],
                  enabled: _editable,
                  minLines: 2,
                  maxLines: 6,
                  maxLength: 2000,
                  validator: required,
                  onChanged: (v) => _answers[i] = v,
                  decoration: InputDecoration(
                    labelText: '${n(i + 1)}. $q',
                    alignLabelWithHint: true,
                    counterText: '',
                  ),
                ),
            ],
            if (_bid == null)
              AttachmentsField(
                files: _file,
                onChanged: (f) => setState(() => _file = f),
                maxFiles: 1,
                chooseLabel: w.attachment,
                rulesText: s.join.fileRules,
                removeLabel: s.join.removeFile,
                tooManyText: s.join.errFileBig,
                tooBigText: s.join.errFileBig,
                totalTooBigText: s.join.errFileBig,
                language: language,
              ),
            if (guide != null) _PriceGuide(guide, amount: plainDigits(_amount)),
            if (_error case final e?) FormMessage(e),
            if (_editable)
              BaghKey(
                label: _bid == null ? w.sendProposal : s.common.save,
                icon: Icons.send_rounded,
                loading: _sending,
                expand: true,
                onPressed: _mismatch ? null : _submit,
              ),
            if (_bid != null && _editable)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton(
                  onPressed: _withdraw,
                  child: Text(w.withdraw),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _PriceGuide extends ConsumerWidget {
  const _PriceGuide(this.guide, {required this.amount});

  final PriceGuide guide;
  final String amount;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final hourly = guide.pricingType == 'HOURLY';
    String show(String? v) {
      final m = money(v, guide.currency, s, language);
      if (m == null) return '—';
      return hourly ? '$m ${w.perHour}' : m;
    }

    final value = BigInt.tryParse(amount);
    final low = switch (guide.market) {
      final m? => BigInt.tryParse(m.low),
      null => null,
    };
    final bMin = BigInt.tryParse(guide.budgetMin ?? '');
    final bMax = BigInt.tryParse(guide.budgetMax ?? '');
    final (String, int)? hint = value == null
        ? null
        : low != null && value < low
        ? (w.lowForMarket, 1)
        : bMax != null && value > bMax
        ? (w.aboveBudget, 1)
        : bMin != null && value < bMin
        ? (w.belowBudget, 0)
        : null;

    return SoftSurface(
      tint: c.tints[2],
      elevated: false,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 6,
        children: [
          Text(w.priceGuide, style: text.titleSmall),
          Text(w.clientBudget, style: text.bodySmall),
          Text(
            guide.hasBudget
                ? [
                    guide.budgetMin,
                    guide.budgetMax,
                  ].whereType<String>().map(show).join(' ${s.market.to} ')
                : w.budgetUnknown,
            style: text.labelLarge,
          ),
          Text(w.marketRange, style: text.bodySmall),
          if (guide.market case final m?) ...[
            Text(
              '${show(m.low)} ${s.market.to} ${show(m.high)}',
              style: text.labelLarge,
            ),
            Text(
              '${w.marketMedian.fill({'amount': show(m.median)})}${factSep(language)}'
              '${w.marketSample.fill({'count': localDigits(m.sample, language)})}',
              style: text.bodySmall,
            ),
          ] else
            Text(w.noMarketData, style: text.bodySmall),
          if (hint case (final words, final tone))
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: c.tints[tone].fill,
                borderRadius: BorderRadius.circular(BaghRadius.tile),
              ),
              child: Text(
                words,
                style: text.bodySmall?.copyWith(color: c.tints[tone].ink),
              ),
            ),
        ],
      ),
    );
  }
}

/// "About the client": what the platform actually knows.
class _ClientPanel extends ConsumerWidget {
  const _ClientPanel(this.client, {this.companyName});

  final ClientStats client;
  final String? companyName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final text = Theme.of(context).textTheme;
    final k = client;
    String n(int v) => localDigits(v, language);
    final rows = <(IconData, String)>[
      (
        Icons.verified_user_outlined,
        k.verified ? w.clientVerified : w.clientUnverified,
      ),
      (
        Icons.star_outline_rounded,
        k.ratingCount > 0
            ? starsText(k.ratingAvg, k.ratingCount, language)
            : w.noReviewsYet,
      ),
      (
        Icons.place_outlined,
        [k.city, geo.country(k.country)].whereType<String>().join('، '),
      ),
      (
        Icons.work_outline_rounded,
        [
          w.projectsPosted.fill({'count': n(k.projectsPosted)}),
          if (k.openProjects > 0)
            w.openProjectsCount.fill({'count': n(k.openProjects)}),
        ].join(factSep(language)),
      ),
      (
        Icons.group_outlined,
        [
          w.hiresCount.fill({'count': n(k.hires)}),
          if (k.hireRate case final r?) w.hireRate.fill({'rate': n(r)}),
        ].join(factSep(language)),
      ),
      if (k.committed.isNotEmpty)
        (
          Icons.account_balance_wallet_outlined,
          '${w.committed}: ${k.committed.map((row) => money(row.amount, row.currency, s, language)).join(' + ')}',
        ),
      if (k.memberSince case final at?)
        (
          Icons.event_outlined,
          w.memberSince.fill({'date': formatDate(at.toLocal(), language)}),
        ),
      if (k.lastActiveAt case final at?)
        (
          Icons.visibility_outlined,
          w.activeAgo.fill({'ago': postedAgo(at, s, language)}),
        ),
    ];
    return SoftSurface(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Text(w.aboutClient, style: text.titleMedium),
          if (k.companyName ?? companyName case final name?)
            Text(name, style: text.titleSmall),
          for (final (icon, words) in rows) FactLine([(icon, words)]),
          if (k.username case final user?)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton(
                onPressed: () => context.push('/profiles/$user'),
                child: Text(w.viewProfile),
              ),
            ),
        ],
      ),
    );
  }
}

/// "Activity on this project": the competition, counted, never itemised.
class _ActivityPanel extends ConsumerWidget {
  const _ActivityPanel(this.activity, {required this.currency});

  final ProjectActivity activity;
  final String currency;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final a = activity;
    String n(int v) => localDigits(v, language);
    final rows = [
      (w.proposals, w.proposalRange.label(a.proposalRange)),
      (w.interviewing, n(a.interviewing)),
      (w.invitesSent, n(a.invitesSent)),
      (w.unansweredInvites, n(a.unansweredInvites)),
      (w.hired, n(a.hired)),
      (
        w.lastViewed,
        a.lastViewedByClient != null
            ? postedAgo(a.lastViewedByClient, s, language)
            : w.neverViewed,
      ),
      (
        w.averageBid,
        a.averageBid != null
            ? money(a.averageBid, currency, s, language) ?? '—'
            : w.sealedBids,
      ),
    ];
    return SoftSurface(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          Text(w.activity, style: text.titleMedium),
          for (final (label, value) in rows)
            Row(
              children: [
                Expanded(
                  child: Text(
                    label,
                    style: text.bodyMedium?.copyWith(color: c.ink2),
                  ),
                ),
                const SizedBox(width: 8),
                // Shrinks and wraps: an amount in large text is wider than
                // a narrow phone leaves beside its label.
                Flexible(
                  child: Text(
                    value,
                    textAlign: TextAlign.end,
                    style: text.labelLarge,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
