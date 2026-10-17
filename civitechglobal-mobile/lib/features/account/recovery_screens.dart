import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/session.dart';
import '../../core/capabilities.dart';
import '../../core/config.dart';
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
    if (!(caps.value?.email ?? false)) {
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
