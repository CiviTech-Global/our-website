import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/capabilities.dart';
import '../../core/config.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/sheet.dart';
import '../../l10n/l10n.dart';

/// One part of the platform as the app shows it: its name, its icon, the
/// garden tint it wears everywhere, where it lives on the website, and the
/// server switch it depends on, if any.
class AppModule {
  const AppModule({
    required this.label,
    required this.icon,
    required this.tint,
    required this.webPath,
    this.feature,
  });

  final String Function(Strings s) label;
  final IconData icon;
  final int tint;
  final String webPath;
  final String? feature;
}

/// The marketplaces Explore lists, in the order the web's menu has them.
final exploreModules = <AppModule>[
  AppModule(
    label: (s) => s.nav.jobs,
    icon: Icons.work_outline_rounded,
    tint: 0,
    webPath: '/jobs',
  ),
  AppModule(
    label: (s) => s.nav.freelance,
    icon: Icons.assignment_outlined,
    tint: 1,
    webPath: '/projects',
  ),
  AppModule(
    label: (s) => s.nav.freelanceServices,
    icon: Icons.design_services_outlined,
    tint: 2,
    webPath: '/freelance-services',
    feature: 'projectsV2',
  ),
  AppModule(
    label: (s) => s.nav.freelancers,
    icon: Icons.groups_outlined,
    tint: 3,
    webPath: '/freelancers',
    feature: 'projectsV2',
  ),
  AppModule(
    label: (s) => s.nav.books,
    icon: Icons.menu_book_outlined,
    tint: 4,
    webPath: '/books',
  ),
  AppModule(
    label: (s) => s.nav.localMarket,
    icon: Icons.storefront_outlined,
    tint: 0,
    webPath: '/marketplace',
    feature: 'tradeMaster',
  ),
  AppModule(
    label: (s) => s.nav.insurance,
    icon: Icons.shield_outlined,
    tint: 2,
    webPath: '/insurance',
  ),
  AppModule(
    label: (s) => s.nav.consult,
    icon: Icons.support_agent_outlined,
    tint: 3,
    webPath: '/consult',
  ),
  AppModule(
    label: (s) => s.nav.experts,
    icon: Icons.workspace_premium_outlined,
    tint: 1,
    webPath: '/experts',
  ),
];

/// What the centre "+" key offers.
final startActions = <AppModule>[
  AppModule(
    label: (s) => s.mobile.startProject,
    icon: Icons.rocket_launch_outlined,
    tint: 0,
    webPath: '/start-project',
  ),
  AppModule(
    label: (s) => s.mobile.startConsult,
    icon: Icons.support_agent_outlined,
    tint: 3,
    webPath: '/consult',
  ),
  AppModule(
    label: (s) => s.mobile.startInsurance,
    icon: Icons.shield_outlined,
    tint: 2,
    webPath: '/insurance',
  ),
  AppModule(
    label: (s) => s.mobile.startPostProject,
    icon: Icons.assignment_outlined,
    tint: 1,
    webPath: '/dashboard/projects/new',
  ),
  AppModule(
    label: (s) => s.mobile.startPostJob,
    icon: Icons.work_outline_rounded,
    tint: 0,
    webPath: '/dashboard/jobs',
  ),
  AppModule(
    label: (s) => s.mobile.startSellBook,
    icon: Icons.menu_book_outlined,
    tint: 4,
    webPath: '/dashboard/books/sell',
    feature: 'booksV2',
  ),
  AppModule(
    label: (s) => s.mobile.startOpenShop,
    icon: Icons.storefront_outlined,
    tint: 1,
    webPath: '/marketplace/join',
    feature: 'tradeMaster',
  ),
];

/// Only the modules whose switch is on, as the server reports it.
List<AppModule> visibleModules(List<AppModule> modules, Capabilities caps) => [
  for (final m in modules)
    if (m.feature == null || caps.feature(m.feature!)) m,
];

/// Until a module's screens arrive in the app, it opens here: a short note
/// and the way to the same page on the website.
Future<void> showModuleSoon(BuildContext context, AppModule module) async {
  // Screens the app already has open directly; the note is only for the rest.
  if (isAppPath(module.webPath)) {
    await GoRouter.of(context).push(module.webPath);
    return;
  }
  await showBaghSheet<void>(
    context,
    builder: (context) => Consumer(
      builder: (context, ref, _) {
        final s = ref.watch(stringsProvider);
        final language = ref.watch(l10nProvider).language;
        final c = BaghColors.of(context);
        final tint = moduleTint(c, module.tint);
        final text = Theme.of(context).textTheme;
        return SafeArea(
          child: SingleChildScrollView(
            padding: BaghLayout.readablePadding(
              context,
              bottom: BaghSpace.gutter,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 14,
              children: [
                Row(
                  spacing: 12,
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: tint.fill,
                      child: Icon(module.icon, color: tint.ink),
                    ),
                    Expanded(
                      child: Text(module.label(s), style: text.titleLarge),
                    ),
                    GirihStar(color: tint.ink, size: 22),
                  ],
                ),
                Text(s.mobile.comingInUpdate, style: text.bodyLarge),
                BaghKey(
                  label: s.nav.viewSite,
                  icon: Icons.open_in_new_rounded,
                  expand: true,
                  onPressed: () => launchUrl(
                    AppConfig.website(module.webPath, language),
                    mode: LaunchMode.externalApplication,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
}
