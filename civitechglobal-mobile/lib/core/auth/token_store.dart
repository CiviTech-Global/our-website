import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Where the session's two tokens live.
///
/// The refresh token is long-lived and is kept only in the platform's secure
/// storage (Android Keystore-backed encryption), never in plain preferences.
/// The access token lives fifteen minutes and only in memory: losing it costs
/// one refresh, while writing it to disk would only widen the window in which
/// a copied file is worth something.
class TokenStore {
  TokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _refreshKey = 'session.refreshToken';

  final FlutterSecureStorage _storage;

  String? accessToken;

  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);

  Future<void> save({
    required String accessToken,
    required String refreshToken,
  }) async {
    this.accessToken = accessToken;
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  Future<void> clear() async {
    accessToken = null;
    await _storage.delete(key: _refreshKey);
  }
}
