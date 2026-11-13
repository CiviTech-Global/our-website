import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/date_field.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../browse/browse.dart';
import 'staff_collections.dart';
import 'staff_queues.dart';
import 'staff_screens.dart' show workloadProvider;

/// The desk's way to everything that is not a queue, by what this person may
/// reach. `permissions` is the workload's, so a super admin sees every module.
class StaffDeskMenu extends ConsumerWidget {
  const StaffDeskMenu({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final isSuper = ref.watch(sessionProvider).value?.role == 'SUPER_ADMIN';
    final granted = {
      for (final p
          in (ref.watch(workloadProvider).value?['permissions'] as List? ??
              const []))
        '$p',
    };
    final forward = Directionality.of(context) == TextDirection.rtl
        ? Icons.chevron_left_rounded
        : Icons.chevron_right_rounded;
    final items = <(IconData, String, String)>[
      if (granted.contains('users')) ...[
        (Icons.group_outlined, s.admin.users, '/staff/users'),
        (Icons.shield_outlined, s.admin.roles, '/staff/roles'),
      ],
      if (granted.contains('analytics'))
        (Icons.insights_outlined, s.analytics.title, '/staff/analytics'),
      if (isSuper) (Icons.history_rounded, s.audit.title, '/staff/audit'),
      if (granted.contains('billing')) ...[
        (
          Icons.workspace_premium_outlined,
          s.plans.adminPlansTitle,
          '/staff/plans',
        ),
        (Icons.sms_outlined, s.sms.adminTitle, '/staff/sms'),
      ],
      if (granted.contains('accounts'))
        (
          Icons.add_business_outlined,
          s.plans.adminAccountsTitle,
          '/staff/accounts',
        ),
      for (final c in [...staffCollections, ...staffTools])
        if (c.permission == null ? isSuper : granted.contains(c.permission))
          (
            c.icon,
            c.label(s),
            c.createOnly
                ? '/staff/manage/${c.key}/new'
                : '/staff/manage/${c.key}',
          ),
    ];
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: BaghSpace.gutter),
      child: SoftSurface(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Column(
          children: [
            for (final (icon, label, path) in items)
              ListTile(
                leading: Icon(icon),
                title: Text(label),
                trailing: Icon(forward),
                onTap: () => context.push(path),
              ),
          ],
        ),
      ),
    );
  }
}

/// What came in lately: fourteen days of arrivals and the newest items, as
/// the web panel's overview shows them.
class StaffActivity extends ConsumerWidget {
  const StaffActivity({required this.workload, super.key});

  final StaffRow workload;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final trend = [
      for (final p in (workload['trend'] as List? ?? const []))
        if (p is Map) (p['count'] as num?)?.toInt() ?? 0,
    ];
    final recent = [
      for (final r in (workload['recent'] as List? ?? const []))
        if (r is Map) r.cast<String, Object?>(),
    ];
    final peak = trend.fold(1, (most, n) => n > most ? n : most);
    final total = trend.fold(0, (sum, n) => sum + n);

    String status(StaffRow item) {
      final value = '${item['status']}';
      return switch (item['kind']) {
        'project' => s.proposal.statuses.label(value),
        'insurance' => switch (value) {
          'NEW' => s.admin.newLeads,
          'CONTACTED' => s.admin.contacted,
          'IN_PROGRESS' => s.admin.inProgress,
          'COMPLETED' => s.admin.completed,
          'CANCELLED' => s.admin.cancelled,
          _ => value,
        },
        'message' => s.contact.statuses.label(value),
        _ => s.join.statuses.label(value),
      };
    }

    void open(StaffRow item) {
      final queue = switch (item['kind']) {
        'project' => 'projects',
        'insurance' => 'insurance',
        'message' => 'messages',
        'programme' => 'programme',
        _ => 'resumes',
      };
      // A contact message has no page of its own; its queue shows it.
      context.push(
        queue == 'messages'
            ? '/staff/q/messages'
            : '/staff/q/$queue/${item['id']}',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: BaghSpace.gutter,
      children: [
        if (trend.isNotEmpty)
          SoftSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 10,
              children: [
                Text(s.app.arrivals, style: text.titleSmall),
                Text(
                  '${s.app.arrivalsTotal}: ${localDigits(total, language)}',
                  style: text.bodySmall,
                ),
                Semantics(
                  label:
                      '${s.app.arrivalsTotal}: '
                      '${localDigits(total, language)}',
                  child: SizedBox(
                    height: 64,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      spacing: 3,
                      children: [
                        for (final n in trend)
                          Expanded(
                            child: FractionallySizedBox(
                              heightFactor: n == 0 ? 0.04 : n / peak,
                              alignment: Alignment.bottomCenter,
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  color: c.primary,
                                  borderRadius: BorderRadius.circular(3),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        if (recent.isNotEmpty)
          SoftSurface(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: Text(s.app.recentActivity, style: text.titleSmall),
                ),
                for (final item in recent)
                  ListTile(
                    title: Text(
                      '${item['title']}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      [
                        L10nMap(
                          s.app.node('activityKinds'),
                        ).label('${item['kind']}'),
                        status(item),
                      ].join(factSep(language)),
                    ),
                    onTap: () => open(item),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

/// The staff who can take an item: every active account but the customers.
/// Asked for by role, so members never crowd staff off the one page read.
final assignableStaffProvider =
    FutureProvider.autoDispose<List<(String, String)>>((ref) async {
      final api = ref.read(apiClientProvider);
      Future<List<(String, String)>> byRole(String role) => api.get(
        '/admin/users',
        query: {'page': 1, 'limit': 100, 'role': role, 'status': 'active'},
        parse: (d) => [
          for (final u in ((d! as Map)['items'] as List? ?? const []))
            if (u is Map && u['role'] != 'USER' && u['isActive'] != false)
              (
                '${u['id']}',
                '${u['firstName'] ?? ''} ${u['lastName'] ?? ''}'.trim(),
              ),
        ],
      );
      final [admins, supers] = await Future.wait([
        byRole('ADMIN'),
        byRole('SUPER_ADMIN'),
      ]);
      return [...admins, ...supers];
    });

/// What an item takes besides its decision or status: who owns it, when to
/// call, and what can be done to it once it is published.
class StaffItemExtras extends ConsumerStatefulWidget {
  const StaffItemExtras({
    required this.queue,
    required this.id,
    required this.row,
    super.key,
  });

  final StaffQueue queue;
  final String id;
  final StaffRow row;

  @override
  ConsumerState<StaffItemExtras> createState() => _StaffItemExtrasState();
}

class _StaffItemExtrasState extends ConsumerState<StaffItemExtras> {
  late final StaffRow _item = widget.queue.itemOf(widget.row);
  late String? _owner =
      (_item['assignedToId'] ?? (_item['assignedTo'] as Map?)?['id'])
          as String?;
  late DateTime? _when = DateTime.tryParse(
    '${_item['callbackScheduledAt'] ?? _item['scheduledAt']}',
  )?.toLocal();
  late bool _featured = _item['featured'] == true;
  DateTime? _closesAt;
  final _offerAmount = TextEditingController();
  final _offerDays = TextEditingController();
  final _offerMessage = TextEditingController();
  bool _busy = false;
  String? _error;

  StaffQueue get q => widget.queue;
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  void dispose() {
    _offerAmount.dispose();
    _offerDays.dispose();
    _offerMessage.dispose();
    super.dispose();
  }

  /// Whether the change was saved.
  Future<bool> _run(Future<void> Function() action, String done) async {
    if (_busy) return false;
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
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(done)));
      }
      return true;
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
      return false;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _assign(String? id) async {
    final s = ref.read(stringsProvider);
    final a = q.assign!;
    final before = _owner;
    setState(() => _owner = id);
    final saved = await _run(
      () => _api.patch<Object?>(
        a.path(widget.id),
        body: {
          'assignedToId': id,
          if (a.sendsStatus) 'status': q.statusOf(widget.row),
        },
      ),
      s.admin.assignUpdated,
    );
    // Show what is actually stored, not the choice that failed.
    if (!saved && mounted) setState(() => _owner = before);
  }

  Future<void> _schedule(DateTime? day) async {
    final s = ref.read(stringsProvider);
    var when = day;
    if (day != null) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_when ?? DateTime(0, 1, 1, 10)),
      );
      if (time == null) return;
      when = DateTime(day.year, day.month, day.day, time.hour, time.minute);
    }
    if (!mounted) return;
    final before = _when;
    setState(() => _when = when);
    final saved = await _run(
      () => _api.patch<Object?>(
        q.schedule!.path(widget.id),
        body: {'scheduledAt': when?.toUtc().toIso8601String()},
      ),
      when == null ? s.admin.callbackCleared : s.admin.callbackUpdated,
    );
    if (!saved && mounted) setState(() => _when = before);
  }

  String get _kind => q.ops == StaffOps.job ? 'jobs' : 'projects';

  Future<void> _toggleFeatured() async {
    final s = ref.read(stringsProvider);
    final next = !_featured;
    await _run(() async {
      if (q.ops == StaffOps.service) {
        await _api.patch<Object?>(
          '/work/admin/services/${widget.id}/featured',
          body: {'featured': next},
        );
      } else {
        await _api.post<Object?>(
          '/market/admin/$_kind/${widget.id}/${next ? 'feature' : 'unfeature'}',
        );
      }
      if (mounted) setState(() => _featured = next);
    }, next ? s.ops.featured : s.ops.unfeatured);
  }

  Future<void> _extend() async {
    final s = ref.read(stringsProvider);
    final closes = _closesAt;
    if (closes == null) return;
    await _run(
      () => _api.post<Object?>(
        '/market/admin/$_kind/${widget.id}/extend',
        body: {'closesAt': closes.toUtc().toIso8601String()},
      ),
      s.ops.extended,
    );
  }

  Future<void> _placeOffer() async {
    final s = ref.read(stringsProvider);
    final amount = plainDigits(_offerAmount.text);
    final message = _offerMessage.text.trim();
    if (amount.isEmpty || message.isEmpty) return;
    await _run(
      () => _api.post<Object?>(
        '/market/admin/projects/${widget.id}/company-offer',
        body: {
          'amount': amount,
          'deliveryDays': ?int.tryParse(_offerDays.text.trim()),
          'message': message,
        },
      ),
      s.market.companyOfferPlaced,
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final published = _item['moderationStatus'] == 'APPROVED';
    final staff = q.assign == null
        ? null
        : ref.watch(assignableStaffProvider).value;

    final children = <Widget>[
      // Reading the staff list takes the users module, so without it the
      // owner cannot be chosen here, as on the web.
      if (staff != null)
        DropdownButtonFormField<String>(
          initialValue: staff.any((u) => u.$1 == _owner) ? _owner : '',
          isExpanded: true,
          decoration: InputDecoration(labelText: s.admin.assignedTo),
          items: [
            DropdownMenuItem(value: '', child: Text(s.admin.unassigned)),
            for (final (id, name) in staff)
              DropdownMenuItem(
                value: id,
                child: Text(name, overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: _busy
              ? null
              : (value) =>
                    _assign(value == null || value.isEmpty ? null : value),
        ),
      if (q.schedule != null)
        DateField(
          label: s.admin.callbackScheduled,
          value: _when,
          onChanged: _schedule,
        ),
      if (q.ops != null && published) ...[
        BaghKey(
          label: _featured ? s.ops.unfeature : s.ops.feature,
          kind: BaghKeyKind.outline,
          expand: true,
          loading: _busy,
          onPressed: _toggleFeatured,
        ),
        if (q.ops != StaffOps.service) ...[
          DateField(
            label: s.ops.extendLabel,
            value: _closesAt,
            firstDate: DateTime.now(),
            onChanged: (value) => setState(() => _closesAt = value),
          ),
          BaghKey(
            label: s.ops.extendSubmit,
            kind: BaghKeyKind.outline,
            expand: true,
            loading: _busy,
            onPressed: _closesAt == null ? null : _extend,
          ),
        ],
      ],
      if (q.ops == StaffOps.project && published) ...[
        const Divider(),
        Text(
          s.market.placeCompanyOffer,
          style: Theme.of(context).textTheme.titleSmall,
        ),
        TextField(
          controller: _offerAmount,
          keyboardType: TextInputType.number,
          textDirection: TextDirection.ltr,
          inputFormatters: const [ThousandsFormatter()],
          decoration: InputDecoration(labelText: s.market.amount),
        ),
        TextField(
          controller: _offerDays,
          keyboardType: TextInputType.number,
          textDirection: TextDirection.ltr,
          decoration: InputDecoration(labelText: s.market.deliveryDays),
        ),
        TextField(
          controller: _offerMessage,
          minLines: 2,
          maxLines: 6,
          decoration: InputDecoration(labelText: s.market.bidMessage),
        ),
        BaghKey(
          label: s.market.placeCompanyOffer,
          kind: BaghKeyKind.outline,
          expand: true,
          loading: _busy,
          onPressed: _placeOffer,
        ),
      ],
      if (_error != null) FormMessage(_error!),
    ];

    if (children.isEmpty) return const SizedBox.shrink();
    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 14,
        children: children,
      ),
    );
  }
}
