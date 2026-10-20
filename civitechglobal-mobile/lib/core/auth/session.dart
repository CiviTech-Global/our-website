import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';
import '../push.dart';
import 'auth_user.dart';

/// What a sign-in attempt produced: a session, or a second-factor challenge.
sealed class SignInResult {
  const SignInResult();
}

class SignedIn extends SignInResult {
  const SignedIn(this.user);
  final AuthUser user;
}

class NeedsSecondFactor extends SignInResult {
  const NeedsSecondFactor(this.challengeToken);
  final String challengeToken;
}

/// The session: null while signed out, the user while signed in.
///
/// Starts by trying the stored refresh token, the way the web's AuthProvider
/// starts by calling /auth/refresh with its cookie. Every method that issues a
/// session stores both tokens first and publishes the user second, so nothing
/// reads "signed in" before the tokens to prove it exist.
final sessionProvider = AsyncNotifierProvider<SessionController, AuthUser?>(
  SessionController.new,
);

class SessionController extends AsyncNotifier<AuthUser?> {
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Future<AuthUser?> build() async {
    _api.onSessionLost = () => state = const AsyncData(null);
    if (!await _api.refresh()) return null;
    try {
      return await _me();
    } catch (_) {
      return null;
    }
  }

  Future<AuthUser> _me() => _api.get(
    '/auth/me',
    parse: (d) =>
        AuthUser.fromJson((d! as Map)['user'] as Map<String, Object?>),
  );

  Future<AuthUser> _adopt(Object? data) async {
    final map = data! as Map;
    // A server from before the mobile token transport answers with a cookie
    // and no refresh token in the body. Without one this device could never
    // renew the session, so it is not adopted at all: a plain sign-in
    // failure, not a type error.
    if (map['refreshToken'] is! String || map['accessToken'] is! String) {
      throw const ApiException(message: '');
    }
    await _api.tokens.save(
      accessToken: map['accessToken'] as String,
      refreshToken: map['refreshToken'] as String,
    );
    final user = AuthUser.fromJson(map['user'] as Map<String, Object?>);
    state = AsyncData(user);
    return user;
  }

  Future<SignInResult> login(String email, String password) async {
    final data = await _api.post<Object?>(
      '/auth/login',
      body: {'email': email.trim(), 'password': password},
    );
    final map = data! as Map;
    if (map['mfaRequired'] == true) {
      return NeedsSecondFactor(map['challengeToken'] as String);
    }
    return SignedIn(await _adopt(map));
  }

  /// The second step: a code from the authenticator app, or a recovery code.
  Future<AuthUser> verifySecondFactor(
    String challengeToken,
    String code,
  ) async => _adopt(
    await _api.post<Object?>(
      '/auth/mfa/verify',
      body: {'challengeToken': challengeToken, 'code': code.trim()},
    ),
  );

  Future<AuthUser> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
  }) async => _adopt(
    await _api.post<Object?>(
      '/auth/register',
      body: {
        'firstName': firstName.trim(),
        'lastName': lastName.trim(),
        'email': email.trim(),
        'password': password,
      },
    ),
  );

  Future<void> logout() async {
    // This phone stops receiving the account's notices before the session
    // that can say whose phone it is ends.
    await ref.read(pushRegistrarProvider).unregister();
    final token = await _api.tokens.readRefreshToken();
    try {
      await _api.post<Object?>('/auth/logout', body: {'refreshToken': token});
    } catch (_) {
      // Signing out on the device must work offline too; the server's copy
      // expires on its own.
    } finally {
      await _api.tokens.clear();
      state = const AsyncData(null);
    }
  }

  /// Ends every session for this account, on every device.
  Future<void> logoutEverywhere() async {
    // The server forgets every phone of the account itself; this only
    // stops this one being remembered here as registered.
    await ref.read(pushRegistrarProvider).unregister();
    try {
      await _api.post<Object?>('/auth/logout-all');
    } finally {
      await _api.tokens.clear();
      state = const AsyncData(null);
    }
  }

  Future<void> reload() async => state = AsyncData(await _me());

  /// Saves the account's own name and phone (`PUT /auth/me`), and shows the
  /// account as the server now holds it.
  Future<AuthUser> updateProfile({
    required String firstName,
    required String lastName,
    required String phone,
  }) async {
    final user = await _api.put(
      '/auth/me',
      body: {'firstName': firstName, 'lastName': lastName, 'phone': phone},
      parse: (d) =>
          AuthUser.fromJson((d! as Map)['user'] as Map<String, Object?>),
    );
    state = AsyncData(user);
    return user;
  }
}

/// Recovery and verification: no session involved.
final accountRecoveryProvider = Provider<AccountRecovery>(
  (ref) => AccountRecovery(ref.watch(apiClientProvider)),
);

class AccountRecovery {
  const AccountRecovery(this._api);

  final ApiClient _api;

  Future<void> forgotPassword(String email) => _api.post<Object?>(
    '/auth/forgot-password',
    body: {'email': email.trim()},
  );

  Future<void> resetPassword(String token, String password) =>
      _api.post<Object?>(
        '/auth/reset-password',
        body: {'token': token, 'password': password},
      );

  Future<void> verifyEmail(String token) =>
      _api.post<Object?>('/auth/verify-email', body: {'token': token});

  Future<void> sendVerificationEmail() =>
      _api.post<Object?>('/auth/send-verification');
}
