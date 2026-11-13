import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../intake/track_screen.dart' show StatusPill;

/// The account's phone as `GET /auth/me/phone` reports it.
typedef PhoneSettings = ({
  String? phone,
  bool verified,
  bool smsOptOut,

  /// The number given at identity verification, offered as the one to verify.
  String? suggestedPhone,
  bool smsAvailable,
});

PhoneSettings _phoneSettings(Object? d) {
  final m = (d as Map?) ?? const {};
  String? text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;
  return (
    phone: text(m['phone']),
    verified: text(m['phoneVerifiedAt']) != null,
    smsOptOut: m['smsOptOut'] == true,
    suggestedPhone: text(m['suggestedPhone']),
    smsAvailable: m['smsAvailable'] == true,
  );
}

final phoneSettingsProvider = FutureProvider.autoDispose<PhoneSettings?>((
  ref,
) async {
  final signedIn = ref.watch(
    sessionProvider.select((s) => s.value?.id != null),
  );
  if (!signedIn) return null;
  return ref
      .read(apiClientProvider)
      .get('/auth/me/phone', parse: _phoneSettings);
});

/// The account's mobile number: proved with a texted code, then used for
/// password reset by SMS and security alerts. Changing the number
/// un-verifies it on the server, so the card simply asks for a new code.
/// Draws nothing until the server has answered.
class PhoneSettingsCard extends ConsumerStatefulWidget {
  const PhoneSettingsCard({super.key});

  @override
  ConsumerState<PhoneSettingsCard> createState() => _PhoneSettingsCardState();
}

class _PhoneSettingsCardState extends ConsumerState<PhoneSettingsCard> {
  final _phone = TextEditingController();
  final _code = TextEditingController();
  bool _seeded = false;
  bool _editing = false;
  bool _awaitingCode = false;
  bool _busy = false;
  (String, bool)? _message;

  @override
  void initState() {
    super.initState();
    ref.listenManual(phoneSettingsProvider, (_, next) {
      final data = next.value;
      if (_seeded || data == null) return;
      _seeded = true;
      _phone.text = data.phone ?? data.suggestedPhone ?? '';
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _run(Future<String> Function() action) async {
    if (_busy) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final done = await action();
      await ref.read(hapticsProvider).success();
      if (mounted) setState(() => _message = (done, true));
    } catch (e) {
      if (mounted) setState(() => _message = (describeError(s, e), false));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendCode() => _run(() async {
    final s = ref.read(stringsProvider);
    final phone = toLatinDigits(_phone.text.trim());
    await ref
        .read(apiClientProvider)
        .post<Object?>('/auth/me/phone/code', body: {'phone': phone});
    setState(() => _awaitingCode = true);
    return s.sms.codeSent.fill({'phone': phone});
  });

  Future<void> _confirm() => _run(() async {
    final s = ref.read(stringsProvider);
    await ref
        .read(apiClientProvider)
        .post<Object?>(
          '/auth/me/phone/verify',
          body: {'code': toLatinDigits(_code.text.trim())},
        );
    _code.clear();
    setState(() {
      _awaitingCode = false;
      _editing = false;
    });
    ref.invalidate(phoneSettingsProvider);
    // The account's phone may have changed with it.
    await ref.read(sessionProvider.notifier).reload();
    return s.sms.phoneVerified;
  });

  Future<void> _setOptOut(bool optOut) => _run(() async {
    final s = ref.read(stringsProvider);
    await ref
        .read(apiClientProvider)
        .patch<Object?>('/auth/me/sms', body: {'optOut': optOut});
    ref.invalidate(phoneSettingsProvider);
    return s.sms.saved;
  });

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final data = ref.watch(phoneSettingsProvider).value;
    if (data == null) return const SizedBox.shrink();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final verified = data.verified && !_editing;

    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 14,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              Text(s.sms.phoneTitle, style: text.titleMedium),
              StatusPill(
                verified ? s.sms.verified : s.sms.notVerified,
                tone: verified ? 0 : 2,
              ),
            ],
          ),
          Text(
            s.sms.phoneIntro,
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
          if (!data.smsAvailable)
            Text(s.sms.smsUnavailable, style: text.bodyMedium)
          else if (verified)
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: 6,
                  children: [
                    Icon(
                      Icons.check_circle_outline_rounded,
                      size: 18,
                      color: c.primary,
                    ),
                    Text(
                      data.phone ?? '',
                      textDirection: TextDirection.ltr,
                      style: text.bodyLarge,
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () => setState(() => _editing = true),
                  child: Text(s.sms.changeNumber),
                ),
              ],
            )
          else ...[
            TextFormField(
              controller: _phone,
              enabled: !_awaitingCode,
              keyboardType: TextInputType.phone,
              textDirection: TextDirection.ltr,
              autofillHints: const [AutofillHints.telephoneNumber],
              decoration: InputDecoration(
                labelText: s.sms.phoneLabel,
                hintText: '09xxxxxxxxx',
              ),
            ),
            if (_awaitingCode)
              TextFormField(
                controller: _code,
                keyboardType: TextInputType.number,
                textDirection: TextDirection.ltr,
                autofillHints: const [AutofillHints.oneTimeCode],
                maxLength: 8,
                onFieldSubmitted: (_) => _confirm(),
                decoration: InputDecoration(
                  labelText: s.sms.codeLabel,
                  counterText: '',
                ),
              ),
            BaghKey(
              label: _awaitingCode ? s.sms.confirm : s.sms.sendCode,
              kind: _awaitingCode ? BaghKeyKind.primary : BaghKeyKind.outline,
              loading: _busy,
              expand: true,
              onPressed: () {
                if (_awaitingCode) {
                  if (toLatinDigits(_code.text.trim()).length >= 4) _confirm();
                } else if (_phone.text.trim().isNotEmpty) {
                  _sendCode();
                }
              },
            ),
            if (_awaitingCode)
              TextButton(
                onPressed: _busy
                    ? null
                    : () => setState(() => _awaitingCode = false),
                child: Text(s.sms.changeNumber),
              ),
          ],
          if (data.smsAvailable && data.verified)
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              value: data.smsOptOut,
              onChanged: _busy ? null : _setOptOut,
              title: Text(s.sms.optOutLabel),
              subtitle: Text(s.sms.optOutHint),
            ),
          if (_message case (final msg, final ok))
            FormMessage(msg, positive: ok),
        ],
      ),
    );
  }
}
