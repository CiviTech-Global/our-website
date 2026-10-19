import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/l10n.dart';

/// The app bar's leading key: none of its own (so the usual back arrow
/// shows) when there is a screen to go back to, and a key home when there is
/// not. A screen opened straight from a website link or a notification is
/// alone in the app's history, and without this its only way out was the
/// system back, which leaves the app.
Widget? homeLeading(BuildContext context) =>
    Navigator.of(context).canPop() ? null : const _HomeKey();

class _HomeKey extends ConsumerWidget {
  const _HomeKey();

  @override
  Widget build(BuildContext context, WidgetRef ref) => IconButton(
    tooltip: ref.watch(stringsProvider).nav.home,
    icon: const Icon(Icons.home_outlined),
    onPressed: () => context.go('/'),
  );
}
