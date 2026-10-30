import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../l10n/l10n.dart';
import 'account_page.dart';
import 'security_screen.dart';

/// A new password from inside the account (`POST /auth/change-password`).
/// Other devices are signed out; this one keeps its session.
class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _form = GlobalKey<FormState>();
  bool _tried = false;
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
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
          .read(sessionProvider.notifier)
          .changePassword(_current.text, _next.text);
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.workspace.passwordChanged)));
      context.pop();
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final v = Validators(s);
    return AccountPage(
      title: s.workspace.changePassword,
      subtitle: s.workspace.securityHint,
      helpId: 'profile',
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
                controller: _current,
                label: s.workspace.currentPassword,
                validator: v.required,
              ),
              PasswordField(
                controller: _next,
                label: s.workspace.newPassword,
                helper: s.auth.passwordHint,
                newPassword: true,
                validator: v.password,
              ),
              PasswordField(
                controller: _confirm,
                label: s.workspace.confirmPassword,
                newPassword: true,
                validator: (value) =>
                    value == _next.text ? null : s.workspace.passwordMismatch,
                onSubmitted: (_) => _submit(),
              ),
            ],
          ),
        ),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: s.workspace.changePassword,
          onPressed: _submit,
          loading: _busy,
          expand: true,
        ),
      ],
    );
  }
}

/// What still stands between the account and its deletion:
/// `GET /auth/me/deletion`.
final deletionStatusProvider =
    FutureProvider.autoDispose<({int contracts, int books, bool canDelete})>(
      (ref) => ref
          .read(apiClientProvider)
          .get(
            '/auth/me/deletion',
            parse: (d) {
              final m = d! as Map;
              return (
                contracts: (m['activeContracts'] as num?)?.toInt() ?? 0,
                books: (m['booksInHandOver'] as num?)?.toInt() ?? 0,
                canDelete: m['canDelete'] == true,
              );
            },
          ),
    );

/// Closing the account (`POST /auth/delete-account`): the password, the
/// second factor when it is on, and a deliberate tick, because nothing here
/// can be taken back. Staff accounts are closed by the super admin instead.
class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  ConsumerState<DeleteAccountScreen> createState() =>
      _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  final _password = TextEditingController();
  final _code = TextEditingController();
  bool _understood = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit({required bool needsCode}) async {
    final code = toLatinDigits(_code.text).replaceAll(' ', '');
    if (_busy || _password.text.isEmpty || (needsCode && code.isEmpty)) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(sessionProvider.notifier)
          .deleteAccount(
            password: _password.text,
            code: needsCode ? code : null,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.workspace.accountDeleted)));
      context.go('/');
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final user = ref.watch(sessionProvider).value;
    final isCustomer = user?.role == 'USER';
    if (!isCustomer) {
      return AccountPage(
        title: s.workspace.deleteTitle,
        children: [Text(s.workspace.deleteStaffNote)],
      );
    }
    final status = ref.watch(deletionStatusProvider);
    final mfa = ref.watch(mfaStatusProvider);
    final language = ref.watch(l10nProvider).language;

    return AccountPage(
      title: s.workspace.deleteTitle,
      subtitle: s.workspace.deleteHint,
      helpId: 'profile',
      children: switch ((status, mfa)) {
        (AsyncError(:final error), _) ||
        (_, AsyncError(:final error)) => [FormMessage(describeError(s, error))],
        (AsyncData(value: final st), AsyncData(value: final m)) =>
          st.canDelete
              ? _form(s, needsCode: m.enabled)
              : [
                  FormMessage(
                    s.workspace.deleteBlocked.fill({
                      'contracts': localDigits(st.contracts, language),
                      'books': localDigits(st.books, language),
                    }),
                  ),
                ],
        _ => [const Center(child: GirihSpinner())],
      },
    );
  }

  List<Widget> _form(Strings s, {required bool needsCode}) => [
    PasswordField(controller: _password, label: s.workspace.currentPassword),
    if (needsCode)
      TextField(
        controller: _code,
        keyboardType: TextInputType.number,
        textDirection: TextDirection.ltr,
        autofillHints: const [AutofillHints.oneTimeCode],
        decoration: InputDecoration(
          labelText: s.auth.mfaCode,
          helperText: s.auth.mfaCodeHint,
        ),
      ),
    CheckboxListTile(
      value: _understood,
      contentPadding: EdgeInsets.zero,
      controlAffinity: ListTileControlAffinity.leading,
      title: Text(s.workspace.deleteConfirm),
      onChanged: (value) => setState(() => _understood = value ?? false),
    ),
    if (_error != null) FormMessage(_error!),
    BaghKey(
      label: s.workspace.deleteButton,
      kind: BaghKeyKind.outline,
      onPressed: _understood ? () => _submit(needsCode: needsCode) : null,
      loading: _busy,
      expand: true,
    ),
  ];
}
