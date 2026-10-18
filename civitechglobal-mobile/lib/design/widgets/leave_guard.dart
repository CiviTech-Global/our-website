import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/l10n.dart';

/// Back on a form: a step back where there is one, a question before
/// anything typed is thrown away, and straight out otherwise. A stray back
/// press once emptied a half-filled insurance request.
///
/// Back is always caught and decided when it happens, because a text field
/// changes without rebuilding the screen, so a rule worked out at build time
/// would be out of date.
class LeaveGuard extends ConsumerWidget {
  const LeaveGuard({
    required this.isDirty,
    required this.child,
    this.stepBack,
    this.busy = false,
    super.key,
  });

  /// Whether anything has been entered.
  final bool Function() isDirty;

  /// Goes back a step and says so; false when on the first step.
  final bool Function()? stepBack;

  /// While a request is on its way, back does nothing.
  final bool busy;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) => PopScope(
    canPop: false,
    onPopInvokedWithResult: (didPop, _) async {
      if (didPop || busy) return;
      if (stepBack?.call() ?? false) return;
      if (isDirty() && !await confirmLeave(context, ref)) return;
      if (context.mounted) Navigator.of(context).pop();
    },
    child: child,
  );
}

/// Asks whether to leave a form and lose what was entered.
Future<bool> confirmLeave(BuildContext context, WidgetRef ref) async {
  final m = ref.read(stringsProvider).mobile;
  final leave = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(m.leaveTitle),
      content: Text(m.leaveBody),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(m.leaveConfirm),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(m.leaveStay),
        ),
      ],
    ),
  );
  return leave ?? false;
}
