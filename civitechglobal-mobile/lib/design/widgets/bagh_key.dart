import 'package:flutter/material.dart';

import '../palette.dart';
import '../tokens.dart';
import 'girih.dart';
import 'pressable.dart';

enum BaghKeyKind {
  /// The one main action on a screen: a solid fill.
  primary,

  /// A secondary action: the surface with a real 1.5px edge.
  outline,

  /// A quieter action inside a tinted area: the primary's pastel tint.
  tonal,
}

/// A key: a pill that sits on a flat tile lip and travels down when pressed.
///
/// Pressing changes three things together (the key sinks onto its lip, the
/// fill darkens a step, the whole key scales to 0.97), so the state never
/// rests on a shadow alone. Every kind keeps a 3:1 boundary against the
/// ground: the primary from its fill (5.2:1 in the default palette), the
/// outline from its edge.
class BaghKey extends StatelessWidget {
  const BaghKey({
    required this.label,
    required this.onPressed,
    this.kind = BaghKeyKind.primary,
    this.icon,
    this.loading = false,
    this.expand = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final BaghKeyKind kind;
  final IconData? icon;

  /// Shows a turning girih star in place of the label and ignores presses.
  final bool loading;

  /// Fills the available width, as a form's submit key does.
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme.labelLarge!;
    final enabled = onPressed != null && !loading;

    final (Color fill, Color ink, Color lip, BorderSide? side) = switch (kind) {
      BaghKeyKind.primary => (
        c.primary,
        c.onPrimary,
        Color.lerp(c.primary, const Color(0xFF000000), 0.35)!,
        null,
      ),
      BaghKeyKind.outline => (
        c.surface,
        c.ink,
        Color.lerp(c.edge, c.ground, 0.35)!,
        BorderSide(color: c.edge, width: 1.5),
      ),
      BaghKeyKind.tonal => (
        c.primarySoft.fill,
        c.primarySoft.ink,
        Color.lerp(c.primarySoft.fill, c.primarySoft.ink, 0.25)!,
        null,
      ),
    };

    return Opacity(
      opacity: enabled || loading ? 1 : 0.45,
      child: Pressable(
        onPressed: enabled ? onPressed : null,
        semanticLabel: loading ? null : label,
        builder: (context, depth) {
          final pressed = depth.clamp(0.0, 1.0);
          if (c.glass && !MediaQuery.highContrastOf(context)) {
            return _glassKey(context, c, fill, ink, side, pressed, text);
          }
          final travel = 3 * pressed;
          // Room for the lip is reserved below the key and handed to the top
          // as it sinks, so the key's overall height never changes: nothing
          // around it moves when it is pressed, and the lip stays inside
          // its own box.
          return Padding(
            padding: EdgeInsets.only(top: travel, bottom: 3 - travel),
            child: Container(
              constraints: BoxConstraints(
                minHeight: 52,
                minWidth: expand ? double.infinity : 88,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 22),
              decoration: ShapeDecoration(
                color: Color.lerp(fill, c.ink, 0.10 * depth.clamp(0.0, 1.0)),
                shape: StadiumBorder(side: side ?? BorderSide.none),
                shadows: [
                  if (travel < 3)
                    BaghDepth.lip(lip).copyWith(offset: Offset(0, 3 - travel)),
                  if (depth < 0.5 && kind != BaghKeyKind.tonal)
                    ...BaghDepth.rest(c),
                ],
              ),
              child: _content(ink, text),
            ),
          );
        },
      ),
    );
  }

  /// The glass style's key: no lip; it rises on soft layered shadows and
  /// settles towards the ground as it is pressed. The primary carries a
  /// gentle top-lit gradient; the others sit on glass with a real edge.
  Widget _glassKey(
    BuildContext context,
    BaghColors c,
    Color fill,
    Color ink,
    BorderSide? side,
    double pressed,
    TextStyle text,
  ) {
    final solid = kind == BaghKeyKind.primary;
    final face = Color.lerp(fill, c.ink, 0.08 * pressed)!;
    return Container(
      constraints: BoxConstraints(
        minHeight: 52,
        minWidth: expand ? double.infinity : 88,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 22),
      decoration: ShapeDecoration(
        color: solid ? null : (kind == BaghKeyKind.outline ? c.pane : face),
        gradient: solid
            ? LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color.lerp(face, Colors.white, 0.16)!, face],
              )
            : null,
        shape: StadiumBorder(
          side: side ?? BorderSide(color: solid ? c.rim : face),
        ),
        shadows: BaghDepth.lift(c, (solid ? 1.1 : 0.6) * (1 - pressed)),
      ),
      child: _content(ink, text),
    );
  }

  Widget _content(Color ink, TextStyle text) => Center(
    widthFactor: expand ? null : 1,
    child: loading
        ? GirihSpinner(color: ink, size: 24)
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, color: ink, size: 20),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  label,
                  style: text.copyWith(color: ink),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
  );
}
