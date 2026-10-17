import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../help/help_sheet.dart';
import 'account_page.dart';

/// Two-factor status: `GET /auth/mfa`.
final mfaStatusProvider =
    FutureProvider.autoDispose<({bool enabled, int codesLeft})>(
      (ref) => ref
          .read(apiClientProvider)
          .get(
            '/auth/mfa',
            parse: (d) {
              final m = d! as Map;
              return (
                enabled: m['enabled'] == true,
                codesLeft: (m['recoveryCodesLeft'] as num?)?.toInt() ?? 0,
              );
            },
          ),
    );

/// Account security: two-factor sign-in, and ending every session.
class SecurityScreen extends ConsumerWidget {
  const SecurityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final mfa = ref.watch(mfaStatusProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(s.dashboard.securityTitle),
        actions: const [HelpAction('profile')],
      ),
      body: ListView(
        padding: const EdgeInsets.all(BaghSpace.gutter),
        children: [
          SoftSurface(
            child: mfa.when(
              loading: () => const Center(child: GirihSpinner()),
              error: (e, _) => Text(describeError(s, e)),
              data: (status) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 12,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(s.auth.mfaTitle, style: text.titleMedium),
                      ),
                      if (status.enabled)
                        Chip(
                          label: Text(s.auth.mfaOn),
                          backgroundColor: c.primarySoft.fill,
                          labelStyle: TextStyle(color: c.primarySoft.ink),
                          side: BorderSide.none,
                        ),
                    ],
                  ),
                  Text(status.enabled ? s.auth.mfaOnBody : s.auth.mfaOffBody),
                  if (status.enabled && status.codesLeft < 4)
                    FormMessage(
                      s.auth.mfaRecoveryLow.fill({
                        'count': localDigits(
                          status.codesLeft,
                          ref.watch(l10nProvider).language,
                        ),
                      }),
                    ),
                  BaghKey(
                    label: status.enabled
                        ? s.auth.mfaDisable
                        : s.auth.mfaEnable,
                    kind: status.enabled
                        ? BaghKeyKind.outline
                        : BaghKeyKind.primary,
                    expand: true,
                    onPressed: () => status.enabled
                        ? _disable(context, ref)
                        : context.push('/me/security/two-factor'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: BaghSpace.gutter),
          SoftSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 12,
              children: [
                Text(s.dashboard.signOutEverywhere, style: text.titleMedium),
                Text(s.dashboard.signOutEverywhereHint),
                BaghKey(
                  label: s.dashboard.signOutEverywhere,
                  kind: BaghKeyKind.outline,
                  expand: true,
                  onPressed: () async {
                    await ref.read(sessionProvider.notifier).logoutEverywhere();
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(s.dashboard.signedOutEverywhere)),
                    );
                    context.go('/me');
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _disable(BuildContext context, WidgetRef ref) async {
    final s = ref.read(stringsProvider);
    final code = TextEditingController();
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
          BaghSpace.gutter,
          0,
          BaghSpace.gutter,
          MediaQuery.viewInsetsOf(context).bottom + BaghSpace.section,
        ),
        child: _CodeForm(
          controller: code,
          label: s.auth.mfaDisableLabel,
          submit: s.auth.mfaDisable,
          onSubmit: (value) async {
            await ref
                .read(apiClientProvider)
                .post<Object?>('/auth/mfa/disable', body: {'code': value});
            if (context.mounted) Navigator.of(context).pop(true);
          },
        ),
      ),
    );
    code.dispose();
    if (done == true && context.mounted) {
      ref.invalidate(mfaStatusProvider);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.auth.mfaDisabled)));
    }
  }
}

/// Turning two-factor on: add the key to an authenticator, confirm a code,
/// then keep the recovery codes, which are shown once and never again.
class TwoFactorSetupScreen extends ConsumerStatefulWidget {
  const TwoFactorSetupScreen({super.key});

  @override
  ConsumerState<TwoFactorSetupScreen> createState() =>
      _TwoFactorSetupScreenState();
}

class _TwoFactorSetupScreenState extends ConsumerState<TwoFactorSetupScreen> {
  late final Future<({String secret, String uri})> _start = ref
      .read(apiClientProvider)
      .post(
        '/auth/mfa/begin',
        parse: (d) {
          final m = d! as Map;
          return (secret: '${m['secret']}', uri: '${m['otpauthUri']}');
        },
      );
  final _code = TextEditingController();
  List<String>? _recovery;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  void _copy(String value, String done) {
    Clipboard.setData(ClipboardData(text: value));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(done)));
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);

    if (_recovery case final codes?) {
      return PopScope(
        canPop: false,
        child: AccountPage(
          title: s.auth.mfaRecoveryTitle,
          children: [
            FormMessage(s.auth.mfaRecoveryBody),
            SoftSurface(
              tint: c.tints[4],
              radius: BaghRadius.tile,
              child: SelectableText(
                codes.join('\n'),
                textDirection: TextDirection.ltr,
                style: text.titleMedium?.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()],
                  height: 1.9,
                ),
              ),
            ),
            BaghKey(
              label: s.auth.mfaRecoveryCopy,
              kind: BaghKeyKind.outline,
              expand: true,
              onPressed: () =>
                  _copy(codes.join('\n'), s.auth.mfaRecoveryCopied),
            ),
            BaghKey(
              label: s.auth.mfaRecoveryStored,
              expand: true,
              onPressed: () {
                ref.invalidate(mfaStatusProvider);
                context.pop();
              },
            ),
          ],
        ),
      );
    }

    return FutureBuilder(
      future: _start,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return AccountPage(
            title: s.auth.mfaTitle,
            children: [FormMessage(describeError(s, snapshot.error!))],
          );
        }
        final start = snapshot.data;
        if (start == null) {
          return const Scaffold(body: Center(child: GirihSpinner()));
        }
        return AccountPage(
          title: s.auth.mfaTitle,
          children: [
            Text(s.auth.mfaStep1),
            SoftSurface(
              tint: c.tints[2],
              radius: BaghRadius.tile,
              child: SelectableText(
                start.secret,
                textDirection: TextDirection.ltr,
                style: text.titleMedium,
              ),
            ),
            Row(
              spacing: 8,
              children: [
                Expanded(
                  child: BaghKey(
                    label: s.auth.mfaCopyKey,
                    kind: BaghKeyKind.outline,
                    onPressed: () =>
                        _copy(start.secret, s.auth.mfaSecretCopied),
                  ),
                ),
                Expanded(
                  child: BaghKey(
                    label: s.auth.mfaOpenInApp,
                    kind: BaghKeyKind.tonal,
                    onPressed: () => launchUrl(
                      Uri.parse(start.uri),
                      mode: LaunchMode.externalApplication,
                    ),
                  ),
                ),
              ],
            ),
            Text(s.auth.mfaStep2),
            _CodeForm(
              controller: _code,
              label: s.auth.mfaCode,
              submit: s.auth.mfaConfirm,
              onSubmit: (value) async {
                final codes = await ref
                    .read(apiClientProvider)
                    .post(
                      '/auth/mfa/confirm',
                      body: {'code': value},
                      parse: (d) => [
                        for (final c in ((d! as Map)['recoveryCodes'] as List))
                          '$c',
                      ],
                    );
                await ref.read(hapticsProvider).success();
                setState(() => _recovery = codes);
              },
            ),
          ],
        );
      },
    );
  }
}

/// A one-time code and the key that sends it, with the server's answer
/// shown under it.
class _CodeForm extends ConsumerStatefulWidget {
  const _CodeForm({
    required this.controller,
    required this.label,
    required this.submit,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final String label;
  final String submit;
  final Future<void> Function(String code) onSubmit;

  @override
  ConsumerState<_CodeForm> createState() => _CodeFormState();
}

class _CodeFormState extends ConsumerState<_CodeForm> {
  bool _busy = false;
  String? _error;

  Future<void> _go() async {
    final code = toLatinDigits(widget.controller.text).replaceAll(' ', '');
    if (_busy || code.isEmpty) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onSubmit(code);
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = describeError(s, e, fallback: s.auth.mfaCodeWrong),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    mainAxisSize: MainAxisSize.min,
    spacing: 12,
    children: [
      TextField(
        controller: widget.controller,
        keyboardType: TextInputType.number,
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.center,
        autofillHints: const [AutofillHints.oneTimeCode],
        onSubmitted: (_) => _go(),
        decoration: InputDecoration(labelText: widget.label),
      ),
      if (_error != null) FormMessage(_error!),
      BaghKey(
        label: widget.submit,
        onPressed: _go,
        loading: _busy,
        expand: true,
      ),
    ],
  );
}
