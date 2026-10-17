import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/widgets/bagh_key.dart';
import '../../l10n/l10n.dart';
import 'account_page.dart';

/// Sign-in, step two: the six digits from the authenticator app, or one of
/// the recovery codes. A wrong code costs an attempt, not the sign-in; after
/// five the server destroys the challenge and the password is asked again.
class MfaScreen extends ConsumerStatefulWidget {
  const MfaScreen({required this.challengeToken, this.from, super.key});

  final String challengeToken;
  final String? from;

  @override
  ConsumerState<MfaScreen> createState() => _MfaScreenState();
}

class _MfaScreenState extends ConsumerState<MfaScreen> {
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final s = ref.read(stringsProvider);
    final code = toLatinDigits(_code.text).replaceAll(' ', '');
    if (_busy || code.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(sessionProvider.notifier)
          .verifySecondFactor(widget.challengeToken, code);
      await ref.read(hapticsProvider).success();
      if (mounted) context.go(widget.from ?? '/me');
    } catch (e) {
      setState(
        () => _error = describeError(s, e, fallback: s.auth.mfaCodeWrong),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    return AccountPage(
      title: s.auth.mfaTitle,
      subtitle: s.auth.mfaSubtitle,
      helpId: 'login',
      children: [
        TextField(
          controller: _code,
          autofocus: true,
          keyboardType: TextInputType.visiblePassword,
          textDirection: TextDirection.ltr,
          textAlign: TextAlign.center,
          autofillHints: const [AutofillHints.oneTimeCode],
          style: Theme.of(context).textTheme.headlineSmall,
          onSubmitted: (_) => _submit(),
          decoration: InputDecoration(
            labelText: s.auth.mfaCode,
            helperText: s.auth.mfaCodeHint,
          ),
        ),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: s.auth.mfaSubmit,
          onPressed: _submit,
          loading: _busy,
          expand: true,
        ),
      ],
    );
  }
}
