import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/files.dart';
import '../../design/haptics.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'staff_collections.dart';
import 'staff_queues.dart' show StaffRow;
import 'staff_screens.dart' show StaffImageTile;

/// A collection's answer as the server gave it; each page reads its rows,
/// and a form its choices, out of the same data.
final collectionDataProvider = FutureProvider.autoDispose
    .family<Object?, String>((ref, key) {
      final c = staffCollection(key)!;
      return ref
          .read(apiClientProvider)
          .get(c.path, query: c.query, parse: (d) => d);
    });

class StaffCollectionScreen extends ConsumerStatefulWidget {
  const StaffCollectionScreen({required this.collection, super.key});

  final String collection;

  @override
  ConsumerState<StaffCollectionScreen> createState() =>
      _StaffCollectionScreenState();
}

class _StaffCollectionScreenState extends ConsumerState<StaffCollectionScreen> {
  /// The order just dragged into, until the server's answer replaces it.
  List<StaffRow>? _order;

  Future<void> _reorder(
    StaffCollection c,
    List<StaffRow> rows,
    int from,
    int to,
  ) async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    final next = [...rows];
    next.insert(to > from ? to - 1 : to, next.removeAt(from));
    setState(() => _order = next);
    try {
      await ref
          .read(apiClientProvider)
          .post<Object?>(
            c.reorderPath!,
            body: {
              'ids': [for (final r in next) r['id']],
            },
          );
      ref.invalidate(collectionDataProvider(c.key));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
      if (mounted) setState(() => _order = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final c = staffCollection(widget.collection);
    if (c == null) {
      return AccountPage(
        title: s.app.adminPanel,
        children: [Text(s.mobile.staffItemMissing)],
      );
    }
    ref.listen(collectionDataProvider(c.key), (_, _) {
      if (_order != null) setState(() => _order = null);
    });
    final text = Theme.of(context).textTheme;

    Widget card(StaffRow row, Key? key) => Padding(
      key: key,
      padding: const EdgeInsets.only(bottom: 10),
      child: SoftSurface(
        onTap: () =>
            context.push('/staff/manage/${c.key}/${row['id']}', extra: row),
        semanticLabel: c.title(row),
        child: Row(
          spacing: 12,
          children: [
            if (c.imagePath?.call(row) case final path?)
              StaffImageTile(path: path, size: 48, label: c.title(row)),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 2,
                children: [
                  Text(c.title(row), style: text.titleSmall),
                  if (c.subtitle?.call(row, s) case final sub?
                      when sub.isNotEmpty)
                    Text(sub, style: text.bodySmall),
                ],
              ),
            ),
            if (c.hidden?.call(row) ?? false)
              StatusPill(s.team.hidden, tone: 4),
          ],
        ),
      ),
    );

    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(c.label(s)),
        actions: [
          if (c.canCreate)
            IconButton(
              tooltip: s.categoryDesk.add,
              icon: const Icon(Icons.add_rounded),
              onPressed: () => context.push('/staff/manage/${c.key}/new'),
            ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: AsyncView(
          value: ref.watch(collectionDataProvider(c.key)),
          onRetry: () => ref.invalidate(collectionDataProvider(c.key)),
          isEmpty: (d) => c.rows(d).isEmpty,
          empty: s.list.empty,
          data: (d) {
            final rows = _order ?? c.rows(d);
            final padding = BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            );
            if (c.reorderPath == null) {
              return ListView(
                padding: padding,
                children: [for (final r in rows) card(r, null)],
              );
            }
            return ReorderableListView(
              padding: padding,
              onReorder: (from, to) => _reorder(c, rows, from, to),
              children: [for (final r in rows) card(r, ValueKey('${r['id']}'))],
            );
          },
        ),
      ),
    );
  }
}

/// One row's form, or an empty one for a new row.
class StaffCollectionFormScreen extends ConsumerStatefulWidget {
  const StaffCollectionFormScreen({
    required this.collection,
    this.row,
    super.key,
  });

  final String collection;
  final StaffRow? row;

  @override
  ConsumerState<StaffCollectionFormScreen> createState() =>
      _StaffCollectionFormScreenState();
}

class _StaffCollectionFormScreenState
    extends ConsumerState<StaffCollectionFormScreen> {
  late final StaffCollection c = staffCollection(widget.collection)!;
  final _form = GlobalKey<FormState>();
  bool _tried = false;
  late final Map<String, TextEditingController> _text = {
    for (final f in c.fields)
      if (f.kind != FieldKind.flag &&
          f.kind != FieldKind.choice &&
          f.kind != FieldKind.lookup)
        f.key: TextEditingController(text: _initial(f)),
  };
  late final Map<String, Object?> _values = {
    for (final f in c.fields)
      if (f.kind == FieldKind.flag)
        f.key: widget.row?[f.key] ?? f.fallback ?? false
      else if (f.kind == FieldKind.choice || f.kind == FieldKind.lookup)
        f.key: '${widget.row?[f.key] ?? f.fallback ?? ''}',
  };
  final Map<String, String> _picked = {};
  String? _keepId;
  PreparedImage? _image;
  bool _busy = false;
  String? _error;

  String _initial(StaffField f) {
    final v = widget.row?[f.key];
    return switch (v) {
      null => '',
      final List<Object?> list => list.join('، '),
      _ => '$v',
    };
  }

  @override
  void dispose() {
    for (final t in _text.values) {
      t.dispose();
    }
    super.dispose();
  }

  /// A number left blank on a row that never had one is not sent: most
  /// endpoints take no number at all there, only a real one or nothing.
  bool _skipped(StaffField f) =>
      f.kind == FieldKind.number &&
      _text[f.key]!.text.trim().isEmpty &&
      widget.row?[f.key] == null;

  Map<String, Object?> _payload() => {
    ...c.fixed,
    for (final f in c.fields)
      if (!_skipped(f))
        f.key: switch (f.kind) {
          FieldKind.flag => _values[f.key],
          FieldKind.choice || FieldKind.lookup =>
            (_values[f.key]! as String).isEmpty ? null : _values[f.key],
          FieldKind.number => int.tryParse(_text[f.key]!.text.trim()),
          FieldKind.tags => [
            for (final t in _text[f.key]!.text.split(RegExp('[،,]')))
              if (t.trim().isNotEmpty) t.trim(),
          ],
          _ => _text[f.key]!.text.trim(),
        },
  };

  Future<void> _pick() async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    final picked = await FilePicker.pickFiles(type: FileType.image);
    final file = picked.firstOrNull;
    if (file == null) return;
    try {
      final ready = await prepareImage(file.xFile.path, file.name);
      if (mounted) setState(() => _image = ready);
    } on ImageNotReady catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            e.problem == ImageProblem.tooLarge
                ? s.upload.errors.imageTooLarge
                : s.upload.errors.unreadableImage,
          ),
        ),
      );
    }
  }

  Future<void> _save() async {
    if (!_tried) setState(() => _tried = true);
    if (_busy || !_form.currentState!.validate()) return;
    final s = ref.read(stringsProvider);
    final api = ref.read(apiClientProvider);
    final id = widget.row?['id'];
    final path = id == null ? c.base : '${c.base}/$id';
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final payload = _payload();
      if (c.imageField case final field?) {
        final image = _image;
        await api.upload<Object?>(
          path,
          method: id == null ? 'POST' : 'PATCH',
          form: () => FormData.fromMap({
            'payload': jsonEncode(payload),
            if (image != null)
              field: MultipartFile.fromBytes(
                image.bytes,
                filename: image.name,
                contentType: DioMediaType('image', 'webp'),
              ),
          }),
        );
      } else if (id == null) {
        await api.post<Object?>(path, body: payload);
      } else {
        await api.patch<Object?>(path, body: payload);
      }
      await ref.read(hapticsProvider).success();
      ref.invalidate(collectionDataProvider(c.key));
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _lookup(StaffField f) async {
    final s = ref.read(stringsProvider);
    final query = TextEditingController();
    final term = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(f.label(s)),
        content: TextField(controller: query, autofocus: true),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(s.common.cancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(query.text.trim()),
            child: Text(s.common.search),
          ),
        ],
      ),
    );
    query.dispose();
    if (term == null || term.isEmpty || !mounted) return;
    try {
      final found = await ref
          .read(apiClientProvider)
          .get(
            f.lookupPath!,
            query: {'q': term},
            parse: (d) => [
              for (final u in (d as List? ?? const []))
                if (u is Map)
                  (
                    '${u['id']}',
                    '${u['firstName'] ?? ''} ${u['lastName'] ?? ''} '
                        '(${u['email'] ?? ''})',
                  ),
            ],
          );
      if (!mounted) return;
      final picked = await pickFromList(
        context,
        title: f.label(s),
        all: '—',
        options: found,
      );
      if (picked == null) return;
      setState(() {
        _values[f.key] = picked;
        _picked[f.key] = found
            .firstWhere((o) => o.$1 == picked, orElse: () => ('', ''))
            .$2;
      });
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    }
  }

  Future<void> _merge() async {
    final keep = _keepId;
    if (keep == null || _busy) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .post<Object?>(
            c.mergePath!,
            body: {'keepId': keep, 'dropId': widget.row!['id']},
          );
      await ref.read(hapticsProvider).success();
      ref.invalidate(collectionDataProvider(c.key));
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.bookshop.merged)));
      context.pop();
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final s = ref.read(stringsProvider);
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(c.deleteConfirm?.call(s) ?? s.common.delete),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(s.common.cancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(s.common.delete),
          ),
        ],
      ),
    );
    if (sure != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .delete<Object?>('${c.base}/${widget.row!['id']}');
      await ref.read(hapticsProvider).success();
      ref.invalidate(collectionDataProvider(c.key));
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final v = Validators(s);
    final data = ref.watch(collectionDataProvider(c.key)).value;
    final row = widget.row;

    Widget field(StaffField f) => switch (f.kind) {
      FieldKind.flag => SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(f.label(s)),
        value: _values[f.key] == true,
        onChanged: (on) => setState(() => _values[f.key] = on),
      ),
      FieldKind.lookup => ListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(f.label(s)),
        subtitle: _picked[f.key] == null ? null : Text(_picked[f.key]!),
        trailing: const Icon(Icons.search_rounded),
        onTap: () => _lookup(f),
      ),
      FieldKind.choice => Builder(
        builder: (context) {
          final options = f.choices!(s, data, row);
          final value = _values[f.key]! as String;
          return DropdownButtonFormField<String>(
            initialValue: options.any((o) => o.$1 == value) ? value : null,
            isExpanded: true,
            decoration: InputDecoration(labelText: f.label(s)),
            items: [
              for (final (id, label) in options)
                DropdownMenuItem(
                  value: id,
                  child: Text(label, overflow: TextOverflow.ellipsis),
                ),
            ],
            onChanged: (next) => setState(() => _values[f.key] = next ?? ''),
          );
        },
      ),
      _ => TextFormField(
        controller: _text[f.key],
        minLines: f.kind == FieldKind.long ? 3 : 1,
        maxLines: f.kind == FieldKind.long ? 10 : 1,
        keyboardType: f.kind == FieldKind.number ? TextInputType.number : null,
        textDirection: f.kind == FieldKind.ltr ? TextDirection.ltr : null,
        validator: f.required ? v.required : null,
        decoration: InputDecoration(labelText: f.label(s)),
      ),
    };

    return AccountPage(
      title: c.label(s),
      children: [
        if (c.imageField != null) ...[
          if (row != null)
            if (c.imagePath?.call(row) case final path?)
              Center(
                child: StaffImageTile(
                  path: path,
                  size: 120,
                  label: c.title(row),
                ),
              ),
          BaghKey(
            label: _image == null ? s.team.photo : _image!.name,
            kind: BaghKeyKind.outline,
            expand: true,
            onPressed: _pick,
          ),
        ],
        Form(
          key: _form,
          autovalidateMode: _tried
              ? AutovalidateMode.always
              : AutovalidateMode.disabled,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 14,
            children: [for (final f in c.fields) field(f)],
          ),
        ),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: s.common.save,
          onPressed: _save,
          loading: _busy,
          expand: true,
        ),
        // A gallery belongs to a saved project: it is added once it exists.
        if (row != null && c.key == 'portfolio') ...[
          const Divider(),
          StaffShotsEditor(row: row),
        ],
        if (row != null && c.mergePath != null) ...[
          const Divider(),
          Text(s.bookshop.mergeHint),
          DropdownButtonFormField<String>(
            initialValue: _keepId,
            isExpanded: true,
            decoration: InputDecoration(labelText: s.bookshop.merge),
            items: [
              for (final other in c.rows(data))
                if (other['id'] != row['id'])
                  DropdownMenuItem(
                    value: '${other['id']}',
                    child: Text(
                      c.title(other),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
            ],
            onChanged: (next) => setState(() => _keepId = next),
          ),
          BaghKey(
            label: s.bookshop.merge,
            kind: BaghKeyKind.outline,
            expand: true,
            loading: _busy,
            onPressed: _keepId == null ? null : _merge,
          ),
        ],
        if (row != null && c.canDelete)
          BaghKey(
            label: s.common.delete,
            kind: BaghKeyKind.outline,
            onPressed: _delete,
            expand: true,
          ),
      ],
    );
  }
}

/// A portfolio project's screenshots: add several at once with their
/// captions, move them, take one away. Each change is saved as it is made,
/// apart from the project's own form, as on the web.
class StaffShotsEditor extends ConsumerStatefulWidget {
  const StaffShotsEditor({required this.row, super.key});

  final StaffRow row;

  @override
  ConsumerState<StaffShotsEditor> createState() => _StaffShotsEditorState();
}

class _StaffShotsEditorState extends ConsumerState<StaffShotsEditor> {
  static const _max = 12;
  static const _key = 'portfolio';

  final List<(PreparedImage, TextEditingController)> _pending = [];
  bool _busy = false;
  String? _error;

  String get _projectId => '${widget.row['id']}';

  @override
  void dispose() {
    for (final (_, caption) in _pending) {
      caption.dispose();
    }
    super.dispose();
  }

  /// The freshest copy of this project's pictures: the list once it has been
  /// read again after a change, the row the form was opened with until then.
  List<StaffRow> _shots() {
    final c = staffCollection(_key)!;
    final data = ref.watch(collectionDataProvider(_key)).value;
    final row = data == null
        ? widget.row
        : c
              .rows(data)
              .firstWhere(
                (r) => '${r['id']}' == _projectId,
                orElse: () => widget.row,
              );
    return [
      for (final s in (row['screenshots'] as List? ?? const []))
        if (s is Map) s.cast<String, Object?>(),
    ];
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
      ref.invalidate(collectionDataProvider(_key));
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(done)));
      }
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pick(int room) async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    final picked = await FilePicker.pickFiles(type: FileType.image);
    if (picked.isEmpty) return;
    var refused = false;
    for (final file in picked.take(room - _pending.length)) {
      try {
        final ready = await prepareImage(file.xFile.path, file.name);
        if (!mounted) return;
        setState(() => _pending.add((ready, TextEditingController())));
      } on ImageNotReady {
        refused = true;
      }
    }
    if (refused) {
      messenger.showSnackBar(
        SnackBar(content: Text(s.upload.errors.unreadableImage)),
      );
    }
  }

  Future<void> _upload() {
    final s = ref.read(stringsProvider);
    final batch = List.of(_pending);
    return _run(() async {
      await ref
          .read(apiClientProvider)
          .upload<Object?>(
            '/showcase/admin/projects/$_projectId/shots',
            method: 'POST',
            form: () => FormData.fromMap({
              'shots': [
                for (final (image, _) in batch)
                  MultipartFile.fromBytes(
                    image.bytes,
                    filename: image.name,
                    contentType: DioMediaType('image', 'webp'),
                  ),
              ],
              'captions': jsonEncode([
                for (final (_, caption) in batch)
                  caption.text.trim().isEmpty ? null : caption.text.trim(),
              ]),
            }),
          );
      if (!mounted) return;
      setState(() {
        for (final (_, caption) in batch) {
          caption.dispose();
        }
        _pending.clear();
      });
    }, s.showcase.shotsAdded);
  }

  Future<void> _move(List<StaffRow> shots, int index, int by) {
    final s = ref.read(stringsProvider);
    final ids = [for (final shot in shots) '${shot['id']}'];
    final moved = ids.removeAt(index);
    ids.insert(index + by, moved);
    return _run(
      () => ref
          .read(apiClientProvider)
          .post<Object?>(
            '/showcase/admin/projects/$_projectId/shots/reorder',
            body: {'ids': ids},
          ),
      s.showcase.saved,
    );
  }

  Future<void> _remove(String id) {
    final s = ref.read(stringsProvider);
    return _run(
      () => ref
          .read(apiClientProvider)
          .delete<Object?>('/showcase/admin/shots/$id'),
      s.showcase.shotRemoved,
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final sc = s.showcase;
    final text = Theme.of(context).textTheme;
    final shots = _shots();
    final room = _max - shots.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: [
        Text(sc.gallery, style: text.titleMedium),
        if (shots.isEmpty) Text(sc.galleryEmpty),
        for (final (i, shot) in shots.indexed)
          Row(
            spacing: 8,
            children: [
              StaffImageTile(
                path: '${shot['url']}',
                size: 64,
                label: '${shot['caption'] ?? ''}',
              ),
              Expanded(
                child: Text(
                  '${shot['caption'] ?? '—'}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              IconButton(
                tooltip: sc.moveUp,
                onPressed: i == 0 || _busy ? null : () => _move(shots, i, -1),
                icon: const Icon(Icons.arrow_upward_rounded),
              ),
              IconButton(
                tooltip: sc.moveDown,
                onPressed: i == shots.length - 1 || _busy
                    ? null
                    : () => _move(shots, i, 1),
                icon: const Icon(Icons.arrow_downward_rounded),
              ),
              IconButton(
                tooltip: sc.removeShot,
                onPressed: _busy ? null : () => _remove('${shot['id']}'),
                icon: const Icon(Icons.delete_outline_rounded),
              ),
            ],
          ),
        for (final (image, caption) in _pending)
          TextField(
            controller: caption,
            decoration: InputDecoration(
              labelText: '${sc.shotCaption} · ${image.name}',
              helperText: sc.shotCaptionHint,
            ),
          ),
        if (room > 0) ...[
          Text(sc.shotLimit.fill({'count': room - _pending.length})),
          if (_pending.length < room)
            BaghKey(
              label: sc.addShots,
              kind: BaghKeyKind.outline,
              expand: true,
              onPressed: _busy ? null : () => _pick(room),
            ),
        ],
        if (_pending.isNotEmpty)
          BaghKey(
            label: s.common.save,
            expand: true,
            loading: _busy,
            onPressed: _upload,
          ),
        if (_error != null) FormMessage(_error!),
      ],
    );
  }
}
