import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../account/account_page.dart';

/// The end of an intake: it was sent, here is the tracking code to keep,
/// copy it, follow it. The project wizard, the consultation request and the
/// CV form all close on this page.
class CodeIssued extends StatelessWidget {
  const CodeIssued({
    required this.title,
    required this.body,
    required this.codeLabel,
    required this.code,
    required this.copyLabel,
    required this.copiedLabel,
    required this.trackLabel,
    this.note,
    this.homeLabel,
    this.helpId,
    super.key,
  });

  final String title;
  final String body;
  final String codeLabel;
  final String code;
  final String copyLabel;
  final String copiedLabel;
  final String trackLabel;

  /// A line under the code (how many files arrived, why to keep it).
  final String? note;
  final String? homeLabel;
  final String? helpId;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return AccountPage(
      title: title,
      subtitle: body,
      helpId: helpId,
      children: [
        Center(child: GirihStar(color: c.accent, size: 48, fill: true)),
        Text(codeLabel, style: text.titleSmall, textAlign: TextAlign.center),
        SelectableText(
          code,
          textAlign: TextAlign.center,
          textDirection: TextDirection.ltr,
          style: BaghType.weight(
            text.headlineMedium!,
            800,
          ).copyWith(letterSpacing: 2, color: c.primary),
        ),
        if (note != null) Text(note!, textAlign: TextAlign.center),
        BaghKey(
          label: copyLabel,
          icon: Icons.copy_rounded,
          kind: BaghKeyKind.outline,
          expand: true,
          onPressed: () {
            Clipboard.setData(ClipboardData(text: code));
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(SnackBar(content: Text(copiedLabel)));
          },
        ),
        BaghKey(
          label: trackLabel,
          expand: true,
          onPressed: () => context.go('/track?code=$code'),
        ),
        if (homeLabel != null)
          BaghKey(
            label: homeLabel!,
            kind: BaghKeyKind.outline,
            expand: true,
            onPressed: () => context.go('/'),
          ),
      ],
    );
  }
}
