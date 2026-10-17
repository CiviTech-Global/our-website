import 'package:dio/dio.dart';

/// What went wrong with a request, in the shape the server reports it:
/// `{ success: false, message, errors?: [{ path, message }] }`.
class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.status,
    this.fieldErrors = const {},
    this.offline = false,
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
      final fields = <String, String>{};
      if (data is Map) {
        if (data['message'] is String) message = data['message'] as String;
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

  @override
  String toString() => 'ApiException($status, $message)';
}
