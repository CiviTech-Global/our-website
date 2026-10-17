import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/capabilities.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/glass_pane.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../start/modules.dart';

/// Every marketplace in one place, each in its own garden tint. Modules whose
/// server switch is off are not shown, exactly as on the web.
class ExploreScreen extends ConsumerWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final caps = ref.watch(capabilitiesProvider).value ?? const Capabilities();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final modules = visibleModules(exploreModules, caps);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            title: Text(s.mobile.exploreTitle),
            backgroundColor: c.glass ? Colors.transparent : c.ground,
            surfaceTintColor: Colors.transparent,
            // Cards scroll under the pinned title: in the glass style it is
            // frosted, so they blur away beneath it instead of colliding.
            flexibleSpace: c.glass
                ? const GlassPane(
                    shape: RoundedRectangleBorder(),
                    child: SizedBox.expand(),
                  )
                : null,
          ),
          SliverPadding(
            padding: BaghLayout.readablePadding(context),
            sliver: SliverToBoxAdapter(
              child: Text(
                s.mobile.exploreSubtitle,
                style: text.bodyLarge?.copyWith(color: c.ink2),
              ),
            ),
          ),
          SliverPadding(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: 120,
            ),
            // Two columns on a phone, more on a tablet; each tile as tall as
            // its icon and a two-line label need at the reader's text size.
            sliver: SliverGrid(
              gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 240,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                mainAxisExtent: BaghLayout.tileHeight(context) + 24,
              ),
              delegate: SliverChildListDelegate([
                for (final module in modules)
                  SoftSurface(
                    tint: moduleTint(c, module.tint),
                    semanticLabel: module.label(s),
                    onTap: () => showModuleSoon(context, module),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Icon(module.icon, size: 30),
                        Text(
                          module.label(s),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: BaghType.weight(
                            text.titleSmall!,
                            750,
                          ).copyWith(color: moduleTint(c, module.tint).ink),
                        ),
                      ],
                    ),
                  ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}
