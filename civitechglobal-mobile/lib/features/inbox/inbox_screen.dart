import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/centered_scroll.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../help/help_sheet.dart';
import 'inbox_data.dart';

/// Messages and notifications together, as two tabs: the web's
/// /dashboard/messages and /dashboard/notifications. A signed-out visitor is
/// asked to sign in.
class InboxScreen extends ConsumerWidget {
  const InboxScreen({this.tab, super.key});

  /// 'notifications' opens on that tab.
  final String? tab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final user = ref.watch(sessionProvider).value;
    if (user == null) return const _SignedOut();

    final unreadMessages = (ref.watch(conversationsProvider).value ?? const [])
        .fold(0, (sum, c) => sum + c.unreadCount);
    final unreadNotices = ref.watch(unreadNoticesProvider).value ?? 0;

    return DefaultTabController(
      // A new key when the address names another tab, so a link to the
      // notifications lands there even with the Inbox already open.
      key: ValueKey(tab),
      length: 2,
      initialIndex: tab == 'notifications' ? 1 : 0,
      child: Scaffold(
        appBar: AppBar(
          title: Text(s.mobile.inboxTitle),
          actions: const [HelpAction('messages')],
          bottom: TabBar(
            tabs: [
              _CountedTab(s.market.messagesNav, unreadMessages),
              _CountedTab(s.market.notificationsNav, unreadNotices),
            ],
          ),
        ),
        body: const TabBarView(children: [_Conversations(), _Notices()]),
      ),
    );
  }
}

class _SignedOut extends ConsumerWidget {
  const _SignedOut();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final c = BaghColors.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(s.mobile.inboxTitle),
        actions: const [HelpAction('messages')],
      ),
      body: CenteredScroll(
        child: SizedBox(
          width: double.infinity,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            spacing: 16,
            children: [
              GirihStar(color: c.tints[2].ink, size: 56),
              Text(
                s.mobile.inboxSignedOut,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              BaghKey(
                label: s.nav.login,
                onPressed: () => context.push('/login?from=/inbox'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A tab label with its unread count beside it.
class _CountedTab extends StatelessWidget {
  const _CountedTab(this.label, this.count);

  final String label;
  final int count;

  @override
  Widget build(BuildContext context) => Tab(
    child: Row(
      mainAxisSize: MainAxisSize.min,
      spacing: 6,
      children: [
        Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
        if (count > 0) CountBadge(count),
      ],
    ),
  );
}

/// An unread count in a small pill, in the reader's digits.
class CountBadge extends ConsumerWidget {
  const CountBadge(this.count, {super.key});

  final int count;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = BaghColors.of(context);
    final language = ref.watch(l10nProvider).language;
    return Container(
      constraints: const BoxConstraints(minWidth: 20),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: ShapeDecoration(
        color: c.primary,
        shape: const StadiumBorder(),
      ),
      child: Text(
        localDigits(count > 99 ? '99+' : count, language),
        textAlign: TextAlign.center,
        style: Theme.of(
          context,
        ).textTheme.labelSmall?.copyWith(color: c.onPrimary),
      ),
    );
  }
}

/// The date for a day other than today, the time for today.
String _when(DateTime? at, String language) {
  if (at == null) return '';
  final now = DateTime.now();
  final local = at.toLocal();
  final today =
      local.year == now.year &&
      local.month == now.month &&
      local.day == now.day;
  return today ? formatTime(at, language) : formatDate(at, language);
}

class _Conversations extends ConsumerWidget {
  const _Conversations();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final threads = ref.watch(conversationsProvider);
    return RefreshIndicator(
      color: BaghColors.of(context).primary,
      onRefresh: () => ref.refresh(conversationsProvider.future),
      child: ListView(
        padding: BaghLayout.readablePadding(
          context,
          top: BaghSpace.gutter,
          bottom: BaghSpace.section * 4,
        ),
        children: [
          AsyncView(
            value: threads,
            onRetry: () => ref.invalidate(conversationsProvider),
            isEmpty: (list) => list.isEmpty,
            empty: s.market.noConversations,
            data: (list) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 10,
              children: [
                for (final (i, thread) in list.indexed)
                  _ConversationRow(thread: thread, tint: i),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ConversationRow extends ConsumerWidget {
  const _ConversationRow({required this.thread, required this.tint});

  final Conversation thread;
  final int tint;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final name = thread.counterpartName ?? s.market.noProfileLabel;
    final kind = switch (thread.kind) {
      'application' => s.market.awardKindJob,
      'book' => s.bookshop.kindBook,
      _ => s.market.awardKindProject,
    };
    final unread = thread.unreadCount > 0;
    return SoftSurface(
      tint: unread ? c.primarySoft : null,
      semanticLabel: '$name, ${thread.listingTitle}',
      onTap: () => context.push(thread.path),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 12,
        children: [
          RemoteImage(
            url: null,
            width: 44,
            height: 44,
            radius: 22,
            tint: tint,
            initials: initialsOf(name),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 2,
              children: [
                Row(
                  spacing: 4,
                  children: [
                    Flexible(
                      child: Text(
                        name,
                        // "@reza_data" stays whole in a Persian row, not
                        // "reza_data@".
                        textDirection: textDirectionOf(
                          name,
                          Directionality.of(context),
                        ),
                        style: BaghType.weight(text.titleSmall!, 750),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (thread.verified)
                      Icon(
                        Icons.verified_rounded,
                        size: 16,
                        color: c.primary,
                        semanticLabel: s.market.verifiedBadge,
                      ),
                  ],
                ),
                Text(
                  '$kind: ${thread.listingTitle}',
                  style: text.bodySmall?.copyWith(color: c.ink2),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (thread.lastBody case final body?)
                  Text(
                    thread.lastMine ? '${s.market.youPrefix}: $body' : body,
                    style: text.bodyMedium,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            spacing: 6,
            children: [
              Text(
                _when(thread.lastAt, language),
                style: text.labelSmall?.copyWith(color: c.ink2),
              ),
              if (unread) CountBadge(thread.unreadCount),
            ],
          ),
        ],
      ),
    );
  }
}

class _Notices extends ConsumerWidget {
  const _Notices();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final notices = ref.watch(noticesProvider);
    final controller = ref.read(noticesProvider.notifier);
    final unread = ref.watch(unreadNoticesProvider).value ?? 0;
    return RefreshIndicator(
      color: BaghColors.of(context).primary,
      onRefresh: () async {
        ref.invalidate(unreadNoticesProvider);
        ref.invalidate(noticesProvider);
        await ref.read(noticesProvider.future);
      },
      child: NotificationListener<ScrollNotification>(
        // The next page, before the reader reaches the end of this one.
        onNotification: (n) {
          if (n.metrics.extentAfter < 600) controller.loadMore();
          return false;
        },
        child: ListView(
          padding: BaghLayout.readablePadding(
            context,
            top: BaghSpace.gutter,
            bottom: BaghSpace.section * 4,
          ),
          children: [
            if (unread > 0)
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton.icon(
                  icon: const Icon(Icons.done_all_rounded),
                  label: Text(s.market.markAllRead),
                  onPressed: controller.markAllRead,
                ),
              ),
            AsyncView(
              value: notices,
              onRetry: () => ref.invalidate(noticesProvider),
              isEmpty: (p) => p.items.isEmpty,
              empty: s.market.noNotifications,
              data: (p) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 10,
                children: [
                  for (final notice in p.items) _NoticeRow(notice),
                  if (p.page < p.totalPages)
                    const Padding(
                      padding: EdgeInsets.all(BaghSpace.gutter),
                      child: Center(child: GirihSpinner()),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoticeRow extends ConsumerWidget {
  const _NoticeRow(this.notice);

  final Notice notice;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final controller = ref.read(noticesProvider.notifier);
    final ink = notice.read ? c.ink2 : c.ink;
    return SoftSurface(
      tint: notice.read ? null : c.primarySoft,
      semanticLabel: notice.title,
      onTap: notice.link == null
          ? null
          : () {
              if (!notice.read) controller.markRead(notice.id);
              openLink(context, ref, notice.link!);
            },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 4,
        children: [
          Text(
            notice.title,
            style: BaghType.weight(
              text.titleSmall!,
              notice.read ? 600 : 750,
            ).copyWith(color: ink),
          ),
          if (notice.body.isNotEmpty)
            Text(notice.body, style: text.bodyMedium?.copyWith(color: ink)),
          // The key drops under the date when large text leaves no room.
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                _when(notice.createdAt, language),
                style: text.labelSmall?.copyWith(color: c.ink2),
              ),
              if (!notice.read)
                TextButton(
                  onPressed: () => controller.markRead(notice.id),
                  child: Text(s.market.markRead),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
