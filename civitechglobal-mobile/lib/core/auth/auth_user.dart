import 'package:freezed_annotation/freezed_annotation.dart';

part 'auth_user.freezed.dart';
part 'auth_user.g.dart';

/// The signed-in person, as `/auth/me` returns them
/// (userResponseFields in civitechglobal-server/src/services/auth.service.ts).
@freezed
abstract class AuthUser with _$AuthUser {
  const factory AuthUser({
    required String id,
    required String email,
    required String firstName,
    required String lastName,
    String? username,
    String? phone,
    @Default('USER') String role,
    @Default(<String>[]) List<String> permissions,
    @Default(false) bool emailVerified,
  }) = _AuthUser;

  const AuthUser._();

  factory AuthUser.fromJson(Map<String, Object?> json) =>
      _$AuthUserFromJson(json);

  String get fullName => '$firstName $lastName'.trim();

  /// Staff accounts get a link to the web panel; the app has no admin screens.
  bool get isStaff => role == 'ADMIN' || role == 'SUPER_ADMIN';
}
