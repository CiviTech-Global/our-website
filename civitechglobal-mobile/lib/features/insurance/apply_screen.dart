import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/capabilities.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/motion.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/date_field.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/step_keys.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import '../intake/code_issued.dart';
import 'insurance.dart';
import 'insurance_rules.dart';

/// The request for one product, as the web's InsuranceForm: the product's
/// own questions, then the contact ones, then the phone number, which is
/// proved with a texted code where the server can send one and taken as
/// typed where it cannot. Every question, rule and option comes from the
/// product's schema on the server.
class InsuranceApplyScreen extends ConsumerWidget {
  const InsuranceApplyScreen({
    required this.slug,
    this.initialStep = 0,
    super.key,
  });

  final String slug;

  /// Which step to open on; the layout audit renders each one.
  final int initialStep;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(insuranceProductProvider(slug));
    return switch (product) {
      AsyncData(:final value) => _ApplyForm(
        product: value,
        initialStep: initialStep,
      ),
      _ => Scaffold(
        appBar: AppBar(),
        body: AsyncView(
          value: product,
          onRetry: () => ref.invalidate(insuranceProductProvider(slug)),
          data: (_) => const SizedBox.shrink(),
        ),
      ),
    };
  }
}

class _ApplyForm extends ConsumerStatefulWidget {
  const _ApplyForm({required this.product, required this.initialStep});

  final InsuranceProductDetail product;
  final int initialStep;

  @override
  ConsumerState<_ApplyForm> createState() => _ApplyFormState();
}

class _ApplyFormState extends ConsumerState<_ApplyForm> {
  late final _steps = splitIntoSteps(widget.product.form);
  late int _step = widget.initialStep.clamp(0, _steps.length - 1);
  final Answers _answers = {};
  Map<String, String> _errors = {};
  final _controllers = <String, TextEditingController>{};
  final _fieldKeys = <String, GlobalKey>{};

  /// The number: verified, or as typed where nothing can verify it.
  String? _phone;
  String? _phoneToken;
  bool _sending = false;
  String? _error;
  ({String code, bool callback})? _done;

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _controller(String name) =>
      _controllers.putIfAbsent(name, TextEditingController.new);

  bool get _lastStep => _step == _steps.length - 1;

  void _set(String name, Object? value) {
    final s = ref.read(stringsProvider);
    final language = ref.read(l10nProvider).language;
    setState(() {
      _answers[name] = value;
      // A flagged field is re-checked as it changes, so a fixed mistake
      // stops being flagged at once.
      if (_errors.containsKey(name)) {
        final field = widget.product.form.firstWhere((f) => f.name == name);
        final message = validateField(
          field,
          value,
          s.mobile.fieldRules,
          language,
        );
        _errors = {..._errors}..remove(name);
        if (message != null) _errors[name] = message;
      }
    });
  }

  /// Brings the first flagged question into view, as the web does: on a
  /// long step the mistake is often far above the key.
  void _revealFirstError() {
    final first = _steps[_step].fields
        .where((f) => _errors.containsKey(f.name))
        .map((f) => _fieldKeys[f.name]?.currentContext)
        .nonNulls
        .firstOrNull;
    if (first == null) return;
    Scrollable.ensureVisible(
      first,
      alignment: 0.2,
      duration: reduceMotion(context, ref, watch: false)
          ? Duration.zero
          : BaghDurations.slow,
      curve: Curves.easeOutCubic,
    );
  }

  bool _checkStep() {
    final s = ref.read(stringsProvider);
    final language = ref.read(l10nProvider).language;
    final errors = validateAll(
      _steps[_step].fields,
      _answers,
      s.mobile.fieldRules,
      language,
    );
    setState(() => _errors = errors);
    if (errors.isNotEmpty) _revealFirstError();
    return errors.isEmpty;
  }

  void _next() {
    if (!_checkStep()) {
      ref.read(hapticsProvider).press();
      return;
    }
    ref.read(hapticsProvider).selection();
    setState(() => _step++);
  }

  /// One step back; false on the first step, where back leaves the form.
  bool _stepBack() {
    if (_step == 0) return false;
    setState(() {
      _step--;
      _error = null;
    });
    return true;
  }

  void _back() {
    if (!_stepBack()) Navigator.of(context).maybePop();
  }

  bool get _dirty =>
      _answers.values.any((v) => !isEmptyAnswer(v)) ||
      (_phone ?? '').trim().isNotEmpty;

  Future<void> _submit(bool canSms) async {
    final s = ref.read(stringsProvider);
    final k = s.insurance;
    setState(() => _error = null);
    if (!_checkStep()) return;
    // With a gateway the number must be proved before it is sent; without
    // one there is nothing to prove it with, so the typed number goes as is.
    if (canSms && _phoneToken == null) {
      setState(() => _error = k.verifyPhoneFirst);
      return;
    }
    final typed = normalizeIranMobile(_phone ?? '');
    if (!canSms && typed == null) {
      setState(() => _error = k.phoneInvalid);
      return;
    }
    setState(() => _sending = true);
    try {
      final result = await ref
          .read(apiClientProvider)
          .post(
            '/insurance/requests',
            body: {
              'productSlug': widget.product.product.slug,
              if (canSms) 'phoneToken': _phoneToken else 'phone': typed,
              'answers': buildPayload(widget.product.form, _answers),
            },
            parse: (d) {
              final m = d! as Map;
              return (
                code: '${m['trackingCode']}',
                callback: m['intakeMode'] == 'CALLBACK',
              );
            },
          );
      await ref.read(hapticsProvider).success();
      setState(() => _done = result);
    } catch (e) {
      final fields = e is ApiException
          ? e.fieldErrors
          : const <String, String>{};
      setState(() {
        // The server checks the same questions; when it disagrees, its
        // message belongs beside the field, on the step that asks it.
        if (fields.isNotEmpty) {
          _errors = {...fields};
          final bad = _steps.indexWhere(
            (step) => step.fields.any((f) => fields.containsKey(f.name)),
          );
          if (bad >= 0) _step = bad;
          WidgetsBinding.instance.addPostFrameCallback(
            (_) => _revealFirstError(),
          );
        }
        _error = describeError(s, e, fallback: k.submitFailed);
      });
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final k = s.insurance;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final canSms = ref.watch(capabilitiesProvider).value?.sms ?? false;
    final product = widget.product.product;

    if (_done case final done?) {
      return CodeIssued(
        title: k.submittedTitle,
        body: done.callback ? k.submittedCallbackBody : k.submittedBody,
        codeLabel: k.trackingCode,
        code: done.code,
        note: k.trackingHint,
        copyLabel: k.copyCode,
        copiedLabel: k.copied,
        trackLabel: k.trackNow,
        helpId: 'insurance-product',
      );
    }

    final step = _steps[_step];
    final fields = visibleFields(step.fields, _answers);
    final reduce = reduceMotion(context, ref);

    return LeaveGuard(
      isDirty: () => _dirty,
      stepBack: _stepBack,
      busy: _sending,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            product.titleIn(language),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          actions: const [HelpAction('insurance-product')],
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              if (_steps.length > 1)
                Padding(
                  padding: BaghLayout.readablePadding(context, bottom: 8),
                  child: Row(
                    spacing: 6,
                    children: [
                      for (var i = 0; i < _steps.length; i++)
                        Expanded(
                          child: AnimatedContainer(
                            duration: reduce
                                ? Duration.zero
                                : BaghDurations.slow,
                            height: 6,
                            decoration: BoxDecoration(
                              color: i <= _step ? c.primary : c.hair,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ),
                    ],
                  ),
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
                  child: ListView(
                    key: ValueKey(_step),
                    padding: BaghLayout.readablePadding(
                      context,
                      top: 8,
                      bottom: BaghSpace.section,
                    ),
                    children: [
                      Text(
                        step.key == 'contact' ? k.stepContact : k.stepDetails,
                        style: text.titleLarge,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        step.key == 'contact'
                            ? k.stepContactHint
                            : k.stepDetailsHint,
                        style: text.bodyMedium?.copyWith(color: c.ink2),
                      ),
                      if (product.callback && _step == 0) ...[
                        const SizedBox(height: BaghSpace.gutter),
                        FormMessage(k.callbackExplainer, positive: true),
                      ],
                      const SizedBox(height: BaghSpace.gutter),
                      for (final field in fields) ...[
                        _FieldInput(
                          key: _fieldKeys.putIfAbsent(
                            field.name,
                            GlobalKey.new,
                          ),
                          field: field,
                          value: _answers[field.name],
                          error: _errors[field.name],
                          controller: _controller(field.name),
                          onChanged: (value) => _set(field.name, value),
                        ),
                        const SizedBox(height: 14),
                      ],
                      if (_lastStep)
                        canSms
                            ? _PhoneVerification(
                                verifiedPhone: _phoneToken == null
                                    ? null
                                    : _phone,
                                onVerified: (phone, token) => setState(() {
                                  _phone = phone;
                                  _phoneToken = token;
                                  _error = null;
                                }),
                              )
                            : _PhoneOnly(
                                value: _phone ?? '',
                                onChanged: (value) => setState(() {
                                  _phone = value;
                                  _error = null;
                                }),
                              ),
                    ],
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
                    StepKeys(
                      backLabel: _step == 0
                          ? s.common.cancel
                          : s.common.previous,
                      onBack: _sending ? null : _back,
                      forward: _lastStep
                          ? BaghKey(
                              label: product.callback
                                  ? k.submitCallback
                                  : k.submitRequest,
                              expand: true,
                              loading: _sending,
                              // Held back only while a code is owed.
                              onPressed: canSms && _phoneToken == null
                                  ? null
                                  : () => _submit(canSms),
                            )
                          : BaghKey(
                              label: s.common.next,
                              expand: true,
                              onPressed: _next,
                            ),
                    ),
                    if (_steps.length > 1)
                      Text(
                        s.mobile.stepOf.fill({
                          'n': localDigits(_step + 1, language),
                          'total': localDigits(_steps.length, language),
                        }),
                        style: text.bodySmall?.copyWith(color: c.ink2),
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
}

/// One question, drawn for its type.
class _FieldInput extends ConsumerWidget {
  const _FieldInput({
    required this.field,
    required this.value,
    required this.error,
    required this.controller,
    required this.onChanged,
    super.key,
  });

  final FieldDef field;
  final Object? value;
  final String? error;
  final TextEditingController controller;
  final ValueChanged<Object?> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final base = field.labelIn(language);
    final label = field.required ? base : '$base (${s.mobile.optional})';
    final help = field.helpIn(language);
    final unit = field.unitIn(language);

    InputDecoration decoration({String? hint}) => InputDecoration(
      labelText: label,
      helperText: help,
      helperMaxLines: 4,
      errorText: error,
      errorMaxLines: 3,
      hintText: hint,
      suffixText: unit,
      alignLabelWithHint: field.type == 'textarea',
    );

    Widget digitsField({
      required List<TextInputFormatter> formatters,
      int? maxLength,
      String? hint,
      TextInputType keyboard = TextInputType.number,
    }) => TextField(
      controller: controller,
      keyboardType: keyboard,
      textDirection: TextDirection.ltr,
      inputFormatters: [
        ...formatters,
        if (maxLength != null) LengthLimitingTextInputFormatter(maxLength),
      ],
      onChanged: onChanged,
      decoration: decoration(hint: hint),
    );

    final digitsOnly = FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]'));

    switch (field.type) {
      case 'textarea':
        return TextField(
          controller: controller,
          minLines: 3,
          maxLines: 8,
          maxLength: field.maxLength,
          keyboardType: TextInputType.multiline,
          onChanged: onChanged,
          decoration: decoration(),
        );

      case 'select':
        return DropdownButtonFormField<String>(
          borderRadius: BorderRadius.circular(BaghRadius.field),
          initialValue: value as String?,
          isExpanded: true,
          style: text.bodyLarge,
          hint: Text(s.mobile.select),
          decoration: decoration(),
          items: [
            for (final o in field.options)
              DropdownMenuItem(
                value: o.value,
                child: Text(language == 'fa' ? o.label : o.labelEn),
              ),
          ],
          onChanged: onChanged,
        );

      case 'multiselect':
        final chosen = value is List
            ? [for (final v in value! as List) '$v']
            : <String>[];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 8,
          children: [
            Text(label, style: text.titleSmall),
            if (help != null)
              Text(help, style: text.bodySmall?.copyWith(color: c.ink2)),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final o in field.options)
                  FilterChip(
                    label: Text(language == 'fa' ? o.label : o.labelEn),
                    selected: chosen.contains(o.value),
                    onSelected: (on) {
                      ref.read(hapticsProvider).selection();
                      onChanged(
                        on
                            ? [...chosen, o.value]
                            : [...chosen.where((v) => v != o.value)],
                      );
                    },
                  ),
              ],
            ),
            if (error != null)
              Text(error!, style: text.bodySmall?.copyWith(color: c.error)),
          ],
        );

      case 'bool':
        return SoftSurface(
          radius: BaghRadius.tile,
          elevated: false,
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: SwitchListTile(
            title: Text(label),
            subtitle: help == null && error == null
                ? null
                : Text(
                    error ?? help!,
                    style: error == null ? null : TextStyle(color: c.error),
                  ),
            value: value == true,
            onChanged: (on) {
              ref.read(hapticsProvider).selection();
              onChanged(on);
            },
          ),
        );

      case 'date':
        DateTime? bound(Object? b) => b == 'today'
            ? DateTime.now()
            : b is String
            ? DateTime.tryParse(b)
            : null;
        return DateField(
          label: label,
          value: value is String ? DateTime.tryParse(value! as String) : null,
          firstDate: bound(field.min),
          lastDate: bound(field.max),
          errorText: error,
          onChanged: (d) => onChanged(d == null ? null : isoDay(d)),
        );

      case 'currency':
        return digitsField(
          formatters: [digitsOnly, const _ThousandsFormatter()],
        );

      case 'number':
        return digitsField(
          formatters: [
            FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩.]')),
          ],
          keyboard: const TextInputType.numberWithOptions(decimal: true),
        );

      case 'nationalId':
        return digitsField(formatters: [digitsOnly], maxLength: 10);

      case 'phone':
        return digitsField(
          formatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[0-9۰-۹٠-٩+\s]')),
          ],
          keyboard: TextInputType.phone,
          hint: '09xxxxxxxxx',
        );

      default:
        return TextField(
          controller: controller,
          // Held to the limit without a counter under every line.
          inputFormatters: [
            if (field.maxLength case final max?)
              LengthLimitingTextInputFormatter(max),
          ],
          onChanged: onChanged,
          decoration: decoration(),
        );
    }
  }
}

/// Groups an amount by thousands as it is typed.
class _ThousandsFormatter extends TextInputFormatter {
  const _ThousandsFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final grouped = groupThousands(newValue.text);
    return TextEditingValue(
      text: grouped,
      selection: TextSelection.collapsed(offset: grouped.length),
    );
  }
}

/// Proving the number: a code is texted, typed back, and exchanged for a
/// token the request is sent with.
class _PhoneVerification extends ConsumerStatefulWidget {
  const _PhoneVerification({
    required this.verifiedPhone,
    required this.onVerified,
  });

  final String? verifiedPhone;
  final void Function(String phone, String token) onVerified;

  @override
  ConsumerState<_PhoneVerification> createState() => _PhoneVerificationState();
}

class _PhoneVerificationState extends ConsumerState<_PhoneVerification> {
  final _phone = TextEditingController();
  final _code = TextEditingController();
  final _codeFocus = FocusNode();
  bool _sent = false;
  bool _busy = false;
  int _seconds = 0;
  Timer? _timer;
  String? _error;

  @override
  void dispose() {
    _timer?.cancel();
    _phone.dispose();
    _code.dispose();
    _codeFocus.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final k = ref.read(stringsProvider).insurance;
    final s = ref.read(stringsProvider);
    final phone = normalizeIranMobile(_phone.text);
    if (phone == null) {
      setState(() => _error = k.phoneInvalid);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final devCode = await ref
          .read(apiClientProvider)
          .post(
            '/insurance/otp/send',
            body: {'phone': phone},
            parse: (d) => (d as Map?)?['devCode'] as String?,
          );
      setState(() {
        _sent = true;
        _seconds = 60;
      });
      _timer?.cancel();
      _timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (!mounted || _seconds <= 1) t.cancel();
        if (mounted) setState(() => _seconds--);
      });
      // Outside production, with no gateway, the server returns the code
      // so the flow can be followed; it still has to be typed back.
      if (devCode != null && mounted) await _showDevCode(devCode);
      if (mounted) _codeFocus.requestFocus();
    } catch (e) {
      setState(() => _error = describeError(s, e, fallback: k.otpSendFailed));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    final s = ref.read(stringsProvider);
    final k = s.insurance;
    final phone = normalizeIranMobile(_phone.text);
    if (phone == null) {
      setState(() => _error = k.phoneInvalid);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final token = await ref
          .read(apiClientProvider)
          .post(
            '/insurance/otp/verify',
            body: {'phone': phone, 'code': toLatinDigits(_code.text)},
            parse: (d) => '${(d! as Map)['phoneToken']}',
          );
      await ref.read(hapticsProvider).success();
      widget.onVerified(phone, token);
    } catch (e) {
      setState(() => _error = describeError(s, e, fallback: k.otpVerifyFailed));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showDevCode(String code) {
    final k = ref.read(stringsProvider).insurance;
    return showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(k.devCodeTitle),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: 16,
          children: [
            Text(k.devCodeHint),
            SelectableText(
              code,
              textDirection: TextDirection.ltr,
              style: Theme.of(
                context,
              ).textTheme.headlineMedium?.copyWith(letterSpacing: 8),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Clipboard.setData(ClipboardData(text: code)),
            child: Text(k.devCodeCopy),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(k.devCodeClose),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final k = s.insurance;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;

    if (widget.verifiedPhone case final phone?) {
      return SoftSurface(
        tint: c.primarySoft,
        radius: BaghRadius.tile,
        child: Row(
          spacing: 12,
          children: [
            Icon(Icons.verified_rounded, color: c.primarySoft.ink),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    k.phoneVerified,
                    style: text.titleSmall?.copyWith(color: c.primarySoft.ink),
                  ),
                  Text(phone, textDirection: TextDirection.ltr),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return SoftSurface(
      radius: BaghRadius.tile,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 10,
            children: [
              Icon(Icons.verified_user_outlined, color: c.primary),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 4,
                  children: [
                    Text(k.verifyPhoneTitle, style: text.titleSmall),
                    Text(
                      k.verifyPhoneHint,
                      style: text.bodySmall?.copyWith(color: c.ink2),
                    ),
                  ],
                ),
              ),
            ],
          ),
          TextField(
            controller: _phone,
            enabled: !_sent,
            keyboardType: TextInputType.phone,
            textDirection: TextDirection.ltr,
            autofillHints: const [AutofillHints.telephoneNumber],
            decoration: InputDecoration(
              labelText: k.phoneLabel,
              hintText: '09121234567',
            ),
          ),
          BaghKey(
            label: _sent && _seconds > 0
                ? localDigits('$_seconds s', language)
                : _sent
                ? k.resendCode
                : k.sendCode,
            icon: Icons.sms_outlined,
            kind: BaghKeyKind.tonal,
            expand: true,
            loading: _busy && !_sent,
            onPressed: _sent && _seconds > 0 ? null : _send,
          ),
          if (_sent) ...[
            TextField(
              controller: _code,
              focusNode: _codeFocus,
              keyboardType: TextInputType.number,
              textDirection: TextDirection.ltr,
              textAlign: TextAlign.center,
              autofillHints: const [AutofillHints.oneTimeCode],
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]')),
                LengthLimitingTextInputFormatter(6),
              ],
              onChanged: (_) => setState(() {}),
              style: text.titleLarge?.copyWith(letterSpacing: 8),
              decoration: InputDecoration(labelText: k.codeLabel),
            ),
            BaghKey(
              label: k.verifyCode,
              expand: true,
              loading: _busy,
              onPressed: _code.text.length == 6 ? _verify : null,
            ),
            TextButton(
              onPressed: () {
                _timer?.cancel();
                setState(() {
                  _sent = false;
                  _seconds = 0;
                  _code.clear();
                  _error = null;
                });
              },
              child: Text(k.changeNumber),
            ),
          ],
          if (_error != null)
            Text(_error!, style: text.bodySmall?.copyWith(color: c.error)),
        ],
      ),
    );
  }
}

/// The number, where nothing can text a code to it: asked plainly, with a
/// word on what happens next, since nothing will arrive on this phone.
class _PhoneOnly extends ConsumerStatefulWidget {
  const _PhoneOnly({required this.value, required this.onChanged});

  final String value;
  final ValueChanged<String> onChanged;

  @override
  ConsumerState<_PhoneOnly> createState() => _PhoneOnlyState();
}

class _PhoneOnlyState extends ConsumerState<_PhoneOnly> {
  late final _controller = TextEditingController(text: widget.value);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final k = ref.watch(stringsProvider).insurance;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return SoftSurface(
      radius: BaghRadius.tile,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          TextField(
            controller: _controller,
            keyboardType: TextInputType.phone,
            textDirection: TextDirection.ltr,
            autofillHints: const [AutofillHints.telephoneNumber],
            onChanged: widget.onChanged,
            decoration: InputDecoration(
              labelText: k.phoneLabel,
              hintText: '09xxxxxxxxx',
            ),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 8,
            children: [
              Icon(Icons.info_outline_rounded, size: 18, color: c.ink2),
              Expanded(
                child: Text(
                  k.noSmsNotice,
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
