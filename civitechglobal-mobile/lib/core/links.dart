import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../l10n/l10n.dart';
import 'config.dart';

/// Website paths the app has its own screen for. A link to one of these
/// (from a blog article, a guide, a button) opens the screen; anything else
/// opens the same page on the website.
const _appPaths = <String>{
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
  '/track',
  '/join',
  '/volunteer',
  '/insurance',
  '/login',
  '/register',
  '/forgot-password',
};

/// Whether [path] (a website path, any query dropped) is a screen in the app.
bool isAppPath(String path) {
  final clean = Uri.parse(path).path;
  return _appPaths.contains(clean) ||
      clean.startsWith('/blog/') ||
      clean.startsWith('/help/') ||
      clean.startsWith('/insurance/');
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
