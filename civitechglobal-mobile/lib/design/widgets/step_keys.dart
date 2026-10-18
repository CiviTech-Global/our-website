import 'package:flutter/material.dart';

import 'bagh_key.dart';

/// Back and forward under a stepped form: side by side, forward twice as
/// wide, while the back label fits on one line in its third; stacked,
/// forward on top, when large text or a long word would wrap it.
class StepKeys extends StatelessWidget {
  const StepKeys({
    required this.backLabel,
    required this.onBack,
    required this.forward,
    super.key,
  });

  final String backLabel;
  final VoidCallback? onBack;
  final BaghKey forward;

  /// BaghKey's side padding, both sides, and a little room to spare.
  static const _keyChrome = 22.0 * 2 + 8;
  static const _gap = 10.0;

  @override
  Widget build(BuildContext context) {
    final back = BaghKey(
      label: backLabel,
      kind: BaghKeyKind.outline,
      expand: true,
      onPressed: onBack,
    );
    return LayoutBuilder(
      builder: (context, box) {
        final label = TextPainter(
          text: TextSpan(
            text: backLabel,
            style: Theme.of(context).textTheme.labelLarge,
          ),
          textScaler: MediaQuery.textScalerOf(context),
          textDirection: Directionality.of(context),
          maxLines: 1,
        )..layout();
        final third = (box.maxWidth - _gap) / 3;
        final fits = label.width + _keyChrome <= third;
        label.dispose();
        if (!fits) {
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: _gap,
            children: [forward, back],
          );
        }
        return Row(
          spacing: _gap,
          children: [
            Expanded(child: back),
            Expanded(flex: 2, child: forward),
          ],
        );
      },
    );
  }
}
