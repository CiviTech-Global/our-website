import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/attachments_field.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/date_field.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import '../insurance/insurance_rules.dart'
    show isValidNationalId, normalizeIranMobile;
import '../intake/track_screen.dart' show StatusPill;
import 'profile_data.dart';

/// The garden tint for a verification status, as the tracking screen's:
/// settled well (0), waiting (2), settled badly (3), not started (1).
int verificationTone(String status) => switch (status) {
  'APPROVED' => 0,
  'PENDING' => 2,
  'REJECTED' => 3,
  _ => 1,
};

final _url = RegExp(r'^https?://\S+\.\S+', caseSensitive: false);

/// Asks the system for one document file; null when nothing was chosen. A
/// provider so a test can hand over a file without the platform picker.
final documentPickerProvider = Provider<Future<PickedFile?> Function()>(
  (ref) => () async {
    final picked = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: documentExtensions,
    );
    if (picked.isEmpty) return null;
    final f = picked.first;
    return PickedFile(
      name: f.name,
      file: f.xFile,
      bytes: await f.xFile.length(),
    );
  },
);

/// One document in the form: its kind, and the file once one is chosen.
class _Document {
  _Document(this.id, this.kind);

  /// Stable across removals, so a row keeps its own state.
  final int id;
  String kind;
  PickedFile? file;
}

/// Identity verification, as the web's VerificationPage: the gate in front
/// of posting, applying and bidding. Where the account stands decides what
/// is shown: approved has nothing to do and pending is waiting (a second
/// submission would only restart the wait), so only "not started" and
/// "rejected" offer the form, a rejection with the reviewer's note above it.
/// The server's rules (civitechglobal-server/src/validators/
/// marketplace.schema.ts) are checked first, so a typo the check digit
/// catches never reaches a reviewer.
class VerificationScreen extends ConsumerStatefulWidget {
  const VerificationScreen({super.key});

  @override
  ConsumerState<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends ConsumerState<VerificationScreen> {
  final _form = GlobalKey<FormState>();
  bool _tried = false;

  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _nationalId = TextEditingController();
  final _phone = TextEditingController();
  final _province = TextEditingController();
  final _city = TextEditingController();
  final _address = TextEditingController();
  final _companyName = TextEditingController();
  final _registrationNo = TextEditingController();
  final _economicCode = TextEditingController();
  final _role = TextEditingController();
  final _website = TextEditingController();

  String _kind = 'INDIVIDUAL';
  DateTime? _birthDate;
  final List<_Document> _documents = [];

  /// Never reused, so a new row never takes over an old row's state.
  int _nextId = 0;
  bool _seeded = false;

  bool _sending = false;
  double? _progress;
  String? _error;
  bool _sent = false;

  List<TextEditingController> get _fields => [
    _firstName,
    _lastName,
    _nationalId,
    _phone,
    _province,
    _city,
    _address,
    _companyName,
    _registrationNo,
    _economicCode,
    _role,
    _website,
  ];

  @override
  void initState() {
    super.initState();
    // A resubmission after a rejection starts from what was sent last time,
    // as far as the server tells it back; the phone from the account.
    ref.listenManual(ownVerificationProvider, (_, next) {
      // Settled answers only: while it reloads, the provider still hands out
      // the previous one, and the "rejected" from before a submission would
      // read as a fresh rejection of it.
      final v = next.value;
      if (v == null || next.isLoading) return;
      // Turned down while this screen was open: the form again, with fresh
      // rows, since the files just sent are the ones that were refused.
      if (_sent && v.canSubmit) {
        _sent = false;
        _resetDocuments();
        if (mounted) setState(() {});
      }
      if (_seeded) return;
      _seeded = true;
      if (v.kind case final kind? when requiredDocuments.containsKey(kind)) {
        _kind = kind;
      }
      _firstName.text = v.legalFirstName ?? '';
      _lastName.text = v.legalLastName ?? '';
      _companyName.text = v.companyName ?? '';
      _phone.text = ref.read(sessionProvider).value?.phone ?? '';
      _resetDocuments();
      if (mounted) setState(() {});
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    for (final c in _fields) {
      c.dispose();
    }
    super.dispose();
  }

  /// One row for each document the account kind needs.
  void _resetDocuments() {
    final required = requiredDocuments[_kind]!;
    _documents
      ..clear()
      ..addAll([for (final k in required) _Document(_nextId++, k)]);
  }

  bool get _dirty =>
      !_sent &&
      ([
            _nationalId,
            _province,
            _city,
            _address,
            _registrationNo,
            _economicCode,
            _role,
            _website,
          ].any((c) => c.text.trim().isNotEmpty) ||
          _birthDate != null ||
          _documents.any((d) => d.file != null));

  int get _totalBytes =>
      _documents.fold(0, (sum, d) => sum + (d.file?.bytes ?? 0));

  /// Takes [file] into [doc] if the server would.
  void _adopt(_Document doc, PickedFile file) {
    final s = ref.read(stringsProvider);
    final others = _totalBytes - (doc.file?.bytes ?? 0);
    final String? problem;
    if (file.bytes > AttachmentRules.maxFileBytes) {
      problem = '${file.name}: ${s.upload.errors.tooLarge}';
    } else if (others + file.bytes > AttachmentRules.maxTotalBytes) {
      problem = s.join.errFileBig;
    } else {
      problem = null;
    }
    if (problem != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(problem)));
      return;
    }
    setState(() => doc.file = file);
  }

  Future<void> _chooseFile(_Document doc) async {
    final picked = await ref.read(documentPickerProvider)();
    if (picked == null || !mounted) return;
    _adopt(doc, picked);
  }

  Map<String, Object?> _payload() {
    String? text(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim();
    final company = _kind == 'COMPANY';
    return {
      'kind': _kind,
      'legalFirstName': _firstName.text.trim(),
      'legalLastName': _lastName.text.trim(),
      'nationalId': toLatinDigits(
        _nationalId.text,
      ).replaceAll(RegExp(r'\D'), ''),
      'phone': normalizeIranMobile(_phone.text),
      // Blank is not absent to the server's schema, and blank is the one
      // that fails: anything empty does not travel.
      if (_birthDate != null) 'birthDate': isoDay(_birthDate!),
      'province': ?text(_province),
      'city': ?text(_city),
      'addressLine': ?text(_address),
      if (company) ...{
        'companyName': ?text(_companyName),
        'companyRegistrationNo': ?text(_registrationNo),
        'companyEconomicCode': ?text(_economicCode),
        'companyRole': ?text(_role),
        'companyWebsite': ?text(_website),
      },
    };
  }

  /// The required kinds no chosen file covers.
  List<String> get _missing {
    final supplied = {
      for (final d in _documents)
        if (d.file != null) d.kind,
    };
    return [
      for (final k in requiredDocuments[_kind]!)
        if (!supplied.contains(k)) k,
    ];
  }

  Future<void> _submit() async {
    final s = ref.read(stringsProvider);
    if (!_tried) setState(() => _tried = true);
    final valid = _form.currentState!.validate();
    if (!valid) revealFirstError(_form);
    if (!valid || _missing.isNotEmpty || _sending) return;
    setState(() {
      _sending = true;
      _progress = 0;
      _error = null;
    });
    try {
      final ready = [
        for (final d in _documents)
          if (d.file != null) d,
      ];
      final parts = await multipartParts([for (final d in ready) d.file!]);
      await ref
          .read(profileActionsProvider)
          .submitVerification(
            payload: jsonEncode(_payload()),
            kinds: jsonEncode([for (final d in ready) d.kind]),
            documents: parts,
            onProgress: (p) => setState(() => _progress = p),
          );
      await ref.read(hapticsProvider).success();
      setState(() => _sent = true);
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final verification = ref.watch(ownVerificationProvider);
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);

    return LeaveGuard(
      isDirty: () => _dirty,
      busy: _sending,
      child: Scaffold(
        appBar: AppBar(
          leading: homeLeading(context),
          title: Text(m.verificationTitle),
          actions: const [HelpAction('verification')],
        ),
        body: SafeArea(
          top: false,
          child: RefreshIndicator(
            color: c.primary,
            onRefresh: () async {
              ref.invalidate(ownVerificationProvider);
              await ref.read(ownVerificationProvider.future);
            },
            child: ListView(
              padding: BaghLayout.readablePadding(
                context,
                top: BaghSpace.gutter,
                bottom: BaghSpace.section * 2,
              ),
              children: [
                Text(
                  m.verificationIntro,
                  style: text.bodyLarge?.copyWith(color: c.ink2),
                ),
                const SizedBox(height: BaghSpace.gutter),
                AsyncView(
                  value: verification,
                  onRetry: () => ref.invalidate(ownVerificationProvider),
                  data: (v) => v == null
                      ? const SizedBox.shrink()
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          spacing: BaghSpace.gutter,
                          children: [
                            _StatusCard(v),
                            // Only while it is still waiting: once judged,
                            // the status card says what happened.
                            if (_sent && v.status == 'PENDING')
                              FormMessage(
                                m.verificationSubmitted,
                                positive: true,
                              )
                            else if (v.canSubmit)
                              _buildForm(context, s),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildForm(BuildContext context, Strings s) {
    final m = s.market;
    final r = s.mobile.fieldRules;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final company = _kind == 'COMPANY';
    String n(int v) => localDigits(v, language);

    String? required(String? v, {int min = 2, int max = 80}) {
      final t = (v ?? '').trim();
      if (t.isEmpty) return r.required;
      if (t.length < min) return r.minChars.fill({'n': n(min)});
      if (t.length > max) return r.maxChars.fill({'n': n(max)});
      return null;
    }

    String? optional(String? v, int max) =>
        (v ?? '').trim().length > max ? r.maxChars.fill({'n': n(max)}) : null;

    TextFormField field(
      TextEditingController controller,
      String label, {
      String? Function(String?)? validator,
      TextInputType? keyboard,
      bool ltr = false,
      String? hint,
      int lines = 1,
      List<TextInputFormatter>? formatters,
      Iterable<String>? autofill,
    }) => TextFormField(
      controller: controller,
      validator: validator,
      keyboardType: lines > 1 ? TextInputType.multiline : keyboard,
      textDirection: ltr ? TextDirection.ltr : null,
      minLines: lines,
      maxLines: lines > 1 ? lines + 2 : 1,
      inputFormatters: formatters,
      autofillHints: autofill,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        alignLabelWithHint: lines > 1,
      ),
    );

    final missing = _missing;
    return Form(
      key: _form,
      autovalidateMode: _tried
          ? AutovalidateMode.always
          : AutovalidateMode.disabled,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: BaghSpace.gutter,
        children: [
          _Section(
            title: m.submitVerification,
            children: [
              Text(m.accountKind, style: text.labelLarge),
              SegmentedButton<String>(
                showSelectedIcon: false,
                segments: [
                  for (final k in requiredDocuments.keys)
                    ButtonSegment(
                      value: k,
                      label: Text(m.label(k)),
                      icon: Icon(
                        k == 'COMPANY'
                            ? Icons.business_outlined
                            : Icons.person_outline_rounded,
                      ),
                    ),
                ],
                selected: {_kind},
                onSelectionChanged: _sending
                    ? null
                    : (next) {
                        ref.read(hapticsProvider).selection();
                        setState(() {
                          _kind = next.first;
                          // Documents follow the kind, but a file already
                          // chosen for a kind still needed is kept.
                          final kept = {
                            for (final d in _documents)
                              if (d.file != null) d.kind: d.file,
                          };
                          _resetDocuments();
                          for (final d in _documents) {
                            d.file = kept[d.kind];
                          }
                        });
                      },
              ),
              field(
                _firstName,
                m.legalFirstName,
                validator: required,
                autofill: const [AutofillHints.givenName],
              ),
              field(
                _lastName,
                m.legalLastName,
                validator: required,
                autofill: const [AutofillHints.familyName],
              ),
              field(
                _nationalId,
                m.nationalId,
                keyboard: TextInputType.number,
                ltr: true,
                hint: '0012345678',
                formatters: [
                  FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]')),
                  LengthLimitingTextInputFormatter(10),
                ],
                validator: (v) {
                  final digits = toLatinDigits(
                    v ?? '',
                  ).replaceAll(RegExp(r'\D'), '');
                  if (digits.length != 10) return r.nationalIdLength;
                  return isValidNationalId(digits) ? null : r.nationalIdCheck;
                },
              ),
              field(
                _phone,
                m.phone,
                keyboard: TextInputType.phone,
                ltr: true,
                hint: '09121234567',
                autofill: const [AutofillHints.telephoneNumber],
                validator: (v) =>
                    normalizeIranMobile(v ?? '') == null ? r.phoneFormat : null,
              ),
              DateField(
                label: m.birthDate,
                value: _birthDate,
                firstDate: DateTime(1900),
                // Nobody was born tomorrow.
                lastDate: DateTime.now(),
                initialDate: DateTime(DateTime.now().year - 30),
                onChanged: (d) => setState(() => _birthDate = d),
              ),
              field(
                _province,
                m.residenceProvince,
                validator: (v) => optional(v, 80),
              ),
              field(
                _city,
                m.residenceCity,
                validator: (v) => optional(v, 80),
                autofill: const [AutofillHints.addressCity],
              ),
              field(
                _address,
                m.address,
                lines: 2,
                validator: (v) => optional(v, 300),
                autofill: const [AutofillHints.fullStreetAddress],
              ),
            ],
          ),
          if (company)
            _Section(
              title: m.label('COMPANY'),
              children: [
                field(
                  _companyName,
                  m.companyName,
                  validator: (v) => required(v, min: 1, max: 160),
                ),
                field(
                  _registrationNo,
                  m.companyRegistrationNo,
                  ltr: true,
                  validator: (v) => required(v, min: 1, max: 40),
                ),
                field(
                  _economicCode,
                  m.companyEconomicCode,
                  ltr: true,
                  validator: (v) => optional(v, 40),
                ),
                field(_role, m.companyRole, validator: (v) => optional(v, 80)),
                field(
                  _website,
                  m.companyWebsite,
                  keyboard: TextInputType.url,
                  ltr: true,
                  hint: 'https://',
                  validator: (v) {
                    final t = (v ?? '').trim();
                    return t.isEmpty || _url.hasMatch(t)
                        ? null
                        : s.volunteer.errUrl;
                  },
                ),
              ],
            ),
          _Section(
            title: m.documents,
            hint: company
                ? m.requiredDocumentsCompany
                : m.requiredDocumentsIndividual,
            children: [
              Text(
                s.upload.accepted.fill({
                  'types': 'PDF, JPG, PNG',
                  // A whole number of megabytes, not «۱۰.۰ MB».
                  'max': localDigits(
                    '${AttachmentRules.maxFileBytes ~/ (1024 * 1024)} MB',
                    language,
                  ),
                }),
                style: text.bodySmall,
              ),
              for (final doc in _documents)
                _DocumentRow(
                  key: ValueKey(doc.id),
                  document: doc,
                  language: language,
                  canRemove: _documents.length > 1,
                  enabled: !_sending,
                  onKind: (k) => setState(() => doc.kind = k),
                  onChooseFile: () => _chooseFile(doc),
                  onClearFile: () => setState(() => doc.file = null),
                  onRemove: () => setState(() => _documents.remove(doc)),
                ),
              if (_documents.length < AttachmentRules.maxFiles)
                BaghKey(
                  label: m.addDocument,
                  icon: Icons.add_rounded,
                  kind: BaghKeyKind.outline,
                  expand: true,
                  onPressed: _sending
                      ? null
                      : () => setState(
                          () => _documents.add(_Document(_nextId++, 'OTHER')),
                        ),
                ),
              if (_tried && missing.isNotEmpty)
                Text(
                  company
                      ? m.requiredDocumentsCompany
                      : m.requiredDocumentsIndividual,
                  style: text.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
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
            label: m.submitVerification,
            icon: Icons.send_rounded,
            onPressed: _submit,
            loading: _sending,
            expand: true,
          ),
        ],
      ),
    );
  }
}

/// Where the account stands, with the reviewer's note when there is one.
class _StatusCard extends ConsumerWidget {
  const _StatusCard(this.verification);

  final OwnVerification verification;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final m = ref.watch(stringsProvider).market;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final status = verification.status;
    final hint = switch (status) {
      'PENDING' => m.verificationPendingHint,
      'APPROVED' => m.verificationApprovedHint,
      'REJECTED' => m.verificationRejectedHint,
      _ => null,
    };
    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                spacing: 8,
                children: [
                  Icon(
                    status == 'APPROVED'
                        ? Icons.verified_rounded
                        : Icons.shield_outlined,
                    size: 20,
                    color: status == 'APPROVED' ? c.primary : c.ink2,
                  ),
                  Flexible(
                    child: Text(m.verificationStatus, style: text.titleSmall),
                  ),
                ],
              ),
              StatusPill(m.label(status), tone: verificationTone(status)),
            ],
          ),
          if (hint != null)
            Text(hint, style: text.bodyMedium?.copyWith(color: c.ink2)),
          if (verification.submittedAt case final at? when status == 'PENDING')
            Text(
              formatDate(at.toLocal(), language),
              style: text.bodySmall?.copyWith(color: c.ink2),
            ),
          if (verification.reviewNote case final note?)
            SoftSurface(
              tint: c.tints[3],
              radius: BaghRadius.tile,
              elevated: false,
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 4,
                children: [
                  Text(
                    m.reviewNote,
                    style: text.labelLarge?.copyWith(color: c.tints[3].ink),
                  ),
                  Text(
                    note,
                    style: text.bodyMedium?.copyWith(color: c.tints[3].ink),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// One document: what it is, and the file or photo standing for it.
class _DocumentRow extends ConsumerWidget {
  const _DocumentRow({
    required this.document,
    required this.language,
    required this.canRemove,
    required this.enabled,
    required this.onKind,
    required this.onChooseFile,
    required this.onClearFile,
    required this.onRemove,
    super.key,
  });

  final _Document document;
  final String language;
  final bool canRemove;
  final bool enabled;
  final ValueChanged<String> onKind;
  final VoidCallback onChooseFile;
  final VoidCallback onClearFile;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final file = document.file;
    final tint = c.tints[documentKinds.indexOf(document.kind) % c.tints.length];
    return SoftSurface(
      tint: tint,
      radius: BaghRadius.tile,
      elevated: false,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Row(
            spacing: 4,
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  borderRadius: BorderRadius.circular(BaghRadius.field),
                  initialValue: document.kind,
                  isExpanded: true,
                  style: text.bodyLarge,
                  decoration: InputDecoration(labelText: m.documentKind),
                  items: [
                    for (final k in documentKinds)
                      DropdownMenuItem(value: k, child: Text(m.label(k))),
                  ],
                  onChanged: enabled ? (k) => onKind(k!) : null,
                ),
              ),
              if (canRemove)
                IconButton(
                  tooltip: m.removeDocument,
                  icon: Icon(Icons.delete_outline_rounded, color: tint.ink),
                  onPressed: enabled ? onRemove : null,
                ),
            ],
          ),
          if (file != null)
            Row(
              spacing: 10,
              children: [
                Icon(Icons.attach_file_rounded, size: 20, color: tint.ink),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        file.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textDirection: TextDirection.ltr,
                        style: text.bodyMedium?.copyWith(color: tint.ink),
                      ),
                      Text(
                        formatBytes(file.bytes, language),
                        style: text.bodySmall?.copyWith(color: tint.ink),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: s.upload.remove,
                  icon: Icon(Icons.close_rounded, color: tint.ink),
                  onPressed: enabled ? onClearFile : null,
                ),
              ],
            )
          else
            BaghKey(
              label: s.upload.choose,
              icon: Icons.upload_file_rounded,
              kind: BaghKeyKind.outline,
              onPressed: enabled ? onChooseFile : null,
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
