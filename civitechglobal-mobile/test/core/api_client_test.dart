import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/api/api_exception.dart';
import 'package:civitech_global_flutter/core/auth/token_store.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

/// Tokens in memory instead of the Keystore.
class MemoryTokens extends TokenStore {
  MemoryTokens({this.refresh});

  String? refresh;

  @override
  Future<String?> readRefreshToken() async => refresh;

  @override
  Future<void> save({
    required String accessToken,
    required String refreshToken,
  }) async {
    this.accessToken = accessToken;
    refresh = refreshToken;
  }

  @override
  Future<void> clear() async {
    accessToken = null;
    refresh = null;
  }
}

/// A server in a function: (method, path, headers, body) -> (status, json).
class FakeServer implements HttpClientAdapter {
  FakeServer(this.handle);

  final Future<(int, Object?)> Function(RequestOptions options) handle;
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final (status, body) = await handle(options);
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

ApiClient _client(FakeServer server, MemoryTokens tokens) {
  final dio = Dio(
    BaseOptions(
      baseUrl: 'https://api.test/api/v1',
      headers: {'X-Client': 'mobile'},
    ),
  )..httpClientAdapter = server;
  return ApiClient(tokens: tokens, language: () => 'fa', dio: dio);
}

void main() {
  test('a query is read, never changed: a constant one works too', () async {
    final server = FakeServer((o) async => (200, {'data': 1}));
    final client = _client(server, MemoryTokens());
    const empty = <String, Object?>{};
    final mine = <String, Object?>{'a': '1', 'b': null};
    await client.get<Object?>('/x', query: empty);
    await client.get<Object?>('/y', query: mine);
    expect(server.requests.last.queryParameters, {'a': '1'});
    expect(mine, {'a': '1', 'b': null});
  });

  test(
    'says it is the app, sends the token and the language, unwraps data',
    () async {
      final server = FakeServer(
        (o) async => (
          200,
          {
            'success': true,
            'data': {'ok': true},
          },
        ),
      );
      final tokens = MemoryTokens()..accessToken = 'access-1';
      final api = _client(server, tokens);

      final data = await api.get<Object?>('/thing');

      expect(data, {'ok': true});
      final sent = server.requests.single.headers;
      expect(sent['X-Client'], 'mobile');
      expect(sent['Authorization'], 'Bearer access-1');
      expect(sent['Accept-Language'], 'fa');
    },
  );

  test('requests that all hit an expired token share one refresh', () async {
    var refreshes = 0;
    final gate = Completer<void>();
    final server = FakeServer((o) async {
      if (o.path == '/auth/refresh') {
        refreshes++;
        await gate.future;
        expect((o.data as Map)['refreshToken'], 'refresh-1');
        return (
          200,
          {
            'data': {'accessToken': 'access-2', 'refreshToken': 'refresh-2'},
          },
        );
      }
      final authorized = o.headers['Authorization'] == 'Bearer access-2';
      return authorized
          ? (200, {'data': o.path})
          : (401, {'success': false, 'message': 'Token expired'});
    });
    final tokens = MemoryTokens(refresh: 'refresh-1')..accessToken = 'access-1';
    final api = _client(server, tokens);

    final results = Future.wait([
      api.get<Object?>('/a'),
      api.get<Object?>('/b'),
      api.get<Object?>('/c'),
    ]);
    await Future<void>.delayed(const Duration(milliseconds: 20));
    gate.complete();

    expect(await results, ['/a', '/b', '/c']);
    // One refresh: a second would replay a spent token, and the server
    // answers a replay by ending every session on the account.
    expect(refreshes, 1);
    expect(tokens.refresh, 'refresh-2');
  });

  test('a refused refresh ends the session and reports it', () async {
    final server = FakeServer(
      (o) async =>
          (401, {'success': false, 'message': 'Invalid refresh token'}),
    );
    final tokens = MemoryTokens(refresh: 'stale')..accessToken = 'old';
    final api = _client(server, tokens);
    var lost = false;
    api.onSessionLost = () => lost = true;

    await expectLater(
      api.get<Object?>('/me'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 401)),
    );
    expect(lost, isTrue);
    expect(tokens.refresh, isNull);
  });

  test(
    "validation errors arrive by field, with the server's message",
    () async {
      final server = FakeServer(
        (o) async => (
          400,
          {
            'success': false,
            'message': 'Validation failed',
            'errors': [
              {'path': 'email', 'message': 'Invalid email address'},
            ],
          },
        ),
      );
      final api = _client(server, MemoryTokens());

      await expectLater(
        api.post<Object?>('/auth/register', body: {}),
        throwsA(
          isA<ApiException>()
              .having((e) => e.message, 'message', 'Validation failed')
              .having(
                (e) => e.fieldErrors['email'],
                'email',
                'Invalid email address',
              ),
        ),
      );
    },
  );
}
