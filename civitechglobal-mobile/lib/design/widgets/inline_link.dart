import 'package:flutter/material.dart';

/// A line of text that opens something (a name to its profile, a website),
/// with a tap target a finger can hit: 48 points tall however small the
/// text, as Android and TalkBack expect. The text itself stays where it was.
class InlineLink extends StatelessWidget {
  const InlineLink({
    required this.onTap,
    required this.child,
    this.borderRadius,
    super.key,
  });

  final VoidCallback? onTap;
  final Widget child;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: borderRadius ?? BorderRadius.circular(8),
    child: ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
      child: Align(
        alignment: AlignmentDirectional.centerStart,
        widthFactor: 1,
        heightFactor: 1,
        child: child,
      ),
    ),
  );
}
