import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/files.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import '../profile/profile_data.dart';
import 'companies.dart' show companyIndustries;
import 'employer_data.dart';

/// The employer's company page, written from the app, as the web's
/// MyCompanyPage: one form whether the page exists yet or not, since there
/// is one per account and the first save creates it.
class MyCompanyScreen extends ConsumerWidget {
  const MyCompanyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final company = ref.watch(ownCompanyProvider);
    final verification = ref.watch(ownVerificationProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(j.myCompany),
        actions: const [HelpAction('my-jobs')],
      ),
      body: AsyncView(
        value: company,
        onRetry: () => ref.invalidate(ownCompanyProvider),
        data: (saved) => switch (verification.value) {
          // The form needs a verified identity; until the answer arrives,
          // nothing is shown rather than a form that then vanishes.
          null => const SizedBox.shrink(),
          final v when v.status != 'APPROVED' => _Intro(
            company: saved,
            needsVerification: true,
          ),
          _ => _CompanyForm(saved: saved),
        },
      ),
    );
  }
}

/// What sits above the form, or alone when there can be no form: the
/// introduction, the way to the public page, and why it may be hidden.
class _Intro extends ConsumerWidget {
  const _Intro({required this.company, this.needsVerification = false});

  final OwnCompany? company;
  final bool needsVerification;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final page = company;
    final notice = c.tints[1];
    final children = [
      Text(j.myCompanyIntro, style: text.bodyMedium?.copyWith(color: c.ink2)),
      if (page != null && !page.hidden && page.slug.isNotEmpty)
        BaghKey(
          label: j.viewPublicPage,
          icon: Icons.open_in_new_rounded,
          kind: BaghKeyKind.outline,
          expand: true,
          onPressed: () => context.push('/companies/${page.slug}'),
        ),
      if (page?.hidden ?? false)
        SoftSurface(
          tint: notice,
          elevated: false,
          padding: const EdgeInsets.all(16),
          child: Row(
            spacing: 10,
            children: [
              Icon(Icons.visibility_off_outlined, color: notice.ink),
              Expanded(
                child: Text(
                  j.companyHiddenNotice,
                  style: text.bodyMedium?.copyWith(color: notice.ink),
                ),
              ),
            ],
          ),
        ),
      if (needsVerification)
        SoftSurface(
          tint: notice,
          elevated: false,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              Text(
                j.companyNeedsVerification,
                style: text.bodyMedium?.copyWith(color: notice.ink),
              ),
              BaghKey(
                label: s.market.goToVerification,
                icon: Icons.verified_user_outlined,
                kind: BaghKeyKind.outline,
                expand: true,
                onPressed: () => context.push('/dashboard/verification'),
              ),
            ],
          ),
        ),
    ];
    if (!needsVerification) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: BaghSpace.gutter,
        children: children,
      );
    }
    return ListView(
      padding: BaghLayout.readablePadding(
        context,
        top: BaghSpace.gutter,
        bottom: BaghSpace.section * 2,
      ),
      children: [
        for (final child in children) ...[
          child,
          const SizedBox(height: BaghSpace.gutter),
        ],
      ],
    );
  }
}

class _CompanyForm extends ConsumerStatefulWidget {
  const _CompanyForm({required this.saved});

  final OwnCompany? saved;

  @override
  ConsumerState<_CompanyForm> createState() => _CompanyFormState();
}

class _CompanyFormState extends ConsumerState<_CompanyForm> {
  final _form = GlobalKey<FormState>();
  late final OwnCompany? _c = widget.saved;
  late String _name = _c?.name ?? '';
  late String _tagline = _c?.tagline ?? '';
  late String _about = _c?.about ?? '';
  late String _industry = _c?.industry ?? '';
  late String _size = _c?.size ?? '';
  late String _founded = _c?.foundedYear?.toString() ?? '';
  late String _website = _c?.website ?? '';
  late String _country = _c?.country ?? homeCountry;
  late String _province = _c?.province ?? '';
  late String _city = _c?.city ?? '';
  PreparedImage? _logo;
  PreparedImage? _cover;

  /// The form as it opened; taken in initState, not lazily on Back.
  late final String _start;

  @override
  void initState() {
    super.initState();
    _start = _snapshot();
  }

  bool _tried = false;
  bool _sending = false;
  double? _progress;
  String? _error;
  Map<String, String> _serverErrors = const {};

  /// What the form sends. Blank means "remove it": the server clears a
  /// field sent empty.
  Map<String, Object?> _payload() {
    String? text(String v) => v.trim().isEmpty ? null : v.trim();
    return {
      'name': _name.trim(),
      'tagline': text(_tagline),
      'about': text(_about),
      'industry': text(_industry),
      'size': text(_size),
      'foundedYear': text(plainDigits(_founded)),
      'website': text(_website),
      'country': _country,
      'province': text(_province),
      'city': text(_city),
    };
  }

  String _snapshot() => jsonEncode(_payload());

  bool get _dirty => _snapshot() != _start || _logo != null || _cover != null;

  void _change(String field, VoidCallback apply) => setState(() {
    apply();
    if (_serverErrors.containsKey(field)) {
      _serverErrors = {..._serverErrors}..remove(field);
    }
  });

  Future<void> _save() async {
    final s = ref.read(stringsProvider);
    if (!_tried) setState(() => _tried = true);
    if (!_form.currentState!.validate()) {
      revealFirstError(_form);
      return;
    }
    setState(() {
      _sending = true;
      _progress = null;
      _error = null;
    });
    try {
      await ref
          .read(employerActionsProvider)
          .saveCompany(
            _payload(),
            logo: _logo,
            cover: _cover,
            onProgress: _logo == null && _cover == null
                ? null
                : (p) => setState(() => _progress = p),
          );
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.jobs.companySaved)));
      // Back where it was opened from; opened from a website link, it stays.
      final navigator = Navigator.of(context);
      if (navigator.canPop()) navigator.pop();
    } catch (e) {
      setState(() {
        _serverErrors = e is ApiException ? e.fieldErrors : const {};
        _error = describeError(s, e);
      });
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final j = s.jobs;
    final m = s.market;
    final rules = s.mobile.fieldRules;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final text = Theme.of(context).textTheme;
    final thisYear = DateTime.now().year;
    String n(int v) => localDigits(v, language);

    Widget field({
      required String key,
      required String label,
      required String value,
      required ValueChanged<String> onChanged,
      String? Function(String?)? validator,
      String? hint,
      int lines = 1,
      int? maxLength,
      bool number = false,
      bool ltr = false,
    }) => TextFormField(
      key: ValueKey(key),
      initialValue: value,
      onChanged: (v) => _change(key, () => onChanged(v)),
      validator: (v) => validator?.call(v) ?? _serverErrors[key],
      minLines: lines,
      maxLines: lines > 1 ? lines + 4 : 1,
      maxLength: maxLength,
      keyboardType: lines > 1
          ? TextInputType.multiline
          : number
          ? TextInputType.number
          : ltr
          ? TextInputType.url
          : null,
      textDirection: number || ltr
          ? TextDirection.ltr
          : textDirectionOf(value, Directionality.of(context)),
      inputFormatters: number
          ? [FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]'))]
          : null,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        alignLabelWithHint: lines > 1,
        counterText: '',
      ),
    );

    Widget choice({
      required String key,
      required String label,
      required String value,
      required List<(String, String)> options,
      required ValueChanged<String> onChanged,
    }) => DropdownButtonFormField<String>(
      key: ValueKey(key),
      borderRadius: BorderRadius.circular(BaghRadius.field),
      initialValue: value,
      isExpanded: true,
      style: text.bodyLarge,
      decoration: InputDecoration(labelText: label),
      validator: (_) => _serverErrors[key],
      items: [
        const DropdownMenuItem(value: '', child: Text('—')),
        for (final (v, l) in options)
          DropdownMenuItem(
            value: v,
            child: Text(l, overflow: TextOverflow.ellipsis),
          ),
      ],
      onChanged: (v) => _change(key, () => onChanged(v ?? '')),
    );

    Widget picker({
      required String key,
      required String label,
      required String shown,
      required List<(String, String)> options,
      required ValueChanged<String> onPicked,
    }) => FormField<String>(
      key: ValueKey(key),
      validator: (_) => _serverErrors[key],
      builder: (state) => InkWell(
        borderRadius: BorderRadius.circular(BaghRadius.field),
        onTap: () async {
          FocusScope.of(context).unfocus();
          final picked = await pickFromList(
            context,
            title: label,
            all: '—',
            searchable: true,
            options: options,
          );
          // Closing the sheet hands focus back to the field that last had it.
          FocusManager.instance.primaryFocus?.unfocus();
          if (picked != null) _change(key, () => onPicked(picked));
        },
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            errorText: state.errorText,
            suffixIcon: const Icon(Icons.arrow_drop_down_rounded),
          ),
          isEmpty: shown.isEmpty,
          child: Text(shown, style: text.bodyLarge),
        ),
      ),
    );

    final form = Form(
      key: _form,
      autovalidateMode: _tried
          ? AutovalidateMode.always
          : AutovalidateMode.disabled,
      child: SoftSurface(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 14,
          children: [
            _ImageField(
              label: j.logo,
              which: 'logo',
              hasSaved: _c?.hasLogo ?? false,
              picked: _logo,
              onPicked: (image) => setState(() => _logo = image),
              square: true,
            ),
            _ImageField(
              label: j.cover,
              which: 'cover',
              hasSaved: _c?.hasCover ?? false,
              picked: _cover,
              onPicked: (image) => setState(() => _cover = image),
            ),
            field(
              key: 'name',
              label: j.companyName,
              value: _name,
              maxLength: 120,
              onChanged: (v) => _name = v,
              validator: (v) {
                final t = (v ?? '').trim();
                if (t.isEmpty) return rules.required;
                return t.length < 2 ? rules.minChars.fill({'n': n(2)}) : null;
              },
            ),
            field(
              key: 'tagline',
              label: j.tagline,
              value: _tagline,
              maxLength: 160,
              onChanged: (v) => _tagline = v,
            ),
            field(
              key: 'about',
              label: j.about,
              value: _about,
              lines: 6,
              maxLength: 5000,
              onChanged: (v) => _about = v,
            ),
            choice(
              key: 'industry',
              label: j.industry,
              value: _industry,
              options: [
                for (final i in companyIndustries) (i, j.industries.label(i)),
              ],
              onChanged: (v) => _industry = v,
            ),
            choice(
              key: 'size',
              label: j.companySize,
              value: _size,
              options: [
                for (final size in companySizes)
                  (size, j.companySizes.label(size)),
              ],
              onChanged: (v) => _size = v,
            ),
            field(
              key: 'foundedYear',
              label: j.founded,
              value: _founded,
              number: true,
              maxLength: 4,
              onChanged: (v) => _founded = v,
              // Either calendar: an Iranian company says ۱۳۸۵, a foreign one
              // 2006.
              validator: (v) {
                final digits = plainDigits(v ?? '');
                if (digits.isEmpty) return null;
                final year = int.tryParse(digits) ?? 0;
                if (year < 1200) return rules.atLeast.fill({'n': n(1200)});
                if (year > thisYear) {
                  return rules.atMost.fill({'n': n(thisYear)});
                }
                return null;
              },
            ),
            field(
              key: 'website',
              label: j.website,
              hint: 'https://',
              value: _website,
              ltr: true,
              onChanged: (v) => _website = v,
            ),
            picker(
              key: 'country',
              label: j.country,
              shown: geo.country(_country),
              options: geo.countryOptions(),
              onPicked: (code) {
                if (code.isEmpty) return;
                _country = code;
                _province = '';
              },
            ),
            if (_country == homeCountry)
              picker(
                key: 'province',
                label: m.province,
                shown: _province.isEmpty
                    ? ''
                    : displayProvince(_province, language),
                options: [
                  if (_province.isNotEmpty &&
                      !iranProvinces.any((p) => p.fa == _province))
                    (_province, _province),
                  for (final p in iranProvinces)
                    (p.fa, provinceLabel(p, language)),
                ],
                onPicked: (fa) => _province = fa,
              )
            else
              field(
                key: 'region-$_country',
                label: j.region,
                value: _province,
                maxLength: 80,
                onChanged: (v) => _province = v,
              ),
            field(
              key: 'city',
              label: m.city,
              value: _city,
              maxLength: 80,
              onChanged: (v) => _city = v,
            ),
            if (_error case final error?) FormMessage(error),
            if (_sending && _progress != null)
              LinearProgressIndicator(
                value: _progress,
                minHeight: 6,
                borderRadius: BorderRadius.circular(3),
              ),
            BaghKey(
              label: j.saveCompany,
              icon: Icons.save_outlined,
              loading: _sending,
              expand: true,
              onPressed: _save,
            ),
          ],
        ),
      ),
    );

    return LeaveGuard(
      isDirty: () => _dirty,
      busy: _sending,
      child: SafeArea(
        top: false,
        child: ListView(
          padding: BaghLayout.readablePadding(
            context,
            top: BaghSpace.gutter,
            bottom: BaghSpace.section * 2,
          ),
          children: [
            _Intro(company: _c),
            const SizedBox(height: BaghSpace.gutter),
            form,
          ],
        ),
      ),
    );
  }
}

/// A logo or a cover: the one on file, or the one just picked, and the key
/// to choose another. A picked photo is shrunk on the phone first, the way
/// the web does, so a camera picture fits the server's limit.
class _ImageField extends ConsumerStatefulWidget {
  const _ImageField({
    required this.label,
    required this.which,
    required this.hasSaved,
    required this.picked,
    required this.onPicked,
    this.square = false,
  });

  final String label;

  /// logo or cover, as the server names it.
  final String which;
  final bool hasSaved;
  final PreparedImage? picked;
  final ValueChanged<PreparedImage> onPicked;
  final bool square;

  @override
  ConsumerState<_ImageField> createState() => _ImageFieldState();
}

class _ImageFieldState extends ConsumerState<_ImageField> {
  bool _shrinking = false;

  Future<void> _choose() async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    final picked = await FilePicker.pickFiles(type: FileType.image);
    final file = picked.firstOrNull;
    if (file == null || !mounted) return;
    setState(() => _shrinking = true);
    try {
      widget.onPicked(await prepareImage(file.xFile.path, file.name));
    } on ImageNotReady catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            e.problem == ImageProblem.tooLarge
                ? s.upload.errors.imageTooLarge
                : s.upload.errors.unreadableImage,
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _shrinking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final saved = widget.hasSaved && widget.picked == null
        ? ref.watch(ownCompanyImageProvider(widget.which)).value
        : null;
    final bytes = widget.picked?.bytes ?? saved;
    final size = widget.square ? 96.0 : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 8,
      children: [
        Text(widget.label, style: text.labelLarge),
        ClipRRect(
          borderRadius: BorderRadius.circular(BaghRadius.tile),
          child: Container(
            width: size,
            height: size ?? 120,
            color: c.fill,
            child: _shrinking
                ? const Center(child: CircularProgressIndicator())
                : bytes == null
                ? Icon(
                    widget.square
                        ? Icons.business_rounded
                        : Icons.image_outlined,
                    color: c.ink2,
                    size: 36,
                  )
                : Image.memory(
                    bytes,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    gaplessPlayback: true,
                  ),
          ),
        ),
        BaghKey(
          label: bytes == null ? s.upload.chooseImage : s.upload.replace,
          icon: Icons.photo_library_outlined,
          kind: BaghKeyKind.outline,
          onPressed: _shrinking ? null : _choose,
        ),
      ],
    );
  }
}
