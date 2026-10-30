import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/capabilities.dart';
import '../../core/config.dart';
import '../../core/files.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../browse/browse.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'staff_queues.dart';

/// What waits in the queues this person may work:
/// `GET /admin/dashboard/workload`, the web panel's overview.
final workloadProvider = FutureProvider.autoDispose<StaffRow>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/admin/dashboard/workload',
        parse: (d) => (d! as Map).cast<String, Object?>(),
      ),
);

/// The queues the workload names, in the registry's order. Freelance
/// services share the freelance projects' moderators, and the workload
/// does not count them separately.
List<(StaffQueue, int open, int total)> workQueues(StaffRow workload) {
  final counts = (workload['queues'] as Map?) ?? const {};
  int n(Object? v) => v is num ? v.toInt() : 0;
  return [
    for (final q in staffQueues)
      if (counts[q.key] case final Map<Object?, Object?> c)
        (q, n(c['open']), n(c['total']))
      else if (q.key == 'services' && counts['freelanceProjects'] != null)
        (q, 0, 0),
  ];
}

Uri _web(WidgetRef ref, String path) =>
    AppConfig.website(path, ref.read(l10nProvider).language);

/// The staff desk: every queue this person works, the waiting ones first,
/// and the way to the web panel for setup.
class StaffHomeScreen extends ConsumerWidget {
  const StaffHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final forward = Directionality.of(context) == TextDirection.rtl
        ? Icons.chevron_left_rounded
        : Icons.chevron_right_rounded;

    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(s.app.adminPanel),
      ),
      body: RefreshIndicator(
        color: c.primary,
        onRefresh: () => ref.refresh(workloadProvider.future),
        child: ListView(
          padding: BaghLayout.readablePadding(
            context,
            top: BaghSpace.gutter,
            bottom: BaghSpace.section * 2,
          ),
          children: [
            Text(s.app.adminOverviewDescription, style: text.bodyMedium),
            const SizedBox(height: BaghSpace.gutter),
            AsyncView(
              value: ref.watch(workloadProvider),
              onRetry: () => ref.invalidate(workloadProvider),
              data: (workload) {
                final queues = workQueues(workload)
                  ..sort((a, b) => (b.$2 > 0 ? 1 : 0) - (a.$2 > 0 ? 1 : 0));
                if (queues.isEmpty) {
                  return EmptyNote(message: s.app.noAccessBody);
                }
                final waiting = queues.fold(0, (sum, q) => sum + q.$2);
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: BaghSpace.gutter,
                  children: [
                    if (waiting == 0)
                      SoftSurface(
                        tint: c.primarySoft,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          spacing: 4,
                          children: [
                            Text(
                              s.app.allClearTitle,
                              style: text.titleMedium?.copyWith(
                                color: c.primarySoft.ink,
                              ),
                            ),
                            Text(
                              s.app.allClearBody,
                              style: text.bodyMedium?.copyWith(
                                color: c.primarySoft.ink,
                              ),
                            ),
                          ],
                        ),
                      ),
                    SoftSurface(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Column(
                        children: [
                          for (final (q, open, total) in queues)
                            ListTile(
                              leading: Icon(q.icon),
                              title: Text(q.label(s)),
                              subtitle: q.key == 'services'
                                  ? null
                                  : Text(
                                      '${s.app.waiting}: ${localDigits(open, language)}'
                                      '${factSep(language)}'
                                      '${s.app.total}: ${localDigits(total, language)}',
                                    ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                spacing: 6,
                                children: [
                                  if (open > 0)
                                    StatusPill(
                                      localDigits(open, language),
                                      tone: 4,
                                    ),
                                  Icon(forward),
                                ],
                              ),
                              onTap: () => context.push('/staff/q/${q.key}'),
                            ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: BaghSpace.gutter),
            SoftSurface(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: ListTile(
                leading: const Icon(Icons.open_in_browser_rounded),
                title: Text(s.mobile.staffPanelOnWeb),
                subtitle: Text(s.mobile.staffPanelOnWebHint),
                trailing: Icon(forward),
                onTap: () => launchUrl(
                  _web(ref, '/admin'),
                  mode: LaunchMode.externalApplication,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One queue, through the app's list kit: search, a status filter, and
/// pages that load as the list nears its end.
class StaffQueueScreen extends ConsumerWidget {
  const StaffQueueScreen({required this.queueKey, super.key});

  final String queueKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final q = staffQueue(queueKey);
    if (q == null) {
      return AccountPage(
        title: s.app.adminPanel,
        children: [Text(s.mobile.staffItemMissing)],
      );
    }
    final language = ref.watch(l10nProvider).language;
    // The book queue follows the market the deployment runs.
    final booksV2 =
        ref.watch(capabilitiesProvider).value?.feature('booksV2') ?? true;
    final path = q.key == 'books' && !booksV2 ? '/market/admin/books' : q.path;

    return BrowseScreen(
      title: q.label(s),
      path: path,
      searchHint: q.searchHint(s),
      // The staff lists keep their own order (oldest waiting first); the
      // parameter is required by the kit and ignored by these endpoints.
      sorts: [('', s.list.sortLabel)],
      fixed: q.params,
      initial: {'status': q.initialStatus},
      filters: (_) => [
        ChoiceFilter(
          s.admin.status,
          'status',
          [
            for (final status in q.statuses) (status, q.statusLabel(s, status)),
            // A moderation list with no status is its pending items, not all of
            // them, so it offers no "all" that would say otherwise.
          ],
          all: q.action is StatusAction ? s.list.allOption : null,
        ),
      ],
      emptyText: s.market.emptyQueue,
      countText: s.list.resultCount,
      itemBuilder: (context, row) {
        final view = q.describe(row, s, language);
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: SoftSurface(
            onTap: () =>
                context.push('/staff/q/${q.key}/${row['id']}', extra: row),
            semanticLabel: view.title,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 4,
              children: [
                Row(
                  spacing: 8,
                  children: [
                    Expanded(
                      child: Text(
                        view.title,
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    if (view.status case final status?) StatusPill(status),
                  ],
                ),
                if (view.subtitle case final sub? when sub.isNotEmpty)
                  Text(sub, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// A fuller copy of one item, when its queue has one.
final staffDetailProvider = FutureProvider.autoDispose
    .family<StaffRow, (String, String)>((ref, key) {
      final q = staffQueue(key.$1)!;
      return ref
          .read(apiClientProvider)
          .get(
            q.detailPath!(key.$2),
            parse: (d) => (d! as Map).cast<String, Object?>(),
          );
    });

/// A picture from a staff route, fetched with the session.
final staffImageProvider = FutureProvider.autoDispose.family<List<int>, String>(
  (ref, path) async => (await ref.read(apiClientProvider).download(path)).bytes,
);

/// The pictures staff are judging, side by side. One that will not load says
/// so with an icon: a missing picture is itself something to review.
class _StaffImages extends ConsumerWidget {
  const _StaffImages({required this.paths, required this.label});

  final List<String> paths;
  final String label;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = BaghColors.of(context);
    return SizedBox(
      height: 140,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: paths.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final image = ref.watch(staffImageProvider(paths[i]));
          return ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 140,
              color: c.pane,
              alignment: Alignment.center,
              child: image.when(
                loading: () => const GirihSpinner(),
                error: (_, _) => const Icon(Icons.broken_image_outlined),
                data: (bytes) => Image.memory(
                  Uint8List.fromList(bytes),
                  width: 140,
                  height: 140,
                  fit: BoxFit.cover,
                  cacheWidth: 420,
                  semanticLabel: label,
                  errorBuilder: (_, _, _) =>
                      const Icon(Icons.broken_image_outlined),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// One item: what it says, its files, and what staff decide.
class StaffItemScreen extends ConsumerWidget {
  const StaffItemScreen({
    required this.queueKey,
    required this.id,
    this.row,
    super.key,
  });

  final String queueKey;
  final String id;

  /// The list's row, which is the whole item for queues without a detail
  /// endpoint.
  final StaffRow? row;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final q = staffQueue(queueKey);
    final Widget body;
    if (q == null) {
      body = EmptyNote(message: s.mobile.staffItemMissing);
    } else if (q.detailPath != null) {
      body = AsyncView(
        value: ref.watch(staffDetailProvider((queueKey, id))),
        onRetry: () => ref.invalidate(staffDetailProvider((queueKey, id))),
        data: (detail) => _StaffItem(queue: q, id: id, row: detail),
      );
    } else if (row != null) {
      body = _StaffItem(queue: q, id: id, row: row!);
    } else {
      body = EmptyNote(message: s.mobile.staffItemMissing);
    }
    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(q?.label(s) ?? s.app.adminPanel),
      ),
      body: SafeArea(top: false, child: body),
    );
  }
}

class _StaffItem extends ConsumerStatefulWidget {
  const _StaffItem({required this.queue, required this.id, required this.row});

  final StaffQueue queue;
  final String id;
  final StaffRow row;

  @override
  ConsumerState<_StaffItem> createState() => _StaffItemState();
}

class _StaffItemState extends ConsumerState<_StaffItem> {
  late String _status = widget.queue.statusOf(widget.row);
  String? _decision;
  late final _note = TextEditingController(
    text: widget.queue.note?.call(widget.row) ?? '',
  );
  final _reviewNote = TextEditingController();
  final _reply = TextEditingController();
  bool _busy = false;
  String? _opening;
  String? _error;

  StaffQueue get q => widget.queue;

  @override
  void initState() {
    super.initState();
    // Opening a contact message reads it, as it does on the web.
    if (q.key == 'messages' && widget.row['readAt'] == null) {
      ref
          .read(apiClientProvider)
          .patch<Object?>('${q.path}/${widget.id}', body: {'read': true})
          .ignore();
    }
  }

  @override
  void dispose() {
    _note.dispose();
    _reviewNote.dispose();
    _reply.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action, String done) async {
    if (_busy) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      await ref.read(hapticsProvider).success();
      ref
        ..invalidate(workloadProvider)
        ..invalidate(browseProvider);
      if (q.detailPath != null) {
        ref.invalidate(staffDetailProvider((q.key, widget.id)));
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(done)));
      // Back to the list, which has just reloaded: the row this screen was
      // given no longer says what the item says.
      if (context.canPop()) context.pop();
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _review(ModerationAction action) {
    final s = ref.read(stringsProvider);
    final decision = _decision;
    if (decision == null) return Future.value();
    final note = _reviewNote.text.trim();
    // The author is owed a reason for anything but a yes.
    if (decision != 'APPROVED' && note.isEmpty) {
      setState(() => _error = s.market.reviewNoteRequired);
      return Future.value();
    }
    return _run(
      () => ref
          .read(apiClientProvider)
          .post<Object?>(
            action.reviewPath(widget.id),
            body: {
              'decision': decision,
              if (note.isNotEmpty) 'reviewNote': note,
              if (_note.text.trim().isNotEmpty)
                'internalNote': _note.text.trim(),
            },
          ),
      s.market.reviewed,
    );
  }

  Future<void> _update(StatusAction action) {
    final s = ref.read(stringsProvider);
    final api = ref.read(apiClientProvider);
    final note = _note.text.trim();
    final body = <String, Object?>{
      'status': _status,
      // An emptied note is sent as empty, so clearing it sticks.
      ?action.noteKey: note,
    };
    final path = action.updatePath(widget.id);
    return _run(
      () => action.method == 'put'
          ? api.put<Object?>(path, body: body)
          : api.patch<Object?>(path, body: body),
      s.admin.statusUpdated,
    );
  }

  Future<void> _sendReply(StatusAction action) {
    final s = ref.read(stringsProvider);
    final body = _reply.text.trim();
    if (body.isEmpty) return Future.value();
    return _run(() async {
      await ref
          .read(apiClientProvider)
          .post<Object?>(action.replyPath!(widget.id), body: {'body': body});
      _reply.clear();
    }, s.contact.replySent);
  }

  Future<void> _open(StaffFile file) async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _opening = file.$2);
    try {
      final got = await ref.read(apiClientProvider).download(file.$2);
      final opened = await openDownloaded(
        bytes: got.bytes,
        name: file.$3,
        mimeType: got.mimeType,
      );
      if (!opened) {
        messenger.showSnackBar(SnackBar(content: Text(s.mobile.noFileViewer)));
      }
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
    } finally {
      if (mounted) setState(() => _opening = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final view = q.describe(widget.row, s, language);

    return ListView(
      padding: BaghLayout.readablePadding(
        context,
        top: BaghSpace.gutter,
        bottom: BaghSpace.section * 2,
      ),
      children: [
        Text(view.title, style: text.headlineSmall),
        if (view.subtitle case final sub? when sub.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(sub, style: text.bodyMedium?.copyWith(color: c.ink2)),
        ],
        if (view.status case final status?) ...[
          const SizedBox(height: 8),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: StatusPill(status),
          ),
        ],
        const SizedBox(height: BaghSpace.gutter),
        if (view.images.isNotEmpty) ...[
          _StaffImages(paths: view.images, label: view.title),
          const SizedBox(height: BaghSpace.gutter),
        ],
        // Selectable as a block: staff copy numbers out of here, and a
        // SelectableText per line would make each one a tiny tap target.
        if (view.facts.isNotEmpty)
          SelectionArea(
            child: SoftSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 10,
                children: [
                  Text(s.mobile.staffDetails, style: text.titleMedium),
                  for (final (label, value) in view.facts)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (label.isNotEmpty)
                          Text(
                            label,
                            style: text.labelMedium?.copyWith(color: c.ink2),
                          ),
                        Text(value, style: text.bodyMedium),
                      ],
                    ),
                ],
              ),
            ),
          ),
        for (final (label, body) in view.texts) ...[
          const SizedBox(height: BaghSpace.gutter),
          SelectionArea(
            child: SoftSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 8,
                children: [
                  Text(label, style: text.titleSmall),
                  Text(body, style: text.bodyMedium),
                ],
              ),
            ),
          ),
        ],
        if (view.files.isNotEmpty) ...[
          const SizedBox(height: BaghSpace.gutter),
          SoftSurface(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              children: [
                for (final file in view.files)
                  ListTile(
                    leading: _opening == file.$2
                        ? const SizedBox.square(
                            dimension: 24,
                            child: GirihSpinner(),
                          )
                        : const Icon(Icons.attach_file_rounded),
                    title: Text(file.$1),
                    subtitle: Text(file.$3, textDirection: TextDirection.ltr),
                    onTap: _opening == null ? () => _open(file) : null,
                  ),
              ],
            ),
          ),
        ],
        if (q.webPath case final web?) ...[
          const SizedBox(height: BaghSpace.gutter),
          SoftSurface(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: ListTile(
              leading: const Icon(Icons.open_in_browser_rounded),
              title: Text(s.mobile.staffPanelOnWeb),
              subtitle: q.webNote == null ? null : Text(q.webNote!(s)),
              onTap: () => launchUrl(
                _web(ref, web(widget.id)),
                mode: LaunchMode.externalApplication,
              ),
            ),
          ),
        ],
        const SizedBox(height: BaghSpace.gutter),
        SoftSurface(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 14,
            children: switch (q.action) {
              final ModerationAction a => _moderationForm(s, a),
              final StatusAction a => _statusForm(s, a),
            },
          ),
        ),
      ],
    );
  }

  List<Widget> _moderationForm(Strings s, ModerationAction a) => [
    Text(s.market.decision, style: Theme.of(context).textTheme.titleMedium),
    Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final d in a.decisions)
          ChoiceChip(
            label: Text(switch (d) {
              'APPROVED' => s.market.approve,
              'REJECTED' => s.market.reject,
              _ => s.market.requestChanges,
            }),
            selected: _decision == d,
            onSelected: (_) => setState(() => _decision = d),
          ),
      ],
    ),
    TextField(
      controller: _reviewNote,
      minLines: 2,
      maxLines: 6,
      decoration: InputDecoration(labelText: s.market.reviewNoteLabel),
    ),
    TextField(
      controller: _note,
      minLines: 1,
      maxLines: 4,
      decoration: InputDecoration(
        labelText: s.market.internalNote,
        helperText: s.market.internalNoteHint,
      ),
    ),
    if (_error != null) FormMessage(_error!),
    BaghKey(
      label: s.market.review,
      onPressed: _decision == null ? null : () => _review(a),
      loading: _busy,
      expand: true,
    ),
  ];

  List<Widget> _statusForm(Strings s, StatusAction a) => [
    DropdownButtonFormField<String>(
      initialValue: q.statuses.contains(_status) ? _status : null,
      isExpanded: true,
      decoration: InputDecoration(labelText: s.admin.updateStatus),
      items: [
        for (final status in q.statuses)
          DropdownMenuItem(
            value: status,
            child: Text(
              q.statusLabel(s, status),
              overflow: TextOverflow.ellipsis,
            ),
          ),
      ],
      onChanged: (value) => setState(() => _status = value ?? _status),
    ),
    if (a.noteKey != null)
      TextField(
        controller: _note,
        minLines: 2,
        maxLines: 6,
        decoration: InputDecoration(
          labelText: s.market.internalNote,
          helperText: s.market.internalNoteHint,
        ),
      ),
    if (_error != null) FormMessage(_error!),
    BaghKey(
      label: s.common.save,
      onPressed: () => _update(a),
      loading: _busy,
      expand: true,
    ),
    if (a.replyPath != null) ...[
      const Divider(),
      TextField(
        controller: _reply,
        minLines: 3,
        maxLines: 8,
        decoration: InputDecoration(labelText: s.contact.replyPlaceholder),
      ),
      BaghKey(
        label: s.contact.sendReply,
        kind: BaghKeyKind.outline,
        onPressed: () => _sendReply(a),
        loading: _busy,
        expand: true,
      ),
    ],
  ];
}
