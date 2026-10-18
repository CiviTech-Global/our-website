import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/account/account_page.dart';
import '../../l10n/l10n.dart';
import '../palette.dart';
import 'bagh_key.dart';
import 'girih.dart';

/// Loading, failure and empty, the same everywhere the app reads from the
/// API: a turning star while it waits, the reason and a retry when it fails,
/// and a garden star with a sentence when there is nothing to show.
class AsyncView<T> extends ConsumerWidget {
  const AsyncView({
    required this.value,
    required this.data,
    required this.onRetry,
    this.isEmpty,
    this.empty,
    super.key,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final VoidCallback onRetry;
  final bool Function(T data)? isEmpty;

  /// What to say when [isEmpty] holds.
  final String? empty;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    return value.when(
      skipLoadingOnRefresh: true,
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Center(child: GirihSpinner()),
      ),
      error: (error, _) => EmptyNote(
        message: describeError(s, error),
        action: (s.common.retry, onRetry),
      ),
      data: (value) => isEmpty?.call(value) ?? false
          ? EmptyNote(message: empty ?? s.common.noResults)
          : data(value),
    );
  }
}

/// A star and a sentence, with an optional key under it.
class EmptyNote extends StatelessWidget {
  const EmptyNote({required this.message, this.action, super.key});

  final String message;
  final (String, VoidCallback)? action;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        spacing: 14,
        children: [
          GirihStar(color: c.tints[2].ink, size: 44),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          if (action case final a?)
            BaghKey(label: a.$1, onPressed: a.$2, kind: BaghKeyKind.outline),
        ],
      ),
    );
  }
}
