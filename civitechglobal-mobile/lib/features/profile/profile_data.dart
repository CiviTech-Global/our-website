import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../me/workspace_data.dart';

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

List<String> _strings(Object? v) =>
    v is List ? v.whereType<String>().toList() : const [];

/// The account's own public-profile fields, `GET /market/me/profile`.
/// [username] is null until one is chosen (at registration or by support):
/// without it there is no public page.
typedef OwnProfile = ({
  String? username,
  String? headline,
  String? bio,
  String? website,
  List<String> skills,
});

OwnProfile _ownProfile(Object? d) {
  final m = (d as Map?) ?? const {};
  return (
    username: _text(m['username']),
    headline: _text(m['headline']),
    bio: _text(m['bio']),
    website: _text(m['website']),
    skills: _strings(m['skills']),
  );
}

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

final ownProfileProvider = FutureProvider.autoDispose<OwnProfile?>((ref) async {
  if (ref.watch(_accountProvider) == null) return null;
  return ref
      .read(apiClientProvider)
      .get('/market/me/profile', parse: _ownProfile);
});

/// A listing on a public profile: a job or a freelance project.
typedef ProfileListing = ({
  String code,
  String title,

  /// The employment type for a job, the category for a project.
  String? tag,
  String state,
  bool isJob,
});

/// A rating someone received, with the listing it was left on.
typedef ProfileReview = ({
  int rating,
  String? text,
  DateTime? createdAt,

  /// employer, applicant, client, freelancer, buyer or seller.
  String role,
  String listingCode,
  String listingTitle,

  /// Where the listing is read, as the server says; null when it has no page.
  String? listingPath,
});

/// A member's public face, `GET /market/profiles/:username`, as the web's
/// public ProfilePage reads it: what they chose to say, whether they are
/// verified, their reputation, live listings and reviews. Never contact
/// details.
class PublicProfile {
  const PublicProfile({
    required this.username,
    required this.verified,
    required this.ratingAvg,
    required this.ratingCount,
    required this.listings,
    required this.reviews,
    this.headline,
    this.bio,
    this.website,
    this.companyName,
    this.joinedAt,
    this.skills = const [],
  });

  factory PublicProfile.fromJson(Map<String, Object?> j) => PublicProfile(
    username: '${j['username']}',
    headline: _text(j['headline']),
    bio: _text(j['bio']),
    website: _text(j['website']),
    companyName: _text(j['companyName']),
    skills: _strings(j['skills']),
    verified: j['verified'] == true,
    ratingAvg: (j['ratingAvg'] as num?)?.toDouble() ?? 0,
    ratingCount: (j['ratingCount'] as num?)?.toInt() ?? 0,
    joinedAt: _date(j['joinedAt']),
    listings: [
      for (final x in (j['jobs'] as List? ?? const []))
        if (x is Map)
          (
            code: '${x['code']}',
            title: '${x['title'] ?? ''}',
            tag: _text(x['employmentType']),
            state: '${x['state'] ?? ''}',
            isJob: true,
          ),
      for (final x in (j['projects'] as List? ?? const []))
        if (x is Map)
          (
            code: '${x['code']}',
            title: '${x['title'] ?? ''}',
            tag: _text(x['category']),
            state: '${x['state'] ?? ''}',
            isJob: false,
          ),
    ],
    reviews: [
      for (final r in (j['reviews'] as List? ?? const []))
        if (r is Map)
          (
            rating: (r['rating'] as num?)?.round() ?? 0,
            text: _text(r['text']),
            createdAt: _date(r['createdAt']),
            role: '${r['role'] ?? ''}',
            listingCode: '${r['listingCode'] ?? ''}',
            listingTitle: '${r['listingTitle'] ?? ''}',
            // A server from before listingPath: the role-based guess.
            listingPath: r.containsKey('listingPath')
                ? _text(r['listingPath'])
                : _guessListingPath(
                    '${r['role'] ?? ''}',
                    '${r['listingCode'] ?? ''}',
                  ),
          ),
    ],
  );

  final String username;
  final String? headline;
  final String? bio;
  final String? website;
  final String? companyName;
  final List<String> skills;
  final bool verified;
  final double ratingAvg;
  final int ratingCount;
  final DateTime? joinedAt;
  final List<ProfileListing> listings;
  final List<ProfileReview> reviews;
}

final publicProfileProvider = FutureProvider.autoDispose
    .family<PublicProfile, String>(
      (ref, username) => ref
          .read(apiClientProvider)
          .get(
            '/market/profiles/${Uri.encodeComponent(username)}',
            parse: (d) => PublicProfile.fromJson(d! as Map<String, Object?>),
          ),
    );

/// Where a review's listing lives, for a server that does not say. The role
/// cannot tell a service from a project (both read as client and
/// freelancer), which is why the server now sends the path itself.
String _guessListingPath(String role, String code) => switch (role) {
  'employer' || 'applicant' => '/jobs/$code',
  'buyer' || 'seller' => '/books/$code',
  _ => '/projects/$code',
};

/// The account's identity verification, `GET /market/me/verification`.
/// The internal reviewer note is never sent; [reviewNote] is written to the
/// applicant.
class OwnVerification {
  const OwnVerification({
    required this.status,
    this.kind,
    this.legalFirstName,
    this.legalLastName,
    this.companyName,
    this.submittedAt,
    this.reviewNote,
  });

  factory OwnVerification.fromJson(Map<String, Object?> j) => OwnVerification(
    status: '${j['status'] ?? 'UNVERIFIED'}',
    kind: _text(j['kind']),
    legalFirstName: _text(j['legalFirstName']),
    legalLastName: _text(j['legalLastName']),
    companyName: _text(j['companyName']),
    submittedAt: _date(j['submittedAt']),
    reviewNote: _text(j['reviewNote']),
  );

  /// UNVERIFIED, PENDING, APPROVED or REJECTED.
  final String status;
  final String? kind;
  final String? legalFirstName;
  final String? legalLastName;
  final String? companyName;
  final DateTime? submittedAt;
  final String? reviewNote;

  /// Only a first attempt or one after a rejection: an approved account has
  /// nothing to do, and resubmitting while pending would only restart the
  /// wait (the server refuses both with a 409).
  bool get canSubmit => status == 'UNVERIFIED' || status == 'REJECTED';
}

final ownVerificationProvider = FutureProvider.autoDispose<OwnVerification?>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return null;
  return ref
      .read(apiClientProvider)
      .get(
        '/market/me/verification',
        parse: (d) => OwnVerification.fromJson(d! as Map<String, Object?>),
      );
});

/// The documents each account kind must include, mirrored from the server's
/// REQUIRED_DOCUMENTS (civitechglobal-server/src/services/verification.service.ts)
/// so the form says what is missing before anything is uploaded.
const requiredDocuments = {
  'INDIVIDUAL': ['NATIONAL_ID_CARD'],
  'COMPANY': ['NATIONAL_ID_CARD', 'COMPANY_REGISTRATION'],
};

const documentKinds = [
  'NATIONAL_ID_CARD',
  'PASSPORT',
  'COMPANY_REGISTRATION',
  'AUTHORITY_LETTER',
  'OTHER',
];

/// What a verification document may be: the web's accept list.
const documentExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

/// The profile and verification writes, for widgets.
final profileActionsProvider = Provider<ProfileActions>(ProfileActions.new);

class ProfileActions {
  const ProfileActions(this._ref);

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  /// Every field is sent: the form is seeded from the server, so an empty
  /// box means "clear it". [skills] is null where the form has no skills
  /// field, so skills set elsewhere are left alone.
  Future<void> savePublicProfile({
    required String headline,
    required String bio,
    required String website,
    List<String>? skills,
  }) async {
    await _api.patch<void>(
      '/market/me/profile',
      body: {
        'headline': headline,
        'bio': bio,
        'website': website,
        'skills': ?skills,
      },
    );
    _ref.invalidate(ownProfileProvider);
  }

  /// Sends the details and documents for review: `payload` as one JSON
  /// field, the files as `documents`, and their kinds as a JSON array in the
  /// same order (multipart keeps field order, not the pairing between two
  /// repeated fields).
  Future<void> submitVerification({
    required String payload,
    required String kinds,
    required List<MultipartFile> Function() documents,
    void Function(double progress)? onProgress,
  }) async {
    await _api.upload<void>(
      '/market/me/verification',
      form: () => FormData.fromMap({
        'payload': payload,
        'kinds': kinds,
        'documents': documents(),
      }),
      onProgress: onProgress,
    );
    _ref
      ..invalidate(ownVerificationProvider)
      ..invalidate(workspaceProvider);
  }
}

/// Skills as typed: split on either comma, since a Persian keyboard types
/// «،» and a list split on "," alone arrives as one skill.
List<String> splitSkills(String value) => [
  for (final skill in value.split(RegExp('[,،]')))
    if (skill.trim().isNotEmpty) skill.trim(),
].take(30).toList();
