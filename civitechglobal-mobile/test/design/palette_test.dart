import 'dart:math' as math;

import 'package:civitech_global_flutter/design/palette.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// WCAG 2.x relative luminance and contrast ratio.
double _luminance(Color c) {
  double channel(double v) =>
      v <= 0.04045 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

double contrast(Color a, Color b) {
  final x = _luminance(a), y = _luminance(b);
  return (math.max(x, y) + 0.05) / (math.min(x, y) + 0.05);
}

/// Every palette, in both themes, keeps the contrast the plan promised.
///
/// A palette is easy to make prettier and quietly less readable; this is the
/// test that notices. The thresholds are WCAG 2.2 AA: 4.5:1 for text, 3:1
/// for the edges of controls and for the primary against the ground.
void main() {
  for (final palette in GardenPalette.values) {
    for (final brightness in Brightness.values) {
      final c = BaghColors.resolve(palette, brightness);
      group('${palette.name} ${brightness.name}', () {
        test('text reads on the ground and on surfaces', () {
          expect(contrast(c.ink, c.ground), greaterThanOrEqualTo(4.5));
          expect(contrast(c.ink, c.surface), greaterThanOrEqualTo(4.5));
          expect(contrast(c.ink2, c.surface), greaterThanOrEqualTo(4.5));
        });

        test('controls have a visible boundary', () {
          expect(contrast(c.edge, c.ground), greaterThanOrEqualTo(3));
          expect(contrast(c.edge, c.surface), greaterThanOrEqualTo(3));
          expect(contrast(c.primary, c.ground), greaterThanOrEqualTo(3));
        });

        test('labels read on the primary, the accent and the error colour', () {
          expect(contrast(c.onPrimary, c.primary), greaterThanOrEqualTo(4.5));
          expect(contrast(c.onAccent, c.accent), greaterThanOrEqualTo(4.5));
          expect(contrast(c.onError, c.error), greaterThanOrEqualTo(4.5));
        });

        test('every garden tint carries its ink', () {
          expect(c.tints, hasLength(5));
          for (final tint in c.tints) {
            expect(contrast(tint.ink, tint.fill), greaterThanOrEqualTo(4.5));
          }
        });
      });
    }
  }

  test('an unknown saved palette falls back to the default, B', () {
    expect(GardenPalette.parse('nonsense'), GardenPalette.pistachio);
    expect(GardenPalette.parse(null), GardenPalette.pistachio);
    expect(GardenPalette.parse('lapis'), GardenPalette.lapis);
  });
}
