import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Refetches the provider every [every] while the app is in front, and at
/// once when it comes back, the web's `refetchInterval`. Notices are
/// convenience, not realtime: push brings the urgent ones, and a phone in a
/// pocket asks nothing of the server.
///
/// Called from a provider's body; the timer goes with the provider's state,
/// so a refetch (which rebuilds it) starts the next one.
void pollWhileOpen(Ref ref, Duration every) {
  final timer = Timer(every, () {
    // Asleep, nothing is asked: the resume below refetches instead.
    if (WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
      ref.invalidateSelf();
    }
  });
  final listener = AppLifecycleListener(onResume: ref.invalidateSelf);
  ref.onDispose(() {
    timer.cancel();
    listener.dispose();
  });
}
