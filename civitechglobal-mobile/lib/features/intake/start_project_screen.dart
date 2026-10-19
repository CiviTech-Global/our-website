import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/motion.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/attachments_field.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/date_field.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/step_keys.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import 'code_issued.dart';

const _types = [
  'NEW_BUILD',
  'REBUILD',
  'INTEGRATION',
  'MOBILE_APP',
  'WEB_APP',
  'DATA_PLATFORM',
  'AUTOMATION',
  'MAINTENANCE',
  'CONSULTING',
  'OTHER',
];
const _platforms = ['web', 'ios', 'android', 'desktop', 'api', 'embedded'];
const _urgencies = ['EXPLORING', 'NEXT_QUARTER', 'NEXT_MONTH', 'URGENT'];
const _engagements = [
  'FIXED_PRICE',
  'TIME_AND_MATERIALS',
  'RETAINER',
  'NOT_SURE',
];

/// Ordering a software project: the web's StartProjectPage as five short
/// steps (you, the project, timing, budget, attachments), each checked
/// before the next, with the same rules the server applies
/// (civitechglobal-server/src/validators/project.schema.ts), then sent as
/// one multipart request with upload progress, and answered with a
/// tracking code to keep.
class StartProjectScreen extends ConsumerStatefulWidget {
  const StartProjectScreen({this.initialStep = 0, super.key});

  /// Which step to open on; the layout audit renders each one.
  final int initialStep;

  @override
  ConsumerState<StartProjectScreen> createState() => _StartProjectScreenState();
}

class _StartProjectScreenState extends ConsumerState<StartProjectScreen> {
  late int _step = widget.initialStep.clamp(0, 4);
  final _forms = List.generate(5, (_) => GlobalKey<FormState>());
  // Steps whose Next was pressed: their fields re-check as they change.
  final _tried = <int>{};

  // You
  final _name = TextEditingController();
  final _role = TextEditingController();
  final _org = TextEditingController();
  final _website = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  // Project
  final _title = TextEditingController();
  final _summary = TextEditingController();
  String _type = 'OTHER';
  final Set<String> _chosenPlatforms = {};
  final _goals = TextEditingController();
  final _users = TextEditingController();
  final _existing = TextEditingController();
  final _constraints = TextEditingController();
  final _outOfScope = TextEditingController();
  // Timing
  String _urgency = 'EXPLORING';
  DateTime? _start;
  DateTime? _deadline;
  String? _deadlineError;
  // Budget
  bool _budgetUnknown = false;
  final _min = TextEditingController();
  final _max = TextEditingController();
  final _suggested = TextEditingController();
  String _engagement = 'NOT_SURE';
  // Files and notes
  List<PickedFile> _files = const [];
  bool _nda = false;
  final _notes = TextEditingController();

  bool _sending = false;
  double _progress = 0;
  String? _error;
  ({String code, int attached})? _done;

  @override
  void dispose() {
    for (final c in [
      _name,
      _role,
      _org,
      _website,
      _email,
      _phone,
      _title,
      _summary,
      _goals,
      _users,
      _existing,
      _constraints,
      _outOfScope,
      _min,
      _max,
      _suggested,
      _notes,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  String _digits(TextEditingController c) =>
      toLatinDigits(c.text).replaceAll(RegExp(r'[^0-9]'), '');

  bool _validStep() {
    if (_tried.add(_step)) setState(() {});
    final ok = _forms[_step].currentState?.validate() ?? true;
    if (_step == 2) {
      final order =
          _start == null || _deadline == null || !_deadline!.isBefore(_start!);
      setState(
        () => _deadlineError = order
            ? null
            : ref.read(stringsProvider).mobile.deadlineBeforeStart,
      );
      return ok && order;
    }
    return ok;
  }

  void _next() {
    if (!_validStep()) return;
    ref.read(hapticsProvider).selection();
    if (_step < 4) {
      setState(() => _step++);
    } else {
      _submit();
    }
  }

  /// One step back; false on the first step, where back leaves the form.
  bool _stepBack() {
    if (_step == 0) return false;
    ref.read(hapticsProvider).selection();
    setState(() => _step--);
    return true;
  }

  void _back() {
    if (!_stepBack()) Navigator.of(context).maybePop();
  }

  bool get _dirty =>
      [
        _name,
        _role,
        _org,
        _website,
        _email,
        _phone,
        _title,
        _summary,
        _goals,
        _users,
        _existing,
        _constraints,
        _outOfScope,
        _min,
        _max,
        _suggested,
        _notes,
      ].any((c) => c.text.trim().isNotEmpty) ||
      _files.isNotEmpty;

  Map<String, Object?> _payload() {
    String? opt(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim();
    String? money(TextEditingController c) =>
        _digits(c).isEmpty ? null : _digits(c);
    return {
      'contactName': _name.text.trim(),
      'contactRole': ?opt(_role),
      'organizationName': ?opt(_org),
      'website': ?opt(_website),
      'email': _email.text.trim(),
      'phone': toLatinDigits(_phone.text.trim()),
      'title': _title.text.trim(),
      'summary': _summary.text.trim(),
      'projectType': _type,
      'platforms': _chosenPlatforms.toList(),
      'goals': ?opt(_goals),
      'targetUsers': ?opt(_users),
      'existingSystems': ?opt(_existing),
      'constraints': ?opt(_constraints),
      'outOfScope': ?opt(_outOfScope),
      'urgency': _urgency,
      if (_start != null) 'desiredStartAt': isoDay(_start!),
      if (_deadline != null) 'deadlineAt': isoDay(_deadline!),
      'budgetUnknown': _budgetUnknown,
      if (!_budgetUnknown) 'budgetMin': ?money(_min),
      if (!_budgetUnknown) 'budgetMax': ?money(_max),
      'suggestedPrice': ?money(_suggested),
      'engagementModel': _engagement,
      'ndaRequired': _nda,
      'clientNotes': ?opt(_notes),
    };
  }

  Future<void> _submit() async {
    final s = ref.read(stringsProvider);
    setState(() {
      _sending = true;
      _progress = 0;
      _error = null;
    });
    try {
      final payload = jsonEncode(_payload());
      final parts = await multipartParts(_files);
      final result = await ref
          .read(apiClientProvider)
          .upload(
            '/projects/requests',
            form: () =>
                FormData.fromMap({'payload': payload, 'files': parts()}),
            onProgress: (p) => setState(() => _progress = p),
            parse: (d) {
              final m = d! as Map;
              return (
                code: '${m['trackingCode']}',
                attached: (m['attachmentCount'] as num?)?.toInt() ?? 0,
              );
            },
          );
      await ref.read(hapticsProvider).success();
      setState(() => _done = result);
    } catch (e) {
      setState(
        () => _error = describeError(s, e, fallback: s.project.errSubmit),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final p = s.project;
    if (_done case final done?) {
      return _Success(code: done.code, attached: done.attached);
    }

    final titles = [
      p.sectionYou,
      p.sectionProject,
      p.sectionTiming,
      p.sectionBudget,
      p.sectionFiles,
    ];
    final reduce = reduceMotion(context, ref);
    return LeaveGuard(
      isDirty: () => _dirty,
      stepBack: _stepBack,
      busy: _sending,
      child: Scaffold(
        appBar: AppBar(
          leading: homeLeading(context),
          title: Text(p.title, maxLines: 1, overflow: TextOverflow.ellipsis),
          actions: const [HelpAction('start-project')],
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              Padding(
                padding: BaghLayout.readablePadding(context, bottom: 8),
                child: _StepBar(step: _step, titles: titles),
              ),
              Expanded(
                child: AnimatedSwitcher(
                  duration: reduce ? Duration.zero : BaghDurations.slow,
                  switchInCurve: Curves.easeOutCubic,
                  transitionBuilder: (child, animation) => FadeTransition(
                    opacity: animation,
                    child: SlideTransition(
                      position: Tween(
                        begin: const Offset(0, 0.04),
                        end: Offset.zero,
                      ).animate(animation),
                      child: child,
                    ),
                  ),
                  child: KeyedSubtree(
                    key: ValueKey(_step),
                    child: ListView(
                      padding: BaghLayout.readablePadding(
                        context,
                        top: 8,
                        bottom: BaghSpace.section,
                      ),
                      children: [
                        Form(
                          key: _forms[_step],
                          autovalidateMode: _tried.contains(_step)
                              ? AutovalidateMode.always
                              : AutovalidateMode.disabled,
                          child: _stepBody(s),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Padding(
                padding: BaghLayout.readablePadding(
                  context,
                  top: 8,
                  bottom: 12,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  spacing: 10,
                  children: [
                    if (_error != null) FormMessage(_error!),
                    if (_sending && _files.isNotEmpty)
                      LinearProgressIndicator(
                        value: _progress,
                        minHeight: 6,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    StepKeys(
                      backLabel: _step == 0
                          ? s.common.cancel
                          : s.common.previous,
                      onBack: _sending ? null : _back,
                      forward: BaghKey(
                        label: _step == 4 ? p.submit : s.common.next,
                        expand: true,
                        onPressed: _next,
                        loading: _sending,
                      ),
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

  Widget _stepBody(Strings s) {
    final p = s.project;
    final v = Validators(s);
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final language = ref.watch(l10nProvider).language;
    String? requiredLen(String? value, int min) =>
        (value == null || value.trim().length < min) ? p.errRequired : null;
    Widget field(
      TextEditingController controller,
      String label, {
      String? helper,
      int lines = 1,
      String? Function(String?)? validator,
      TextInputType? keyboard,
      TextDirection? direction,
      List<String>? autofill,
    }) => TextFormField(
      controller: controller,
      minLines: lines,
      maxLines: lines == 1 ? 1 : lines + 4,
      keyboardType: keyboard,
      textDirection: direction,
      autofillHints: autofill,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        alignLabelWithHint: lines > 1,
      ),
    );
    Widget choices(
      List<String> values,
      String selected,
      L10nMap labels,
      ValueChanged<String> onSelect,
    ) => Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final value in values)
          ChoiceChip(
            label: Text(labels.label(value)),
            selected: selected == value,
            onSelected: (_) {
              ref.read(hapticsProvider).selection();
              onSelect(value);
            },
          ),
      ],
    );

    final List<Widget> children = switch (_step) {
      0 => [
        Text(p.identityHint, style: text.bodySmall),
        field(
          _name,
          p.contactName,
          autofill: const [AutofillHints.name],
          validator: (x) => requiredLen(x, 2),
        ),
        field(_role, p.contactRole),
        field(
          _org,
          p.organization,
          autofill: const [AutofillHints.organizationName],
        ),
        field(
          _website,
          p.website,
          keyboard: TextInputType.url,
          direction: TextDirection.ltr,
          validator: (x) =>
              x == null ||
                  x.trim().isEmpty ||
                  Uri.tryParse(x.trim())?.hasScheme == true
              ? null
              : p.errRequired,
        ),
        field(
          _email,
          p.email,
          keyboard: TextInputType.emailAddress,
          direction: TextDirection.ltr,
          autofill: const [AutofillHints.email],
          validator: (x) => v.email(x) == null ? null : p.errEmail,
        ),
        field(
          _phone,
          p.phone,
          keyboard: TextInputType.phone,
          direction: TextDirection.ltr,
          autofill: const [AutofillHints.telephoneNumber],
          validator: (x) {
            final digits = toLatinDigits(
              x ?? '',
            ).replaceAll(RegExp(r'[^0-9]'), '');
            return digits.length >= 8 && digits.length <= 20
                ? null
                : p.errPhone;
          },
        ),
      ],
      1 => [
        field(_title, p.projectTitle, validator: (x) => requiredLen(x, 4)),
        field(
          _summary,
          p.summary,
          helper: p.summaryHint,
          lines: 5,
          validator: (x) => (x ?? '').trim().length >= 40 ? null : p.errSummary,
        ),
        Text(p.projectType, style: text.titleSmall),
        choices(_types, _type, p.types, (x) => setState(() => _type = x)),
        Text(p.platforms, style: text.titleSmall),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final platform in _platforms)
              FilterChip(
                label: Text(p.platformNames.string(platform)),
                selected: _chosenPlatforms.contains(platform),
                onSelected: (on) {
                  ref.read(hapticsProvider).selection();
                  setState(
                    () => on
                        ? _chosenPlatforms.add(platform)
                        : _chosenPlatforms.remove(platform),
                  );
                },
              ),
          ],
        ),
        field(_goals, p.goals, lines: 2),
        field(_users, p.targetUsers, lines: 2),
        field(_existing, p.existingSystems, lines: 2),
        field(_constraints, p.constraints, lines: 2),
        field(_outOfScope, p.outOfScope, helper: p.outOfScopeHint, lines: 2),
      ],
      2 => [
        Text(p.urgency, style: text.titleSmall),
        choices(
          _urgencies,
          _urgency,
          p.urgencies,
          (x) => setState(() => _urgency = x),
        ),
        DateField(
          label: p.desiredStart,
          value: _start,
          firstDate: DateTime.now(),
          onChanged: (d) => setState(() => _start = d),
        ),
        DateField(
          label: p.deadline,
          value: _deadline,
          firstDate: DateTime.now(),
          errorText: _deadlineError,
          onChanged: (d) => setState(() => _deadline = d),
        ),
      ],
      3 => [
        SoftSurface(
          tint: c.tints[2],
          radius: BaghRadius.tile,
          child: Text(
            p.budgetWhy,
            style: text.bodyMedium?.copyWith(color: c.tints[2].ink),
          ),
        ),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: _budgetUnknown,
          title: Text(p.budgetUnknown),
          onChanged: (on) => setState(() => _budgetUnknown = on ?? false),
        ),
        if (!_budgetUnknown) ...[
          field(
            _min,
            '${p.budgetMin} (${p.currency})',
            keyboard: TextInputType.number,
            direction: TextDirection.ltr,
            validator: (_) => _digits(_min).isEmpty && _digits(_max).isEmpty
                ? p.errBudget
                : null,
          ),
          field(
            _max,
            '${p.budgetMax} (${p.currency})',
            keyboard: TextInputType.number,
            direction: TextDirection.ltr,
            validator: (_) {
              final min = BigInt.tryParse(_digits(_min));
              final max = BigInt.tryParse(_digits(_max));
              return min != null && max != null && min > max
                  ? p.errBudgetOrder
                  : null;
            },
          ),
        ],
        field(
          _suggested,
          '${p.suggestedPrice} (${p.currency})',
          helper: p.suggestedPriceHint,
          keyboard: TextInputType.number,
          direction: TextDirection.ltr,
        ),
        Text(p.engagement, style: text.titleSmall),
        Text(p.engagementHint, style: text.bodySmall),
        choices(
          _engagements,
          _engagement,
          p.engagements,
          (x) => setState(() => _engagement = x),
        ),
      ],
      _ => [
        Text(p.filesHint, style: text.bodyMedium),
        AttachmentsField(
          files: _files,
          onChanged: (f) => setState(() => _files = f),
          chooseLabel: p.chooseFiles,
          rulesText: p.fileRules,
          removeLabel: p.removeFile,
          tooManyText: p.fileTooMany,
          tooBigText: p.fileTooBig,
          totalTooBigText: p.filesTooBig,
          language: language,
        ),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: _nda,
          title: Text(p.nda),
          onChanged: (on) => setState(() => _nda = on ?? false),
        ),
        field(_notes, p.clientNotes, lines: 3),
        Text(p.submitHint, style: text.bodySmall),
      ],
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 14,
      children: children,
    );
  }
}

/// Where the reader is among the five steps: filled pills up to here, and
/// the current step's name.
class _StepBar extends ConsumerWidget {
  const _StepBar({required this.step, required this.titles});

  final int step;
  final List<String> titles;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = BaghColors.of(context);
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 8,
      children: [
        Row(
          spacing: 6,
          children: [
            for (var i = 0; i < titles.length; i++)
              Expanded(
                child: AnimatedContainer(
                  duration: BaghDurations.moderate,
                  height: 6,
                  decoration: ShapeDecoration(
                    color: i <= step ? c.primary : c.hair,
                    shape: const StadiumBorder(),
                  ),
                ),
              ),
          ],
        ),
        Text(
          '${localDigits(step + 1, language)} / ${localDigits(titles.length, language)} · ${titles[step]}',
          style: BaghType.weight(text.titleMedium!, 750),
        ),
      ],
    );
  }
}

class _Success extends ConsumerWidget {
  const _Success({required this.code, required this.attached});

  final String code;
  final int attached;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(stringsProvider).project;
    final language = ref.watch(l10nProvider).language;
    return CodeIssued(
      title: p.successTitle,
      body: p.successBody,
      codeLabel: p.trackingCode,
      code: code,
      note: attached > 0
          ? p.attachedCount.fill({'n': localDigits(attached, language)})
          : null,
      copyLabel: p.copy,
      copiedLabel: p.copied,
      trackLabel: p.goTrack,
      homeLabel: p.goHome,
    );
  }
}
