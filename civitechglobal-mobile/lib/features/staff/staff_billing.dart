import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../plans/plans_data.dart';
import 'staff_queues.dart' show StaffRow;

/// The desk's money and accounts pages, as the web panel's Plans, Accounts
/// and SMS pages: prices and subscriptions (`billing`), accounts support
/// opens for a company in person (`accounts`), and what texts cost
/// (`billing`).

List<StaffRow> _rows(Object? v) => [
  if (v is List)
    for (final r in v)
      if (r is Map) r.cast<String, Object?>(),
];

/// A titled card.
class _Card extends StatelessWidget {
  const _Card({required this.title, required this.children, this.trailing});

  final String title;
  final Widget? trailing;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return SoftSurface(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 12,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              Text(title, style: text.titleMedium),
              ?trailing,
            ],
          ),
          ...children,
        ],
      ),
    );
  }
}

/// A plain staff page: title, intro, and cards.
class _Page extends StatelessWidget {
  const _Page({
    required this.title,
    required this.intro,
    required this.children,
    this.onRefresh,
  });

  final String title;
  final String intro;
  final List<Widget> children;
  final Future<void> Function()? onRefresh;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final list = ListView(
      padding: BaghLayout.readablePadding(
        context,
        top: BaghSpace.gutter,
        bottom: BaghSpace.section * 2,
      ),
      children: [
        Text(intro, style: text.bodyMedium?.copyWith(color: c.ink2)),
        const SizedBox(height: BaghSpace.gutter),
        ...children,
      ],
    );
    return Scaffold(
      appBar: AppBar(leading: homeLeading(context), title: Text(title)),
      body: SafeArea(
        top: false,
        child: onRefresh == null
            ? list
            : RefreshIndicator(
                color: c.primary,
                onRefresh: onRefresh!,
                child: list,
              ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Plans and prices
// ---------------------------------------------------------------------------

final _subscriptionsProvider = FutureProvider.autoDispose.family<StaffRow, int>(
  (ref, page) => ref
      .read(apiClientProvider)
      .get(
        '/billing/admin/subscriptions',
        query: {'page': page, 'pageSize': 20},
        parse: (d) => (d as Map?)?.cast<String, Object?>() ?? const {},
      ),
);

/// Each paid level's monthly price, per item, in toman and USDT; then the
/// subscriptions, with a grant for a founding member or an account support
/// opened. Prices apply to future purchases only.
class StaffPlansScreen extends ConsumerStatefulWidget {
  const StaffPlansScreen({super.key});

  @override
  ConsumerState<StaffPlansScreen> createState() => _StaffPlansScreenState();
}

class _StaffPlansScreenState extends ConsumerState<StaffPlansScreen> {
  String _subject = 'USER';
  int _page = 1;

  /// One field per (item, tier, currency), made as the catalog arrives.
  final Map<String, TextEditingController> _prices = {};
  final Map<String, String> _seeded = {};
  bool _saving = false;
  (String, bool)? _message;

  @override
  void dispose() {
    for (final c in _prices.values) {
      c.dispose();
    }
    super.dispose();
  }

  String _key(String feature, String tier, String currency) =>
      '$feature|$tier|$currency';

  TextEditingController _field(String key, String? value) =>
      _prices.putIfAbsent(key, () {
        final seeded = key.endsWith('|irt')
            ? groupThousands(value ?? '')
            : (value ?? '');
        _seeded[key] = seeded;
        return TextEditingController(text: seeded);
      });

  bool get _dirty => _prices.entries.any((e) => e.value.text != _seeded[e.key]);

  Future<void> _save() async {
    final s = ref.read(stringsProvider);
    final updates = <Map<String, Object?>>[];
    final byLevel = <String, Map<String, Object?>>{};
    for (final MapEntry(:key, value: c) in _prices.entries) {
      if (c.text == _seeded[key]) continue;
      final [feature, tier, currency] = key.split('|');
      final level = byLevel.putIfAbsent(
        '$feature|$tier',
        () => {'featureKey': feature, 'tier': tier},
      );
      final raw = toLatinDigits(c.text.trim());
      if (currency == 'irt') {
        final digits = plainDigits(raw);
        level['priceIrt'] = digits.isEmpty ? null : digits;
      } else {
        level['priceUsdt'] = raw.isEmpty ? null : raw;
      }
    }
    updates.addAll(byLevel.values);
    if (updates.isEmpty || _saving) return;
    setState(() {
      _saving = true;
      _message = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .put<Object?>('/billing/admin/prices', body: {'updates': updates});
      await ref.read(hapticsProvider).success();
      for (final MapEntry(:key, value: c) in _prices.entries) {
        _seeded[key] = c.text;
      }
      ref.invalidate(planCatalogProvider);
      setState(() => _message = (s.plans.pricesSaved, true));
    } catch (e) {
      setState(() => _message = (describeError(s, e), false));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _cancel(String id) async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(apiClientProvider)
          .post<Object?>(
            '/billing/admin/subscriptions/${Uri.encodeComponent(id)}/cancel',
          );
      ref.invalidate(_subscriptionsProvider);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final catalog = ref.watch(planCatalogProvider);
    final subscriptions = ref.watch(_subscriptionsProvider(_page));
    final usdt = FilteringTextInputFormatter.allow(RegExp(r'[0-9۰-۹.]'));

    return LeaveGuard(
      isDirty: () => _dirty,
      busy: _saving,
      child: _Page(
        title: p.adminPlansTitle,
        intro: p.adminPlansIntro,
        onRefresh: () async {
          ref
            ..invalidate(planCatalogProvider)
            ..invalidate(_subscriptionsProvider);
          await ref.read(planCatalogProvider.future);
        },
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final subject in planSubjects)
                ChoiceChip(
                  label: Text(p.subjects.label(subject)),
                  selected: _subject == subject,
                  onSelected: (_) => setState(() => _subject = subject),
                ),
            ],
          ),
          const SizedBox(height: BaghSpace.gutter),
          AsyncView(
            value: catalog,
            onRetry: () => ref.invalidate(planCatalogProvider),
            data: (data) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: BaghSpace.gutter,
              children: [
                for (final feature in data.features.where(
                  (f) => f.subject == _subject,
                ))
                  _Card(
                    title: featureName(s, feature.key, feature.name),
                    children: [
                      for (final level in feature.levels)
                        if (level.tier != 'FREE')
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            spacing: 6,
                            children: [
                              Text(
                                '${p.tiers.label(level.tier)} · '
                                '${describeLimit(s, (kind: level.kind, limit: level.limit, liveDays: level.liveDays), language)}',
                                style: text.labelLarge,
                              ),
                              Row(
                                spacing: 10,
                                children: [
                                  Expanded(
                                    flex: 3,
                                    child: TextField(
                                      controller: _field(
                                        _key(feature.key, level.tier, 'irt'),
                                        level.priceIrt,
                                      ),
                                      keyboardType: TextInputType.number,
                                      textDirection: TextDirection.ltr,
                                      inputFormatters: const [
                                        ThousandsFormatter(),
                                      ],
                                      onChanged: (_) => setState(() {}),
                                      decoration: InputDecoration(
                                        labelText: p.priceIrt,
                                        isDense: true,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 2,
                                    child: TextField(
                                      controller: _field(
                                        _key(feature.key, level.tier, 'usdt'),
                                        level.priceUsdt,
                                      ),
                                      keyboardType:
                                          const TextInputType.numberWithOptions(
                                            decimal: true,
                                          ),
                                      textDirection: TextDirection.ltr,
                                      inputFormatters: [usdt],
                                      onChanged: (_) => setState(() {}),
                                      decoration: InputDecoration(
                                        labelText: p.priceUsdt,
                                        isDense: true,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                    ],
                  ),
                if (_message case (final msg, final ok))
                  FormMessage(msg, positive: ok),
                BaghKey(
                  label: p.savePrices,
                  icon: Icons.check_rounded,
                  loading: _saving,
                  expand: true,
                  onPressed: _dirty ? _save : null,
                ),
              ],
            ),
          ),
          const SizedBox(height: BaghSpace.section),
          _Card(
            title: p.subscriptionsTitle,
            trailing: TextButton.icon(
              onPressed: () async {
                final granted = await context.push<bool>('/staff/plans/grant');
                if (granted ?? false) ref.invalidate(_subscriptionsProvider);
              },
              icon: const Icon(Icons.card_giftcard_rounded, size: 18),
              label: Text(p.grantTitle),
            ),
            children: [
              AsyncView(
                value: subscriptions,
                onRetry: () => ref.invalidate(_subscriptionsProvider(_page)),
                isEmpty: (d) => _rows(d['items']).isEmpty,
                empty: p.noHistory,
                data: (d) {
                  final total = (d['total'] as num?)?.toInt() ?? 0;
                  final pages = (total / 20).ceil();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 12,
                    children: [
                      for (final sub in _rows(d['items']))
                        _SubscriptionRow(
                          row: sub,
                          language: language,
                          onCancel: () => _cancel('${sub['id']}'),
                        ),
                      if (pages > 1)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            IconButton(
                              onPressed: _page > 1
                                  ? () => setState(() => _page--)
                                  : null,
                              icon: const Icon(Icons.chevron_left_rounded),
                            ),
                            Text(
                              '${localDigits(_page, language)} / '
                              '${localDigits(pages, language)}',
                              style: text.bodySmall?.copyWith(color: c.ink2),
                            ),
                            IconButton(
                              onPressed: _page < pages
                                  ? () => setState(() => _page++)
                                  : null,
                              icon: const Icon(Icons.chevron_right_rounded),
                            ),
                          ],
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SubscriptionRow extends ConsumerWidget {
  const _SubscriptionRow({
    required this.row,
    required this.language,
    required this.onCancel,
  });

  final StaffRow row;
  final String language;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final status = '${row['status']}';
    final user = row['user'] is Map ? row['user']! as Map : null;
    final company = row['company'] is Map ? row['company']! as Map : null;
    final holder = company != null
        ? '${company['name']}'
        : user != null
        ? '${user['firstName']} ${user['lastName']}'.trim()
        : '';
    final tier = row['tier'] is String ? row['tier']! as String : null;
    final ends = DateTime.tryParse('${row['endsAt']}');
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 10,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 2,
            children: [
              Text(holder, style: text.bodyMedium),
              Text(
                [
                  '${row['code']}',
                  p.subjects.label('${row['subject']}'),
                  if (tier == null) p.custom else p.tiers.label(tier),
                  '${toman('${row['total'] ?? '0'}', language)} ${p.toman}',
                  p.sources.label('${row['source']}'),
                  if (ends != null)
                    p.activeUntil.fill({
                      'date': formatDate(ends.toLocal(), language),
                    }),
                ].join(' · '),
                style: text.bodySmall?.copyWith(color: c.ink2),
              ),
            ],
          ),
        ),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              StatusPill(
                p.statuses.label(status),
                tone: switch (status) {
                  'ACTIVE' => 0,
                  'PENDING_PAYMENT' => 1,
                  'CANCELLED' => 3,
                  _ => 2,
                },
              ),
              if (status == 'ACTIVE' || status == 'PENDING_PAYMENT')
                TextButton(
                  onPressed: () async {
                    final sure = await showDialog<bool>(
                      context: context,
                      builder: (dialog) => AlertDialog(
                        title: Text(p.cancelSubscription),
                        content: Text('${row['code']} · $holder'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.of(dialog).pop(false),
                            child: Text(s.common.close),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.of(dialog).pop(true),
                            child: Text(p.cancelSubscription),
                          ),
                        ],
                      ),
                    );
                    if (sure ?? false) onCancel();
                  },
                  child: Text(p.cancelSubscription),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// A whole plan, free and active at once, for a member or a company.
class StaffGrantScreen extends ConsumerStatefulWidget {
  const StaffGrantScreen({super.key});

  @override
  ConsumerState<StaffGrantScreen> createState() => _StaffGrantScreenState();
}

class _StaffGrantScreenState extends ConsumerState<StaffGrantScreen> {
  final _form = GlobalKey<FormState>();
  final _holder = TextEditingController();
  final _note = TextEditingController();
  String _subject = 'USER';
  String _tier = 'PRO';
  int _months = 1;
  bool _busy = false;
  bool _tried = false;
  String? _error;

  @override
  void dispose() {
    _holder.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _grant() async {
    final s = ref.read(stringsProvider);
    if (!_tried) setState(() => _tried = true);
    if (_busy || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .post<Object?>(
            '/billing/admin/grants',
            body: {
              'subject': _subject,
              'tier': _tier,
              'months': _months,
              if (_subject == 'COMPANY')
                'companyId': _holder.text.trim()
              else
                'userId': _holder.text.trim(),
              if (_note.text.trim().isNotEmpty) 'note': _note.text.trim(),
            },
          );
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.plans.granted)));
      context.pop(true);
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final language = ref.watch(l10nProvider).language;
    final periods =
        ref.watch(planCatalogProvider).value?.periods ??
        const <({int months, int discountPercent})>[];
    final months = {1, for (final period in periods) period.months}.toList()
      ..sort();

    return AccountPage(
      title: p.grantTitle,
      subtitle: p.grantHint,
      children: [
        Form(
          key: _form,
          autovalidateMode: _tried
              ? AutovalidateMode.always
              : AutovalidateMode.disabled,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 16,
            children: [
              DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: _subject,
                decoration: InputDecoration(labelText: p.holder),
                items: [
                  for (final subject in planSubjects)
                    DropdownMenuItem(
                      value: subject,
                      child: Text(p.subjects.label(subject)),
                    ),
                ],
                onChanged: (v) => setState(() => _subject = v ?? _subject),
              ),
              TextFormField(
                controller: _holder,
                textDirection: TextDirection.ltr,
                autocorrect: false,
                decoration: InputDecoration(
                  labelText: _subject == 'COMPANY'
                      ? p.grantCompanyId
                      : p.grantUserId,
                ),
                validator: Validators(s).required,
              ),
              DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: _tier,
                decoration: InputDecoration(labelText: p.wholeTier),
                items: [
                  for (final tier in planTiers)
                    if (tier != 'FREE')
                      DropdownMenuItem(
                        value: tier,
                        child: Text(p.tiers.label(tier)),
                      ),
                ],
                onChanged: (v) => setState(() => _tier = v ?? _tier),
              ),
              DropdownButtonFormField<int>(
                isExpanded: true,
                initialValue: months.contains(_months) ? _months : months.first,
                decoration: InputDecoration(labelText: p.months),
                items: [
                  for (final m in months)
                    DropdownMenuItem(
                      value: m,
                      child: Text(
                        p.monthsOption.fill({
                          'count': localDigits(m, language),
                        }),
                      ),
                    ),
                ],
                onChanged: (v) => setState(() => _months = v ?? _months),
              ),
              TextFormField(
                controller: _note,
                maxLength: 500,
                minLines: 2,
                maxLines: 4,
                decoration: InputDecoration(labelText: p.note),
              ),
            ],
          ),
        ),
        if (_error != null) FormMessage(_error!),
        BaghKey(
          label: p.grant,
          icon: Icons.card_giftcard_rounded,
          loading: _busy,
          expand: true,
          onPressed: _grant,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Accounts opened by support
// ---------------------------------------------------------------------------

final _accountsProvider = FutureProvider.autoDispose.family<StaffRow, int>(
  (ref, page) => ref
      .read(apiClientProvider)
      .get(
        '/billing/admin/accounts',
        query: {'page': page, 'pageSize': 20},
        parse: (d) => (d as Map?)?.cast<String, Object?>() ?? const {},
      ),
);

class StaffAccountsScreen extends ConsumerWidget {
  const StaffAccountsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final accounts = ref.watch(_accountsProvider(1));

    return _Page(
      title: p.adminAccountsTitle,
      intro: p.adminAccountsIntro,
      onRefresh: () => ref.refresh(_accountsProvider(1).future),
      children: [
        BaghKey(
          label: p.newCompanyAccount,
          icon: Icons.add_business_outlined,
          expand: true,
          onPressed: () async {
            final made = await context.push<bool>('/staff/accounts/company');
            if (made ?? false) ref.invalidate(_accountsProvider);
          },
        ),
        const SizedBox(height: BaghSpace.gutter),
        SoftSurface(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: AsyncView(
            value: accounts,
            onRetry: () => ref.invalidate(_accountsProvider(1)),
            isEmpty: (d) => _rows(d['items']).isEmpty,
            empty: p.noAccounts,
            data: (d) => Column(
              children: [
                for (final a in _rows(d['items']))
                  ListTile(
                    leading: Icon(
                      a['accountKind'] == 'COMPANY'
                          ? Icons.apartment_rounded
                          : Icons.person_outline_rounded,
                    ),
                    title: Text(
                      a['company'] is Map
                          ? '${(a['company']! as Map)['name']}'
                          : '${a['firstName']} ${a['lastName']}'.trim(),
                    ),
                    subtitle: Text(
                      [
                        if (a['username'] is String) '@${a['username']}',
                        '${a['email']}',
                        if (DateTime.tryParse('${a['staffVouchedAt']}')
                            case final at?)
                          '${p.vouchedAt} ${formatDate(at.toLocal(), language)}',
                      ].join(' · '),
                      style: text.bodySmall?.copyWith(color: c.ink2),
                    ),
                    onLongPress: () {
                      Clipboard.setData(ClipboardData(text: '${a['id']}'));
                      ScaffoldMessenger.of(
                        context,
                      ).showSnackBar(SnackBar(content: Text('${a['id']}')));
                    },
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// A company account and its company page, opened by the desk for a company
/// met in person: the representative's sign-in and the company's details.
class StaffCompanyAccountScreen extends ConsumerStatefulWidget {
  const StaffCompanyAccountScreen({super.key});

  @override
  ConsumerState<StaffCompanyAccountScreen> createState() =>
      _StaffCompanyAccountScreenState();
}

class _StaffCompanyAccountScreenState
    extends ConsumerState<StaffCompanyAccountScreen> {
  final _form = GlobalKey<FormState>();
  final _company = TextEditingController();
  final _nationalId = TextEditingController();
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _email = TextEditingController();
  final _username = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _tried = false;
  String? _error;
  Map<String, String> _fieldErrors = const {};

  List<TextEditingController> get _all => [
    _company,
    _nationalId,
    _first,
    _last,
    _email,
    _username,
    _phone,
    _password,
  ];

  @override
  void dispose() {
    for (final c in _all) {
      c.dispose();
    }
    super.dispose();
  }

  String? Function(String?) _check(
    String field,
    String? Function(String?) rule,
  ) =>
      (v) => rule(v) ?? _fieldErrors[field];

  Future<void> _create() async {
    final s = ref.read(stringsProvider);
    setState(() => _fieldErrors = const {});
    if (!_tried) setState(() => _tried = true);
    if (_busy || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .post<Object?>(
            '/billing/admin/accounts/company',
            body: {
              'companyName': _company.text.trim(),
              'nationalId': toLatinDigits(_nationalId.text.trim()),
              'account': {
                'firstName': _first.text.trim(),
                'lastName': _last.text.trim(),
                'email': _email.text.trim(),
                'password': _password.text,
                if (_username.text.trim().isNotEmpty)
                  'username': _username.text.trim(),
                if (_phone.text.trim().isNotEmpty)
                  'phone': toLatinDigits(_phone.text.trim()),
              },
            },
          );
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.plans.accountCreated)));
      context.pop(true);
    } catch (e) {
      setState(() {
        _fieldErrors = {
          for (final MapEntry(:key, :value) in ApiException.from(
            e,
          ).fieldErrors.entries)
            key.replaceFirst('account.', ''): value,
        };
        _error = describeError(s, e);
      });
      _form.currentState!.validate();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final p = s.plans;
    final v = Validators(s);
    final text = Theme.of(context).textTheme;

    return LeaveGuard(
      isDirty: () => _all.any((c) => c.text.isNotEmpty),
      busy: _busy,
      child: AccountPage(
        title: p.newCompanyAccount,
        subtitle: p.adminAccountsIntro,
        children: [
          Form(
            key: _form,
            autovalidateMode: _tried
                ? AutovalidateMode.always
                : AutovalidateMode.disabled,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 16,
              children: [
                TextFormField(
                  controller: _company,
                  decoration: InputDecoration(labelText: p.companyName),
                  validator: _check('companyName', v.required),
                ),
                TextFormField(
                  controller: _nationalId,
                  keyboardType: TextInputType.number,
                  textDirection: TextDirection.ltr,
                  maxLength: 11,
                  decoration: InputDecoration(
                    labelText: p.companyNationalId,
                    helperText: p.companyNationalIdHint,
                    counterText: '',
                  ),
                  validator: _check(
                    'nationalId',
                    (x) =>
                        RegExp(
                          r'^\d{11}$',
                        ).hasMatch(toLatinDigits((x ?? '').trim()))
                        ? null
                        : p.companyNationalIdHint,
                  ),
                ),
                Text(p.operator, style: text.titleSmall),
                TextFormField(
                  controller: _first,
                  decoration: InputDecoration(labelText: p.firstName),
                  validator: _check('firstName', v.required),
                ),
                TextFormField(
                  controller: _last,
                  decoration: InputDecoration(labelText: p.lastName),
                  validator: _check('lastName', v.required),
                ),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  textDirection: TextDirection.ltr,
                  autocorrect: false,
                  decoration: InputDecoration(labelText: p.email),
                  validator: _check('email', v.email),
                ),
                TextFormField(
                  controller: _username,
                  textDirection: TextDirection.ltr,
                  autocorrect: false,
                  enableSuggestions: false,
                  decoration: InputDecoration(labelText: p.username),
                  validator: _check('username', (x) {
                    final t = (x ?? '').trim().toLowerCase();
                    return t.isEmpty ||
                            RegExp(r'^[a-z0-9][a-z0-9._-]{2,29}$').hasMatch(t)
                        ? null
                        : s.mobile.fieldRules.required;
                  }),
                ),
                TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  textDirection: TextDirection.ltr,
                  decoration: InputDecoration(
                    labelText: p.phone,
                    hintText: '09xxxxxxxxx',
                  ),
                  validator: _check('phone', (_) => null),
                ),
                PasswordField(
                  controller: _password,
                  label: p.password,
                  helper: s.auth.passwordHint,
                  newPassword: true,
                  validator: _check('password', v.password),
                ),
              ],
            ),
          ),
          if (_error != null) FormMessage(_error!),
          BaghKey(
            label: p.createAccount,
            icon: Icons.check_rounded,
            loading: _busy,
            expand: true,
            onPressed: _create,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// SMS costs
// ---------------------------------------------------------------------------

final _smsReportProvider = FutureProvider.autoDispose.family<StaffRow, int>(
  (ref, days) => ref
      .read(apiClientProvider)
      .get(
        '/billing/admin/sms',
        query: {'days': days},
        parse: (d) => (d as Map?)?.cast<String, Object?>() ?? const {},
      ),
);

/// What texts have cost, per kind, and the latest sends. Recipients'
/// numbers are not stored, so none are shown.
class StaffSmsScreen extends ConsumerStatefulWidget {
  const StaffSmsScreen({super.key});

  @override
  ConsumerState<StaffSmsScreen> createState() => _StaffSmsScreenState();
}

class _StaffSmsScreenState extends ConsumerState<StaffSmsScreen> {
  int _days = 30;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final m = s.sms;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final report = ref.watch(_smsReportProvider(_days));
    String n(Object v) => localDigits(v, language);
    String rials(Object? v) =>
        groupedNumber('${v is num ? v.round() : 0}', language);

    return _Page(
      title: m.adminTitle,
      intro: m.adminIntro,
      onRefresh: () => ref.refresh(_smsReportProvider(_days).future),
      children: [
        Wrap(
          spacing: 8,
          children: [
            for (final days in const [7, 30, 90])
              ChoiceChip(
                label: Text(n(days)),
                selected: _days == days,
                onSelected: (_) => setState(() => _days = days),
              ),
          ],
        ),
        const SizedBox(height: BaghSpace.gutter),
        AsyncView(
          value: report,
          onRetry: () => ref.invalidate(_smsReportProvider(_days)),
          data: (r) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: BaghSpace.gutter,
            children: [
              _Card(
                title: m.totalCost.fill({
                  'days': n(_days),
                  'amount': rials(r['totalCostRials']),
                }),
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      StatusPill('${m.provider}: ${r['provider']}'),
                      StatusPill(
                        r['canSend'] == true ? m.canSendYes : m.canSendNo,
                        tone: r['canSend'] == true ? 0 : 3,
                      ),
                      StatusPill(
                        r['memberAlerts'] == true
                            ? m.memberAlertsOn
                            : m.memberAlertsOff,
                        tone: 1,
                      ),
                      StatusPill(
                        m.dailyCap.fill({'count': n(r['dailyCap'] ?? 0)}),
                      ),
                    ],
                  ),
                ],
              ),
              _Card(
                title: m.kind,
                children: [
                  for (final k in _rows(r['kinds']))
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      spacing: 2,
                      children: [
                        Row(
                          spacing: 8,
                          children: [
                            Expanded(
                              child: Text(
                                L10nMap(m.kinds.raw).label('${k['kind']}'),
                                style: text.bodyMedium,
                              ),
                            ),
                            Flexible(
                              child: Text(
                                '${rials(k['costRials'])} ${m.costRials}',
                                textAlign: TextAlign.end,
                                style: text.labelLarge,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          [
                            '${k['template']}',
                            '${m.sent}: ${n(k['sent'] ?? 0)}',
                            '${m.failed}: ${n(k['failed'] ?? 0)}',
                            '${m.skipped}: ${n(k['skipped'] ?? 0)}',
                          ].join(' · '),
                          style: text.bodySmall?.copyWith(color: c.ink2),
                        ),
                      ],
                    ),
                ],
              ),
              _Card(
                title: m.recent,
                children: [
                  if (_rows(r['recent']).isEmpty)
                    Text(
                      s.common.noResults,
                      style: text.bodyMedium?.copyWith(color: c.ink2),
                    ),
                  for (final x in _rows(r['recent']))
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 10,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: 2,
                            children: [
                              Text(
                                L10nMap(m.kinds.raw).label('${x['kind']}'),
                                style: text.bodyMedium,
                              ),
                              Text(
                                [
                                  if (DateTime.tryParse('${x['createdAt']}')
                                      case final at?)
                                    '${formatDate(at.toLocal(), language)} '
                                        '${formatTime(at, language)}',
                                  if (x['cost'] is num)
                                    '${rials(x['cost'])} ${m.costRials}',
                                  if (x['reason'] is String) '${x['reason']}',
                                ].join(' · '),
                                style: text.bodySmall?.copyWith(color: c.ink2),
                              ),
                            ],
                          ),
                        ),
                        Flexible(
                          child: StatusPill(
                            m.statuses.label('${x['status']}'),
                            tone: switch ('${x['status']}') {
                              'SENT' => 0,
                              'FAILED' => 3,
                              _ => 2,
                            },
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
