import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/date_field.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../company/experts_screen.dart';
import 'code_issued.dart';

const _topics = ['CAREER', 'TECHNICAL', 'STARTING_OUT', 'HIRING', 'OTHER'];
const _modes = ['ONLINE', 'PHONE', 'IN_PERSON'];
const _parts = ['MORNING', 'AFTERNOON', 'EVENING'];
const _maxWindows = 6;

/// Experts who take consultations, from the club's list.
final consultExpertsProvider = FutureProvider<List<Expert>>(
  (ref) async => [
    for (final e in await ref.watch(expertsProvider.future))
      if (e.acceptsConsultations) e,
  ],
);

/// Asking for a consultation, as the web's ConsultPage: what about, how,
/// with whom (or anyone), a few times one could be free, and a phone number
/// to ring. The server's rules (consultation.routes.ts) are checked first:
/// an Iranian mobile number, at least one and at most six time windows.
class ConsultScreen extends ConsumerStatefulWidget {
  const ConsultScreen({this.expertSlug, super.key});

  final String? expertSlug;

  @override
  ConsumerState<ConsultScreen> createState() => _ConsultScreenState();
}

class _ConsultScreenState extends ConsumerState<ConsultScreen> {
  final _form = GlobalKey<FormState>();
  // After a first attempt, fields re-check as they change, so a fixed
  // mistake stops being flagged.
  bool _tried = false;
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _goal = TextEditingController();
  final _background = TextEditingController();
  String _topic = 'TECHNICAL';
  String? _mode;
  late String? _expert = widget.expertSlug;
  final List<(DateTime?, String)> _windows = [(null, 'MORNING')];
  bool _sending = false;
  String? _error;
  String? _code;

  @override
  void dispose() {
    for (final c in [_name, _phone, _email, _goal, _background]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _dirty =>
      [
        _name,
        _phone,
        _email,
        _goal,
        _background,
      ].any((c) => c.text.trim().isNotEmpty) ||
      _windows.any((w) => w.$1 != null);

  Future<void> _submit() async {
    final s = ref.read(stringsProvider);
    final windows = [
      for (final (day, part) in _windows)
        if (day != null) {'day': isoDay(day), 'part': part},
    ];
    if (!_tried) setState(() => _tried = true);
    final valid = _form.currentState!.validate();
    if (!valid) revealFirstError(_form);
    if (windows.isEmpty) setState(() => _error = s.consult.needWindow);
    if (!valid || windows.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final code = await ref
          .read(apiClientProvider)
          .post(
            '/consult/requests',
            body: {
              'fullName': _name.text.trim(),
              'phone': toLatinDigits(_phone.text.trim()),
              if (_email.text.trim().isNotEmpty) 'email': _email.text.trim(),
              'topic': _topic,
              'preferredMode': ?_mode,
              if (_goal.text.trim().isNotEmpty) 'goal': _goal.text.trim(),
              if (_background.text.trim().isNotEmpty)
                'background': _background.text.trim(),
              // Only the expert the form shows as chosen.
              if ((ref.read(consultExpertsProvider).value ?? const []).any(
                (e) => e.slug == _expert,
              ))
                'expertSlug': ?_expert,
              'availability': windows,
            },
            parse: (d) => '${(d! as Map)['trackingCode']}',
          );
      await ref.read(hapticsProvider).success();
      setState(() => _code = code);
    } catch (e) {
      setState(
        () => _error = describeError(s, e, fallback: s.consult.errSubmit),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final k = s.consult;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final experts = ref.watch(consultExpertsProvider).value ?? const [];

    if (_code case final code?) {
      return CodeIssued(
        title: k.doneTitle,
        body: k.doneBody,
        helpId: 'consult',
        codeLabel: k.codeLabel,
        code: code,
        note: k.codeKeep,
        copyLabel: s.project.copy,
        copiedLabel: s.project.copied,
        trackLabel: k.trackCta,
      );
    }

    Widget chips(
      List<String> values,
      String? selected,
      L10nMap labels,
      ValueChanged<String> onSelect,
    ) => Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final v in values)
          ChoiceChip(
            label: Text(labels.label(v)),
            selected: selected == v,
            onSelected: (_) {
              ref.read(hapticsProvider).selection();
              onSelect(v);
            },
          ),
      ],
    );

    return LeaveGuard(
      isDirty: () => _dirty,
      busy: _sending,
      child: ContentPage(
        title: k.title,
        subtitle: k.subtitle,
        helpId: 'consult',
        children: [
          ContentSection(
            title: k.howTitle,
            children: [
              StepList(
                language: language,
                steps: [
                  for (final step in [
                    k.howSteps.string('one'),
                    k.howSteps.string('two'),
                    k.howSteps.string('three'),
                  ])
                    (step, ''),
                ],
              ),
            ],
          ),
          const SizedBox(height: BaghSpace.section),
          SoftSurface(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _form,
              autovalidateMode: _tried
                  ? AutovalidateMode.always
                  : AutovalidateMode.disabled,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 14,
                children: [
                  Text(k.topicLabel, style: text.titleSmall),
                  chips(
                    _topics,
                    _topic,
                    k.topics,
                    (v) => setState(() => _topic = v),
                  ),
                  Text(k.modeLabel, style: text.titleSmall),
                  chips(
                    _modes,
                    _mode,
                    k.modes,
                    (v) => setState(() => _mode = v),
                  ),
                  TextFormField(
                    controller: _goal,
                    minLines: 2,
                    maxLines: 6,
                    decoration: InputDecoration(
                      labelText: k.goalLabel,
                      helperText: k.goalHint,
                      alignLabelWithHint: true,
                    ),
                  ),
                  TextFormField(
                    controller: _background,
                    minLines: 2,
                    maxLines: 5,
                    decoration: InputDecoration(
                      labelText: k.backgroundLabel,
                      helperText: k.backgroundHint,
                      alignLabelWithHint: true,
                    ),
                  ),
                  if (experts.isNotEmpty)
                    DropdownButtonFormField<String?>(
                      borderRadius: BorderRadius.circular(BaghRadius.field),
                      // A link may name someone who no longer consults.
                      initialValue: experts.any((e) => e.slug == _expert)
                          ? _expert
                          : null,
                      style: text.bodyLarge,
                      isExpanded: true,
                      decoration: InputDecoration(labelText: k.expertLabel),
                      items: [
                        DropdownMenuItem(value: null, child: Text(k.expertAny)),
                        for (final e in experts)
                          DropdownMenuItem(
                            value: e.slug,
                            child: Text(
                              '${e.fullName}${factSep(language)}${e.headline}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                      onChanged: (v) => setState(() => _expert = v),
                    ),
                  Text(k.availabilityTitle, style: text.titleSmall),
                  Text(k.availabilityHint, style: text.bodySmall),
                  for (final (i, (day, part)) in _windows.indexed)
                    SoftSurface(
                      tint: moduleTint(c, i),
                      radius: BaghRadius.tile,
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: 10,
                        children: [
                          DateField(
                            label: k.dayLabel,
                            value: day,
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(
                              const Duration(days: 90),
                            ),
                            onChanged: (d) =>
                                setState(() => _windows[i] = (d, part)),
                          ),
                          Row(
                            children: [
                              Expanded(
                                child: Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: [
                                    for (final p in _parts)
                                      ChoiceChip(
                                        label: Text(k.parts.label(p)),
                                        selected: part == p,
                                        onSelected: (_) => setState(
                                          () => _windows[i] = (day, p),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              if (_windows.length > 1)
                                IconButton(
                                  tooltip: k.removeWindow,
                                  icon: const Icon(Icons.close_rounded),
                                  onPressed: () =>
                                      setState(() => _windows.removeAt(i)),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  if (_windows.length < _maxWindows) ...[
                    BaghKey(
                      label: k.addWindow,
                      icon: Icons.add_rounded,
                      kind: BaghKeyKind.tonal,
                      expand: true,
                      onPressed: () =>
                          setState(() => _windows.add((null, 'MORNING'))),
                    ),
                    Text(
                      k.windowsLeft.fill({
                        'count': localDigits(
                          _maxWindows - _windows.length,
                          language,
                        ),
                      }),
                      style: text.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                  ],
                  TextFormField(
                    controller: _name,
                    autofillHints: const [AutofillHints.name],
                    validator: (v) =>
                        (v ?? '').trim().length >= 2 ? null : s.auth.required,
                    decoration: InputDecoration(labelText: k.nameLabel),
                  ),
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    textDirection: TextDirection.ltr,
                    autofillHints: const [AutofillHints.telephoneNumber],
                    validator: (v) =>
                        RegExp(
                          r'^09\d{9}$',
                        ).hasMatch(toLatinDigits((v ?? '').trim()))
                        ? null
                        : s.project.errPhone,
                    decoration: InputDecoration(
                      labelText: k.phoneLabel,
                      helperText: k.phoneHint,
                      hintText: '09xxxxxxxxx',
                    ),
                  ),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    textDirection: TextDirection.ltr,
                    autofillHints: const [AutofillHints.email],
                    validator: (v) => (v ?? '').trim().isEmpty
                        ? null
                        : Validators(s).email(v),
                    decoration: InputDecoration(labelText: k.emailLabel),
                  ),
                  if (_error != null) FormMessage(_error!),
                  BaghKey(
                    label: k.submit,
                    onPressed: _submit,
                    loading: _sending,
                    expand: true,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
