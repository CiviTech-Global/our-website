import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../l10n/l10n.dart';
import 'api/api_client.dart';

/// Where this install's push address comes from, and where taps on its
/// pushes arrive. One implementation per provider; features never see which.
abstract class PushTokenSource {
  const PushTokenSource();

  /// The provider the server knows the token by (pushe, fcm).
  String get provider;

  /// This install's address with the provider, or null while it has none.
  Future<String?> token();

  /// The link of each push the person taps, to open it in the app.
  Stream<String> get taps;
}

/// No push SDK yet: there is no Pushe account, so the app has no address to
/// register and nothing is ever tapped. The inbox polls while the app is
/// open and catches up on launch, so nothing is missed meanwhile. The
/// Pushe SDK replaces this, and nothing else changes.
class NoPushTokenSource extends PushTokenSource {
  const NoPushTokenSource();

  @override
  String get provider => 'pushe';

  @override
  Future<String?> token() async => null;

  @override
  Stream<String> get taps => const Stream.empty();
}

/// A fixed token, for a debug build trying registration against a local
/// server (`--dart-define=PUSH_DEV_TOKEN=...`). Never set in a release.
class _DevTokenSource extends NoPushTokenSource {
  const _DevTokenSource(this._token);

  final String _token;

  @override
  Future<String?> token() async => _token;
}

const _devToken = String.fromEnvironment('PUSH_DEV_TOKEN');

/// Links of tapped pushes, as they arrive.
final pushTapsProvider = StreamProvider<String>(
  (ref) => ref.watch(pushTokenSourceProvider).taps,
);

final pushTokenSourceProvider = Provider<PushTokenSource>(
  (ref) => _devToken.isEmpty
      ? const NoPushTokenSource()
      : const _DevTokenSource(_devToken),
);

/// Keeps the server's list of this account's phones right: this phone is
/// registered whenever somebody is signed in (sign-in, and every start, which
/// also re-adds it after the server forgot it when every session ended), and
/// removed before it signs out.
class PushRegistrar {
  PushRegistrar(this._ref);

  final Ref _ref;

  /// The (account, token) last registered, so a rebuild does not repeat it.
  (String, String)? _registered;

  /// The registration on its way, so two quick calls send it once, and a
  /// sign-out waits for it rather than racing it: a DELETE overtaken by its
  /// POST would leave the phone with an account that signed out.
  Future<void>? _sending;

  PushTokenSource get _source => _ref.read(pushTokenSourceProvider);

  Future<void> register(String userId) async {
    // Recorded before anything is awaited, so a sign-out arriving while the
    // token is still being read waits for this too.
    final previous = _sending;
    final sending = () async {
      if (previous != null) await previous;
      final token = await _source.token();
      if (token == null || _registered == (userId, token)) return;
      await _send(userId, token);
    }();
    _sending = sending;
    try {
      await sending;
    } finally {
      if (identical(_sending, sending)) _sending = null;
    }
  }

  Future<void> _send(String userId, String token) async {
    try {
      await _ref
          .read(apiClientProvider)
          .post<void>(
            '/push/devices',
            body: {
              'provider': _source.provider,
              'token': token,
              'platform': 'android',
              'appVersion': (await PackageInfo.fromPlatform()).version,
              'language': _ref.read(l10nProvider).language,
            },
          );
      _registered = (userId, token);
    } catch (_) {
      // Best effort: the next start tries again, and the inbox polls anyway.
    }
  }

  /// Before signing out, while the session can still say whose phone it is.
  Future<void> unregister() async {
    if (_sending case final pending?) await pending;
    final registered = _registered;
    _registered = null;
    if (registered == null) return;
    try {
      await _ref
          .read(apiClientProvider)
          .delete<void>('/push/devices/${Uri.encodeComponent(registered.$2)}');
    } catch (_) {
      // Offline: the server drops it when the session ends or the token moves.
    }
  }
}

/// Knows nothing of the session itself (the session asks it to unregister
/// on sign-out); the app root tells it who signed in.
final pushRegistrarProvider = Provider<PushRegistrar>(PushRegistrar.new);
