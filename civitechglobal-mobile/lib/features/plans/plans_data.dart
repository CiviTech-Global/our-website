import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../l10n/l10n.dart';

/// Plans and limits, as the web's api/billing.ts: the price list
/// (`GET /billing/plans`) and the account's own plans and usage
/// (`GET /billing/me`). Buying stays on the website.

const planSubjects = ['USER', 'BUSINESS', 'COMPANY'];
const planTiers = ['FREE', 'PRO', 'PREMIUM', 'VIP'];

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;
int? _int(Object? v) => v is num ? v.toInt() : null;
DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;
List<Map<Object?, Object?>> _maps(Object? v) =>
    v is List ? v.whereType<Map<Object?, Object?>>().toList() : const [];

/// One tier of one item: its limit, how the limit counts, and its price.
typedef PlanLevel = ({
  String tier,

  /// STOCK (live at once), MONTHLY, or LIFETIME (the first one only).
  String kind,

  /// Null is unlimited.
  int? limit,
  int? liveDays,
  String? priceIrt,
  String? priceUsdt,
});

PlanLevel _level(Map<Object?, Object?> m) => (
  tier: '${m['tier']}',
  kind: '${m['kind']}',
  limit: _int(m['limit']),
  liveDays: _int(m['liveDays']),
  priceIrt: _text(m['priceIrt']),
  priceUsdt: _text(m['priceUsdt']),
);

typedef PlanFeature = ({
  String key,
  String subject,
  String name,
  List<PlanLevel> levels,
});

typedef TierTotal = ({String tier, String? monthlyIrt, String? monthlyUsdt});

typedef PlanCatalog = ({
  List<PlanFeature> features,
  Map<String, List<TierTotal>> tiers,

  /// The lengths a plan is sold for, in months, with their discounts.
  List<({int months, int discountPercent})> periods,
});

PlanCatalog _catalog(Object? d) {
  final m = (d as Map?) ?? const {};
  final tiers = m['tiers'];
  return (
    features: [
      for (final f in _maps(m['features']))
        (
          key: '${f['key']}',
          subject: '${f['subject']}',
          name: '${f['name'] ?? f['key']}',
          levels: [for (final l in _maps(f['levels'])) _level(l)],
        ),
    ],
    tiers: {
      if (tiers is Map)
        for (final MapEntry(:key, :value) in tiers.entries)
          '$key': [
            for (final t in _maps(value))
              (
                tier: '${t['tier']}',
                monthlyIrt: _text(t['monthlyIrt']),
                monthlyUsdt: _text(t['monthlyUsdt']),
              ),
          ],
    },
    periods: [
      for (final p in _maps(m['periods']))
        (
          months: _int(p['months']) ?? 1,
          discountPercent: _int(p['discountPercent']) ?? 0,
        ),
    ],
  );
}

final planCatalogProvider = FutureProvider.autoDispose<PlanCatalog>(
  (ref) => ref.read(apiClientProvider).get('/billing/plans', parse: _catalog),
);

/// An item of the account's plan and how much of it is used.
typedef FeatureUsage = ({
  String featureKey,
  String name,
  String tier,
  String kind,
  int? limit,
  int? liveDays,
  int used,
});

typedef Subscription = ({
  String code,
  String subject,
  String status,
  String source,
  String? tier,
  int months,
  DateTime? endsAt,
  String total,
  DateTime? createdAt,
});

Subscription _subscription(Map<Object?, Object?> m) => (
  code: '${m['code']}',
  subject: '${m['subject']}',
  status: '${m['status']}',
  source: '${m['source']}',
  tier: _text(m['tier']),
  months: _int(m['months']) ?? 1,
  endsAt: _date(m['endsAt']),
  total: '${m['total'] ?? '0'}',
  createdAt: _date(m['createdAt']),
);

typedef SubjectPlan = ({
  String subject,
  List<FeatureUsage> usage,
  List<Subscription> active,
});

typedef OwnBilling = ({
  /// Off while limits are only measured: nothing is refused yet.
  bool enforced,
  String? companyName,
  List<SubjectPlan> plans,
  List<Subscription> history,
});

OwnBilling _ownBilling(Object? d) {
  final m = (d as Map?) ?? const {};
  final company = m['company'];
  return (
    enforced: m['enforced'] == true,
    companyName: company is Map ? _text(company['name']) : null,
    plans: [
      for (final p in _maps(m['plans']))
        (
          subject: '${p['subject']}',
          usage: [
            for (final u in _maps(p['usage']))
              (
                featureKey: '${u['featureKey']}',
                name: '${u['name'] ?? u['featureKey']}',
                tier: '${u['tier']}',
                kind: '${u['kind']}',
                limit: _int(u['limit']),
                liveDays: _int(u['liveDays']),
                used: _int(u['used']) ?? 0,
              ),
          ],
          active: [for (final s in _maps(p['active'])) _subscription(s)],
        ),
    ],
    history: [for (final s in _maps(m['history'])) _subscription(s)],
  );
}

final ownBillingProvider = FutureProvider.autoDispose<OwnBilling?>((ref) async {
  final signedIn = ref.watch(
    sessionProvider.select((s) => s.value?.id != null),
  );
  if (!signedIn) return null;
  return ref.read(apiClientProvider).get('/billing/me', parse: _ownBilling);
});

/// The dictionary's name for an item, else the server's.
String featureName(Strings s, String key, String fallback) =>
    s.plans.features[key.replaceAll('.', '_')] ?? fallback;

/// "20 a month", "10 live at once", "first one only · shown for 45 days".
String describeLimit(
  Strings s,
  ({String kind, int? limit, int? liveDays}) level,
  String language,
) {
  final p = s.plans;
  if (level.limit == null) return p.unlimited;
  if (level.kind == 'LIFETIME') {
    final days = level.liveDays;
    return days == null
        ? p.kinds.label('LIFETIME')
        : '${p.kinds.label('LIFETIME')} · '
              '${p.liveDays.fill({'days': localDigits(days, language)})}';
  }
  return '${localDigits(level.limit!, language)} ${p.kinds.label(level.kind)}';
}

/// A whole toman amount, grouped the reader's way.
String toman(String? value, String language) =>
    groupedNumber(value ?? '0', language).ifEmpty(localDigits(0, language));

extension on String {
  String ifEmpty(String other) => isEmpty ? other : this;
}
