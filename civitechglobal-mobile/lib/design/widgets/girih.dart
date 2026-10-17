import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../motion.dart';
import '../palette.dart';

/// The garden motif, drawn in code: the same plan as the web's HeroMotif.
///
/// A chahar bagh seen from above: a walled plot quartered by two water
/// channels, a star planted in each quarter, a ring of stars that turns very
/// slowly, and an octagonal pool at the crossing holding the logo. Drawn from
/// the theme's tokens, so it follows the palette and dark mode, and it stops
/// turning when motion is reduced.
///
/// The same pieces make the rest of the family: [GirihStar] for small marks,
/// [GirihSpinner] for loading.
class GardenMotif extends ConsumerStatefulWidget {
  const GardenMotif({this.size = 280, this.showLogo = true, super.key});

  final double size;
  final bool showLogo;

  @override
  ConsumerState<GardenMotif> createState() => _GardenMotifState();
}

class _GardenMotifState extends ConsumerState<GardenMotif>
    with SingleTickerProviderStateMixin {
  // One turn every 90 seconds: noticed, never watched.
  late final AnimationController _turn = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 90),
  );

  /// Turning or still, to match the motion setting; applied after the frame
  /// so the ticker is never started in the middle of a build.
  void _sync(bool reduce) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (reduce) {
        _turn.stop();
      } else if (!_turn.isAnimating) {
        _turn.repeat();
      }
    });
  }

  @override
  void dispose() {
    _turn.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _sync(reduceMotion(context, ref));
    final c = BaghColors.of(context);
    return SizedBox.square(
      dimension: widget.size,
      child: RepaintBoundary(
        child: Stack(
          alignment: Alignment.center,
          children: [
            Positioned.fill(
              child: AnimatedBuilder(
                animation: _turn,
                builder: (context, _) => CustomPaint(
                  painter: _GardenPainter(c, _turn.value * 2 * math.pi),
                ),
              ),
            ),
            if (widget.showLogo)
              SizedBox.square(
                dimension: widget.size * 0.45,
                child: SvgPicture.asset(
                  'assets/brand/logo.svg',
                  colorFilter: const ColorFilter.mode(
                    Color(0xFFFFFFFF),
                    BlendMode.srcIn,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// The web's star: five points, drawn on a 52-unit square around the origin.
Path _star() => Path()
  ..moveTo(0, -26)
  ..lineTo(7, -9)
  ..lineTo(26, -9)
  ..lineTo(11, 3)
  ..lineTo(16, 22)
  ..lineTo(0, 11)
  ..lineTo(-16, 22)
  ..lineTo(-11, 3)
  ..lineTo(-26, -9)
  ..lineTo(-7, -9)
  ..close();

Path _octagon(double radius) {
  final path = Path();
  for (var i = 0; i < 8; i++) {
    final angle = (22.5 + i * 45) * math.pi / 180;
    final point = Offset(
      200 + radius * math.cos(angle),
      200 + radius * math.sin(angle),
    );
    i == 0 ? path.moveTo(point.dx, point.dy) : path.lineTo(point.dx, point.dy);
  }
  return path..close();
}

class _GardenPainter extends CustomPainter {
  _GardenPainter(this.c, this.turn);

  final BaghColors c;
  final double turn;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 400);
    final star = _star();
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final fill = Paint();

    // The walled plot.
    final plot = RRect.fromRectAndRadius(
      const Rect.fromLTWH(12, 12, 376, 376),
      const Radius.circular(32),
    );
    canvas.drawRRect(plot, fill..color = c.surface);
    canvas.drawRRect(plot, stroke..color = c.edge);

    // Four planted quarters, a star in each outer corner.
    for (final corner in const [
      Offset(86, 86),
      Offset(314, 86),
      Offset(86, 314),
      Offset(314, 314),
    ]) {
      final quarter = RRect.fromRectAndRadius(
        Rect.fromLTWH(
          corner.dx < 200 ? 28 : 212,
          corner.dy < 200 ? 28 : 212,
          160,
          160,
        ),
        const Radius.circular(20),
      );
      canvas.drawRRect(quarter, fill..color = c.primarySoft.fill);
      canvas.drawRRect(
        quarter,
        stroke
          ..color = Color.lerp(c.primarySoft.fill, c.primary, 0.25)!
          ..strokeWidth = 1,
      );
      canvas
        ..save()
        ..translate(corner.dx, corner.dy);
      canvas.drawPath(
        star,
        stroke
          ..color = c.primary
          ..strokeWidth = 1.5,
      );
      canvas
        ..rotate(36 * math.pi / 180)
        ..scale(0.5);
      canvas.drawPath(star, fill..color = c.accent.withValues(alpha: 0.8));
      canvas.restore();
    }

    // The two channels.
    final water = Paint()..color = c.tints[2].fill.withValues(alpha: 0.9);
    canvas
      ..drawRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(190, 24, 20, 352),
          const Radius.circular(10),
        ),
        water,
      )
      ..drawRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(24, 190, 352, 20),
          const Radius.circular(10),
        ),
        water,
      );

    // A halo of tile rings around the pool.
    canvas.drawPath(
      _octagon(136),
      fill..color = c.primarySoft.fill.withValues(alpha: 0.85),
    );
    canvas.drawPath(
      _octagon(136),
      stroke
        ..color = Color.lerp(c.primarySoft.fill, c.primary, 0.3)!
        ..strokeWidth = 1,
    );

    // The turning ring of stars.
    canvas
      ..save()
      ..translate(200, 200)
      ..rotate(turn);
    for (var i = 0; i < 8; i++) {
      canvas
        ..save()
        ..rotate((i * 45 + 22.5) * math.pi / 180)
        ..translate(0, -136)
        ..scale(0.36);
      canvas.drawPath(star, fill..color = c.primary);
      canvas.restore();
    }
    canvas.restore();

    // The pool.
    canvas.drawPath(_octagon(120), fill..color = c.tints[2].ink);
    canvas.drawPath(
      _octagon(108),
      stroke
        ..color = const Color(0x40FFFFFF)
        ..strokeWidth = 1.5,
    );
  }

  @override
  bool shouldRepaint(_GardenPainter old) => old.turn != turn || old.c != c;
}

/// One star, for marks and badges.
class GirihStar extends StatelessWidget {
  const GirihStar({
    required this.color,
    this.size = 24,
    this.fill = false,
    super.key,
  });

  final Color color;
  final double size;
  final bool fill;

  @override
  // Aligned, so a stretching parent (a Column with stretch) places the star
  // at the start instead of blowing it up to the full width.
  Widget build(BuildContext context) => Align(
    alignment: AlignmentDirectional.centerStart,
    widthFactor: 1,
    heightFactor: 1,
    child: CustomPaint(
      size: Size.square(size),
      painter: _StarPainter(color, fill, 0),
    ),
  );
}

class _StarPainter extends CustomPainter {
  _StarPainter(this.color, this.fill, this.turn);

  final Color color;
  final bool fill;
  final double turn;

  @override
  void paint(Canvas canvas, Size size) {
    canvas
      ..translate(size.width / 2, size.height / 2)
      ..rotate(turn)
      ..scale(size.width / 56);
    final paint = Paint()
      ..color = color
      ..style = fill ? PaintingStyle.fill : PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(_star(), paint);
    if (!fill) {
      canvas
        ..rotate(36 * math.pi / 180)
        ..scale(0.45);
      canvas.drawPath(_star(), Paint()..color = color);
    }
  }

  @override
  bool shouldRepaint(_StarPainter old) =>
      old.turn != turn || old.color != color || old.fill != fill;
}

/// Loading: a star turning on a spring-like ease. With reduced motion it
/// breathes in opacity instead of spinning.
class GirihSpinner extends ConsumerStatefulWidget {
  const GirihSpinner({this.color, this.size = 32, super.key});

  final Color? color;
  final double size;

  @override
  ConsumerState<GirihSpinner> createState() => _GirihSpinnerState();
}

class _GirihSpinnerState extends ConsumerState<GirihSpinner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _t = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat();

  @override
  void dispose() {
    _t.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? BaghColors.of(context).primary;
    final reduce = reduceMotion(context, ref);
    return Semantics(
      label: MaterialLocalizations.of(context).refreshIndicatorSemanticLabel,
      child: AnimatedBuilder(
        animation: _t,
        builder: (context, _) {
          final t = Curves.easeInOutCubic.transform(_t.value);
          return Opacity(
            opacity: reduce ? 0.55 + 0.45 * math.sin(_t.value * math.pi) : 1,
            child: CustomPaint(
              size: Size.square(widget.size),
              painter: _StarPainter(
                color,
                false,
                reduce ? 0 : t * 2 * math.pi / 5,
              ),
            ),
          );
        },
      ),
    );
  }
}
