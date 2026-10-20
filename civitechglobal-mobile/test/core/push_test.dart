import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/auth/session.dart';
import 'package:civitech_global_flutter/core/push.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'api_client_test.dart' show FakeServer, MemoryTokens;

final _strings = Strings(
  jsonDecode(File('assets/l10n/en.json').readAsStringSync())
      as Map<String, Object?>,
);

class _Source extends NoPushTokenSource {
  const _Source(this.value);

  final String? value;

  @override
  Future<String?> token() async => value;
}

/// Signed in as u1 (the refresh answers, then /auth/me), with [token] as
/// this install's push address.
ProviderContainer _container(FakeServer server, String? token) {
  final container = ProviderContainer(
    overrides: [
      apiClientProvider.overrideWithValue(
        ApiClient(
          tokens: MemoryTokens(refresh: 'refresh-1'),
          language: () => 'en',
          dio: Dio(BaseOptions(baseUrl: 'https://api.test/api/v1'))
            ..httpClientAdapter = server,
        ),
      ),
      l10nProvider.overrideWith(
        () => L10nController(L10nState('en', _strings)),
      ),
      pushTokenSourceProvider.overrideWithValue(_Source(token)),
    ],
  );
  addTearDown(container.dispose);
  // What the app root does: register for whoever signs in.
  container.listen(sessionProvider.select((s) => s.value?.id), (_, id) {
    if (id != null) container.read(pushRegistrarProvider).register(id);
  }, fireImmediately: true);
  return container;
}

FakeServer _server() => FakeServer(
  (o) async => (
    200,
    {
      'data': switch (o.path) {
        '/auth/refresh' => {'accessToken': 'a', 'refreshToken': 'r'},
        '/auth/me' => {
          'user': {
            'id': 'u1',
            'email': 'a@b.c',
            'firstName': 'M',
            'lastName': 'A',
          },
        },
        _ => null,
      },
    },
  ),
);

List<String> _calls(FakeServer server) => [
  for (final o in server.requests)
    if (!o.path.startsWith('/auth/refresh') && o.path != '/auth/me')
      '${o.method} ${o.path}',
];

void main() {
  setUp(
    () => PackageInfo.setMockInitialValues(
      appName: 'app',
      packageName: 'p',
      version: '1.2.3',
      buildNumber: '1',
      buildSignature: '',
    ),
  );

  test(
    'a signed-in phone is registered once, with what the server needs',
    () async {
      final server = _server();
      final container = _container(server, 'pid_1');
      await container.read(sessionProvider.future);
      await pumpEventQueue();
      // Asked again (another rebuild), it does not repeat itself.
      await container.read(pushRegistrarProvider).register('u1');

      expect(_calls(server), ['POST /push/devices']);
      final body = server.requests
          .firstWhere((o) => o.path == '/push/devices')
          .data;
      expect(body, {
        'provider': 'pushe',
        'token': 'pid_1',
        'platform': 'android',
        'appVersion': '1.2.3',
        'language': 'en',
      });
    },
  );

  test('without a push address (no SDK yet), nothing is registered', () async {
    final server = _server();
    final container = _container(server, null);
    await container.read(sessionProvider.future);
    await pumpEventQueue();

    expect(_calls(server), isEmpty);
  });

  test('signing out straight after sign-in waits for the registration, '
      'so it cannot overtake it', () async {
    final server = _server();
    final container = _container(server, 'pid_1');
    await container.read(sessionProvider.future);
    // No waiting: the registration has only just started.
    await container.read(sessionProvider.notifier).logout();

    expect(_calls(server), [
      'POST /push/devices',
      'DELETE /push/devices/pid_1',
      'POST /auth/logout',
    ]);
  });

  test('signing out removes this phone first, while the session can', () async {
    final server = _server();
    final container = _container(server, 'pid_1');
    await container.read(sessionProvider.future);
    await pumpEventQueue();

    await container.read(sessionProvider.notifier).logout();

    expect(_calls(server), [
      'POST /push/devices',
      'DELETE /push/devices/pid_1',
      'POST /auth/logout',
    ]);
  });
}
