import 'package:flutter/physics.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/settings.dart';

/// Springs, after Material 3's motion physics (mass 1).
///
/// Spatial springs move position and size; effects springs change colour and
/// opacity and never overshoot. Standard springs are for working screens
/// (forms, lists, anything about money); expressive ones for discovery,
/// onboarding and the moments worth celebrating. Values from the community
/// ports of the M3 spec; confirm against m3.material.io before changing them.
abstract final class BaghSprings {
  static final spatialFast = SpringDescription.withDampingRatio(
    mass: 1,
    stiffness: 1400,
    ratio: 0.9,
  );
  static final spatial = SpringDescription.withDampingRatio(
    mass: 1,
    stiffness: 700,
    ratio: 0.9,
  );
  static final spatialSlow = SpringDescription.withDampingRatio(
    mass: 1,
    stiffness: 300,
    ratio: 0.9,
  );

  static final expressiveFast = SpringDescription.withDampingRatio(
    mass: 1,
    stiffness: 800,
    ratio: 0.6,
  );
  static final expressive = SpringDescription.withDampingRatio(
    mass: 1,
    stiffness: 380,
    ratio: 0.8,
  );
  static final expressiveSlow = SpringDescription.withDampingRatio(
    mass: 1,
    stiffness: 200,
    ratio: 0.8,
  );

  static final effectsFast = SpringDescription.withDampingRatio(
    mass: 1,
    stiffness: 3800,
  );
  static final effects = SpringDescription.withDampingRatio(
    mass: 1,
    stiffness: 1600,
  );
}

/// Durations for what is not a spring: fades and cross-fades.
abstract final class BaghDurations {
  static const instant = Duration(milliseconds: 70);
  static const fast = Duration(milliseconds: 110);
  static const moderate = Duration(milliseconds: 150);
  static const slow = Duration(milliseconds: 240);
  static const slower = Duration(milliseconds: 400);
}

/// Whether to move at all.
///
/// True when either the system asks for less motion (Android's "Remove
/// animations", which Flutter reports as `disableAnimations`) or the person
/// switched it on in the app's own settings. Then every spring becomes a
/// fade or an instant change; nothing that carries meaning is lost, because
/// motion never carries meaning alone.
///
/// In `build`, it subscribes, so the widget rebuilds when the setting
/// changes; anywhere else (gesture callbacks, lifecycle methods) pass
/// `watch: false`, because Riverpod allows `ref.watch` only during build.
bool reduceMotion(BuildContext context, WidgetRef ref, {bool watch = true}) {
  final provider = settingsProvider.select((s) => s.reduceMotion);
  return (MediaQuery.maybeDisableAnimationsOf(context) ?? false) ||
      (watch ? ref.watch(provider) : ref.read(provider));
}

/// Drives [controller] to [target] along [spring], keeping its current
/// velocity, so an interrupted animation continues from where the finger
/// left it instead of restarting.
TickerFuture springTo(
  AnimationController controller,
  double target,
  SpringDescription spring, {
  bool reduce = false,
}) {
  if (reduce) {
    controller.value = target;
    return TickerFuture.complete();
  }
  return controller.animateWith(
    SpringSimulation(
      spring,
      controller.value,
      target,
      controller.velocity,
      tolerance: const Tolerance(distance: 0.001, velocity: 0.001),
    ),
  );
}
