import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';

/// One tracking box for every intake, as the web's TrackRequestPage:
/// `GET /track/:code` answers with a `kind` (insurance, project, résumé,
/// consultation), and each kind is shown with what matters for it. A project
/// shows its proposal, which can be accepted or declined here.
class TrackScreen extends ConsumerStatefulWidget {
  const TrackScreen({this.code, super.key});

  final String? code;

  @override
  ConsumerState<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends ConsumerState<TrackScreen> {
  late final _code = TextEditingController(text: widget.code ?? '');
  bool _busy = false;
  int _asks = 0;
  String? _asking;
  String? _error;
  Map<String, Object?>? _result;

  @override
  void initState() {
    super.initState();
    if ((widget.code ?? '').isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _track());
    }
  }

  /// The same screen at another code (a link while it is open) looks that
  /// one up instead of keeping the old answer.
  @override
  void didUpdateWidget(TrackScreen old) {
    super.didUpdateWidget(old);
    final code = widget.code ?? '';
    if (code != (old.code ?? '') && code.isNotEmpty) {
      _code.text = code;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _track();
      });
    }
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _track() async {
    final s = ref.read(stringsProvider);
    final code = toLatinDigits(
      _code.text,
    ).trim().toUpperCase().replaceAll(' ', '');
    if (code.isEmpty || (_busy && code == _asking)) return;
    // Only the latest lookup may answer: a slow one for an earlier code
    // must not land over it.
    final ask = ++_asks;
    _asking = code;
    setState(() {
      _busy = true;
      _error = null;
      _result = null;
    });
    try {
      final result = await ref
          .read(apiClientProvider)
          .get(
            '/track/${Uri.encodeComponent(code)}',
            parse: (d) => d! as Map<String, Object?>,
          );
      if (mounted && ask == _asks) setState(() => _result = result);
    } catch (e) {
      if (mounted && ask == _asks) {
        setState(
          () => _error = describeError(
            s,
            e,
            fallback: s.insurance.trackNotFoundBody,
          ),
        );
      }
    } finally {
      if (mounted && ask == _asks) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final text = Theme.of(context).textTheme;
    return ContentPage(
      title: s.insurance.trackTitle,
      subtitle: s.insurance.trackSubtitle,
      helpId: 'track',
      children: [
        const SizedBox(height: BaghSpace.section),
        TextField(
          controller: _code,
          textDirection: TextDirection.ltr,
          textCapitalization: TextCapitalization.characters,
          onSubmitted: (_) => _track(),
          decoration: InputDecoration(labelText: s.insurance.trackingCode),
        ),
        const SizedBox(height: 12),
        BaghKey(
          label: s.insurance.trackButton,
          onPressed: _track,
          loading: _busy,
          expand: true,
        ),
        const SizedBox(height: 8),
        Text(s.insurance.trackPrivacyNote, style: text.bodySmall),
        const SizedBox(height: BaghSpace.gutter),
        if (_error != null) FormMessage(_error!),
        if (_result case final r?)
          switch ('${r['kind']}') {
            'project' => _ProjectResult(r, onChanged: _track),
            'consultation' => _ConsultationResult(r, onChanged: _track),
            'resume' => _SimpleResult(
              r,
              statusLabel: s.join.statuses.label('${r['status']}'),
            ),
            _ => _SimpleResult(
              r,
              statusLabel: _leadStatus(s, '${r['status']}'),
              product: ref.watch(l10nProvider).language == 'fa'
                  ? r['productTitle'] as String?
                  : (r['productTitleEn'] ?? r['productTitle']) as String?,
            ),
          },
      ],
    );
  }
}

/// A tracked request's status in the reader's words, by its kind: the same
/// labels the tracking screen and the web's MyRequestsPage use.
String requestStatusLabel(Strings s, String kind, String status) =>
    switch (kind) {
      'insurance' => _leadStatus(s, status),
      'project' => s.proposal.statuses.label(status),
      'resume' => s.join.statuses.label(status),
      _ => s.consult.statuses.label(status),
    };

/// The garden tint for a status: settled well (0), waiting on the client
/// (1), settled badly (3), or under way (2).
int requestStatusTone(String status) => switch (status) {
  'COMPLETED' || 'ACCEPTED' || 'SCHEDULED' || 'MATCHED' => 0,
  'PROPOSAL_SENT' || 'NEEDS_CLARIFICATION' || 'SENT' => 1,
  'CANCELLED' || 'DECLINED' || 'WITHDRAWN' || 'EXPIRED' || 'NO_ANSWER' => 3,
  _ => 2,
};

String _leadStatus(Strings s, String status) => switch (status) {
  'NEW' => s.admin.newLeads,
  'CONTACTED' => s.admin.contacted,
  'IN_PROGRESS' => s.admin.inProgress,
  'COMPLETED' => s.admin.completed,
  'CANCELLED' => s.admin.cancelled,
  _ => status,
};

String _date(Object? iso, String language) {
  final d = DateTime.tryParse('$iso');
  return d == null ? '' : formatDate(d, language);
}

/// A status in a pill: tinted by how things stand.
class StatusPill extends StatelessWidget {
  const StatusPill(this.label, {this.tone = 2, super.key});

  final String label;
  final int tone;

  @override
  Widget build(BuildContext context) {
    final t = BaghColors.of(context).tints[tone];
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      decoration: ShapeDecoration(color: t.fill, shape: const StadiumBorder()),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(color: t.ink),
      ),
    );
  }
}

Widget _facts(BuildContext context, List<(String, String)> rows) {
  final text = Theme.of(context).textTheme;
  final c = BaghColors.of(context);
  return Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    spacing: 6,
    children: [
      for (final (label, value) in rows)
        if (value.isNotEmpty)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              Expanded(
                flex: 2,
                child: Text(
                  label,
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
              ),
              Expanded(flex: 3, child: Text(value, style: text.bodyMedium)),
            ],
          ),
    ],
  );
}

class _SimpleResult extends ConsumerWidget {
  const _SimpleResult(this.r, {required this.statusLabel, this.product});

  final Map<String, Object?> r;
  final String statusLabel;
  final String? product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    return SoftSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: StatusPill(
              statusLabel,
              tone: requestStatusTone('${r['status']}'),
            ),
          ),
          _facts(context, [
            (s.insurance.product, product ?? ''),
            (s.insurance.trackingCode, '${r['trackingCode']}'),
            (s.insurance.submittedAt, _date(r['submittedAt'], language)),
            (s.insurance.lastUpdated, _date(r['updatedAt'], language)),
            if (r['callbackScheduledAt'] != null)
              (
                s.insurance.callbackScheduled,
                _date(r['callbackScheduledAt'], language),
              ),
          ]),
        ],
      ),
    );
  }
}

class _ConsultationResult extends ConsumerStatefulWidget {
  const _ConsultationResult(this.r, {required this.onChanged});

  final Map<String, Object?> r;
  final VoidCallback onChanged;

  @override
  ConsumerState<_ConsultationResult> createState() =>
      _ConsultationResultState();
}

class _ConsultationResultState extends ConsumerState<_ConsultationResult> {
  bool _cancelling = false;

  Future<void> _cancel() async {
    final s = ref.read(stringsProvider);
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(s.consult.cancelConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(s.common.no),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(s.common.yes),
          ),
        ],
      ),
    );
    if (sure != true) return;
    setState(() => _cancelling = true);
    try {
      await ref
          .read(apiClientProvider)
          .post<Object?>(
            '/consult/requests/${widget.r['trackingCode']}/cancel',
          );
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(s.consult.cancelled)));
      }
      widget.onChanged();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(describeError(s, e))));
      }
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final r = widget.r;
    final status = '${r['status']}';
    final expert = r['expert'] as Map?;
    final windows = [
      for (final w in (r['availability'] as List? ?? const []))
        if (w is Map)
          '${_date(w['day'], language)} · ${s.consult.parts.label('${w['part']}')}',
    ];
    return SoftSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: StatusPill(
              s.consult.statuses.label(status),
              tone: requestStatusTone(status),
            ),
          ),
          _facts(context, [
            (s.consult.topicLabel, s.consult.topics.label('${r['topic']}')),
            (
              s.consult.modeLabel,
              s.consult.modes.label('${r['preferredMode']}'),
            ),
            if (expert != null)
              (s.consult.expertLabel, '${expert['fullName']}'),
            if (r['scheduledAt'] != null)
              (s.consult.scheduledFor, _date(r['scheduledAt'], language)),
            if (windows.isNotEmpty) (s.consult.yourWindows, windows.join('\n')),
          ]),
          if (status == 'NEW' || status == 'CONTACTED' || status == 'SCHEDULED')
            BaghKey(
              label: s.consult.cancel,
              kind: BaghKeyKind.outline,
              expand: true,
              loading: _cancelling,
              onPressed: _cancel,
            ),
        ],
      ),
    );
  }
}

class _ProjectResult extends ConsumerWidget {
  const _ProjectResult(this.r, {required this.onChanged});

  final Map<String, Object?> r;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final proposal = r['proposal'] as Map<String, Object?>?;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        SoftSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: StatusPill(
                  s.proposal.statuses.label('${r['status']}'),
                  tone: requestStatusTone('${r['status']}'),
                ),
              ),
              _facts(context, [
                (s.proposal.project, '${r['title']}'),
                (s.insurance.submittedAt, _date(r['submittedAt'], language)),
                (s.insurance.lastUpdated, _date(r['updatedAt'], language)),
              ]),
            ],
          ),
        ),
        if (proposal == null)
          SoftSurface(
            tint: BaghColors.of(context).tints[2],
            child: Text(s.proposal.notYet),
          )
        else
          ProposalView(
            proposal: proposal,
            trackingCode: '${r['trackingCode']}',
            onAnswered: onChanged,
          ),
      ],
    );
  }
}

/// A proposal, as the web's ProposalView shows it: scope, deliverables,
/// assumptions, what is not included, milestones, the estimate as a range,
/// and the answer.
class ProposalView extends ConsumerStatefulWidget {
  const ProposalView({
    required this.proposal,
    required this.trackingCode,
    required this.onAnswered,
    super.key,
  });

  final Map<String, Object?> proposal;
  final String trackingCode;
  final VoidCallback onAnswered;

  @override
  ConsumerState<ProposalView> createState() => _ProposalViewState();
}

class _ProposalViewState extends ConsumerState<ProposalView> {
  final _email = TextEditingController();
  final _note = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _answered;

  @override
  void dispose() {
    _email.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _answer(String decision) async {
    final s = ref.read(stringsProvider);
    if (Validators(s).email(_email.text) != null) {
      setState(() => _error = s.proposal.errEmail);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .post<Object?>(
            '/projects/requests/respond',
            body: {
              'trackingCode': widget.trackingCode,
              'email': _email.text.trim(),
              'decision': decision,
              if (_note.text.trim().isNotEmpty) 'note': _note.text.trim(),
            },
          );
      await ref.read(hapticsProvider).success();
      setState(() => _answered = decision);
      widget.onAnswered();
    } catch (e) {
      setState(
        () => _error = describeError(s, e, fallback: s.proposal.errSend),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final p = s.proposal;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final v = widget.proposal;
    List<String> list(String key) => [
      for (final x in (v[key] as List? ?? const [])) '$x',
    ];
    String money(Object? value) => value == null
        ? ''
        : '${localDigits(_grouped('$value'), language)} ${v['currency'] ?? ''}';
    final status = '${v['status']}';
    final hours = v['pertHours'];
    final weeksMin = v['timelineWeeksMin'];
    final weeksMax = v['timelineWeeksMax'];

    Widget bullets(String title, List<String> items, {String? hint}) =>
        items.isEmpty
        ? const SizedBox.shrink()
        : ContentSection(
            title: title,
            subtitle: hint,
            children: [
              for (final item in items)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 10,
                  children: [
                    Text(
                      '•',
                      style: text.bodyLarge?.copyWith(color: c.primary),
                    ),
                    Expanded(child: Text(item, style: text.bodyMedium)),
                  ],
                ),
            ],
          );

    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(p.title, style: text.titleLarge),
              StatusPill(
                status == 'SENT' ? p.awaiting : p.statuses.label(status),
                tone: requestStatusTone(status),
              ),
            ],
          ),
          if (v['message'] case final m? when '$m'.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('$m', style: text.bodyLarge),
          ],
          ContentSection(
            title: p.scope,
            children: [
              Text('${v['scopeSummary'] ?? ''}', style: text.bodyMedium),
            ],
          ),
          bullets(p.deliverables, list('deliverables')),
          bullets(p.assumptions, list('assumptions'), hint: p.assumptionsHint),
          bullets(p.exclusions, list('exclusions'), hint: p.exclusionsHint),
          if ((v['milestones'] as List?)?.isNotEmpty ?? false)
            bullets(p.milestones, [
              for (final m in v['milestones']! as List)
                if (m is Map)
                  [
                    '${m['title']}',
                    if (m['durationDays'] != null)
                      '${localDigits(m['durationDays']! as Object, language)} ${p.days}',
                    if (m['price'] != null) money(m['price']),
                    if ((m['description'] as String?)?.isNotEmpty ?? false)
                      '${m['description']}',
                  ].join(' · '),
            ]),
          ContentSection(
            title: p.estimate,
            subtitle: p.estimateHint,
            children: [
              _facts(context, [
                if (v['priceLikely'] != null)
                  (p.price, money(v['priceLikely'])),
                if (v['priceMin'] != null && v['priceMax'] != null)
                  (
                    p.range,
                    '${money(v['priceMin'])} – ${money(v['priceMax'])}',
                  ),
                if (hours != null)
                  (
                    p.effort,
                    '${localDigits((hours as num).round(), language)} ${p.hours}',
                  ),
                if (v['hourlyRate'] != null)
                  (p.perHour, money(v['hourlyRate'])),
                if (weeksMin != null && weeksMax != null)
                  (
                    p.timeline,
                    '${localDigits(weeksMin, language)}–${localDigits(weeksMax, language)} ${p.weeks}',
                  ),
                if (v['validUntil'] != null)
                  (p.validUntil, _date(v['validUntil'], language)),
              ]),
              if (v['discoveryRequired'] == true)
                SoftSurface(
                  tint: c.accentSoft,
                  radius: BaghRadius.tile,
                  child: Text(
                    '${p.discovery}: ${p.discoveryHint}${v['discoveryPrice'] != null ? ' — ${money(v['discoveryPrice'])}' : ''}',
                    style: text.bodyMedium?.copyWith(color: c.accentSoft.ink),
                  ),
                ),
            ],
          ),
          const SizedBox(height: BaghSpace.section),
          if (_answered != null || status == 'ACCEPTED' || status == 'DECLINED')
            FormMessage(
              (_answered ?? status) == 'ACCEPTED'
                  ? p.thanksAccepted
                  : p.thanksDeclined,
              positive: (_answered ?? status) == 'ACCEPTED',
            )
          else if (status == 'EXPIRED')
            FormMessage(p.expiredHint)
          else if (status != 'SENT')
            FormMessage(p.cannotAnswer)
          else
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 12,
              children: [
                Text(p.yourAnswer, style: text.titleMedium),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  textDirection: TextDirection.ltr,
                  decoration: InputDecoration(
                    labelText: p.confirmEmail,
                    helperText: p.confirmEmailHint,
                  ),
                ),
                TextField(
                  controller: _note,
                  minLines: 2,
                  maxLines: 5,
                  decoration: InputDecoration(labelText: p.note),
                ),
                if (_error != null) FormMessage(_error!),
                BaghKey(
                  label: p.accept,
                  expand: true,
                  loading: _busy,
                  onPressed: () => _answer('ACCEPTED'),
                ),
                BaghKey(
                  label: p.decline,
                  kind: BaghKeyKind.outline,
                  expand: true,
                  onPressed: _busy ? null : () => _answer('DECLINED'),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// 120000000 → 120,000,000: amounts are strings (they exceed 2^53 in
/// tomans), grouped by hand.
String _grouped(String digits) {
  final clean = digits.replaceAll(RegExp('[^0-9]'), '');
  final out = StringBuffer();
  for (var i = 0; i < clean.length; i++) {
    if (i > 0 && (clean.length - i) % 3 == 0) out.write(',');
    out.write(clean[i]);
  }
  return out.toString();
}
