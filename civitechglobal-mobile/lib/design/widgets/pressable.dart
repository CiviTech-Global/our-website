import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../haptics.dart';
import '../motion.dart';
import '../palette.dart';

/// Anything that presses in: keys, tappable cards, tiles.
///
/// The press is a spring, not a tween, so a quick tap and a slow press both
/// feel physical and a release mid-press reverses from where it is. The
/// builder gets the press depth (0 at rest, 1 fully down) to draw its own
/// state from; the scale is applied here so every pressable feels the same.
///
/// Keyboard and switch-access users get the same action through
/// [FocusableActionDetector], and a visible 3px ring while focused.
class Pressable extends ConsumerStatefulWidget {
  const Pressable({
    required this.builder,
    this.onPressed,
    this.semanticLabel,
    this.isButton = true,
    this.focusRadius = 999,
    super.key,
  });

  final Widget Function(BuildContext context, double depth) builder;
  final VoidCallback? onPressed;
  final String? semanticLabel;
  final bool isButton;
  final double focusRadius;

  @override
  ConsumerState<Pressable> createState() => _PressableState();
}

class _PressableState extends ConsumerState<Pressable>
    with SingleTickerProviderStateMixin {
  late final AnimationController _depth = AnimationController.unbounded(
    vsync: this,
  );
  bool _focused = false;

  bool get _enabled => widget.onPressed != null;

  @override
  void dispose() {
    _depth.dispose();
    super.dispose();
  }

  void _to(double target) {
    springTo(
      _depth,
      target,
      BaghSprings.spatialFast,
      reduce: reduceMotion(context, ref, watch: false),
    );
  }

  void _activate() {
    if (!_enabled) return;
    ref.read(hapticsProvider).press();
    widget.onPressed!();
  }

  @override
  Widget build(BuildContext context) {
    final colors = BaghColors.of(context);
    return Semantics(
      button: widget.isButton,
      enabled: _enabled,
      label: widget.semanticLabel,
      child: FocusableActionDetector(
        enabled: _enabled,
        onShowFocusHighlight: (v) => setState(() => _focused = v),
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) {
              _activate();
              return null;
            },
          ),
        },
        shortcuts: const {
          SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
          SingleActivator(LogicalKeyboardKey.space): ActivateIntent(),
        },
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: _enabled ? (_) => _to(1) : null,
          onTapUp: _enabled ? (_) => _to(0) : null,
          onTapCancel: _enabled ? () => _to(0) : null,
          onTap: _enabled ? _activate : null,
          child: AnimatedBuilder(
            animation: _depth,
            builder: (context, _) {
              final depth = _depth.value.clamp(0.0, 1.2);
              return DecoratedBox(
                position: DecorationPosition.foreground,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(widget.focusRadius),
                  border: _focused
                      ? Border.all(color: colors.accent, width: 3)
                      : null,
                ),
                child: Transform.scale(
                  scale: 1 - 0.03 * depth,
                  child: widget.builder(context, depth),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
