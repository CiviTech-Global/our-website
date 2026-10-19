import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';

import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../me/workspace_data.dart';

/// The end of an intake: it was sent, here is the tracking code to keep,
/// copy it, follow it. The project wizard, the consultation request, the CV
/// form and the insurance request all close on this page.
///
/// For a signed-in member the code is also kept on the account (My
/// requests), as the web's SavedToAccount; anybody else is invited to sign
/// in and keep it. Either way the code on screen is still the code.
class CodeIssued extends ConsumerStatefulWidget {
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
  ConsumerState<CodeIssued> createState() => _CodeIssuedState();
}

class _CodeIssuedState extends ConsumerState<CodeIssued> {
  bool _saved = false;
  bool _asked = false;

  @override
  void initState() {
    super.initState();
    // Whenever there is a member: now, once a session still loading
    // arrives, or after signing in from the link below and coming back.
    ref.listenManual(sessionProvider, (_, next) {
      if (next.value == null || _asked) return;
      _asked = true;
      // Silent on failure: the code is on screen, and a note about a
      // convenience that did not happen would read as the request failing.
      ref
          .read(trackingActionsProvider)
          .track(widget.code)
          .then((_) {
            if (mounted) setState(() => _saved = true);
          })
          .catchError((Object _) {});
    }, fireImmediately: true);
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final signedIn = ref.watch(sessionProvider).value != null;
    final title = widget.title;
    final body = widget.body;
    final helpId = widget.helpId;
    final codeLabel = widget.codeLabel;
    final code = widget.code;
    final note = widget.note;
    final copyLabel = widget.copyLabel;
    final copiedLabel = widget.copiedLabel;
    final trackLabel = widget.trackLabel;
    final homeLabel = widget.homeLabel;
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
        if (note != null) Text(note, textAlign: TextAlign.center),
        if (signedIn && _saved)
          TextButton.icon(
            icon: const Icon(Icons.check_circle_outline_rounded),
            label: Text(s.workspace.savedToAccount),
            onPressed: () => context.push('/dashboard/requests'),
          )
        else if (!signedIn)
          TextButton(
            onPressed: () => context.push(
              Uri(
                path: '/login',
                queryParameters: {'from': '/track?code=$code'},
              ).toString(),
            ),
            child: Text(s.workspace.signInToKeep),
          ),
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
            label: homeLabel,
            kind: BaghKeyKind.outline,
            expand: true,
            onPressed: () => context.go('/'),
          ),
      ],
    );
  }
}
