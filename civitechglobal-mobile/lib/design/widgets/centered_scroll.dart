import 'package:flutter/material.dart';

import '../tokens.dart';

/// Content centred on the screen that still scrolls when it does not fit.
///
/// A plain `Center(Column)` runs off the bottom in landscape or at large
/// text sizes, with nothing to reach the part that is cut off. Here the
/// content is centred while it fits and scrolls once it does not, and never
/// grows wider than a comfortable reading column.
class CenteredScroll extends StatelessWidget {
  const CenteredScroll({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) => SingleChildScrollView(
      padding: const EdgeInsets.all(BaghSpace.section),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minHeight: (constraints.maxHeight - BaghSpace.section * 2).clamp(
            0,
            double.infinity,
          ),
        ),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: BaghLayout.readable),
            child: child,
          ),
        ),
      ),
    ),
  );
}
