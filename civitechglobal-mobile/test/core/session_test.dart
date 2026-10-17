import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/api/api_exception.dart';
import 'package:civitech_global_flutter/core/auth/session.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'api_client_test.dart' show FakeServer, MemoryTokens;

ProviderContainer _container(FakeServer server, MemoryTokens tokens) {
  final dio = Dio(BaseOptions(baseUrl: 'https://api.test/api/v1'))
    ..httpClientAdapter = server;
  return ProviderContainer(
    overrides: [
      apiClientProvider.overrideWithValue(
        ApiClient(tokens: tokens, language: () => 'en', dio: dio),
      ),
    ],
  );
}

const _user = {
  'id': 'u1',
  'email': 'a@b.c',
  'firstName': 'Maryam',
  'lastName': 'Ahmadi',
};

void main() {
  test('a sign-in stores both tokens and publishes the user', () async {
    final server = FakeServer(
      (o) async => (
        200,
        {
          'data': {
            'user': _user,
            'accessToken': 'access-1',
            'refreshToken': 'refresh-1',
          },
        },
      ),
    );
    final tokens = MemoryTokens();
    final container = _container(server, tokens);
    addTearDown(container.dispose);
    await container.read(sessionProvider.future);

    final result = await container
        .read(sessionProvider.notifier)
        .login('a@b.c', 'pw');

    expect(result, isA<SignedIn>());
    expect(tokens.refresh, 'refresh-1');
    expect(container.read(sessionProvider).value?.firstName, 'Maryam');
  });

  test(
    'an account with a second factor gets a challenge, not a session',
    () async {
      final server = FakeServer(
        (o) async => (
          200,
          {
            'data': {'mfaRequired': true, 'challengeToken': 'c1'},
          },
        ),
      );
      final tokens = MemoryTokens();
      final container = _container(server, tokens);
      addTearDown(container.dispose);
      await container.read(sessionProvider.future);

      final result = await container
          .read(sessionProvider.notifier)
          .login('a@b.c', 'pw');

      expect(result, isA<NeedsSecondFactor>());
      expect(tokens.refresh, isNull);
    },
  );

  test(
    'a server that sends no refresh token is a failed sign-in, not a crash',
    () async {
      // What the API answered before the mobile token transport: the user and
      // an access token, with the refresh token only in a cookie.
      final server = FakeServer(
        (o) async => (
          200,
          {
            'data': {'user': _user, 'accessToken': 'access-1'},
          },
        ),
      );
      final tokens = MemoryTokens();
      final container = _container(server, tokens);
      addTearDown(container.dispose);
      await container.read(sessionProvider.future);

      await expectLater(
        container.read(sessionProvider.notifier).login('a@b.c', 'pw'),
        throwsA(isA<ApiException>()),
      );
      expect(container.read(sessionProvider).value, isNull);
      expect(tokens.accessToken, isNull);
    },
  );
}
