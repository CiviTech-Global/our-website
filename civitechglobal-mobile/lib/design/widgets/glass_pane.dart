import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../palette.dart';

/// Frosted glass for what floats: the navigation bar, sheets.
///
/// A real backdrop blur, which is the expensive part of glassmorphism, so it
/// is kept to the chrome: two or three panes on screen at most. Cards in a
/// scrolling list are glass without blur (see SoftSurface), which reads the
/// same over the aurora at a fraction of the cost on a low-end phone.
///
/// In the other styles, or when the system asks for high contrast (blur is
/// the first thing that hurts legibility), it is a plain opaque surface.
class GlassPane extends StatelessWidget {
  const GlassPane({
    required this.child,
    required this.shape,
    this.opacity = 1,
    super.key,
  });

  final Widget child;
  final ShapeBorder shape;

  /// How much of the pane's fill to use; chrome over busy content wants a
  /// little more than a card does.
  final double opacity;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final highContrast = MediaQuery.highContrastOf(context);
    if (!c.glass || highContrast) {
      return DecoratedBox(
        decoration: ShapeDecoration(
          color: c.surface,
          shape: highContrast && shape is OutlinedBorder
              ? (shape as OutlinedBorder).copyWith(
                  side: BorderSide(color: c.edge, width: 1.5),
                )
              : shape,
        ),
        child: child,
      );
    }
    final fill = c.pane.withValues(
      alpha: (c.pane.a * opacity * (c.isDark ? 1.6 : 1.15)).clamp(0, 0.92),
    );
    return ClipPath(
      clipper: ShapeBorderClipper(shape: shape),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 22, sigmaY: 22),
        child: DecoratedBox(
          decoration: ShapeDecoration(
            color: fill,
            shape: shape is OutlinedBorder
                ? (shape as OutlinedBorder).copyWith(
                    side: BorderSide(color: c.rim),
                  )
                : shape,
          ),
          child: child,
        ),
      ),
    );
  }
}
