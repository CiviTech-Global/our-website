import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/settings.dart';

/// Touch feedback, in three strengths, all behind the one setting.
///
/// selection: toggles, tabs, segmented choices.
/// press: a key going down.
/// success: a flow completed (a request sent, a sign-in done), once per flow.
class Haptics {
  const Haptics(this._enabled);

  final bool _enabled;

  Future<void> selection() async {
    if (_enabled) await HapticFeedback.selectionClick();
  }

  Future<void> press() async {
    if (_enabled) await HapticFeedback.lightImpact();
  }

  Future<void> success() async {
    if (_enabled) await HapticFeedback.mediumImpact();
  }
}

/// Off when the person turned vibration off or asked for reduced motion:
/// someone who finds movement uncomfortable is unlikely to want buzzing.
final hapticsProvider = Provider<Haptics>((ref) {
  final s = ref.watch(settingsProvider);
  return Haptics(s.haptics && !s.reduceMotion);
});
