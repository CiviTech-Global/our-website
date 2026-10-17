import 'package:flutter/material.dart';

import '../palette.dart';
import '../tokens.dart';
import 'pressable.dart';

/// A soft surface: plaster one step lighter than the ground, lit from above.
///
/// Depth comes from tone first and the shadow second, so the card still reads
/// where shadows vanish (high-contrast mode adds a real edge instead, through
/// the theme). Content-only cards need no border; give [onTap] and it becomes
/// a [Pressable], which supplies the press, the haptic and the focus ring.
class SoftSurface extends StatelessWidget {
  const SoftSurface({
    required this.child,
    this.onTap,
    this.semanticLabel,
    this.padding = const EdgeInsets.all(BaghSpace.gutter),
    this.tint,
    this.radius = BaghRadius.card,
    this.elevated = true,
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final String? semanticLabel;
  final EdgeInsetsGeometry padding;

  /// A garden tint instead of the surface: flat, no shadow, its own ink.
  final GardenTint? tint;
  final double radius;
  final bool elevated;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final highContrast = MediaQuery.highContrastOf(context);

    Widget surface(double depth) {
      final fill = tint?.fill ?? c.surface;
      return DecoratedBox(
        decoration: ShapeDecoration(
          color: Color.lerp(fill, c.ink, 0.05 * depth),
          shape: RoundedSuperellipseBorder(
            borderRadius: BorderRadius.circular(radius),
            side: highContrast
                ? BorderSide(color: c.edge, width: 1.5)
                : BorderSide.none,
          ),
          shadows: elevated && tint == null && !highContrast && depth < 0.5
              ? BaghDepth.rest(c)
              : const [],
        ),
        child: Padding(
          padding: padding,
          child: tint == null
              ? child
              : DefaultTextStyle.merge(
                  style: TextStyle(color: tint!.ink),
                  child: IconTheme.merge(
                    data: IconThemeData(color: tint!.ink),
                    child: child,
                  ),
                ),
        ),
      );
    }

    if (onTap == null) return surface(0);
    return Pressable(
      onPressed: onTap,
      semanticLabel: semanticLabel,
      focusRadius: radius,
      builder: (context, depth) => surface(depth),
    );
  }
}
