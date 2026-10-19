import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/poll.dart';

/// Where a thread lives: a job application (a), a project bid (b) or a book
/// purchase request (k), as the web's ThreadKind.
String threadKindCode(String kind) => switch (kind) {
  'application' => 'a',
  'book' => 'k',
  _ => 'b',
};

String _threadPath(String code, String id) => code == 'k'
    ? '/bookshop/me/requests/$id/messages'
    : '/market/me/${code == 'a' ? 'applications' : 'bids'}/$id/messages';

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

class Conversation {
  const Conversation({
    required this.threadId,
    required this.kind,
    required this.listingTitle,
    required this.unreadCount,
    this.counterpartName,
    this.verified = false,
    this.lastBody,
    this.lastAt,
    this.lastMine = false,
  });

  factory Conversation.fromJson(Map<String, Object?> j) {
    final last = j['lastMessage'] as Map<String, Object?>?;
    final counterpart = j['counterpart'] as Map<String, Object?>?;
    return Conversation(
      threadId: '${j['threadId']}',
      kind: '${j['kind']}',
      listingTitle: '${j['listingTitle'] ?? ''}',
      unreadCount: (j['unreadCount'] as num?)?.toInt() ?? 0,
      counterpartName: j['counterpartName'] as String?,
      verified: counterpart?['verified'] == true,
      lastBody: last?['body'] as String?,
      lastAt: _date(last?['createdAt']),
      lastMine: last?['mine'] == true,
    );
  }

  final String threadId;

  /// application, bid or book.
  final String kind;
  final String listingTitle;
  final int unreadCount;
  final String? counterpartName;
  final bool verified;
  final String? lastBody;
  final DateTime? lastAt;
  final bool lastMine;

  String get path => '/dashboard/messages/${threadKindCode(kind)}/$threadId';
}

class ThreadMessage {
  const ThreadMessage({
    required this.id,
    required this.body,
    required this.mine,
    this.createdAt,
  });

  final String id;
  final String body;
  final bool mine;
  final DateTime? createdAt;
}

class Thread {
  const Thread({
    required this.kind,
    required this.listingTitle,
    required this.path,
    required this.messages,
  });

  factory Thread.fromJson(Map<String, Object?> j) {
    final anchor = j['anchor'] as Map<String, Object?>? ?? const {};
    return Thread(
      kind: '${anchor['kind']}',
      listingTitle: '${anchor['listingTitle'] ?? ''}',
      path: '${anchor['path'] ?? ''}',
      messages: [
        for (final m in (j['messages'] as List? ?? const []))
          if (m is Map<String, Object?>)
            ThreadMessage(
              id: '${m['id']}',
              body: '${m['body'] ?? ''}',
              mine: m['mine'] == true,
              createdAt: _date(m['createdAt']),
            ),
      ],
    );
  }

  final String kind;
  final String listingTitle;

  /// The listing on the website (a job, a project, a book).
  final String path;
  final List<ThreadMessage> messages;
}

class Notice {
  const Notice({
    required this.id,
    required this.title,
    required this.body,
    this.link,
    this.read = false,
    this.createdAt,
  });

  factory Notice.fromJson(Map<String, Object?> j) => Notice(
    id: '${j['id']}',
    title: '${j['title'] ?? ''}',
    body: '${j['body'] ?? ''}',
    link: j['link'] as String?,
    read: j['readAt'] != null,
    createdAt: _date(j['createdAt']),
  );

  final String id;
  final String title;
  final String body;
  final String? link;
  final bool read;
  final DateTime? createdAt;

  Notice get asRead => Notice(
    id: id,
    title: title,
    body: body,
    link: link,
    read: true,
    createdAt: createdAt,
  );
}

/// The account's id, so every list here starts over when someone else signs
/// in, and asks nothing while nobody is.
final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

/// Threads with something in them, last said first: `GET /market/me/conversations`.
final conversationsProvider = FutureProvider<List<Conversation>>((ref) async {
  if (ref.watch(_accountProvider) == null) return const [];
  pollWhileOpen(ref, const Duration(seconds: 30));
  return ref
      .read(apiClientProvider)
      .get(
        '/market/me/conversations',
        parse: (d) => [
          for (final c in (d as List? ?? const []))
            if (c is Map<String, Object?>) Conversation.fromJson(c),
        ],
      );
});

/// One thread, refreshed every 15 seconds while it is open, as on the web.
final threadProvider = FutureProvider.autoDispose
    .family<Thread, (String, String)>((ref, key) async {
      final (code, id) = key;
      pollWhileOpen(ref, const Duration(seconds: 15));
      return ref
          .read(apiClientProvider)
          .get(
            _threadPath(code, id),
            parse: (d) => Thread.fromJson(d! as Map<String, Object?>),
          );
    });

/// Says [body] in a thread, then refreshes it and the list at once, so the
/// writer never waits on the poll.
Future<void> sendMessage(
  WidgetRef ref,
  (String, String) thread,
  String body,
) async {
  await ref
      .read(apiClientProvider)
      .post<void>(_threadPath(thread.$1, thread.$2), body: {'body': body});
  ref
    ..invalidate(threadProvider(thread))
    ..invalidate(conversationsProvider);
}

/// Unread notices for the badge: `GET /market/me/notifications/unread-count`.
final unreadNoticesProvider = FutureProvider<int>((ref) async {
  if (ref.watch(_accountProvider) == null) return 0;
  pollWhileOpen(ref, const Duration(seconds: 30));
  return ref
      .read(apiClientProvider)
      .get(
        '/market/me/notifications/unread-count',
        parse: (d) => ((d as Map?)?['count'] as num?)?.toInt() ?? 0,
      );
});

/// Unread messages and notices together: the Inbox tab's badge.
final inboxBadgeProvider = Provider<int>((ref) {
  final messages = (ref.watch(conversationsProvider).value ?? const []).fold(
    0,
    (sum, c) => sum + c.unreadCount,
  );
  return messages + (ref.watch(unreadNoticesProvider).value ?? 0);
});

typedef NoticePage = ({List<Notice> items, int page, int totalPages});

/// The notification centre, newest first, a page of 20 at a time; the next
/// page loads as the list nears its end.
final noticesProvider = AsyncNotifierProvider<NoticesController, NoticePage>(
  NoticesController.new,
);

class NoticesController extends AsyncNotifier<NoticePage> {
  static const pageSize = 20;
  bool _loadingMore = false;

  ApiClient get _api => ref.read(apiClientProvider);

  Future<NoticePage> _fetch(int page) => _api.get(
    '/market/me/notifications',
    query: {'page': page, 'pageSize': pageSize},
    parse: (d) {
      final map = d! as Map;
      return (
        items: [
          for (final n in (map['items'] as List? ?? const []))
            if (n is Map<String, Object?>) Notice.fromJson(n),
        ],
        page: (map['page'] as num?)?.toInt() ?? page,
        totalPages: (map['totalPages'] as num?)?.toInt() ?? 1,
      );
    },
  );

  @override
  Future<NoticePage> build() async {
    if (ref.watch(_accountProvider) == null) {
      return (items: const <Notice>[], page: 1, totalPages: 1);
    }
    return _fetch(1);
  }

  bool get hasMore => switch (state.value) {
    final p? => p.page < p.totalPages,
    null => false,
  };

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !hasMore || _loadingMore) return;
    _loadingMore = true;
    try {
      final next = await _fetch(current.page + 1);
      // Rows already shown stay; a notice that arrived meanwhile moves the
      // pages along by one, so a repeat is dropped rather than shown twice.
      final seen = {for (final n in current.items) n.id};
      state = AsyncData((
        items: [
          ...current.items,
          ...next.items.where((n) => !seen.contains(n.id)),
        ],
        page: next.page,
        totalPages: next.totalPages,
      ));
    } finally {
      _loadingMore = false;
    }
  }

  /// Marked read here at once, then on the server.
  Future<void> markRead(String id) async {
    _update((n) => n.id == id ? n.asRead : n);
    await _api.post<void>('/market/me/notifications/$id/read');
    ref.invalidate(unreadNoticesProvider);
  }

  Future<void> markAllRead() async {
    _update((n) => n.asRead);
    await _api.post<void>('/market/me/notifications/read-all');
    ref.invalidate(unreadNoticesProvider);
  }

  void _update(Notice Function(Notice) change) {
    final current = state.value;
    if (current == null) return;
    state = AsyncData((
      items: [for (final n in current.items) change(n)],
      page: current.page,
      totalPages: current.totalPages,
    ));
  }
}
