import 'package:flutter/material.dart';

import 'palette.dart';

/// Shape: a small set, so radii never drift screen to screen.
abstract final class BaghRadius {
  static const field = 16.0;
  static const card = 24.0;
  static const sheet = 32.0;
  static const tile = 18.0;

  /// Continuous (superellipse) corners: softer than circular arcs at the same
  /// radius, which is most of what makes a surface read as "soft".
  static RoundedSuperellipseBorder shape([double radius = card]) =>
      RoundedSuperellipseBorder(borderRadius: BorderRadius.circular(radius));
}

/// The 8px module, and the two gutters every screen uses.
abstract final class BaghSpace {
  static const unit = 8.0;
  static const gutter = 16.0;
  static const section = 24.0;
}

/// Layout that adapts to the screen.
abstract final class BaghLayout {
  /// The widest a column of reading or form content grows: about 70
  /// characters of Persian body text. Phones never reach it; tablets and
  /// landscape phones centre the content instead of stretching lines across
  /// the whole screen.
  static const readable = 640.0;

  /// Padding that keeps a list's content within [readable], centred, with
  /// at least the gutter on each side.
  static EdgeInsets readablePadding(
    BuildContext context, {
    double top = 0,
    double bottom = 0,
  }) {
    final width = MediaQuery.sizeOf(context).width;
    final side = ((width - readable) / 2).clamp(
      BaghSpace.gutter,
      double.infinity,
    );
    return EdgeInsets.fromLTRB(side, top, side, bottom);
  }

  /// The height a tile needs for an icon and a two-line label at the
  /// reader's text size, so grids grow with the text instead of overflowing.
  static double tileHeight(
    BuildContext context, {
    double icon = 30,
    double padding = 16,
    double labelSize = 15,
  }) {
    final line = MediaQuery.textScalerOf(context).scale(labelSize) * 1.5;
    return padding * 2 + icon + 10 + line * 2;
  }
}

/// Depth: one light, straight overhead. Every offset is on the vertical axis
/// only, so nothing has to be mirrored for right-to-left.
abstract final class BaghDepth {
  /// A card at rest: a short contact shadow and a long soft drop.
  static List<BoxShadow> rest(BaghColors c) => [
    BoxShadow(
      color: c.shadow.withValues(alpha: c.isDark ? 0.40 : 0.06),
      offset: const Offset(0, 1),
      blurRadius: 2,
    ),
    BoxShadow(
      color: c.shadow.withValues(alpha: c.isDark ? 0.55 : 0.16),
      offset: const Offset(0, 10),
      blurRadius: 24,
      spreadRadius: -12,
    ),
  ];

  /// What floats: sheets and the navigation bar.
  static List<BoxShadow> float(BaghColors c) => [
    BoxShadow(
      color: c.shadow.withValues(alpha: c.isDark ? 0.45 : 0.08),
      offset: const Offset(0, 2),
      blurRadius: 6,
    ),
    BoxShadow(
      color: c.shadow.withValues(alpha: c.isDark ? 0.70 : 0.24),
      offset: const Offset(0, 24),
      blurRadius: 48,
      spreadRadius: -16,
    ),
  ];

  /// The glass style's elevation: three soft layers (a wide ambient glow, a
  /// directional key shadow, a tight contact shadow), all straight down.
  ///
  /// [height] runs from 0 (resting on the ground) to 1 (a card) and beyond
  /// (2 for what floats). It is continuous, not a set of steps, so a press
  /// can carry a surface down along a spring and let it rise again: the
  /// "soft highs" of the style.
  static List<BoxShadow> lift(BaghColors c, double height) {
    final h = height.clamp(0.0, 2.5);
    final strength = c.isDark ? 1.8 : 1.0;
    return [
      BoxShadow(
        color: c.shadow.withValues(alpha: (0.05 * strength * h).clamp(0, 1)),
        offset: Offset(0, 2 * h),
        blurRadius: 4 * h,
      ),
      BoxShadow(
        color: c.shadow.withValues(alpha: (0.08 * strength * h).clamp(0, 1)),
        offset: Offset(0, 8 * h),
        blurRadius: 20 * h,
        spreadRadius: -4 * h,
      ),
      BoxShadow(
        color: c.shadow.withValues(alpha: (0.10 * strength * h).clamp(0, 1)),
        offset: Offset(0, 22 * h),
        blurRadius: 44 * h,
        spreadRadius: -14 * h,
      ),
    ];
  }

  /// The tile lip under a key: a flat, zero-blur ledge, as on the web.
  static BoxShadow lip(Color edge) =>
      BoxShadow(color: edge, offset: const Offset(0, 3));
}

/// Type, sized for Persian: a step larger than Latin defaults, tall line
/// heights for the dots, no letter-spacing ever, hierarchy from weight.
///
/// Weight is set twice on purpose. Vazirmatn is a variable font, and the
/// `wght` variation is what actually moves the outline; `fontWeight` is what
/// the rest of Flutter (semantics, fallbacks, bold-text accessibility) reads.
abstract final class BaghType {
  static const family = 'Vazirmatn';

  static TextStyle style(double size, double height, double weight) =>
      TextStyle(
        fontFamily: family,
        fontSize: size,
        height: height,
        letterSpacing: 0,
        fontWeight: _nearest(weight),
        fontVariations: [FontVariation('wght', weight)],
      );

  static FontWeight _nearest(double weight) =>
      FontWeight.values[((weight / 100).round() - 1).clamp(0, 8)];

  static TextTheme textTheme(BaghColors c) {
    TextStyle s(double size, double height, double weight, [Color? color]) =>
        style(size, height, weight).copyWith(color: color ?? c.ink);
    return TextTheme(
      displayLarge: s(40, 1.25, 850),
      displayMedium: s(34, 1.3, 850),
      displaySmall: s(30, 1.3, 800),
      headlineLarge: s(28, 1.35, 800),
      headlineMedium: s(26, 1.35, 800),
      headlineSmall: s(22, 1.4, 780),
      titleLarge: s(20, 1.45, 750),
      titleMedium: s(17, 1.5, 700),
      titleSmall: s(15, 1.5, 700),
      bodyLarge: s(16, 1.75, 400),
      bodyMedium: s(15, 1.75, 400),
      bodySmall: s(13, 1.6, 450, c.ink2),
      labelLarge: s(15, 1.5, 650),
      labelMedium: s(14, 1.5, 600),
      // 13 is the floor: below it, Persian loses its dots.
      labelSmall: s(13, 1.5, 550),
    );
  }

  /// The same style at another weight, moving the variable axis too.
  static TextStyle weight(TextStyle style, double weight) => style.copyWith(
    fontWeight: _nearest(weight),
    fontVariations: [FontVariation('wght', weight)],
  );
}

/// The tint a module wears everywhere it appears, so it is recognisable at a
/// glance: in Explore, on cards, in empty states.
GardenTint moduleTint(BaghColors c, int index) =>
    c.tints[index % c.tints.length];
