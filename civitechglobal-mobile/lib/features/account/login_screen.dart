import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../design/haptics.dart';
import '../../design/widgets/bagh_key.dart';
import '../../l10n/l10n.dart';
import 'account_page.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({this.from, super.key});

  /// Where to go once signed in; the Me tab when nothing asked.
  final String? from;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  // After a first attempt, fields re-check as they change, so a fixed
  // mistake stops being flagged.
  bool _tried = false;
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
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
      final result = await ref
          .read(sessionProvider.notifier)
          .login(_email.text, _password.text);
      if (!mounted) return;
      switch (result) {
        case SignedIn():
          await ref.read(hapticsProvider).success();
          if (mounted) context.go(widget.from ?? '/me');
        case NeedsSecondFactor(:final challengeToken):
          await context.push(
            '/login/mfa',
            extra: (challengeToken: challengeToken, from: widget.from),
          );
      }
    } catch (e) {
      setState(() => _error = describeError(s, e, fallback: s.auth.loginError));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final v = Validators(s);
    return AccountPage(
      title: s.auth.loginTitle,
      subtitle: s.auth.loginSubtitle,
      helpId: 'login',
      children: [
        Form(
          key: _form,
          autovalidateMode: _tried
              ? AutovalidateMode.always
              : AutovalidateMode.disabled,
          child: AutofillGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 16,
              children: [
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  textDirection: TextDirection.ltr,
                  autocorrect: false,
                  autofillHints: const [AutofillHints.email],
                  textInputAction: TextInputAction.next,
                  validator: v.email,
                  decoration: InputDecoration(labelText: s.auth.email),
                ),
                PasswordField(
                  controller: _password,
                  label: s.auth.password,
                  validator: v.required,
                  onSubmitted: (_) => _submit(),
                ),
              ],
            ),
          ),
        ),
        Align(
          alignment: AlignmentDirectional.centerEnd,
          child: TextButton(
            onPressed: () => context.push('/forgot-password'),
            child: Text(s.auth.forgotLink),
          ),
        ),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: s.auth.loginSubmit,
          onPressed: _submit,
          loading: _busy,
          expand: true,
        ),
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(s.auth.noAccount),
            TextButton(
              onPressed: () => context.pushReplacement(
                Uri(
                  path: '/register',
                  queryParameters: {'from': ?widget.from},
                ).toString(),
              ),
              child: Text(s.auth.registerLink),
            ),
          ],
        ),
      ],
    );
  }
}
