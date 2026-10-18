import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../design/haptics.dart';
import '../../design/widgets/bagh_key.dart';
import '../../l10n/l10n.dart';
import 'account_page.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({this.from, super.key});

  final String? from;

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  // After a first attempt, fields re-check as they change, so a fixed
  // mistake stops being flagged.
  bool _tried = false;
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;
  Map<String, String> _fieldErrors = const {};

  @override
  void dispose() {
    for (final c in [_first, _last, _email, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _fieldErrors = const {});
    if (!_tried) setState(() => _tried = true);
    if (_busy || !_form.currentState!.validate()) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(sessionProvider.notifier)
          .register(
            firstName: _first.text,
            lastName: _last.text,
            email: _email.text,
            password: _password.text,
          );
      await ref.read(hapticsProvider).success();
      if (mounted) context.go(widget.from ?? '/me');
    } catch (e) {
      setState(() {
        _fieldErrors = ApiException.from(e).fieldErrors;
        _error = describeError(s, e, fallback: s.auth.registerError);
      });
      _form.currentState!.validate();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// A rule from the device, or else what the server said about [field].
  String? Function(String?) _check(
    String field,
    String? Function(String?) rule,
  ) =>
      (v) => rule(v) ?? _fieldErrors[field];

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final v = Validators(s);
    return AccountPage(
      title: s.auth.registerTitle,
      subtitle: s.auth.registerSubtitle,
      helpId: 'register',
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
                  controller: _first,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.givenName],
                  validator: _check('firstName', v.required),
                  decoration: InputDecoration(labelText: s.auth.firstName),
                ),
                TextFormField(
                  controller: _last,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.familyName],
                  validator: _check('lastName', v.required),
                  decoration: InputDecoration(labelText: s.auth.lastName),
                ),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  textDirection: TextDirection.ltr,
                  autocorrect: false,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.email],
                  validator: _check('email', v.email),
                  decoration: InputDecoration(labelText: s.auth.email),
                ),
                PasswordField(
                  controller: _password,
                  label: s.auth.password,
                  helper: s.auth.passwordHint,
                  newPassword: true,
                  validator: _check('password', v.password),
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
        ),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: s.auth.registerSubmit,
          onPressed: _submit,
          loading: _busy,
          expand: true,
        ),
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(s.auth.haveAccount),
            TextButton(
              onPressed: () => context.pushReplacement(
                Uri(
                  path: '/login',
                  queryParameters: {'from': ?widget.from},
                ).toString(),
              ),
              child: Text(s.auth.loginLink),
            ),
          ],
        ),
      ],
    );
  }
}
