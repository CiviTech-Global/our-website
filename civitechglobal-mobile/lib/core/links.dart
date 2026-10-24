import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../l10n/l10n.dart';
import 'config.dart';
import 'settings.dart';

/// Website paths the app has its own screen for. A link to one of these
/// (from a blog article, a guide, a button) opens the screen; anything else
/// opens the same page on the website.
const appPaths = <String>{
  '/',
  '/services',
  '/about',
  '/team',
  '/portfolio',
  '/customers',
  '/partners',
  '/blog',
  '/help',
  '/contact',
  '/start-project',
  '/consult',
  '/experts',
  '/track',
  '/join',
  '/volunteer',
  '/insurance',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/dashboard',
  '/dashboard/requests',
  '/dashboard/messages',
  '/dashboard/notifications',
  '/dashboard/profile',
  '/dashboard/verification',
  '/jobs',
  '/companies',
  '/dashboard/applications',
  '/dashboard/saved-jobs',
  '/dashboard/job-alerts',
  '/dashboard/jobs',
  '/dashboard/company',
};

/// Sections whose every page is a screen in the app.
const appPrefixes = <String>[
  '/blog/',
  '/help/',
  '/experts/',
  '/insurance/',
  '/dashboard/messages/',
  '/profiles/',
  '/jobs/',
  '/companies/',
];

/// [path] without the website's language prefix: '/en/blog' is '/blog', and
/// '/en' is '/'. Persian has no prefix on the website.
String stripLocalePrefix(String path) {
  for (final language in supportedLanguages) {
    if (path == '/$language') return '/';
    if (path.startsWith('/$language/')) {
      return path.substring(language.length + 1);
    }
  }
  return path;
}

/// Whether [path] (a website path, any query dropped) is a screen in the app.
bool isAppPath(String path) {
  final clean = Uri.parse(path).path;
  return appPaths.contains(clean) ||
      appPrefixes.any(clean.startsWith) ||
      (clean.startsWith('/proposal/') &&
          !clean.startsWith('/proposal/preview/'));
}

/// Follows a link: inside the app when it can, to the website or the wider
/// web otherwise. A website path is one that starts with "/".
Future<void> openLink(BuildContext context, WidgetRef ref, String href) async {
  if (href.startsWith('/')) {
    if (isAppPath(href)) {
      await context.push(href);
      return;
    }
    await launchUrl(
      AppConfig.website(href, ref.read(l10nProvider).language),
      mode: LaunchMode.externalApplication,
    );
    return;
  }
  final uri = Uri.tryParse(href);
  // Only links a person would expect to leave the app by; never a scheme
  // that could do something on its own (javascript:, intent:, file:).
  if (uri != null && (uri.scheme == 'https' || uri.scheme == 'http')) {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

/// An asset the API serves (photos, logos, covers), as an absolute URL:
/// the web's apiAssetSrc.
String? apiAsset(String? path) {
  if (path == null || path.isEmpty) return null;
  if (path.startsWith('http')) return path;
  final base = AppConfig.apiBaseUrl.replaceFirst(RegExp(r'/v1$'), '');
  return '$base$path';
}
