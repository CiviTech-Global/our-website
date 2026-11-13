import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/session.dart';
import '../../core/capabilities.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../l10n/l10n.dart';
import 'account_page.dart';

/// "Forgot your password?": asks for the address and says the same thing
/// whether or not an account has it, as the server does. When this
/// deployment cannot send email, the form is not offered at all.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _form = GlobalKey<FormState>();
  // After a first attempt, fields re-check as they change, so a fixed
  // mistake stops being flagged.
  bool _tried = false;
  final _email = TextEditingController();
  bool _busy = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_tried) setState(() => _tried = true);
    if (_busy || !_form.currentState!.validate()) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(accountRecoveryProvider).forgotPassword(_email.text);
      await ref.read(hapticsProvider).success();
      setState(() => _sent = true);
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider.select((l) => l.language));
    final caps = ref.watch(capabilitiesProvider);

    if (caps.isLoading) {
      return const Scaffold(body: Center(child: GirihSpinner()));
    }
    final canEmail = caps.value?.email ?? false;
    final canSms = caps.value?.sms ?? false;
    // Without email, a code by SMS is the only way back in.
    if (!canEmail && canSms) return const SmsResetScreen(emailToo: false);
    if (!canEmail) {
      return AccountPage(
        title: s.auth.emailUnavailableTitle,
        helpId: 'password-reset',
        children: [
          Text(s.auth.emailUnavailableBody),
          BaghKey(
            label: s.auth.emailUnavailableCta,
            kind: BaghKeyKind.outline,
            expand: true,
            onPressed: () => launchUrl(
              AppConfig.website('/contact', language),
              mode: LaunchMode.externalApplication,
            ),
          ),
        ],
      );
    }
    if (_sent) {
      return AccountPage(
        title: s.auth.forgotSentTitle,
        helpId: 'password-reset',
        children: [
          FormMessage(s.auth.forgotSentBody, positive: true),
          Text(s.auth.forgotSentHint),
          BaghKey(
            label: s.auth.backToLogin,
            kind: BaghKeyKind.outline,
            expand: true,
            onPressed: () => context.pop(),
          ),
        ],
      );
    }
    return AccountPage(
      title: s.auth.forgotTitle,
      subtitle: s.auth.forgotSubtitle,
      helpId: 'password-reset',
      children: [
        Form(
          key: _form,
          autovalidateMode: _tried
              ? AutovalidateMode.always
              : AutovalidateMode.disabled,
          child: TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            textDirection: TextDirection.ltr,
            autocorrect: false,
            autofillHints: const [AutofillHints.email],
            validator: Validators(s).email,
            onFieldSubmitted: (_) => _submit(),
            decoration: InputDecoration(labelText: s.auth.email),
          ),
        ),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: s.auth.forgotSubmit,
          onPressed: _submit,
          loading: _busy,
          expand: true,
        ),
        if (canSms)
          BaghKey(
            label: s.sms.resetTitle,
            kind: BaghKeyKind.outline,
            expand: true,
            onPressed: () => context.push('/forgot-password/sms'),
          ),
      ],
    );
  }
}

/// Resetting the password with a code texted to the account's verified
/// phone: the account's email or username, then the code and a new password.
/// The first answer is the same whether or not the account exists, so the
/// screen never tells a stranger who has an account here.
class SmsResetScreen extends ConsumerStatefulWidget {
  const SmsResetScreen({this.emailToo = true, super.key});

  /// Whether resetting by email is also on offer, to go back to.
  final bool emailToo;

  @override
  ConsumerState<SmsResetScreen> createState() => _SmsResetScreenState();
}

class _SmsResetScreenState extends ConsumerState<SmsResetScreen> {
  final _form = GlobalKey<FormState>();
  bool _tried = false;
  final _identifier = TextEditingController();
  final _code = TextEditingController();
  final _password = TextEditingController();
  bool _codeSent = false;
  bool _done = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _identifier.dispose();
    _code.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_tried) setState(() => _tried = true);
    if (_busy || !_form.currentState!.validate()) return;
    final s = ref.read(stringsProvider);
    final recovery = ref.read(accountRecoveryProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (!_codeSent) {
        await recovery.requestResetSms(_identifier.text);
        setState(() {
          _codeSent = true;
          _tried = false;
        });
      } else {
        await recovery.resetPasswordWithSms(
          identifier: _identifier.text,
          code: toLatinDigits(_code.text),
          password: _password.text,
        );
        await ref.read(hapticsProvider).success();
        setState(() => _done = true);
      }
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final v = Validators(s);
    if (_done) {
      return AccountPage(
        title: s.sms.resetTitle,
        helpId: 'password-reset',
        children: [
          FormMessage(s.sms.resetDone, positive: true),
          BaghKey(
            label: s.auth.loginLink,
            expand: true,
            onPressed: () => context.go('/login'),
          ),
        ],
      );
    }
    return AccountPage(
      title: s.sms.resetTitle,
      subtitle: _codeSent ? s.sms.resetCodeSent : s.sms.resetIntro,
      helpId: 'password-reset',
      children: [
        Form(
          key: _form,
          autovalidateMode: _tried
              ? AutovalidateMode.always
              : AutovalidateMode.disabled,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 16,
            children: [
              TextFormField(
                controller: _identifier,
                enabled: !_codeSent,
                keyboardType: TextInputType.visiblePassword,
                textDirection: TextDirection.ltr,
                autocorrect: false,
                enableSuggestions: false,
                autofillHints: const [AutofillHints.username],
                validator: v.required,
                onFieldSubmitted: (_) => _codeSent ? null : _submit(),
                decoration: InputDecoration(labelText: s.sms.identifier),
              ),
              if (_codeSent) ...[
                TextFormField(
                  controller: _code,
                  keyboardType: TextInputType.number,
                  textDirection: TextDirection.ltr,
                  autofillHints: const [AutofillHints.oneTimeCode],
                  maxLength: 8,
                  validator: (value) =>
                      RegExp(
                        r'^\d{4,8}$',
                      ).hasMatch(toLatinDigits(value?.trim() ?? ''))
                      ? null
                      : s.auth.required,
                  decoration: InputDecoration(
                    labelText: s.sms.codeLabel,
                    counterText: '',
                  ),
                ),
                PasswordField(
                  controller: _password,
                  label: s.sms.newPassword,
                  helper: s.auth.passwordHint,
                  newPassword: true,
                  validator: v.password,
                  onSubmitted: (_) => _submit(),
                ),
              ],
            ],
          ),
        ),
        if (_codeSent) Text(s.auth.resetRevokesSessions),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: _codeSent ? s.sms.resetSubmit : s.sms.sendResetCode,
          onPressed: _submit,
          loading: _busy,
          expand: true,
        ),
        Text(s.sms.noPhoneHint),
        if (widget.emailToo)
          TextButton(
            onPressed: () => context.pop(),
            child: Text(s.sms.byEmail),
          ),
      ],
    );
  }
}

/// The page a reset link opens: a new password, twice. Every other session
/// on the account ends when it is saved (resetRevokesSessions says so).
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({this.token, super.key});

  final String? token;

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _form = GlobalKey<FormState>();
  // After a first attempt, fields re-check as they change, so a fixed
  // mistake stops being flagged.
  bool _tried = false;
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  bool _done = false;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_tried) setState(() => _tried = true);
    if (_busy || !_form.currentState!.validate()) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(accountRecoveryProvider)
          .resetPassword(widget.token!, _password.text);
      await ref.read(hapticsProvider).success();
      setState(() => _done = true);
    } catch (e) {
      setState(
        () => _error = describeError(s, e, fallback: s.auth.resetLinkBroken),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final v = Validators(s);
    if (widget.token == null || widget.token!.isEmpty) {
      return AccountPage(
        title: s.auth.resetTitle,
        helpId: 'password-reset',
        children: [FormMessage(s.auth.resetLinkBroken)],
      );
    }
    if (_done) {
      return AccountPage(
        title: s.auth.resetTitle,
        helpId: 'password-reset',
        children: [
          FormMessage(s.auth.resetDone, positive: true),
          BaghKey(
            label: s.auth.loginLink,
            expand: true,
            onPressed: () => context.go('/login'),
          ),
        ],
      );
    }
    return AccountPage(
      title: s.auth.resetTitle,
      subtitle: s.auth.resetSubtitle,
      helpId: 'password-reset',
      children: [
        Form(
          key: _form,
          autovalidateMode: _tried
              ? AutovalidateMode.always
              : AutovalidateMode.disabled,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 16,
            children: [
              PasswordField(
                controller: _password,
                label: s.auth.newPassword,
                helper: s.auth.passwordHint,
                newPassword: true,
                validator: v.password,
              ),
              PasswordField(
                controller: _confirm,
                label: s.auth.confirmPassword,
                newPassword: true,
                validator: (value) =>
                    value == _password.text ? null : s.auth.passwordMismatch,
                onSubmitted: (_) => _submit(),
              ),
            ],
          ),
        ),
        Text(s.auth.resetRevokesSessions),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: s.auth.resetSubmit,
          onPressed: _submit,
          loading: _busy,
          expand: true,
        ),
      ],
    );
  }
}

/// The page a verification link opens: confirms the address as it loads.
class VerifyEmailScreen extends ConsumerStatefulWidget {
  const VerifyEmailScreen({this.token, super.key});

  final String? token;

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  late final Future<void> _verifying = _verify();

  Future<void> _verify() async {
    final token = widget.token;
    if (token == null || token.isEmpty) throw StateError('no token');
    await ref.read(accountRecoveryProvider).verifyEmail(token);
    await ref.read(hapticsProvider).success();
    // The account now says verified; refresh it if this device is signed in.
    if (ref.read(sessionProvider).value != null) {
      await ref.read(sessionProvider.notifier).reload();
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    return FutureBuilder<void>(
      future: _verifying,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return AccountPage(
            title: s.auth.verifyTitle,
            helpId: 'verify-email',
            children: [
              const Center(child: GirihSpinner()),
              Text(s.auth.verifyChecking, textAlign: TextAlign.center),
            ],
          );
        }
        final ok = !snapshot.hasError;
        return AccountPage(
          title: ok ? s.auth.verifyDoneTitle : s.auth.verifyFailedTitle,
          helpId: 'verify-email',
          children: [
            FormMessage(
              ok ? s.auth.verifyDoneBody : s.auth.verifyFailedHint,
              positive: ok,
            ),
            BaghKey(
              label: s.mobile.tabMe,
              kind: BaghKeyKind.outline,
              expand: true,
              onPressed: () => context.go('/me'),
            ),
          ],
        );
      },
    );
  }
}
