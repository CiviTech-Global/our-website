import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../browse/browse.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'staff_queues.dart';
import 'staff_screens.dart' show workloadProvider;

/// The web panel's people and oversight pages: users, roles, analytics with
/// its disputes, and the audit log. Every change here is the super admin's,
/// as on the web; the server refuses anybody else, and the screens simply do
/// not offer it to them.

/// The label of a module, from the same map the web's users page reads.
String moduleLabel(Strings s, String permission) =>
    L10nMap(s.access.node('modules_')).label(permission);

String _roleLabel(Strings s, String role) => switch (role) {
  'ADMIN' => s.access.roleAdmin,
  'SUPER_ADMIN' => s.access.roleSuperAdmin,
  _ => s.access.roleUser,
};

final permissionCatalogueProvider = FutureProvider.autoDispose<List<String>>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/admin/permissions',
        parse: (d) => [
          for (final p in ((d! as Map)['permissions'] as List? ?? const []))
            '$p',
        ],
      ),
);

class StaffUsersScreen extends ConsumerWidget {
  const StaffUsersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final isSuper = ref.watch(sessionProvider).value?.role == 'SUPER_ADMIN';
    return BrowseScreen(
      title: s.admin.users,
      subtitle: s.access.pageSubtitle,
      path: '/admin/users',
      searchHint: s.access.searchUsers,
      sorts: [('', s.list.sortLabel)],
      actions: [
        if (isSuper)
          IconButton(
            tooltip: s.access.newAdmin,
            icon: const Icon(Icons.person_add_alt_rounded),
            onPressed: () => context.push('/staff/users/new'),
          ),
      ],
      filters: (_) => [
        ChoiceFilter(s.access.filterRole, 'role', [
          ('USER', s.access.roleUser),
          ('ADMIN', s.access.roleAdmin),
          ('SUPER_ADMIN', s.access.roleSuperAdmin),
        ], all: s.access.filterRoleAll),
        ChoiceFilter(s.access.filterStatus, 'status', [
          ('active', s.access.statusActive),
          ('inactive', s.access.statusInactive),
        ], all: s.access.filterStatusAll),
      ],
      emptyText: s.list.empty,
      countText: s.list.resultCount,
      itemBuilder: (context, row) {
        final text = Theme.of(context).textTheme;
        final name = '${row['firstName'] ?? ''} ${row['lastName'] ?? ''}'
            .trim();
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: SoftSurface(
            onTap: () => context.push('/staff/users/${row['id']}', extra: row),
            semanticLabel: name,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 4,
              children: [
                Text(name, style: text.titleSmall),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    if (row['isActive'] == false)
                      StatusPill(s.access.deactivated, tone: 4),
                    StatusPill(_roleLabel(s, '${row['role']}')),
                  ],
                ),
                Text(
                  '${row['email']}',
                  style: text.bodySmall,
                  textDirection: TextDirection.ltr,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// One account: its modules, its standing, and whether it may use the boards.
class StaffUserScreen extends ConsumerStatefulWidget {
  const StaffUserScreen({required this.id, this.row, super.key});

  final String id;
  final StaffRow? row;

  @override
  ConsumerState<StaffUserScreen> createState() => _StaffUserScreenState();
}

class _StaffUserScreenState extends ConsumerState<StaffUserScreen> {
  late List<String> _modules = [
    for (final p in (widget.row?['permissions'] as List? ?? const [])) '$p',
  ];
  final _reason = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _reason.dispose();
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
      ref.invalidate(browseProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(done)));
      if (context.canPop()) context.pop();
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final text = Theme.of(context).textTheme;
    final row = widget.row;
    final me = ref.watch(sessionProvider).value;
    final catalogue = ref.watch(permissionCatalogueProvider);

    if (row == null) {
      return AccountPage(
        title: s.admin.users,
        children: [Text(s.mobile.staffItemMissing)],
      );
    }

    final id = widget.id;
    final role = '${row['role']}';
    final name = '${row['firstName'] ?? ''} ${row['lastName'] ?? ''}'.trim();
    final isCustomer = role == 'USER';
    final isTop = role == 'SUPER_ADMIN';
    final active = row['isActive'] != false;
    final deleted = '${row['email']}'.endsWith('@deleted.invalid');
    final canEdit = me?.role == 'SUPER_ADMIN' && me?.id != id && !isTop;

    return Scaffold(
      appBar: AppBar(leading: homeLeading(context), title: Text(s.admin.users)),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: BaghLayout.readablePadding(
            context,
            top: BaghSpace.gutter,
            bottom: BaghSpace.section * 2,
          ),
          children: [
            Text(name, style: text.headlineSmall),
            const SizedBox(height: 4),
            Text(
              '${row['email']}',
              textDirection: TextDirection.ltr,
              style: text.bodyMedium,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                StatusPill(_roleLabel(s, role)),
                if (deleted)
                  StatusPill(s.access.deletedByOwner, tone: 4)
                else if (!active)
                  StatusPill(s.access.deactivated, tone: 4),
              ],
            ),
            const SizedBox(height: BaghSpace.gutter),
            if (isTop)
              SoftSurface(child: Text(s.access.superAdminNote))
            else if (isCustomer)
              SoftSurface(child: Text(s.access.customerNote))
            else
              SoftSurface(
                child: AsyncView(
                  value: catalogue,
                  onRetry: () => ref.invalidate(permissionCatalogueProvider),
                  data: (all) => Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 8,
                    children: [
                      Text(s.access.modules, style: text.titleMedium),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (final p in all)
                            FilterChip(
                              label: Text(moduleLabel(s, p)),
                              selected: _modules.contains(p),
                              onSelected: canEdit
                                  ? (on) => setState(
                                      () => _modules = on
                                          ? [..._modules, p]
                                          : [
                                              for (final x in _modules)
                                                if (x != p) x,
                                            ],
                                    )
                                  : null,
                            ),
                        ],
                      ),
                      if (canEdit)
                        BaghKey(
                          label: s.common.save,
                          loading: _busy,
                          expand: true,
                          onPressed: () => _run(
                            () => _api.patch<Object?>(
                              '/admin/users/$id/permissions',
                              body: {'permissions': _modules},
                            ),
                            s.access.permissionsSaved,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            if (canEdit && !deleted) ...[
              const SizedBox(height: BaghSpace.gutter),
              SoftSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 10,
                  children: [
                    if (!active)
                      BaghKey(
                        label: s.access.reactivate,
                        kind: BaghKeyKind.outline,
                        expand: true,
                        loading: _busy,
                        onPressed: () => _run(
                          () => _api.patch<Object?>(
                            '/admin/users/$id/reactivate',
                            body: const {},
                          ),
                          s.access.reactivatedDone,
                        ),
                      )
                    else ...[
                      BaghKey(
                        label: isCustomer
                            ? s.access.makeStaff
                            : s.access.makeCustomer,
                        kind: BaghKeyKind.outline,
                        expand: true,
                        loading: _busy,
                        onPressed: () => _run(
                          () => _api.patch<Object?>(
                            '/admin/users/$id/role',
                            body: {'role': isCustomer ? 'ADMIN' : 'USER'},
                          ),
                          s.access.roleChanged,
                        ),
                      ),
                      BaghKey(
                        label: s.access.deactivate,
                        kind: BaghKeyKind.outline,
                        expand: true,
                        loading: _busy,
                        onPressed: () => _run(
                          () => _api.patch<Object?>(
                            '/admin/users/$id/deactivate',
                            body: const {},
                          ),
                          s.access.deactivatedDone,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
            if (!deleted && active && !isTop && me?.id != id) ...[
              const SizedBox(height: BaghSpace.gutter),
              SoftSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 10,
                  children: [
                    TextField(
                      controller: _reason,
                      minLines: 1,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: s.ops.pauseReasonLabel,
                      ),
                    ),
                    BaghKey(
                      label: s.ops.pauseUser,
                      kind: BaghKeyKind.outline,
                      expand: true,
                      loading: _busy,
                      onPressed: () => _run(
                        () => _api.post<Object?>(
                          '/market/admin/users/$id/pause',
                          body: {
                            'paused': true,
                            if (_reason.text.trim().isNotEmpty)
                              'reason': _reason.text.trim(),
                          },
                        ),
                        s.ops.pausedToast,
                      ),
                    ),
                    BaghKey(
                      label: s.ops.unpauseUser,
                      kind: BaghKeyKind.outline,
                      expand: true,
                      loading: _busy,
                      onPressed: () => _run(
                        () => _api.post<Object?>(
                          '/market/admin/users/$id/pause',
                          body: const {'paused': false},
                        ),
                        s.ops.unpausedToast,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: BaghSpace.gutter),
              FormMessage(_error!),
            ],
          ],
        ),
      ),
    );
  }
}

/// A new staff account, with exactly the modules it is meant to reach.
class StaffCreateAdminScreen extends ConsumerStatefulWidget {
  const StaffCreateAdminScreen({super.key});

  @override
  ConsumerState<StaffCreateAdminScreen> createState() =>
      _StaffCreateAdminScreenState();
}

class _StaffCreateAdminScreenState
    extends ConsumerState<StaffCreateAdminScreen> {
  final _form = GlobalKey<FormState>();
  bool _tried = false;
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  List<String> _modules = const [];
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _first.dispose();
    _last.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_tried) setState(() => _tried = true);
    if (_busy || !_form.currentState!.validate()) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .post<Object?>(
            '/admin/users',
            body: {
              'firstName': _first.text.trim(),
              'lastName': _last.text.trim(),
              'email': _email.text.trim(),
              'password': _password.text,
              'permissions': _modules,
            },
          );
      await ref.read(hapticsProvider).success();
      ref.invalidate(browseProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.access.adminCreated)));
      context.pop();
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
    final catalogue = ref.watch(permissionCatalogueProvider);
    return AccountPage(
      title: s.access.newAdmin,
      subtitle: s.access.newAdminHint,
      children: [
        Form(
          key: _form,
          autovalidateMode: _tried
              ? AutovalidateMode.always
              : AutovalidateMode.disabled,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 14,
            children: [
              TextFormField(
                controller: _first,
                validator: v.required,
                decoration: InputDecoration(labelText: s.auth.firstName),
              ),
              TextFormField(
                controller: _last,
                validator: v.required,
                decoration: InputDecoration(labelText: s.auth.lastName),
              ),
              TextFormField(
                controller: _email,
                validator: v.email,
                keyboardType: TextInputType.emailAddress,
                textDirection: TextDirection.ltr,
                decoration: InputDecoration(labelText: s.auth.email),
              ),
              PasswordField(
                controller: _password,
                label: s.auth.password,
                helper: s.auth.passwordHint,
                newPassword: true,
                validator: v.password,
              ),
            ],
          ),
        ),
        AsyncView(
          value: catalogue,
          onRetry: () => ref.invalidate(permissionCatalogueProvider),
          data: (all) => Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final p in all)
                FilterChip(
                  label: Text(moduleLabel(s, p)),
                  selected: _modules.contains(p),
                  onSelected: (on) => setState(
                    () => _modules = on
                        ? [..._modules, p]
                        : [
                            for (final x in _modules)
                              if (x != p) x,
                          ],
                  ),
                ),
            ],
          ),
        ),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: s.access.createAdmin,
          onPressed: _submit,
          loading: _busy,
          expand: true,
        ),
      ],
    );
  }
}

final _rolesProvider = FutureProvider.autoDispose<List<StaffRow>>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/admin/roles',
        parse: (d) => [
          for (final r in (d as List? ?? const []))
            if (r is Map) r.cast<String, Object?>(),
        ],
      ),
);

class StaffRolesScreen extends ConsumerWidget {
  const StaffRolesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(leading: homeLeading(context), title: Text(s.admin.roles)),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: BaghLayout.readablePadding(
            context,
            top: BaghSpace.gutter,
            bottom: BaghSpace.section * 2,
          ),
          children: [
            Text(s.admin.rolesEndpointNote, style: text.bodyMedium),
            const SizedBox(height: BaghSpace.gutter),
            AsyncView(
              value: ref.watch(_rolesProvider),
              onRetry: () => ref.invalidate(_rolesProvider),
              isEmpty: (roles) => roles.isEmpty,
              empty: s.list.empty,
              data: (roles) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 10,
                children: [
                  for (final role in roles)
                    SoftSurface(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: 8,
                        children: [
                          Text('${role['name']}', style: text.titleSmall),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              for (final p
                                  in (role['permissions'] as List? ?? const []))
                                StatusPill(moduleLabel(s, '$p')),
                            ],
                          ),
                        ],
                      ),
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

final _analyticsProvider = FutureProvider.autoDispose<StaffRow>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/market/admin/analytics',
        parse: (d) => (d! as Map).cast<String, Object?>(),
      ),
);

final _disputesProvider = FutureProvider.autoDispose<List<StaffRow>>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/market/admin/disputes',
        parse: (d) => [
          for (final r in (d as List? ?? const []))
            if (r is Map) r.cast<String, Object?>(),
        ],
      ),
);

/// The marketplace in numbers, and the disputes only staff can settle.
class StaffAnalyticsScreen extends ConsumerWidget {
  const StaffAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final a = s.analytics;

    Widget tally(String title, List<Object?> rows) => SoftSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 6,
        children: [
          Text(title, style: text.titleSmall),
          if (rows.isEmpty) Text(a.empty),
          for (final r in rows)
            if (r is Map)
              Row(
                children: [
                  Expanded(child: Text('${r['value']}')),
                  Text(localDigits('${r['total'] ?? 0}', language)),
                ],
              ),
        ],
      ),
    );

    return Scaffold(
      appBar: AppBar(leading: homeLeading(context), title: Text(a.title)),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          onRefresh: () async {
            ref
              ..invalidate(_analyticsProvider)
              ..invalidate(_disputesProvider);
            await ref.read(_analyticsProvider.future);
          },
          child: ListView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            children: [
              AsyncView(
                value: ref.watch(_analyticsProvider),
                onRetry: () => ref.invalidate(_analyticsProvider),
                data: (d) {
                  final awards = (d['awards'] as Map?) ?? const {};
                  final featured = (d['featured'] as Map?) ?? const {};
                  final queues = (d['queues'] as Map?) ?? const {};
                  final speed = (d['reviewSpeedHours'] as Map?) ?? const {};
                  final rate = awards['completionRate'];
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: BaghSpace.gutter,
                    children: [
                      SoftSurface(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          spacing: 6,
                          children: [
                            for (final (label, value) in [
                              (a.totalAwards, awards['total'] ?? 0),
                              (
                                a.completionRate,
                                rate is num ? '${(rate * 100).round()}%' : '—',
                              ),
                              (a.openDisputes, awards['openDisputes'] ?? 0),
                              (
                                a.featuredListings,
                                ((featured['jobs'] as num?) ?? 0) +
                                    ((featured['projects'] as num?) ?? 0),
                              ),
                            ])
                              Row(
                                children: [
                                  Expanded(child: Text(label)),
                                  Text(
                                    localDigits('$value', language),
                                    style: text.titleMedium,
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                      SoftSurface(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          spacing: 6,
                          children: [
                            Text(a.queueDepths, style: text.titleSmall),
                            for (final MapEntry(:key, :value) in queues.entries)
                              if (value is Map)
                                for (final MapEntry(key: state, value: count)
                                    in value.entries)
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '$key${factSep(language)}'
                                          '${s.market.label('$state')}',
                                        ),
                                      ),
                                      Text(
                                        localDigits('${count ?? 0}', language),
                                      ),
                                    ],
                                  ),
                          ],
                        ),
                      ),
                      SoftSurface(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          spacing: 6,
                          children: [
                            Text(a.reviewSpeed, style: text.titleSmall),
                            for (final MapEntry(:key, :value) in speed.entries)
                              Row(
                                children: [
                                  Expanded(child: Text('$key')),
                                  Text(
                                    value == null
                                        ? '—'
                                        : '${localDigits('$value', language)} '
                                              '${a.hoursSuffix}',
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                      tally(a.topSkills, d['topSkills'] as List? ?? const []),
                      tally(
                        a.topCategories,
                        d['topCategories'] as List? ?? const [],
                      ),
                    ],
                  );
                },
              ),
              const SizedBox(height: BaghSpace.gutter),
              Text(a.openDisputes, style: text.titleMedium),
              const SizedBox(height: 8),
              AsyncView(
                value: ref.watch(_disputesProvider),
                onRetry: () => ref.invalidate(_disputesProvider),
                isEmpty: (rows) => rows.isEmpty,
                empty: a.empty,
                data: (rows) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 10,
                  children: [
                    for (final row in rows)
                      _DisputeCard(key: ValueKey(row['awardId']), row: row),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DisputeCard extends ConsumerStatefulWidget {
  const _DisputeCard({required this.row, super.key});

  final StaffRow row;

  @override
  ConsumerState<_DisputeCard> createState() => _DisputeCardState();
}

class _DisputeCardState extends ConsumerState<_DisputeCard> {
  final _note = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _resolve() async {
    final note = _note.text.trim();
    if (_busy || note.isEmpty) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .post<Object?>(
            '/market/admin/awards/${widget.row['awardId']}/resolve-dispute',
            body: {'note': note},
          );
      await ref.read(hapticsProvider).success();
      ref
        ..invalidate(_disputesProvider)
        ..invalidate(_analyticsProvider)
        ..invalidate(workloadProvider);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(s.ops.disputeResolvedToast)));
      }
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final text = Theme.of(context).textTheme;
    final listing = (widget.row['listing'] as Map?) ?? const {};
    return SoftSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Text('${listing['title'] ?? ''}', style: text.titleSmall),
          Text('${widget.row['disputeReason'] ?? ''}'),
          TextField(
            controller: _note,
            minLines: 2,
            maxLines: 5,
            decoration: InputDecoration(labelText: s.ops.resolveDisputeNote),
          ),
          if (_error != null) FormMessage(_error!),
          BaghKey(
            label: s.ops.resolveDispute,
            onPressed: _resolve,
            loading: _busy,
            expand: true,
          ),
        ],
      ),
    );
  }
}

/// Every operational action, with who did it and when. Super admin only.
class StaffAuditScreen extends ConsumerWidget {
  const StaffAuditScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    return BrowseScreen(
      title: s.audit.title,
      path: '/market/admin/audit',
      searchHint: s.audit.searchPlaceholder,
      sorts: [('', s.list.sortLabel)],
      filters: (_) => const [],
      emptyText: s.audit.empty,
      countText: s.list.resultCount,
      itemBuilder: (context, row) {
        final text = Theme.of(context).textTheme;
        final actor = (row['actor'] as Map?) ?? const {};
        final at = DateTime.tryParse('${row['createdAt']}');
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: SoftSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: 4,
              children: [
                Text(
                  '${row['action']}',
                  style: text.titleSmall,
                  textDirection: TextDirection.ltr,
                ),
                Text(
                  [
                    '${actor['firstName'] ?? ''} ${actor['lastName'] ?? ''}'
                        .trim(),
                    '${row['targetType']}',
                    if (at != null) formatDate(at.toLocal(), language),
                  ].where((x) => x.isNotEmpty).join(factSep(language)),
                  style: text.bodySmall,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
