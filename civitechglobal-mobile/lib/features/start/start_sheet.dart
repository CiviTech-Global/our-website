import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/capabilities.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import 'modules.dart';

/// The sheet behind the centre "+" key: everything one can start, as tinted
/// tiles, in the order people most often need them.
Future<void> showStartSheet(BuildContext context) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  builder: (context) => const _StartSheet(),
);

class _StartSheet extends ConsumerWidget {
  const _StartSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final caps = ref.watch(capabilitiesProvider).value ?? const Capabilities();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final actions = visibleModules(startActions, caps);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          BaghSpace.gutter,
          0,
          BaghSpace.gutter,
          BaghSpace.gutter,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(s.mobile.startTitle, style: text.titleLarge),
            const SizedBox(height: BaghSpace.gutter),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.7,
              children: [
                for (final action in actions)
                  SoftSurface(
                    tint: moduleTint(c, action.tint),
                    radius: BaghRadius.tile,
                    semanticLabel: action.label(s),
                    padding: const EdgeInsets.all(14),
                    onTap: () {
                      // The navigator outlives this sheet; its context
                      // opens the next one.
                      final navigator = Navigator.of(context)..pop();
                      showModuleSoon(navigator.context, action);
                    },
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Icon(action.icon, size: 26),
                        Text(
                          action.label(s),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: BaghType.weight(
                            text.labelLarge!,
                            700,
                          ).copyWith(color: moduleTint(c, action.tint).ink),
                        ),
                      ],
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
