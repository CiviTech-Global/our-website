import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../motion.dart';
import '../palette.dart';

/// The glass style's ground: soft fields of colour drifting very slowly
/// behind the page, which is what the glass panes have to show through.
///
/// Three wide radial glows on the base colour, each tracing its own slow
/// ellipse (a full circuit takes minutes), so the page feels lit and alive
/// without anything a reader would call movement. With reduced motion the
/// fields hold still. One pass of radial gradients and no blur, so it costs
/// almost nothing to draw, and only the top page draws it: the pages below
/// an opaque route are not painted.
class AuroraBackground extends ConsumerStatefulWidget {
  const AuroraBackground({this.child, super.key});

  final Widget? child;

  @override
  ConsumerState<AuroraBackground> createState() => _AuroraBackgroundState();
}

class _AuroraBackgroundState extends ConsumerState<AuroraBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _drift = AnimationController(
    vsync: this,
    duration: const Duration(minutes: 3),
  );

  void _sync(bool reduce) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (reduce) {
        _drift.stop();
      } else if (!_drift.isAnimating) {
        _drift.repeat();
      }
    });
  }

  @override
  void dispose() {
    _drift.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    _sync(reduceMotion(context, ref));
    return Stack(
      fit: StackFit.expand,
      children: [
        RepaintBoundary(
          child: AnimatedBuilder(
            animation: _drift,
            builder: (context, _) => CustomPaint(
              painter: _AuroraPainter(c, _drift.value * 2 * math.pi),
            ),
          ),
        ),
        ?widget.child,
      ],
    );
  }
}

class _AuroraPainter extends CustomPainter {
  _AuroraPainter(this.c, this.phase);

  final BaghColors c;
  final double phase;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = c.ground);
    if (c.aurora.isEmpty) return;
    // Where each field rests, and how far it wanders, as fractions of the
    // screen: one high on the start side, one low on the end side, one
    // across the middle.
    const anchors = [Offset(0.15, 0.12), Offset(0.9, 0.55), Offset(0.35, 0.92)];
    const reach = [Offset(0.08, 0.05), Offset(0.06, 0.08), Offset(0.1, 0.04)];
    final radius = size.longestSide * 0.62;
    for (var i = 0; i < c.aurora.length && i < anchors.length; i++) {
      final angle = phase + i * 2.1;
      final centre = Offset(
        (anchors[i].dx + reach[i].dx * math.cos(angle)) * size.width,
        (anchors[i].dy + reach[i].dy * math.sin(angle * 1.3)) * size.height,
      );
      final color = c.aurora[i];
      canvas.drawCircle(
        centre,
        radius,
        Paint()
          ..shader = ui.Gradient.radial(centre, radius, [
            color.withValues(alpha: c.isDark ? 0.95 : 0.85),
            color.withValues(alpha: 0),
          ]),
      );
    }
  }

  @override
  bool shouldRepaint(_AuroraPainter old) => old.phase != phase || old.c != c;
}
