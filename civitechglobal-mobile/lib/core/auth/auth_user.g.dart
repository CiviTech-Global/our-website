// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AuthUser _$AuthUserFromJson(Map<String, dynamic> json) => _AuthUser(
  id: json['id'] as String,
  email: json['email'] as String,
  firstName: json['firstName'] as String,
  lastName: json['lastName'] as String,
  username: json['username'] as String?,
  phone: json['phone'] as String?,
  role: json['role'] as String? ?? 'USER',
  permissions:
      (json['permissions'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
  emailVerified: json['emailVerified'] as bool? ?? false,
);

Map<String, dynamic> _$AuthUserToJson(_AuthUser instance) => <String, dynamic>{
  'id': instance.id,
  'email': instance.email,
  'firstName': instance.firstName,
  'lastName': instance.lastName,
  'username': instance.username,
  'phone': instance.phone,
  'role': instance.role,
  'permissions': instance.permissions,
  'emailVerified': instance.emailVerified,
};
