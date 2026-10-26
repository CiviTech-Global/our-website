import 'package:flutter/material.dart';

import '../palette.dart';
import '../tokens.dart';
import 'glass_pane.dart';

/// Every sheet in the app opens through here.
///
/// On the root navigator, so a sheet always covers the tab bar instead of
/// opening underneath it. In the glass style the sheet is a frosted pane
/// with its own drag handle; otherwise it is the theme's plaster sheet.
///
/// Pass `framed: false` when the builder frames itself, as a draggable sheet
/// must (its frame has to be inside the drag, see [SheetFrame]).
Future<T?> showBaghSheet<T>(
  BuildContext context, {
  required WidgetBuilder builder,
  bool isScrollControlled = false,
  bool useSafeArea = false,
  bool framed = true,
}) => showModalBottomSheet<T>(
  context: context,
  useRootNavigator: true,
  isScrollControlled: isScrollControlled,
  useSafeArea: useSafeArea,
  // Clear of the system navigation bar: a sheet's last key sat under the
  // gesture bar on a phone with one.
  builder: (context) => SafeArea(
    top: false,
    child: framed ? SheetFrame(child: builder(context)) : builder(context),
  ),
);

/// A sheet's surface: frosted glass with a handle in the glass style, the
/// child unchanged otherwise (the theme already draws the plaster sheet).
class SheetFrame extends StatelessWidget {
  const SheetFrame({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    if (!c.glass) return child;
    return GlassPane(
      opacity: 1.35,
      shape: const RoundedSuperellipseBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(BaghRadius.sheet),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 14),
              width: 36,
              height: 4,
              decoration: ShapeDecoration(
                color: c.edge,
                shape: const StadiumBorder(),
              ),
            ),
          ),
          Flexible(child: child),
        ],
      ),
    );
  }
}
