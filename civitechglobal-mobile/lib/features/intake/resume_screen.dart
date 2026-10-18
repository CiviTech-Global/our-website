import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/attachments_field.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/date_field.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import 'code_issued.dart';

const _disciplines = [
  'FRONTEND',
  'BACKEND',
  'FULLSTACK',
  'MOBILE',
  'DEVOPS',
  'DATA',
  'QA',
  'UI_UX',
  'OTHER',
];
const _arrangements = ['ONSITE', 'HYBRID', 'REMOTE'];

/// What a CV may be: the server reads these three and nothing else.
const _cvTypes = ['pdf', 'docx', 'tex'];

String _digits(String value) =>
    toLatinDigits(value).replaceAll(RegExp(r'\D'), '');

final _url = RegExp(r'^https?://\S+\.\S+', caseSensitive: false);

/// Sending a CV, as the web's JoinUsPage, or applying for an internship or
/// to volunteer, as its VolunteerPage ([programme]). Both go to the same
/// intake (`POST /resumes`, the form as one JSON field and the CV as a
/// file), checked first with the server's rules
/// (civitechglobal-server/src/validators/resume.schema.ts): the programme
/// form also needs the kind of work and the hours a week.
class ResumeScreen extends ConsumerStatefulWidget {
  const ResumeScreen({this.programme = false, super.key});

  final bool programme;

  @override
  ConsumerState<ResumeScreen> createState() => _ResumeScreenState();
}

class _ResumeScreenState extends ConsumerState<ResumeScreen> {
  final _form = GlobalKey<FormState>();
  // After a first attempt, fields re-check as they change, so a fixed
  // mistake stops being flagged.
  bool _tried = false;
  final _emailFocus = FocusNode();

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _city = TextEditingController();
  final _birthYear = TextEditingController();
  final _cover = TextEditingController();
  final _hours = TextEditingController();
  final _duration = TextEditingController();
  final _university = TextEditingController();
  final _field = TextEditingController();
  final _skills = TextEditingController();
  final _github = TextEditingController();
  final _portfolio = TextEditingController();
  final _linkedin = TextEditingController();

  late String _track = widget.programme ? 'INTERNSHIP' : 'JOB';
  String? _discipline;
  String? _arrangement;
  DateTime? _availableFrom;
  List<PickedFile> _cv = const [];

  /// Whether this email has used up its days for this track; asked when the
  /// email is left, so nobody learns it after attaching a file.
  bool _exhausted = false;
  bool _sending = false;
  double? _progress;
  String? _error;
  String? _code;

  @override
  void initState() {
    super.initState();
    _emailFocus.addListener(() {
      if (!_emailFocus.hasFocus) _checkAllowance();
    });
  }

  @override
  void dispose() {
    _emailFocus.dispose();
    for (final c in [
      _name,
      _email,
      _phone,
      _city,
      _birthYear,
      _cover,
      _hours,
      _duration,
      _university,
      _field,
      _skills,
      _github,
      _portfolio,
      _linkedin,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _checkAllowance() async {
    final email = _email.text.trim();
    if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(email)) return;
    try {
      final exhausted = await ref
          .read(apiClientProvider)
          .post(
            '/resumes/allowance',
            body: {'email': email, 'track': _track},
            parse: (d) {
              final m = d! as Map;
              final allowed = (m['daysAllowed'] as num?)?.toInt();
              final used = (m['daysUsed'] as num?)?.toInt() ?? 0;
              return m['known'] == true && allowed != null && used >= allowed;
            },
          );
      if (mounted) setState(() => _exhausted = exhausted);
    } catch (_) {
      // Advisory only: the server decides on submit either way.
      if (mounted) setState(() => _exhausted = false);
    }
  }

  bool get _dirty =>
      [
        _name,
        _email,
        _phone,
        _city,
        _birthYear,
        _cover,
        _hours,
        _duration,
        _university,
        _field,
        _skills,
        _github,
        _portfolio,
        _linkedin,
      ].any((c) => c.text.trim().isNotEmpty) ||
      _cv.isNotEmpty;

  Map<String, Object?> _payload() {
    String? text(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim();
    int? number(TextEditingController c) => int.tryParse(_digits(c.text));
    return {
      'fullName': _name.text.trim(),
      'email': _email.text.trim(),
      'phone': _digits(_phone.text),
      'city': ?text(_city),
      'birthYear': ?number(_birthYear),
      'coverNote': ?text(_cover),
      if (widget.programme) ...{
        'track': _track,
        'discipline': _discipline,
        'hoursPerWeek': number(_hours),
        if (_availableFrom != null) 'availableFrom': isoDay(_availableFrom!),
        'durationMonths': ?number(_duration),
        'arrangement': ?_arrangement,
        'university': ?text(_university),
        'fieldOfStudy': ?text(_field),
        'skills': [
          for (final skill in _skills.text.split(RegExp('[,،]')))
            if (skill.trim().isNotEmpty) skill.trim(),
        ].take(30).toList(),
        'githubUrl': ?text(_github),
        'portfolioUrl': ?text(_portfolio),
        'linkedinUrl': ?text(_linkedin),
      },
    };
  }

  Future<void> _submit() async {
    final s = ref.read(stringsProvider);
    if (!_tried) setState(() => _tried = true);
    final valid = _form.currentState!.validate();
    if (!valid) revealFirstError(_form);
    if (!valid || _cv.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _progress = 0;
      _error = null;
    });
    try {
      final payload = jsonEncode(_payload());
      final parts = await multipartParts(_cv);
      final code = await ref
          .read(apiClientProvider)
          .upload(
            '/resumes',
            form: () =>
                FormData.fromMap({'payload': payload, 'resume': parts().first}),
            onProgress: (p) => setState(() => _progress = p),
            parse: (d) => '${(d! as Map)['trackingCode']}',
          );
      await ref.read(hapticsProvider).success();
      setState(() => _code = code);
    } catch (e) {
      setState(() => _error = describeError(s, e, fallback: s.join.errSubmit));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final j = s.join;
    final v = s.volunteer;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);

    if (_code case final code?) {
      return CodeIssued(
        title: widget.programme ? v.successTitle : j.successTitle,
        body: widget.programme ? v.successBody : j.successBody,
        codeLabel: j.trackingCode,
        code: code,
        copyLabel: j.copy,
        copiedLabel: j.copied,
        trackLabel: j.goTrack,
        homeLabel: j.goHome,
      );
    }

    String? required(String? value) =>
        (value ?? '').trim().length >= 2 ? null : j.errRequired;
    String? url(String? value) {
      final t = (value ?? '').trim();
      return t.isEmpty || _url.hasMatch(t) ? null : v.errUrl;
    }

    final digitsOnly = [
      FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]')),
    ];

    TextFormField field(
      TextEditingController controller,
      String label, {
      String? helper,
      String? hint,
      String? Function(String?)? validator,
      TextInputType? keyboard,
      bool ltr = false,
      int? maxLength,
      int lines = 1,
      FocusNode? focus,
      Iterable<String>? autofill,
    }) => TextFormField(
      controller: controller,
      focusNode: focus,
      validator: validator,
      keyboardType: lines > 1 ? TextInputType.multiline : keyboard,
      textDirection: ltr ? TextDirection.ltr : null,
      minLines: lines,
      maxLines: lines > 1 ? lines + 3 : 1,
      autofillHints: autofill,
      inputFormatters: keyboard == TextInputType.number
          ? [...digitsOnly, LengthLimitingTextInputFormatter(maxLength)]
          : null,
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        helperMaxLines: 3,
        hintText: hint,
        alignLabelWithHint: lines > 1,
      ),
    );

    return LeaveGuard(
      isDirty: () => _dirty,
      busy: _sending,
      child: ContentPage(
        title: widget.programme ? v.title : j.homeTitle,
        subtitle: widget.programme ? v.subtitle : j.subtitle,
        helpId: widget.programme ? 'volunteer' : 'join',
        children: [
          if (widget.programme) ...[
            ContentSection(
              title: v.forWhomTitle,
              children: [
                for (final line in [v.forWhom1, v.forWhom2, v.forWhom3])
                  _Bullet(line),
              ],
            ),
            ContentSection(
              title: v.offerTitle,
              children: [
                for (final line in [v.offer1, v.offer2, v.offer3])
                  _Bullet(line),
              ],
            ),
          ] else
            ContentSection(
              title: j.processTitle,
              subtitle: j.limitNote,
              children: [
                StepList(
                  language: language,
                  steps: [
                    for (final step in [j.step1, j.step2, j.step3]) (step, ''),
                  ],
                ),
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 4,
                  children: [
                    Text(j.moreRoutes, style: text.bodyMedium),
                    TextButton(
                      onPressed: () => openLink(context, ref, '/volunteer'),
                      child: Text(s.nav.volunteer),
                    ),
                    TextButton(
                      onPressed: () => openLink(context, ref, '/jobs'),
                      child: Text(s.nav.jobs),
                    ),
                  ],
                ),
              ],
            ),
          const SizedBox(height: BaghSpace.section),
          Form(
            key: _form,
            autovalidateMode: _tried
                ? AutovalidateMode.always
                : AutovalidateMode.disabled,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: BaghSpace.gutter,
              children: [
                if (_exhausted) FormMessage(j.exhausted),
                if (widget.programme)
                  _Section(
                    title: v.trackLabel,
                    children: [
                      for (final (i, track) in const [
                        'INTERNSHIP',
                        'VOLUNTEER',
                      ].indexed)
                        _TrackChoice(
                          icon: track == 'INTERNSHIP'
                              ? Icons.school_outlined
                              : Icons.volunteer_activism_outlined,
                          title: v.tracks.label(track),
                          body: track == 'INTERNSHIP'
                              ? v.trackInternshipDesc
                              : v.trackVolunteerDesc,
                          tint: moduleTint(c, i),
                          selected: _track == track,
                          onTap: () {
                            ref.read(hapticsProvider).selection();
                            setState(() => _track = track);
                            // The allowance is per track.
                            _checkAllowance();
                          },
                        ),
                    ],
                  ),
                _Section(
                  title: j.sectionYou,
                  children: [
                    field(
                      _name,
                      j.fullName,
                      validator: required,
                      autofill: const [AutofillHints.name],
                    ),
                    field(
                      _email,
                      j.email,
                      helper: j.identityHint,
                      keyboard: TextInputType.emailAddress,
                      ltr: true,
                      focus: _emailFocus,
                      autofill: const [AutofillHints.email],
                      validator: (value) =>
                          RegExp(
                            r'^\S+@\S+\.\S+$',
                          ).hasMatch((value ?? '').trim())
                          ? null
                          : j.errEmail,
                    ),
                    field(
                      _phone,
                      j.phone,
                      hint: '09121234567',
                      keyboard: TextInputType.phone,
                      ltr: true,
                      autofill: const [AutofillHints.telephoneNumber],
                      validator: (value) {
                        final n = _digits(value ?? '').length;
                        return n >= 10 && n <= 20 ? null : j.errPhone;
                      },
                    ),
                    field(_city, j.city),
                    field(
                      _birthYear,
                      j.birthYear,
                      hint: widget.programme ? '2003' : '1995',
                      keyboard: TextInputType.number,
                      ltr: true,
                      maxLength: 4,
                    ),
                  ],
                ),
                if (widget.programme) ...[
                  _Section(
                    title: v.sectionPlacement,
                    children: [
                      DropdownButtonFormField<String>(
                        borderRadius: BorderRadius.circular(BaghRadius.field),
                        initialValue: _discipline,
                        style: text.bodyLarge,
                        isExpanded: true,
                        decoration: InputDecoration(labelText: v.discipline),
                        hint: Text(v.choose),
                        validator: (value) =>
                            value == null ? v.errDiscipline : null,
                        items: [
                          for (final d in _disciplines)
                            DropdownMenuItem(
                              value: d,
                              child: Text(v.disciplines.label(d)),
                            ),
                        ],
                        onChanged: (value) =>
                            setState(() => _discipline = value),
                      ),
                      field(
                        _hours,
                        v.hoursPerWeek,
                        helper: v.hoursHint,
                        hint: '20',
                        keyboard: TextInputType.number,
                        ltr: true,
                        maxLength: 2,
                        validator: (value) {
                          final n = int.tryParse(_digits(value ?? '')) ?? 0;
                          return n >= 1 && n <= 60 ? null : v.errHours;
                        },
                      ),
                      DateField(
                        label: v.availableFrom,
                        value: _availableFrom,
                        firstDate: DateTime.now(),
                        onChanged: (d) => setState(() => _availableFrom = d),
                      ),
                      field(
                        _duration,
                        v.durationMonths,
                        helper: v.durationHint,
                        hint: '6',
                        keyboard: TextInputType.number,
                        ltr: true,
                        maxLength: 2,
                        validator: (value) {
                          final t = _digits(value ?? '');
                          if (t.isEmpty) return null;
                          final n = int.parse(t);
                          return n >= 1 && n <= 24 ? null : v.durationHint;
                        },
                      ),
                      DropdownButtonFormField<String?>(
                        borderRadius: BorderRadius.circular(BaghRadius.field),
                        initialValue: _arrangement,
                        style: text.bodyLarge,
                        isExpanded: true,
                        decoration: InputDecoration(labelText: v.arrangement),
                        items: [
                          DropdownMenuItem(child: Text(v.noPreference)),
                          for (final a in _arrangements)
                            DropdownMenuItem(
                              value: a,
                              child: Text(v.arrangements.label(a)),
                            ),
                        ],
                        onChanged: (value) =>
                            setState(() => _arrangement = value),
                      ),
                    ],
                  ),
                  _Section(
                    title: v.sectionStudy,
                    children: [
                      field(_university, v.university),
                      field(_field, v.fieldOfStudy),
                      field(_skills, v.skills, helper: v.skillsHint),
                      field(
                        _github,
                        v.githubUrl,
                        hint: 'https://github.com/…',
                        keyboard: TextInputType.url,
                        ltr: true,
                        validator: url,
                      ),
                      field(
                        _portfolio,
                        v.portfolioUrl,
                        hint: 'https://…',
                        keyboard: TextInputType.url,
                        ltr: true,
                        validator: url,
                      ),
                      field(
                        _linkedin,
                        v.linkedinUrl,
                        hint: 'https://linkedin.com/in/…',
                        keyboard: TextInputType.url,
                        ltr: true,
                        validator: url,
                      ),
                    ],
                  ),
                ],
                _Section(
                  title: j.sectionResume,
                  hint: j.resumeHint,
                  children: [
                    AttachmentsField(
                      files: _cv,
                      onChanged: (files) => setState(() => _cv = files),
                      extensions: _cvTypes,
                      maxFiles: 1,
                      chooseLabel: j.chooseFile,
                      rulesText: j.fileRules,
                      removeLabel: j.removeFile,
                      tooManyText: j.errFileBig,
                      tooBigText: j.errFileBig,
                      totalTooBigText: j.errFileBig,
                      language: language,
                    ),
                    if (_tried && _cv.isEmpty)
                      Text(
                        j.errFileRequired,
                        style: text.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    field(_cover, j.coverNote, lines: 3),
                  ],
                ),
                if (_error != null) FormMessage(_error!),
                if (_sending)
                  LinearProgressIndicator(
                    value: _progress,
                    minHeight: 6,
                    borderRadius: BorderRadius.circular(3),
                  ),
                BaghKey(
                  label: widget.programme ? v.submit : j.submit,
                  icon: Icons.send_rounded,
                  onPressed: _submit,
                  loading: _sending,
                  expand: true,
                ),
                Text(
                  j.submitHint,
                  style: text.bodySmall?.copyWith(color: c.ink2),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A titled card of fields.
class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children, this.hint});

  final String title;
  final String? hint;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 14,
        children: [
          Text(title, style: text.titleMedium),
          if (hint != null)
            Text(
              hint!,
              style: text.bodySmall?.copyWith(
                color: BaghColors.of(context).ink2,
              ),
            ),
          ...children,
        ],
      ),
    );
  }
}

/// Internship or volunteering: a card that reads as a choice.
class _TrackChoice extends StatelessWidget {
  const _TrackChoice({
    required this.icon,
    required this.title,
    required this.body,
    required this.tint,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String body;
  final GardenTint tint;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final ink = selected ? tint.ink : c.ink;
    return Semantics(
      selected: selected,
      inMutuallyExclusiveGroup: true,
      child: SoftSurface(
        tint: selected ? tint : null,
        radius: BaghRadius.tile,
        onTap: onTap,
        semanticLabel: title,
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 12,
          children: [
            Icon(icon, color: ink),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 4,
                children: [
                  Text(
                    title,
                    style: BaghType.weight(
                      text.titleSmall!,
                      750,
                    ).copyWith(color: ink),
                  ),
                  Text(
                    body,
                    style: text.bodySmall?.copyWith(
                      color: selected ? tint.ink : c.ink2,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              selected
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_unchecked_rounded,
              color: ink,
            ),
          ],
        ),
      ),
    );
  }
}

/// One line of a short list.
class _Bullet extends StatelessWidget {
  const _Bullet(this.line);

  final String line;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 10,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Icon(Icons.circle, size: 7, color: c.primary),
        ),
        Expanded(
          child: Text(line, style: text.bodyMedium?.copyWith(color: c.ink2)),
        ),
      ],
    );
  }
}
