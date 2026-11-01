import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../design/haptics.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/date_field.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'staff_queues.dart' show StaffRow;
import 'staff_screens.dart' show staffDetailProvider, workloadProvider;

/// A project request's proposals: what was offered, and the draft being
/// written. Sending is what the client sees; a draft is the staff's own.
class StaffProposals extends ConsumerStatefulWidget {
  const StaffProposals({required this.requestId, required this.row, super.key});

  final String requestId;
  final StaffRow row;

  @override
  ConsumerState<StaffProposals> createState() => _StaffProposalsState();
}

class _StaffProposalsState extends ConsumerState<StaffProposals> {
  bool _busy = false;
  String? _error;

  Future<void> _send(String id) async {
    if (_busy) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .post<Object?>('/projects/admin/proposals/$id/send');
      await ref.read(hapticsProvider).success();
      ref
        ..invalidate(staffDetailProvider(('projects', widget.requestId)))
        ..invalidate(workloadProvider);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(s.proposal.sent)));
      }
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final text = Theme.of(context).textTheme;
    final proposals = [
      for (final p in (widget.row['proposals'] as List? ?? const []))
        if (p is Map) p.cast<String, Object?>(),
    ];
    final hasDraft = proposals.any((p) => p['status'] == 'DRAFT');
    return SoftSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Text(s.proposal.proposals, style: text.titleMedium),
          if (proposals.isEmpty) Text(s.proposal.noneYet),
          for (final p in proposals) ...[
            Row(
              spacing: 8,
              children: [
                Expanded(
                  child: Text(
                    '${p['scopeSummary'] ?? ''}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                StatusPill(s.proposal.proposalStatuses.label('${p['status']}')),
              ],
            ),
            if (p['status'] == 'DRAFT') ...[
              BaghKey(
                label: s.proposal.editDraft,
                kind: BaghKeyKind.outline,
                expand: true,
                onPressed: () => context.push(
                  '/staff/q/projects/${widget.requestId}/proposal',
                  extra: p,
                ),
              ),
              BaghKey(
                label: s.proposal.send,
                expand: true,
                loading: _busy,
                onPressed: () => _send('${p['id']}'),
              ),
            ],
          ],
          if (_error != null) FormMessage(_error!),
          if (!hasDraft)
            BaghKey(
              label: s.proposal.newProposal,
              kind: BaghKeyKind.outline,
              expand: true,
              onPressed: () => context.push(
                '/staff/q/projects/${widget.requestId}/proposal',
              ),
            ),
        ],
      ),
    );
  }
}

/// A proposal's form: the scope and what is left out of it, the price and
/// the time. Drafts are saved here and sent from the project's page.
class StaffProposalScreen extends ConsumerStatefulWidget {
  const StaffProposalScreen({required this.requestId, this.draft, super.key});

  final String requestId;
  final StaffRow? draft;

  @override
  ConsumerState<StaffProposalScreen> createState() =>
      _StaffProposalScreenState();
}

class _StaffProposalScreenState extends ConsumerState<StaffProposalScreen> {
  final _form = GlobalKey<FormState>();
  bool _tried = false;

  TextEditingController _lines(String key) => TextEditingController(
    text: (widget.draft?[key] as List? ?? const []).join('\n'),
  );
  TextEditingController _value(String key) =>
      TextEditingController(text: '${widget.draft?[key] ?? ''}');

  late final _scope = _value('scopeSummary');
  late final _deliverables = _lines('deliverables');
  late final _assumptions = _lines('assumptions');
  late final _exclusions = _lines('exclusions');
  late final _priceMin = _value('priceMin');
  late final _priceLikely = _value('priceLikely');
  late final _priceMax = _value('priceMax');
  late final _weeksMin = _value('timelineWeeksMin');
  late final _weeksMax = _value('timelineWeeksMax');
  late final _message = _value('message');
  late final _notes = _value('internalNotes');
  late DateTime? _validUntil = DateTime.tryParse(
    '${widget.draft?['validUntil']}',
  );
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [
      _scope,
      _deliverables,
      _assumptions,
      _exclusions,
      _priceMin,
      _priceLikely,
      _priceMax,
      _weeksMin,
      _weeksMax,
      _message,
      _notes,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  List<String> _each(TextEditingController c) => [
    for (final line in c.text.split('\n'))
      if (line.trim().isNotEmpty) line.trim(),
  ];

  Future<void> _save() async {
    if (!_tried) setState(() => _tried = true);
    if (_busy || !_form.currentState!.validate()) return;
    final s = ref.read(stringsProvider);
    final api = ref.read(apiClientProvider);
    String? money(TextEditingController c) {
      final digits = plainDigits(c.text);
      return digits.isEmpty ? null : digits;
    }

    final body = <String, Object?>{
      'scopeSummary': _scope.text.trim(),
      'deliverables': _each(_deliverables),
      'assumptions': _each(_assumptions),
      'exclusions': _each(_exclusions),
      'priceMin': ?money(_priceMin),
      'priceLikely': ?money(_priceLikely),
      'priceMax': ?money(_priceMax),
      'timelineWeeksMin': ?int.tryParse(_weeksMin.text.trim()),
      'timelineWeeksMax': ?int.tryParse(_weeksMax.text.trim()),
      'validUntil': ?_validUntil?.toUtc().toIso8601String(),
      if (_message.text.trim().isNotEmpty) 'message': _message.text.trim(),
      if (_notes.text.trim().isNotEmpty) 'internalNotes': _notes.text.trim(),
    };
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final draft = widget.draft;
      if (draft == null) {
        await api.post<Object?>(
          '/projects/admin/requests/${widget.requestId}/proposals',
          body: body,
        );
      } else {
        await api.patch<Object?>(
          '/projects/admin/proposals/${draft['id']}',
          body: body,
        );
      }
      await ref.read(hapticsProvider).success();
      ref.invalidate(staffDetailProvider(('projects', widget.requestId)));
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.proposal.saved)));
      context.pop();
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final p = s.proposal;
    final v = Validators(s);

    Widget lines(
      TextEditingController c,
      String label, {
      bool required = false,
    }) => TextFormField(
      controller: c,
      minLines: 3,
      maxLines: 10,
      validator: required ? v.required : null,
      decoration: InputDecoration(labelText: label, helperText: p.onePerLine),
    );
    Widget price(TextEditingController c, String label) => TextFormField(
      controller: c,
      keyboardType: TextInputType.number,
      textDirection: TextDirection.ltr,
      inputFormatters: const [ThousandsFormatter()],
      decoration: InputDecoration(labelText: label),
    );
    Widget number(TextEditingController c, String label) => TextFormField(
      controller: c,
      keyboardType: TextInputType.number,
      textDirection: TextDirection.ltr,
      decoration: InputDecoration(labelText: label),
    );

    return AccountPage(
      title: widget.draft == null ? p.newProposal : p.editDraft,
      children: [
        Form(
          key: _form,
          autovalidateMode: _tried
              ? AutovalidateMode.always
              : AutovalidateMode.disabled,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 14,
            children: [
              TextFormField(
                controller: _scope,
                minLines: 3,
                maxLines: 10,
                validator: v.required,
                decoration: InputDecoration(
                  labelText: p.scope,
                  helperText: p.scopeHint,
                  helperMaxLines: 3,
                ),
              ),
              lines(_deliverables, p.deliverables, required: true),
              lines(_assumptions, p.assumptions),
              lines(_exclusions, p.exclusions, required: true),
              price(_priceMin, p.priceMin),
              price(_priceLikely, p.priceLikely),
              price(_priceMax, p.priceMax),
              number(_weeksMin, p.weeksMin),
              number(_weeksMax, p.weeksMax),
              DateField(
                label: p.validUntil,
                value: _validUntil,
                firstDate: DateTime.now(),
                onChanged: (value) => setState(() => _validUntil = value),
              ),
              TextFormField(
                controller: _message,
                minLines: 2,
                maxLines: 8,
                decoration: InputDecoration(labelText: p.messageToClient),
              ),
              TextFormField(
                controller: _notes,
                minLines: 2,
                maxLines: 8,
                decoration: InputDecoration(
                  labelText: p.internalNotes,
                  helperText: p.internalNotesHint,
                ),
              ),
            ],
          ),
        ),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: p.saveDraft,
          onPressed: _save,
          loading: _busy,
          expand: true,
        ),
      ],
    );
  }
}
