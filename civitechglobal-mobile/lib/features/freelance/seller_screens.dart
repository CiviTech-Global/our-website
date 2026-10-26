import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/files.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/inline_link.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../jobs/jobs_format.dart' show postedAgo;
import '../jobs/seeker_screens.dart'
    show MemberListPage, ReviewNote, statusTone;
import 'client_screens.dart' show Gauges;
import 'freelance_data.dart';
import 'freelance_ui.dart';
import 'seller_data.dart';

const _maxImages = 6;
const _revisionChoices = [0, 1, 2, 3, 5, 10];

Future<bool> _run(
  BuildContext context,
  WidgetRef ref,
  Future<void> Function() action, {
  String? done,
}) async {
  final s = ref.read(stringsProvider);
  final messenger = ScaffoldMessenger.of(context);
  try {
    await action();
    await ref.read(hapticsProvider).success();
    if (done != null) messenger.showSnackBar(SnackBar(content: Text(done)));
    return true;
  } catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
    return false;
  }
}

/// A picture the seller owns, through the sign-in.
class _OwnImage extends ConsumerWidget {
  const _OwnImage(this.id);

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = BaghColors.of(context);
    final bytes = ref.watch(ownServiceImageProvider(id)).value;
    return Container(
      color: c.fill,
      child: bytes == null
          ? Icon(Icons.image_outlined, color: c.ink2)
          : Image.memory(bytes, fit: BoxFit.cover, gaplessPlayback: true),
    );
  }
}

/// The seller's services, as the web's MyServicesPage: each with its state,
/// gauges and moves (edit, submit, pause, delete).
class MyServicesScreen extends ConsumerWidget {
  const MyServicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final services = ref.watch(ownServicesProvider);
    return MemberListPage(
      title: w.myServicesTitle,
      helpId: 'my-services',
      onRefresh: () => ref.refresh(ownServicesProvider.future),
      children: [
        BaghKey(
          label: w.newService,
          icon: Icons.add_rounded,
          expand: true,
          onPressed: () => context.push('/dashboard/services/new'),
        ),
        const SizedBox(height: 10),
        BaghKey(
          label: w.navOrders,
          icon: Icons.receipt_long_outlined,
          kind: BaghKeyKind.outline,
          expand: true,
          onPressed: () => context.push('/dashboard/service-orders'),
        ),
        const SizedBox(height: BaghSpace.gutter),
        AsyncView(
          value: services,
          onRetry: () => ref.invalidate(ownServicesProvider),
          isEmpty: (list) => list.isEmpty,
          empty: w.myServicesEmpty,
          data: (list) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [for (final v in list) _OwnServiceCard(v)],
          ),
        ),
      ],
    );
  }
}

class _OwnServiceCard extends ConsumerWidget {
  const _OwnServiceCard(this.v);

  final OwnService v;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final basic =
        v.packages.where((p) => p.tier == 'BASIC').firstOrNull ??
        v.packages.firstOrNull;
    final actions = ref.read(sellerActionsProvider);
    String n(int x) => localDigits(x, language);
    return SoftSurface(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (v.imageIds.isNotEmpty)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(BaghRadius.card),
              ),
              child: SizedBox(height: 140, child: _OwnImage(v.imageIds.first)),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 10,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    StatusPill(
                      v.live ? m.label('OPEN') : m.label(v.moderationStatus),
                      tone: v.live ? 0 : statusTone(v.moderationStatus),
                    ),
                    if (v.state == 'PAUSED') StatusPill(w.paused, tone: 1),
                    if (v.featured) StatusPill(w.featured, tone: 1),
                    if (v.ratingCount > 0)
                      Text(starsText(v.ratingAvg, v.ratingCount, language)),
                  ],
                ),
                Text(v.title, style: text.titleMedium),
                if (basic != null)
                  Text(
                    '${w.startingAt} ${money(basic.price, basic.currency, s, language)}${factSep(language)}'
                    '${w.deliveryIn.fill({'days': n(basic.deliveryDays)})}${factSep(language)}'
                    '${w.packages}: ${n(v.packages.length)}',
                    style: text.bodySmall?.copyWith(color: c.ink2),
                  ),
                if (v.reviewNote case final note? when !v.live)
                  ReviewNote(note),
                Gauges([
                  (
                    s.jobs.viewsCount.fill({'count': ''}).trim(),
                    n(v.viewCount),
                    false,
                  ),
                  (
                    w.orderStatus.label('REQUESTED'),
                    n(v.orders['REQUESTED'] ?? 0),
                    (v.orders['REQUESTED'] ?? 0) > 0,
                  ),
                  (
                    w.orderStatus.label('ACCEPTED'),
                    n(v.orders['ACCEPTED'] ?? 0),
                    false,
                  ),
                  (w.reviewsTitle, n(v.ratingCount), false),
                ]),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (v.live)
                      TextButton.icon(
                        icon: const Icon(Icons.visibility_outlined),
                        label: Text(s.common.view),
                        onPressed: () =>
                            context.push('/freelance-services/${v.code}'),
                      ),
                    if (v.editable)
                      BaghKey(
                        label: s.common.edit,
                        icon: Icons.edit_outlined,
                        kind: BaghKeyKind.outline,
                        onPressed: () => context.push(
                          '/dashboard/services/${Uri.encodeComponent(v.id)}/edit',
                        ),
                      ),
                    if (v.submittable)
                      BaghKey(
                        label: w.submitForReview,
                        icon: Icons.send_rounded,
                        onPressed: () => _run(
                          context,
                          ref,
                          () => actions.submit(v.id),
                          done: w.serviceSubmitted,
                        ),
                      ),
                    if (v.live)
                      TextButton.icon(
                        icon: Icon(
                          v.state == 'ACTIVE'
                              ? Icons.pause_circle_outline_rounded
                              : Icons.play_circle_outline_rounded,
                        ),
                        label: Text(v.state == 'ACTIVE' ? w.pause : w.activate),
                        onPressed: () => _run(
                          context,
                          ref,
                          () => actions.setActive(
                            v.id,
                            active: v.state != 'ACTIVE',
                          ),
                          done: w.serviceSaved,
                        ),
                      ),
                    TextButton.icon(
                      icon: const Icon(Icons.delete_outline_rounded),
                      label: Text(s.common.delete),
                      onPressed: () async {
                        final sure = await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: Text(s.common.delete),
                            content: Text(
                              '${v.title}\n\n${w.deleteServiceConfirm}',
                            ),
                            actions: [
                              TextButton(
                                onPressed: () =>
                                    Navigator.of(context).pop(false),
                                child: Text(s.common.cancel),
                              ),
                              FilledButton(
                                onPressed: () =>
                                    Navigator.of(context).pop(true),
                                child: Text(s.common.delete),
                              ),
                            ],
                          ),
                        );
                        if (sure != true || !context.mounted) return;
                        await _run(
                          context,
                          ref,
                          () => actions.delete(v.id),
                          done: w.serviceDeleted,
                        );
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Orders on both sides, as the web's ServiceOrdersPage: what the reader
/// bought, and what they were asked to deliver.
class ServiceOrdersScreen extends ConsumerStatefulWidget {
  const ServiceOrdersScreen({this.side = 'buyer', super.key});

  final String side;

  @override
  ConsumerState<ServiceOrdersScreen> createState() =>
      _ServiceOrdersScreenState();
}

class _ServiceOrdersScreenState extends ConsumerState<ServiceOrdersScreen> {
  late String _side = widget.side == 'seller' ? 'seller' : 'buyer';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final orders = ref.watch(serviceOrdersProvider(_side));
    return MemberListPage(
      title: w.ordersTitle,
      helpId: 'my-services',
      onRefresh: () => ref.refresh(serviceOrdersProvider(_side).future),
      children: [
        Wrap(
          spacing: 8,
          children: [
            for (final (value, label) in [
              ('buyer', w.buying),
              ('seller', w.selling),
            ])
              ChoiceChip(
                label: Text(label),
                selected: _side == value,
                onSelected: (_) => setState(() => _side = value),
              ),
          ],
        ),
        const SizedBox(height: BaghSpace.gutter),
        AsyncView(
          value: orders,
          onRetry: () => ref.invalidate(serviceOrdersProvider(_side)),
          isEmpty: (list) => list.isEmpty,
          empty: w.ordersEmpty,
          data: (list) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [for (final o in list) _OrderCard(o, side: _side)],
          ),
        ),
      ],
    );
  }
}

class _OrderCard extends ConsumerWidget {
  const _OrderCard(this.o, {required this.side});

  final ServiceOrder o;
  final String side;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final waiting = o.status == 'REQUESTED';
    final actions = ref.read(sellerActionsProvider);
    String n(int x) => localDigits(x, language);
    return SoftSurface(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              StatusPill(
                w.orderStatus.label(o.status),
                tone: switch (o.status) {
                  'ACCEPTED' => 0,
                  'REQUESTED' => 1,
                  'DECLINED' => 3,
                  _ => 4,
                },
              ),
              StatusPill(w.tiers.label(o.tier), tone: 4),
              Text(
                [
                  '#${o.code}',
                  if (o.createdAt case final at?) postedAgo(at, s, language),
                ].join(factSep(language)),
                style: text.bodySmall?.copyWith(color: c.ink2),
              ),
            ],
          ),
          InkWell(
            onTap: () => context.push('/freelance-services/${o.serviceCode}'),
            child: Text(
              o.serviceTitle,
              style: text.titleMedium?.copyWith(color: c.primary),
            ),
          ),
          Text(
            money(o.price, o.currency, s, language) ?? '—',
            style: text.titleSmall,
          ),
          Text(
            '${o.packageName}${factSep(language)}${w.daysCount.fill({'count': n(o.deliveryDays)})}${factSep(language)}'
            '${o.revisions == unlimitedRevisions ? w.unlimitedRevisions : w.revisionsCount.fill({'count': n(o.revisions)})}',
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
          if (o.counterparty case final user?)
            InlineLink(
              onTap: () => context.push('/profiles/$user'),
              child: Text(
                '${side == 'buyer' ? w.aboutSeller : w.aboutClient}: @$user',
                style: text.bodySmall?.copyWith(color: c.primary),
              ),
            ),
          if (o.extras.isNotEmpty)
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final e in o.extras)
                  Chip(
                    label: Text(
                      '+ ${e.title} (${money(e.price, o.currency, s, language)})',
                    ),
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
          if (o.answers.isNotEmpty || o.note != null)
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              initiallyExpanded: side == 'seller' && waiting,
              title: Text(w.buyerAnswers, style: text.labelLarge),
              expandedCrossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final (i, q) in o.requirements.indexed) ...[
                  Text(q, style: text.bodySmall?.copyWith(color: c.ink2)),
                  Text(i < o.answers.length ? o.answers[i] : '—'),
                  const SizedBox(height: 6),
                ],
                if (o.note case final note?) ...[
                  Text(
                    w.orderNote,
                    style: text.bodySmall?.copyWith(color: c.ink2),
                  ),
                  Text(note),
                ],
              ],
            ),
          if (o.declineReason case final reason?)
            Text('${w.declineReason} $reason', style: text.bodyMedium),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (side == 'seller' && waiting) ...[
                BaghKey(
                  label: w.accept,
                  icon: Icons.check_rounded,
                  onPressed: () => _run(
                    context,
                    ref,
                    () => actions.order(o.id, 'accept'),
                    done: w.orderAccepted,
                  ),
                ),
                TextButton(
                  onPressed: () => _decline(context, ref),
                  child: Text(w.decline),
                ),
              ],
              if (side == 'buyer' && waiting)
                TextButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    () => actions.order(o.id, 'cancel'),
                    done: w.orderCancelled,
                  ),
                  child: Text(w.cancelOrder),
                ),
              if (o.awardId != null)
                BaghKey(
                  label: w.openContract,
                  icon: Icons.handshake_outlined,
                  kind: BaghKeyKind.outline,
                  onPressed: () => context.push('/dashboard/awards'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _decline(BuildContext context, WidgetRef ref) async {
    final s = ref.read(stringsProvider);
    final w = s.work;
    final reason = TextEditingController();
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(w.decline),
          content: TextField(
            controller: reason,
            minLines: 2,
            maxLines: 5,
            maxLength: 500,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: w.declineReason),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(s.common.cancel),
            ),
            FilledButton(
              onPressed: reason.text.trim().length < 5
                  ? null
                  : () => Navigator.of(context).pop(true),
              child: Text(w.decline),
            ),
          ],
        ),
      ),
    );
    final text = reason.text;
    reason.dispose();
    if (sure != true || !context.mounted) return;
    await _run(
      context,
      ref,
      () =>
          ref.read(sellerActionsProvider).order(o.id, 'decline', reason: text),
      done: w.orderDeclined,
    );
  }
}

/// One package, as the editor holds it.
class _PackageDraft {
  _PackageDraft({required this.offered});

  bool offered;
  String name = '';
  String description = '';
  String price = '';
  String deliveryDays = '3';
  int revisions = 1;
  String features = '';
}

/// Creating or editing a service, as the web's ServiceEditorPage: the
/// overview, the gallery, up to three packages, extras, questions and
/// answers, and what the buyer answers when ordering.
class ServiceEditorScreen extends ConsumerWidget {
  const ServiceEditorScreen({this.serviceId, super.key});

  final String? serviceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    if (serviceId == null) return const _Editor();
    final own = ref.watch(ownServicesProvider);
    return own.hasValue
        ? switch (own.value!.where((v) => v.id == serviceId).firstOrNull) {
            final v? when v.editable => _Editor(service: v),
            _ => Scaffold(
              appBar: AppBar(title: Text(s.work.editService)),
              body: EmptyNote(message: s.list.noResults),
            ),
          }
        : Scaffold(
            appBar: AppBar(title: Text(s.work.editService)),
            body: AsyncView(
              value: own,
              onRetry: () => ref.invalidate(ownServicesProvider),
              data: (_) => const SizedBox.shrink(),
            ),
          );
  }
}

class _Editor extends ConsumerStatefulWidget {
  const _Editor({this.service});

  final OwnService? service;

  @override
  ConsumerState<_Editor> createState() => _EditorState();
}

class _EditorState extends ConsumerState<_Editor> {
  final _form = GlobalKey<FormState>();
  late final Map<String, Object?> _raw = widget.service?.raw ?? const {};
  late String _title = '${_raw['title'] ?? ''}';
  late String _description = '${_raw['description'] ?? ''}';
  late String _categoryId = '${_raw['workCategoryId'] ?? ''}';
  late String _skills = [
    for (final x in (_raw['skills'] as List? ?? const []))
      if (x is String) x,
  ].join(', ');
  late List<String> _languages = [
    for (final x in (_raw['languages'] as List? ?? const ['fa']))
      if (x is String) x,
  ];
  late final List<ServicePackage> _saved = packagesOf(_raw);
  late String _currency = _saved.firstOrNull?.currency ?? 'IRT';
  late final Map<String, _PackageDraft> _packages = {
    for (final tier in packageTiers) tier: _draftFor(tier),
  };
  late List<({String title, String price, int extraDays})> _extras = [
    for (final e in (_raw['extras'] as List? ?? const []))
      if (e is Map)
        (
          title: '${e['title'] ?? ''}',
          price: '${e['price'] ?? ''}',
          extraDays: (e['extraDays'] as num?)?.toInt() ?? 0,
        ),
  ];
  late List<({String question, String answer})> _faqs = [
    for (final f in (_raw['faqs'] as List? ?? const []))
      if (f is Map)
        (question: '${f['question'] ?? ''}', answer: '${f['answer'] ?? ''}'),
  ];
  late List<String> _requirements = [
    for (final x in (_raw['requirements'] as List? ?? const []))
      if (x is String) x,
  ];
  late final List<String> _keptImages = [...?widget.service?.imageIds];
  final List<String> _removed = [];
  List<PreparedImage> _newImages = const [];
  late final String _start;
  bool _tried = false;
  bool _sending = false;
  bool _shrinking = false;
  double? _progress;
  String? _error;

  _PackageDraft _draftFor(String tier) {
    final p = _saved.where((x) => x.tier == tier).firstOrNull;
    final draft = _PackageDraft(offered: p != null || tier == 'BASIC');
    if (p != null) {
      draft
        ..name = p.name
        ..description = p.description
        ..price = p.price
        ..deliveryDays = '${p.deliveryDays}'
        ..revisions = p.revisions
        ..features = p.features.join('\n');
    }
    return draft;
  }

  @override
  void initState() {
    super.initState();
    _start = _snapshot();
  }

  String _snapshot() => '${_payload()}${_newImages.length}${_removed.length}';

  /// What the editor sends, as the web's payload().
  Map<String, Object?> _payload() => {
    'title': _title.trim(),
    'description': _description.trim(),
    'workCategoryId': _categoryId.isEmpty ? null : _categoryId,
    'skills': {
      for (final x in _skills.split(RegExp('[,،\n]')))
        if (x.trim().isNotEmpty) x.trim(),
    }.take(15).toList(),
    'languages': _languages,
    'faqs': [
      for (final f in _faqs)
        if (f.question.trim().isNotEmpty && f.answer.trim().isNotEmpty)
          {'question': f.question.trim(), 'answer': f.answer.trim()},
    ],
    'requirements': [
      for (final q in _requirements)
        if (q.trim().isNotEmpty) q.trim(),
    ],
    'currency': _currency,
    'packages': [
      for (final tier in packageTiers)
        if (_packages[tier]!.offered)
          {
            'tier': tier,
            'name': _packages[tier]!.name.trim(),
            'description': _packages[tier]!.description.trim(),
            'price': plainDigits(_packages[tier]!.price),
            'deliveryDays':
                int.tryParse(plainDigits(_packages[tier]!.deliveryDays)) ?? 1,
            'revisions': _packages[tier]!.revisions,
            'features': [
              for (final line in _packages[tier]!.features.split('\n'))
                if (line.trim().isNotEmpty) line.trim(),
            ],
          },
    ],
    'extras': [
      for (final e in _extras)
        if (e.title.trim().isNotEmpty && plainDigits(e.price).isNotEmpty)
          {
            'title': e.title.trim(),
            'price': plainDigits(e.price),
            'extraDays': e.extraDays,
          },
    ],
    'removeImageIds': _removed,
  };

  Future<void> _addImages() async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    final room = _maxImages - _keptImages.length - _newImages.length;
    if (room <= 0) return;
    final picked = await FilePicker.pickFiles(type: FileType.image);
    if (picked.isEmpty || !mounted) return;
    setState(() => _shrinking = true);
    final ready = <PreparedImage>[];
    for (final f in picked.take(room)) {
      try {
        ready.add(await prepareImage(f.xFile.path, f.name));
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
    if (mounted) {
      setState(() {
        _newImages = [..._newImages, ...ready];
        _shrinking = false;
      });
    }
  }

  Future<void> _save({required bool submit}) async {
    final s = ref.read(stringsProvider);
    final w = s.work;
    if (!_tried) setState(() => _tried = true);
    if (!_form.currentState!.validate()) {
      revealFirstError(_form);
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
      _progress = null;
    });
    final actions = ref.read(sellerActionsProvider);
    try {
      final id = await actions.save(
        _payload(),
        id: widget.service?.id,
        images: _newImages,
        onProgress: _newImages.isEmpty
            ? null
            : (p) => setState(() => _progress = p),
      );
      if (submit) await actions.submit(id);
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(submit ? w.serviceSubmitted : w.serviceSaved)),
      );
      context.pop();
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final rules = s.mobile.fieldRules;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.watch(workCategoriesProvider).value ?? const [];
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final digits = [FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]'))];
    final live = widget.service?.live ?? false;
    final room = _maxImages - _keptImages.length - _newImages.length;
    String n(int x) => localDigits(x, language);

    String? length(String? v, int min, int max) {
      final t = (v ?? '').trim();
      if (t.isEmpty) return rules.required;
      if (t.length < min) return rules.minChars.fill({'n': n(min)});
      if (t.length > max) return rules.maxChars.fill({'n': n(max)});
      return null;
    }

    Widget section(String title, List<Widget> children, {String? hint}) =>
        SoftSurface(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              Text(title, style: text.titleMedium),
              if (hint != null)
                Text(hint, style: text.bodySmall?.copyWith(color: c.ink2)),
              ...children,
            ],
          ),
        );

    Widget remove(VoidCallback onTap) => IconButton(
      tooltip: s.common.delete,
      icon: const Icon(Icons.delete_outline_rounded),
      onPressed: () => setState(onTap),
    );

    final body = Form(
      key: _form,
      autovalidateMode: _tried
          ? AutovalidateMode.always
          : AutovalidateMode.disabled,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: BaghSpace.gutter,
        children: [
          if (live)
            SoftSurface(
              tint: c.tints[1],
              elevated: false,
              padding: const EdgeInsets.all(12),
              child: Text(
                w.liveEditWarning,
                style: text.bodyMedium?.copyWith(color: c.tints[1].ink),
              ),
            ),
          section(w.aboutService, [
            TextFormField(
              initialValue: _title,
              maxLength: 120,
              textDirection: textDirectionOf(
                _title,
                Directionality.of(context),
              ),
              onChanged: (v) => setState(() => _title = v),
              validator: (v) => length(v, 15, 120),
              decoration: InputDecoration(
                labelText: w.serviceTitleLabel,
                helperText: w.serviceTitleHint,
                helperMaxLines: 3,
                counterText: '',
              ),
            ),
            OutlinedButton.icon(
              icon: const Icon(Icons.arrow_drop_down_rounded),
              label: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(
                  categories
                          .where((x) => x.id == _categoryId)
                          .firstOrNull
                          ?.label(language) ??
                      w.chooseCategory,
                ),
              ),
              onPressed: () async {
                final picked = await pickFromList(
                  context,
                  title: w.categoryLabel,
                  all: w.chooseCategory,
                  searchable: true,
                  options: workCategoryOptions(categories, language),
                );
                FocusManager.instance.primaryFocus?.unfocus();
                if (picked != null) setState(() => _categoryId = picked);
              },
            ),
            TextFormField(
              initialValue: _description,
              minLines: 6,
              maxLines: 20,
              maxLength: 12000,
              keyboardType: TextInputType.multiline,
              textDirection: textDirectionOf(
                _description,
                Directionality.of(context),
              ),
              onChanged: (v) => setState(() => _description = v),
              validator: (v) => length(v, 120, 12000),
              decoration: InputDecoration(
                labelText: w.serviceDescriptionLabel,
                alignLabelWithHint: true,
                counterText: '',
              ),
            ),
            TextFormField(
              initialValue: _skills,
              onChanged: (v) => setState(() => _skills = v),
              decoration: InputDecoration(labelText: w.skillsLabel),
            ),
            Text(w.languagesLabel, style: text.labelLarge),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final code in workLanguages)
                  FilterChip(
                    label: Text(geo.language(code)),
                    selected: _languages.contains(code),
                    onSelected: (on) => setState(
                      () => _languages = on
                          ? [..._languages, code]
                          : [
                              for (final x in _languages)
                                if (x != code) x,
                            ],
                    ),
                  ),
              ],
            ),
          ]),
          section(w.galleryLabel, [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final id in _keptImages)
                  _Thumb(
                    onRemove: () => setState(() {
                      _keptImages.remove(id);
                      _removed.add(id);
                    }),
                    child: _OwnImage(id),
                  ),
                for (final image in _newImages)
                  _Thumb(
                    onRemove: () => setState(
                      () => _newImages = [
                        for (final x in _newImages)
                          if (x != image) x,
                      ],
                    ),
                    child: Image.memory(image.bytes, fit: BoxFit.cover),
                  ),
                if (room > 0)
                  SizedBox(
                    width: 120,
                    height: 84,
                    child: OutlinedButton(
                      onPressed: _shrinking ? null : _addImages,
                      child: _shrinking
                          ? const CircularProgressIndicator()
                          : const Icon(Icons.add_photo_alternate_outlined),
                    ),
                  ),
              ],
            ),
          ]),
          section(w.packages, [
            OutlinedButton.icon(
              icon: const Icon(Icons.arrow_drop_down_rounded),
              label: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(geo.currency(_currency, s.market.currency)),
              ),
              onPressed: () async {
                final picked = await pickFromList(
                  context,
                  title: w.currencyLabel,
                  all: geo.currency('IRT', s.market.currency),
                  searchable: true,
                  options: [
                    for (final code in currencyCodes)
                      (code, geo.currency(code, s.market.currency)),
                  ],
                );
                FocusManager.instance.primaryFocus?.unfocus();
                if (picked != null) {
                  setState(() => _currency = picked.isEmpty ? 'IRT' : picked);
                }
              },
            ),
            for (final tier in packageTiers)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: _packages[tier]!.offered
                        ? c.edge
                        : c.edge.withValues(alpha: 0.35),
                  ),
                  borderRadius: BorderRadius.circular(BaghRadius.tile),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 10,
                  children: [
                    if (tier == 'BASIC')
                      Text(w.tiers.label(tier), style: text.titleSmall)
                    else
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          w.tiers.label(tier),
                          style: text.titleSmall,
                        ),
                        subtitle: Text(w.offerPackage),
                        value: _packages[tier]!.offered,
                        onChanged: (v) =>
                            setState(() => _packages[tier]!.offered = v),
                      ),
                    if (_packages[tier]!.offered) ...[
                      TextFormField(
                        initialValue: _packages[tier]!.name,
                        maxLength: 60,
                        onChanged: (v) =>
                            setState(() => _packages[tier]!.name = v),
                        validator: (v) =>
                            (v ?? '').trim().isEmpty ? rules.required : null,
                        decoration: InputDecoration(
                          labelText: w.packageName,
                          counterText: '',
                        ),
                      ),
                      TextFormField(
                        initialValue: _packages[tier]!.description,
                        minLines: 2,
                        maxLines: 5,
                        maxLength: 600,
                        onChanged: (v) =>
                            setState(() => _packages[tier]!.description = v),
                        validator: (v) =>
                            (v ?? '').trim().isEmpty ? rules.required : null,
                        decoration: InputDecoration(
                          labelText: w.packageDescription,
                          alignLabelWithHint: true,
                          counterText: '',
                        ),
                      ),
                      TextFormField(
                        initialValue: groupThousands(_packages[tier]!.price),
                        keyboardType: TextInputType.number,
                        textDirection: TextDirection.ltr,
                        inputFormatters: [
                          ...digits,
                          const ThousandsFormatter(),
                        ],
                        onChanged: (v) => setState(
                          () => _packages[tier]!.price = plainDigits(v),
                        ),
                        validator: (v) => plainDigits(v ?? '').isEmpty
                            ? rules.required
                            : null,
                        decoration: InputDecoration(labelText: w.packagePrice),
                      ),
                      Row(
                        spacing: 8,
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: _packages[tier]!.deliveryDays,
                              keyboardType: TextInputType.number,
                              textDirection: TextDirection.ltr,
                              inputFormatters: digits,
                              onChanged: (v) => setState(
                                () => _packages[tier]!.deliveryDays = v,
                              ),
                              validator: (v) {
                                final d = int.tryParse(plainDigits(v ?? ''));
                                if (d == null) return rules.required;
                                if (d < 1) {
                                  return rules.atLeast.fill({'n': n(1)});
                                }
                                if (d > 365) {
                                  return rules.atMost.fill({'n': n(365)});
                                }
                                return null;
                              },
                              decoration: InputDecoration(
                                labelText: w.packageDays,
                              ),
                            ),
                          ),
                          Expanded(
                            child: DropdownButtonFormField<int>(
                              initialValue: _packages[tier]!.revisions,
                              isExpanded: true,
                              decoration: InputDecoration(
                                labelText: w.packageRevisions,
                              ),
                              items: [
                                for (final r in _revisionChoices)
                                  DropdownMenuItem(value: r, child: Text(n(r))),
                                DropdownMenuItem(
                                  value: unlimitedRevisions,
                                  child: Text(
                                    w.unlimitedRevisions,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                              onChanged: (v) => setState(
                                () => _packages[tier]!.revisions = v ?? 0,
                              ),
                            ),
                          ),
                        ],
                      ),
                      TextFormField(
                        initialValue: _packages[tier]!.features,
                        minLines: 3,
                        maxLines: 8,
                        onChanged: (v) =>
                            setState(() => _packages[tier]!.features = v),
                        decoration: InputDecoration(
                          labelText: w.packageFeatures,
                          alignLabelWithHint: true,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
          ]),
          section(w.extras, [
            for (final (i, e) in _extras.indexed)
              Row(
                key: ObjectKey((i, _extras.length)),
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 8,
                children: [
                  Expanded(
                    flex: 4,
                    child: TextFormField(
                      initialValue: e.title,
                      onChanged: (v) => _extras[i] = (
                        title: v,
                        price: _extras[i].price,
                        extraDays: _extras[i].extraDays,
                      ),
                      decoration: InputDecoration(labelText: w.extraTitle),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: TextFormField(
                      initialValue: groupThousands(e.price),
                      keyboardType: TextInputType.number,
                      textDirection: TextDirection.ltr,
                      inputFormatters: [...digits, const ThousandsFormatter()],
                      onChanged: (v) => _extras[i] = (
                        title: _extras[i].title,
                        price: plainDigits(v),
                        extraDays: _extras[i].extraDays,
                      ),
                      decoration: InputDecoration(labelText: w.extraPrice),
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      initialValue: '${e.extraDays}',
                      keyboardType: TextInputType.number,
                      textDirection: TextDirection.ltr,
                      inputFormatters: digits,
                      onChanged: (v) => _extras[i] = (
                        title: _extras[i].title,
                        price: _extras[i].price,
                        extraDays: int.tryParse(plainDigits(v)) ?? 0,
                      ),
                      decoration: InputDecoration(labelText: w.packageDays),
                    ),
                  ),
                  remove(() => _extras = [..._extras]..removeAt(i)),
                ],
              ),
            if (_extras.length < 8)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton.icon(
                  icon: const Icon(Icons.add_rounded),
                  label: Text(w.addExtra),
                  onPressed: () => setState(
                    () => _extras = [
                      ..._extras,
                      (title: '', price: '', extraDays: 0),
                    ],
                  ),
                ),
              ),
          ]),
          section(w.faq, [
            for (final (i, f) in _faqs.indexed)
              Row(
                key: ObjectKey((i, _faqs.length)),
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 8,
                children: [
                  Expanded(
                    child: Column(
                      spacing: 8,
                      children: [
                        TextFormField(
                          initialValue: f.question,
                          onChanged: (v) =>
                              _faqs[i] = (question: v, answer: _faqs[i].answer),
                          decoration: InputDecoration(labelText: w.faqQuestion),
                        ),
                        TextFormField(
                          initialValue: f.answer,
                          minLines: 2,
                          maxLines: 5,
                          onChanged: (v) => _faqs[i] = (
                            question: _faqs[i].question,
                            answer: v,
                          ),
                          decoration: InputDecoration(
                            labelText: w.faqAnswer,
                            alignLabelWithHint: true,
                          ),
                        ),
                      ],
                    ),
                  ),
                  remove(() => _faqs = [..._faqs]..removeAt(i)),
                ],
              ),
            if (_faqs.length < 10)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton.icon(
                  icon: const Icon(Icons.add_rounded),
                  label: Text(w.addFaq),
                  onPressed: () => setState(
                    () => _faqs = [..._faqs, (question: '', answer: '')],
                  ),
                ),
              ),
          ]),
          section(w.requirementsLabel, hint: w.requirementsTitle, [
            for (final (i, q) in _requirements.indexed)
              Row(
                key: ObjectKey((i, _requirements.length)),
                spacing: 8,
                children: [
                  Expanded(
                    child: TextFormField(
                      initialValue: q,
                      onChanged: (v) => _requirements[i] = v,
                    ),
                  ),
                  remove(() => _requirements = [..._requirements]..removeAt(i)),
                ],
              ),
            if (_requirements.length < 8)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton.icon(
                  icon: const Icon(Icons.add_rounded),
                  label: Text(w.addRequirement),
                  onPressed: () =>
                      setState(() => _requirements = [..._requirements, '']),
                ),
              ),
          ]),
          if (_sending && _progress != null)
            LinearProgressIndicator(
              value: _progress,
              minHeight: 6,
              borderRadius: BorderRadius.circular(3),
            ),
          if (_error case final e?) FormMessage(e),
          if (!live)
            BaghKey(
              label: w.submitForReview,
              icon: Icons.send_rounded,
              loading: _sending,
              expand: true,
              onPressed: () => _save(submit: true),
            ),
          BaghKey(
            label: w.saveDraft,
            icon: Icons.save_outlined,
            kind: live ? BaghKeyKind.primary : BaghKeyKind.outline,
            loading: _sending,
            expand: true,
            onPressed: () => _save(submit: false),
          ),
        ],
      ),
    );

    return LeaveGuard(
      isDirty: () => _snapshot() != _start,
      busy: _sending,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.service == null ? w.newService : w.editService),
          actions: const [HelpAction('my-services')],
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            child: body,
          ),
        ),
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.child, required this.onRemove});

  final Widget child;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 120,
    height: 84,
    child: Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(BaghRadius.tile),
          child: child,
        ),
        PositionedDirectional(
          top: 2,
          end: 2,
          child: IconButton.filledTonal(
            visualDensity: VisualDensity.compact,
            tooltip: MaterialLocalizations.of(context).deleteButtonTooltip,
            icon: const Icon(Icons.close_rounded, size: 16),
            onPressed: onRemove,
          ),
        ),
      ],
    ),
  );
}
