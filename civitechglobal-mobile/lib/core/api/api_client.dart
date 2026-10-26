import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/l10n.dart';
import '../auth/token_store.dart';
import '../config.dart';
import 'api_exception.dart';

/// The one way the app talks to the API.
///
/// - Says it is the mobile app (`X-Client: mobile`), so the auth endpoints
///   hand the refresh token over in the body instead of a cookie (see
///   civitechglobal-server/src/controllers/auth.controller.ts).
/// - Sends the access token, and the reader's language.
/// - On a 401 it refreshes once and retries once. Concurrent requests that
///   all hit an expired token share one refresh: refresh tokens are single
///   use, and two refreshes racing would look like a replayed token to the
///   server, which then ends every session on the account.
/// - Unwraps the `{ success, message, data }` envelope.
class ApiClient {
  ApiClient({
    required this.tokens,
    required String Function() language,
    Dio? dio,
  }) : _dio =
           dio ??
           Dio(
             BaseOptions(
               baseUrl: AppConfig.apiBaseUrl,
               connectTimeout: const Duration(seconds: 15),
               receiveTimeout: const Duration(seconds: 30),
               headers: {'X-Client': 'mobile'},
             ),
           ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = tokens.accessToken;
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          options.headers['Accept-Language'] = language();
          handler.next(options);
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStore tokens;

  /// Called when the session cannot be renewed, so the app can show itself
  /// signed out instead of failing request after request.
  void Function()? onSessionLost;

  Completer<bool>? _refreshing;

  static const _authPaths = {
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/auth/mfa/verify',
  };

  Future<T> get<T>(
    String path, {
    Map<String, Object?>? query,
    T Function(Object? data)? parse,
  }) => _send('GET', path, query: query, parse: parse);

  Future<T> post<T>(
    String path, {
    Object? body,
    T Function(Object? data)? parse,
  }) => _send('POST', path, body: body, parse: parse);

  Future<T> put<T>(
    String path, {
    Object? body,
    T Function(Object? data)? parse,
  }) => _send('PUT', path, body: body, parse: parse);

  Future<T> patch<T>(
    String path, {
    Object? body,
    T Function(Object? data)? parse,
  }) => _send('PATCH', path, body: body, parse: parse);

  Future<T> delete<T>(String path, {T Function(Object? data)? parse}) =>
      _send('DELETE', path, parse: parse);

  /// A multipart upload, reporting progress from 0 to 1 as it is sent.
  ///
  /// [form] is built fresh by the caller for every attempt: a FormData's
  /// file streams can be read only once, so the retry after a token refresh
  /// asks for a new one.
  Future<T> upload<T>(
    String path, {
    required FormData Function() form,
    String method = 'POST',
    void Function(double progress)? onProgress,
    T Function(Object? data)? parse,
  }) async {
    Future<T> attempt() async {
      final response = await _dio.request<Object?>(
        path,
        data: form(),
        options: Options(method: method),
        onSendProgress: onProgress == null
            ? null
            : (sent, total) {
                if (total > 0) onProgress(sent / total);
              },
      );
      final envelope = response.data;
      final data = envelope is Map ? envelope['data'] : envelope;
      return parse != null ? parse(data) : data as T;
    }

    try {
      return await attempt();
    } on DioException catch (error) {
      if (error.response?.statusCode == 401 && await refresh()) {
        try {
          return await attempt();
        } on DioException catch (retryError) {
          throw ApiException.from(retryError);
        }
      }
      throw ApiException.from(error);
    }
  }

  /// A file behind the sign-in, as bytes and the type the server gave it.
  /// The web opens these through a viewer that sends the token; a plain
  /// link would not, and neither would a browser tab.
  Future<({List<int> bytes, String mimeType})> download(String path) async {
    Future<({List<int> bytes, String mimeType})> attempt() async {
      final response = await _dio.get<List<int>>(
        path,
        options: Options(responseType: ResponseType.bytes),
      );
      return (
        bytes: response.data ?? const <int>[],
        mimeType:
            response.headers
                .value(Headers.contentTypeHeader)
                ?.split(';')
                .first ??
            'application/octet-stream',
      );
    }

    try {
      return await attempt();
    } on DioException catch (error) {
      if (error.response?.statusCode == 401 && await refresh()) {
        try {
          return await attempt();
        } on DioException catch (retryError) {
          throw ApiException.from(retryError);
        }
      }
      throw ApiException.from(error);
    }
  }

  Future<T> _send<T>(
    String method,
    String path, {
    Object? body,
    Map<String, Object?>? query,
    T Function(Object? data)? parse,
    bool retried = false,
  }) async {
    try {
      final response = await _dio.request<Object?>(
        path,
        data: body,
        // A copy: the caller's map may be constant, or reused for the next
        // request, and is never this method's to change.
        queryParameters: query == null
            ? null
            : {for (final MapEntry(:key, :value) in query.entries) key: ?value},
        options: Options(method: method),
      );
      final envelope = response.data;
      final data = envelope is Map ? envelope['data'] : envelope;
      return parse != null ? parse(data) : data as T;
    } on DioException catch (error) {
      final unauthorized = error.response?.statusCode == 401;
      if (unauthorized && !retried && !_authPaths.contains(path)) {
        if (await refresh()) {
          return _send(
            method,
            path,
            body: body,
            query: query,
            parse: parse,
            retried: true,
          );
        }
        onSessionLost?.call();
      }
      throw ApiException.from(error);
    }
  }

  /// Renews the access token with the stored refresh token. True on success.
  /// Shared by every caller that asks while a refresh is already running.
  Future<bool> refresh() {
    final running = _refreshing;
    if (running != null) return running.future;
    final completer = _refreshing = Completer<bool>();
    () async {
      try {
        final stored = await tokens.readRefreshToken();
        if (stored == null) {
          completer.complete(false);
          return;
        }
        final response = await _dio.post<Object?>(
          '/auth/refresh',
          data: {'refreshToken': stored},
        );
        final data = (response.data as Map)['data'] as Map;
        await tokens.save(
          accessToken: data['accessToken'] as String,
          refreshToken: data['refreshToken'] as String,
        );
        completer.complete(true);
      } on DioException catch (error) {
        // Only a definite "no" from the server ends the session. Offline, the
        // stored token is still good for when the connection comes back.
        final status = error.response?.statusCode;
        if (status == 401 || status == 404) await tokens.clear();
        completer.complete(false);
      } catch (_) {
        completer.complete(false);
      } finally {
        _refreshing = null;
      }
    }();
    return completer.future;
  }
}

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(
    tokens: ref.watch(tokenStoreProvider),
    language: () => ref.read(l10nProvider).language,
  ),
);
