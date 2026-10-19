import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/auth/auth_user.dart';
import 'package:civitech_global_flutter/core/auth/session.dart';
import 'package:civitech_global_flutter/features/inbox/inbox_data.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../core/api_client_test.dart' show FakeServer, MemoryTokens;

class _SignedIn extends SessionController {
  @override
  Future<AuthUser?> build() async => const AuthUser(
    id: 'u1',
    email: 'a@b.c',
    firstName: 'Maryam',
    lastName: 'Ahmadi',
  );
}

ProviderContainer _container(FakeServer server, {bool signedIn = true}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://api.test/api/v1'))
    ..httpClientAdapter = server;
  final container = ProviderContainer(
    overrides: [
      apiClientProvider.overrideWithValue(
        ApiClient(tokens: MemoryTokens(), language: () => 'en', dio: dio),
      ),
      if (signedIn) sessionProvider.overrideWith(_SignedIn.new),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

Map<String, Object?> _notice(String id, {bool read = false}) => {
  'id': id,
  'title': 'Title $id',
  'body': 'Body',
  'link': '/dashboard/messages/b/t1',
  'readAt': read ? '2026-10-01T00:00:00Z' : null,
  'createdAt': '2026-10-01T00:00:00Z',
};

Map<String, Object?> _page(List<String> ids, int page, int totalPages) => {
  'data': {
    'items': [for (final id in ids) _notice(id)],
    'page': page,
    'pageSize': 20,
    'total': 40,
    'totalPages': totalPages,
    'unreadCount': 3,
  },
};

void main() {
  // pollWhileOpen listens to the app's lifecycle.
  TestWidgetsFlutterBinding.ensureInitialized();

  test('a thread kind maps to the web\'s path letter', () {
    expect(threadKindCode('application'), 'a');
    expect(threadKindCode('bid'), 'b');
    expect(threadKindCode('book'), 'k');
  });

  test(
    'conversations parse, and the badge counts messages and notices',
    () async {
      final server = FakeServer(
        (o) async => switch (o.path) {
          '/market/me/conversations' => (
            200,
            {
              'data': [
                {
                  'threadId': 't1',
                  'kind': 'book',
                  'listingTitle': 'A book',
                  'counterpart': {'verified': true},
                  'counterpartName': 'Sara',
                  'lastMessage': {
                    'body': 'Hi',
                    'createdAt': '2026-10-01T00:00:00Z',
                    'mine': false,
                  },
                  'unreadCount': 2,
                },
                {
                  'threadId': 't2',
                  'kind': 'application',
                  'listingTitle': 'A job',
                  'counterpart': null,
                  'counterpartName': null,
                  'lastMessage': null,
                  'unreadCount': 1,
                },
              ],
            },
          ),
          '/market/me/notifications/unread-count' => (
            200,
            {
              'data': {'count': 4},
            },
          ),
          _ => (404, null),
        },
      );
      final container = _container(server);
      await container.read(sessionProvider.future);
      final threads = await container.read(conversationsProvider.future);
      await container.read(unreadNoticesProvider.future);

      expect(threads.first.path, '/dashboard/messages/k/t1');
      expect(threads.first.verified, isTrue);
      expect(threads.last.counterpartName, isNull);
      expect(threads.last.lastBody, isNull);
      expect(container.read(inboxBadgeProvider), 7);
    },
  );

  test('signed out, nothing is asked of the server', () async {
    final server = FakeServer((o) async => (200, null));
    final container = _container(server, signedIn: false);
    expect(await container.read(conversationsProvider.future), isEmpty);
    expect(await container.read(unreadNoticesProvider.future), 0);
    expect(server.requests, isEmpty);
  });

  test('the next page joins the list without repeating a row', () async {
    final server = FakeServer(
      (o) async => switch (o.queryParameters['page']) {
        1 => (200, _page(['n1', 'n2'], 1, 2)),
        // A notice arrived meanwhile and pushed n2 onto page 2.
        _ => (200, _page(['n2', 'n3'], 2, 2)),
      },
    );
    final container = _container(server);
    await container.read(sessionProvider.future);
    await container.read(noticesProvider.future);
    final notices = container.read(noticesProvider.notifier);
    expect(notices.hasMore, isTrue);

    await notices.loadMore();
    final page = container.read(noticesProvider).value!;
    expect([for (final n in page.items) n.id], ['n1', 'n2', 'n3']);
    expect(notices.hasMore, isFalse);
  });

  test('marking read shows at once and tells the server', () async {
    final server = FakeServer(
      (o) async => switch (o.path) {
        '/market/me/notifications' => (200, _page(['n1', 'n2'], 1, 1)),
        _ => (
          200,
          {
            'data': {'ok': true, 'count': 0},
          },
        ),
      },
    );
    final container = _container(server);
    await container.read(sessionProvider.future);
    await container.read(noticesProvider.future);
    final notices = container.read(noticesProvider.notifier);

    final pending = notices.markRead('n1');
    // Read before the server has answered.
    expect(container.read(noticesProvider).value!.items.first.read, isTrue);
    expect(container.read(noticesProvider).value!.items.last.read, isFalse);
    await pending;
    expect(
      server.requests.map((r) => '${r.method} ${r.path}'),
      contains('POST /market/me/notifications/n1/read'),
    );

    await notices.markAllRead();
    expect(
      container.read(noticesProvider).value!.items.every((n) => n.read),
      isTrue,
    );
  });
}
