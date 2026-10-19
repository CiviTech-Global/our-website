import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/centered_scroll.dart';
import '../../design/widgets/girih.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import 'inbox_data.dart';

/// One conversation, as the web's ConversationThreadPage: the newest message
/// at the bottom, the box to answer in under it, refreshed every 15 seconds
/// and at once after sending. A thread exists only once moderation approved
/// the application, bid or request under it.
class ThreadScreen extends ConsumerStatefulWidget {
  const ThreadScreen({required this.kind, required this.threadId, super.key});

  /// a (application), b (bid) or k (book request).
  final String kind;
  final String threadId;

  @override
  ConsumerState<ThreadScreen> createState() => _ThreadScreenState();
}

class _ThreadScreenState extends ConsumerState<ThreadScreen> {
  final _body = TextEditingController();
  bool _sending = false;
  String? _error;

  (String, String) get _key => (widget.kind, widget.threadId);

  @override
  void dispose() {
    _body.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final s = ref.read(stringsProvider);
    final body = _body.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await sendMessage(ref, _key, body);
      _body.clear();
      await ref.read(hapticsProvider).press();
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final known = ['a', 'b', 'k'].contains(widget.kind);
    final thread = known
        ? ref.watch(threadProvider(_key))
        : const AsyncValue<Thread>.loading();
    final anchor = thread.value;
    // An unknown kind, or a thread the server will not open (not yet
    // approved, or not this account's), is unavailable. Anything else, such
    // as being offline, keeps its retry.
    final refused = switch (thread.error) {
      final e? => [403, 404, 409].contains(ApiException.from(e).status),
      null => false,
    };
    final unavailable = !known || refused;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          anchor?.listingTitle ?? s.market.messagesNav,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          if (anchor != null && anchor.path.isNotEmpty)
            IconButton(
              tooltip: s.common.view,
              icon: const Icon(Icons.open_in_new_rounded),
              onPressed: () => openLink(context, ref, anchor.path),
            ),
        ],
      ),
      body: unavailable
          ? CenteredScroll(
              child: EmptyNote(
                message: s.market.threadUnavailable,
                action: (s.market.backToMessages, () => context.go('/inbox')),
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: AsyncView(
                    value: thread,
                    onRetry: () => ref.invalidate(threadProvider(_key)),
                    data: (t) => _Messages(thread: t),
                  ),
                ),
                _Composer(
                  controller: _body,
                  sending: _sending,
                  error: _error,
                  onSend: _send,
                ),
              ],
            ),
    );
  }
}

class _Messages extends ConsumerWidget {
  const _Messages({required this.thread});

  final Thread thread;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    if (thread.messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: 12,
          children: [
            GirihStar(color: c.tints[2].ink, size: 44),
            Text(s.market.emptyThread, style: text.bodyLarge),
          ],
        ),
      );
    }
    final messages = thread.messages.reversed.toList();
    return ListView.builder(
      // Newest at the bottom, and the list starts there.
      reverse: true,
      padding: BaghLayout.readablePadding(
        context,
        top: BaghSpace.gutter,
        bottom: BaghSpace.gutter,
      ),
      itemCount: messages.length,
      itemBuilder: (context, i) {
        final m = messages[i];
        final fill = m.mine ? c.primary : c.surface;
        final ink = m.mine ? c.onPrimary : c.ink;
        const round = Radius.circular(BaghRadius.tile);
        const tail = Radius.circular(4);
        return Align(
          alignment: m.mine
              ? AlignmentDirectional.centerEnd
              : AlignmentDirectional.centerStart,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width * 0.8,
            ),
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 4),
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
              decoration: BoxDecoration(
                color: fill,
                border: m.mine ? null : Border.all(color: c.hair),
                // The corner nearest the speaker's side is the tail.
                borderRadius: BorderRadiusDirectional.only(
                  topStart: round,
                  topEnd: round,
                  bottomStart: m.mine ? round : tail,
                  bottomEnd: m.mine ? tail : round,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                spacing: 2,
                children: [
                  // Each message in its own writing direction, as the web's
                  // dir="auto": English reads left to right in Persian.
                  SelectableText(
                    m.body,
                    textDirection: textDirectionOf(
                      m.body,
                      Directionality.of(context),
                    ),
                    style: text.bodyLarge?.copyWith(color: ink),
                  ),
                  if (m.createdAt case final at?)
                    Text(
                      '${formatDate(at, language)} · '
                      '${formatTime(at, language)}',
                      style: text.labelSmall?.copyWith(
                        color: ink.withValues(alpha: 0.75),
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _Composer extends ConsumerWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.error,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool sending;
  final String? error;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final c = BaghColors.of(context);
    return SafeArea(
      top: false,
      child: Padding(
        padding: BaghLayout.readablePadding(context, top: 8, bottom: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          spacing: 6,
          children: [
            if (error case final e?)
              Text(
                e,
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: c.error),
              ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              spacing: 8,
              children: [
                Expanded(
                  // The box turns to the direction of what is being typed.
                  child: ListenableBuilder(
                    listenable: controller,
                    builder: (context, _) => TextField(
                      controller: controller,
                      minLines: 1,
                      maxLines: 5,
                      textCapitalization: TextCapitalization.sentences,
                      textDirection: textDirectionOf(
                        controller.text,
                        Directionality.of(context),
                      ),
                      decoration: InputDecoration(
                        hintText: s.market.messagePlaceholder,
                      ),
                    ),
                  ),
                ),
                ListenableBuilder(
                  listenable: controller,
                  builder: (context, _) => IconButton.filled(
                    tooltip: s.market.sendMessage,
                    onPressed: controller.text.trim().isEmpty || sending
                        ? null
                        : onSend,
                    icon: sending
                        ? const SizedBox.square(
                            dimension: 20,
                            child: GirihSpinner(),
                          )
                        // Mirrored by Material in right-to-left text.
                        : const Icon(Icons.send_rounded),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
