import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/session.dart';
import '../../core/config.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../help/help_sheet.dart';

/// Me: the person, their account and the app's settings. Signed out, it is
/// the door in.
class MeScreen extends ConsumerWidget {
  const MeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final session = ref.watch(sessionProvider);
    final user = session.value;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final forward = Directionality.of(context) == TextDirection.rtl
        ? Icons.chevron_left_rounded
        : Icons.chevron_right_rounded;

    Widget row(
      IconData icon,
      String label,
      VoidCallback onTap, {
      String? hint,
    }) => ListTile(
      leading: Icon(icon),
      title: Text(label),
      subtitle: hint == null ? null : Text(hint),
      trailing: Icon(forward),
      onTap: onTap,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(s.mobile.tabMe),
        actions: const [HelpAction('dashboard')],
      ),
      body: ListView(
        padding: BaghLayout.readablePadding(context, bottom: 120),
        children: [
          if (session.isLoading && user == null)
            const Padding(
              padding: EdgeInsets.all(BaghSpace.section),
              child: Center(child: GirihSpinner()),
            )
          else if (user == null)
            SoftSurface(
              tint: c.primarySoft,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 12,
                children: [
                  GirihStar(color: c.primarySoft.ink, size: 36),
                  Text(
                    s.mobile.meSignedOutTitle,
                    style: text.titleLarge?.copyWith(color: c.primarySoft.ink),
                  ),
                  Text(
                    s.mobile.meSignedOutBody,
                    style: text.bodyMedium?.copyWith(color: c.primarySoft.ink),
                  ),
                  Row(
                    spacing: 10,
                    children: [
                      Expanded(
                        child: BaghKey(
                          label: s.nav.login,
                          onPressed: () => context.push('/login'),
                        ),
                      ),
                      Expanded(
                        child: BaghKey(
                          label: s.nav.register,
                          kind: BaghKeyKind.outline,
                          onPressed: () => context.push('/register'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            )
          else
            SoftSurface(
              child: Row(
                spacing: 14,
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: c.primarySoft.fill,
                    child: Text(
                      user.firstName.characters.firstOrNull ?? '؟',
                      style: text.titleLarge?.copyWith(
                        color: c.primarySoft.ink,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user.fullName, style: text.titleMedium),
                        Text(
                          user.email,
                          style: text.bodySmall,
                          textDirection: TextDirection.ltr,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: BaghSpace.gutter),
          SoftSurface(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              children: [
                if (user != null)
                  row(
                    Icons.lock_outline_rounded,
                    s.dashboard.securityTitle,
                    () => context.push('/me/security'),
                  ),
                row(
                  Icons.manage_search_rounded,
                  s.nav.track,
                  () => context.push('/track'),
                ),
                row(
                  Icons.tune_rounded,
                  s.mobile.settingsTitle,
                  () => context.push('/me/settings'),
                ),
                row(
                  Icons.help_outline_rounded,
                  s.mobile.help,
                  () => context.push('/help'),
                ),
                if (user?.isStaff ?? false)
                  row(
                    Icons.admin_panel_settings_outlined,
                    s.mobile.staffPanelOnWeb,
                    hint: s.mobile.staffPanelOnWebHint,
                    () => launchUrl(
                      AppConfig.website('/admin', language),
                      mode: LaunchMode.externalApplication,
                    ),
                  ),
              ],
            ),
          ),
          if (user != null) ...[
            const SizedBox(height: BaghSpace.section),
            BaghKey(
              label: s.nav.logout,
              kind: BaghKeyKind.outline,
              icon: Icons.logout_rounded,
              expand: true,
              onPressed: () => ref.read(sessionProvider.notifier).logout(),
            ),
          ],
        ],
      ),
    );
  }
}
