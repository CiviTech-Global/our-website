import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'config.dart';

/// Reports crashes to the server's own client-error endpoint, the one the web
/// uses (POST /api/v1/client-errors), rather than to an outside service that
/// may be unreachable, or restricted, from Iran.
///
/// Fire-and-forget and bounded to what the endpoint accepts. Never reports
/// from debug builds, where the console already shows everything.
class Telemetry {
  Telemetry._();

  static final _dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      headers: {'X-Client': 'mobile'},
    ),
  );

  static String release = '';
  static String route = '';

  static void install() {
    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      report(details.exception, details.stack, kind: 'boundary');
    };
    PlatformDispatcher.instance.onError = (error, stack) {
      report(error, stack);
      return true;
    };
  }

  static void report(Object error, StackTrace? stack, {String kind = 'error'}) {
    if (kDebugMode) return;
    final message = error.toString();
    unawaited(
      _dio
          .post<void>(
            '/client-errors',
            data: {
              'message': message.length > 500
                  ? message.substring(0, 500)
                  : message,
              if (stack != null) 'stack': _clip(stack.toString(), 4000),
              'route': _clip(route, 200),
              'kind': kind,
              'release': _clip('android-$release', 60),
            },
          )
          .then((_) {}, onError: (_) {}),
    );
  }

  static String _clip(String s, int max) =>
      s.length > max ? s.substring(0, max) : s;
}
