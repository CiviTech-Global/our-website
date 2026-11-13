import 'package:dio/dio.dart';

/// What went wrong with a request, in the shape the server reports it:
/// `{ success: false, message, errors?: [{ path, message }] }`.
class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.status,
    this.fieldErrors = const {},
    this.offline = false,
    this.code,
    this.data,
  });

  factory ApiException.from(Object error) {
    if (error is ApiException) return error;
    if (error is DioException) {
      final response = error.response;
      if (response == null) {
        return const ApiException(message: '', offline: true);
      }
      final data = response.data;
      var message = '';
      String? code;
      Object? extra;
      final fields = <String, String>{};
      if (data is Map) {
        if (data['message'] is String) message = data['message'] as String;
        if (data['code'] is String) code = data['code'] as String;
        extra = data['data'];
        final errors = data['errors'];
        if (errors is List) {
          for (final e in errors) {
            if (e is Map && e['path'] is String && e['message'] is String) {
              fields[e['path'] as String] = e['message'] as String;
            }
          }
        }
      }
      return ApiException(
        message: message,
        status: response.statusCode,
        fieldErrors: fields,
        code: code,
        data: extra,
      );
    }
    return ApiException(message: error.toString());
  }

  /// The server's own message, which it writes for people to read. Empty when
  /// there is none, so the caller can show its own.
  final String message;
  final int? status;

  /// Validation messages by field path, e.g. {'email': 'Invalid email'}.
  final Map<String, String> fieldErrors;

  /// The request never reached the server.
  final bool offline;

  /// The server's machine-readable reason, e.g. `QUOTA_EXCEEDED`.
  final String? code;

  /// What the server attached to the error, for a [code] that has any.
  final Object? data;

  @override
  String toString() => 'ApiException($status, $message)';
}
