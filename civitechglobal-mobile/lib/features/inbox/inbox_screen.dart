import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../design/palette.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/centered_scroll.dart';
import '../../design/widgets/girih.dart';
import '../../l10n/l10n.dart';
import '../help/help_sheet.dart';

/// Messages and notifications together. The lists arrive in phase 2; until
/// then this says so plainly, and asks a signed-out visitor to sign in.
class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final user = ref.watch(sessionProvider).value;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(s.mobile.inboxTitle),
        actions: const [HelpAction('messages')],
      ),
      body: CenteredScroll(
        child: SizedBox(
          width: double.infinity,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            spacing: 16,
            children: [
              GirihStar(color: c.tints[2].ink, size: 56),
              Text(
                user == null
                    ? s.mobile.inboxSignedOut
                    : s.mobile.comingInUpdate,
                textAlign: TextAlign.center,
                style: text.bodyLarge,
              ),
              if (user == null)
                BaghKey(
                  label: s.nav.login,
                  onPressed: () => context.push('/login?from=/inbox'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
