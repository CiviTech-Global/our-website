import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../inbox/inbox_data.dart';

int _int(Object? v) => v is num ? v.toInt() : 0;

Map<String, int> _counts(Object? v) => {
  if (v is Map)
    for (final MapEntry(:key, :value) in v.entries) '$key': _int(value),
};

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

/// A notification as the member home lists it.
typedef Activity = ({
  String id,
  String title,
  String body,
  String? link,
  bool read,
  DateTime? createdAt,
});

/// The member home's one request, `GET /market/me/workspace`: which parts
/// this member plays and what is waiting in each, as the web's DashboardPage
/// reads it.
class Workspace {
  const Workspace({
    required this.verification,
    required this.hiringPostings,
    required this.hiringOpen,
    required this.hiringApplicants,
    required this.hiringUnseen,
    required this.hiringByStatus,
    required this.hiringByOutcome,
    required this.jobApplications,
    required this.jobByOutcome,
    required this.savedJobs,
    required this.activeAlerts,
    required this.clientProjects,
    required this.clientOpen,
    required this.clientByStatus,
    required this.bidsAwaiting,
    required this.freelanceBids,
    required this.freelanceByOutcome,
    required this.books,
    required this.booksByStatus,
    required this.collaborationsActive,
    required this.collaborationsCompleted,
    required this.unreadNotifications,
    required this.unreadMessages,
    required this.recent,
    required this.trackedRequests,
  });

  factory Workspace.fromJson(Map<String, Object?> j) {
    Map<String, Object?> part(String key) =>
        (j[key] as Map?)?.cast<String, Object?>() ?? const {};
    final hiring = part('hiring');
    final jobSearch = part('jobSearch');
    final client = part('client');
    final freelance = part('freelance');
    final selling = part('selling');
    final collaborations = part('collaborations');
    final unread = part('unread');
    return Workspace(
      verification: '${j['verification'] ?? 'UNVERIFIED'}',
      hiringPostings: _int(hiring['postings']),
      hiringOpen: _int(hiring['open']),
      hiringApplicants: _int(hiring['applicants']),
      hiringUnseen: _int(hiring['unseen']),
      hiringByStatus: _counts(hiring['byStatus']),
      hiringByOutcome: _counts(hiring['byOutcome']),
      jobApplications: _int(jobSearch['applications']),
      jobByOutcome: _counts(jobSearch['byOutcome']),
      savedJobs: _int(jobSearch['savedJobs']),
      activeAlerts: _int(jobSearch['activeAlerts']),
      clientProjects: _int(client['projects']),
      clientOpen: _int(client['open']),
      clientByStatus: _counts(client['byStatus']),
      bidsAwaiting: _int(client['bidsAwaiting']),
      freelanceBids: _int(freelance['bids']),
      freelanceByOutcome: _counts(freelance['byOutcome']),
      books: _int(selling['books']),
      booksByStatus: _counts(selling['booksByStatus']),
      collaborationsActive: _int(collaborations['active']),
      collaborationsCompleted: _int(collaborations['completed']),
      unreadNotifications: _int(unread['notifications']),
      unreadMessages: _int(unread['messages']),
      recent: [
        for (final n in (j['recentNotifications'] as List? ?? const []))
          if (n is Map)
            (
              id: '${n['id']}',
              title: '${n['title'] ?? ''}',
              body: '${n['body'] ?? ''}',
              link: n['link'] as String?,
              read: n['readAt'] != null,
              createdAt: _date(n['createdAt']),
            ),
      ],
      trackedRequests: _int(j['trackedRequests']),
    );
  }

  /// UNVERIFIED, PENDING, APPROVED, REJECTED...
  final String verification;
  final int hiringPostings;
  final int hiringOpen;
  final int hiringApplicants;
  final int hiringUnseen;
  final Map<String, int> hiringByStatus;
  final Map<String, int> hiringByOutcome;
  final int jobApplications;
  final Map<String, int> jobByOutcome;
  final int savedJobs;
  final int activeAlerts;
  final int clientProjects;
  final int clientOpen;
  final Map<String, int> clientByStatus;
  final int bidsAwaiting;
  final int freelanceBids;
  final Map<String, int> freelanceByOutcome;
  final int books;
  final Map<String, int> booksByStatus;
  final int collaborationsActive;
  final int collaborationsCompleted;
  final int unreadNotifications;
  final int unreadMessages;
  final List<Activity> recent;
  final int trackedRequests;

  /// Listings sent back with a reviewer's note, across jobs, projects and books.
  int get changesRequested =>
      (hiringByStatus['CHANGES_REQUESTED'] ?? 0) +
      (clientByStatus['CHANGES_REQUESTED'] ?? 0) +
      (booksByStatus['CHANGES_REQUESTED'] ?? 0);
}

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

/// Null while nobody is signed in.
final workspaceProvider = FutureProvider<Workspace?>((ref) async {
  if (ref.watch(_accountProvider) == null) return null;
  // Asked again when the Inbox's unread count moves, so "needs your
  // attention" never lags behind messages already read.
  ref.watch(inboxBadgeProvider);
  return ref
      .read(apiClientProvider)
      .get(
        '/market/me/workspace',
        parse: (d) => Workspace.fromJson(d! as Map<String, Object?>),
      );
});

/// A request made through one of the account-less intakes and kept on the
/// account by its code. [state] is where it stands now, or null when the
/// request can no longer be found.
class TrackedRequest {
  const TrackedRequest({
    required this.code,
    this.label,
    this.createdAt,
    this.state,
  });

  factory TrackedRequest.fromJson(Map<String, Object?> j) => TrackedRequest(
    code: '${j['code']}',
    label: switch (j['label']) {
      final String l when l.trim().isNotEmpty => l,
      _ => null,
    },
    createdAt: _date(j['createdAt']),
    state: (j['state'] as Map?)?.cast<String, Object?>(),
  );

  final String code;
  final String? label;
  final DateTime? createdAt;
  final Map<String, Object?>? state;

  /// insurance, project, resume or consultation.
  String? get kind => state?['kind'] as String?;
  String? get status => state?['status'] as String?;
}

/// The account's kept codes, newest first: `GET /market/me/tracked-requests`.
final trackedRequestsProvider = FutureProvider<List<TrackedRequest>>((
  ref,
) async {
  if (ref.watch(_accountProvider) == null) return const [];
  return ref
      .read(apiClientProvider)
      .get(
        '/market/me/tracked-requests',
        parse: (d) => [
          for (final r in (d as List? ?? const []))
            if (r is Map<String, Object?>) TrackedRequest.fromJson(r),
        ],
      );
});

/// Keeps [code] on the account; a label of null leaves any label it has.
Future<void> trackRequest(Ref ref, String code, {String? label}) async {
  await ref
      .read(apiClientProvider)
      .post<void>(
        '/market/me/tracked-requests',
        body: {'code': code, 'label': ?label},
      );
  ref
    ..invalidate(trackedRequestsProvider)
    ..invalidate(workspaceProvider);
}

Future<void> untrackRequest(Ref ref, String code) async {
  await ref
      .read(apiClientProvider)
      .delete<void>('/market/me/tracked-requests/${Uri.encodeComponent(code)}');
  ref
    ..invalidate(trackedRequestsProvider)
    ..invalidate(workspaceProvider);
}

/// The two above, for widgets: a widget's ref cannot be passed as a Ref.
final trackingActionsProvider = Provider<TrackingActions>(TrackingActions.new);

class TrackingActions {
  const TrackingActions(this._ref);

  final Ref _ref;

  Future<void> track(String code, {String? label}) =>
      trackRequest(_ref, code, label: label);

  Future<void> untrack(String code) => untrackRequest(_ref, code);
}
