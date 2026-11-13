import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/session.dart';
import '../../core/capabilities.dart';
import '../../l10n/l10n.dart';
import '../market/market_data.dart';

/// Who a new job or project is posted as: the member, or one of their open,
/// approved shops (`postAsBusinessId`). It decides which plan the posting
/// counts against. Drawn only for a person with such a shop; a company
/// account always posts as its company.
class PostAsPicker extends ConsumerWidget {
  const PostAsPicker({required this.value, required this.onChanged, super.key});

  /// The shop's id, or null for the member.
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final company = ref.watch(
      sessionProvider.select((u) => u.value?.isCompany ?? false),
    );
    final market =
        ref.watch(capabilitiesProvider).value?.feature('tradeMaster') ?? false;
    if (company || !market) return const SizedBox.shrink();
    final shops = [
      for (final shop in ref.watch(ownShopsProvider).value ?? const <OwnShop>[])
        if (shop.moderationStatus == 'APPROVED' && shop.state == 'OPEN') shop,
    ];
    if (shops.isEmpty) return const SizedBox.shrink();
    return DropdownButtonFormField<String?>(
      initialValue: shops.any((shop) => shop.id == value) ? value : null,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: s.plans.postAs,
        helperText: s.plans.postAsHint,
        helperMaxLines: 3,
      ),
      items: [
        DropdownMenuItem(value: null, child: Text(s.plans.postAsMe)),
        for (final shop in shops)
          DropdownMenuItem(value: shop.id, child: Text(shop.name)),
      ],
      onChanged: onChanged,
    );
  }
}

/// [payload] with the shop it is posted as, when one was chosen.
Map<String, Object?> postedAs(Map<String, Object?> payload, String? shopId) =>
    shopId == null ? payload : {...payload, 'postAsBusinessId': shopId};
