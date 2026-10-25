import 'dart:io';

import 'package:civitech_global_flutter/core/links.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:flutter_test/flutter_test.dart';

/// The website paths Android hands to the app (AndroidManifest.xml) and the
/// ones the app has screens for (links.dart) must agree. A claimed path with
/// no screen leaves a visitor bouncing between the app and the browser; an
/// unclaimed one quietly opens the website instead of the app.
void main() {
  final manifest = File(
    'android/app/src/main/AndroidManifest.xml',
  ).readAsStringSync();
  final claimedPaths = RegExp(
    r'android:path="([^"]+)"',
  ).allMatches(manifest).map((m) => m[1]!).toSet();
  final claimedPrefixes = RegExp(
    r'android:pathPrefix="([^"]+)"',
  ).allMatches(manifest).map((m) => m[1]!).toSet();

  test('every claimed path is a screen in the app', () {
    for (final path in claimedPaths) {
      expect(isAppPath(stripLocalePrefix(path)), isTrue, reason: path);
    }
    for (final prefix in claimedPrefixes) {
      expect(
        isAppPath('${stripLocalePrefix(prefix)}anything'),
        isTrue,
        reason: prefix,
      );
    }
  });

  test('every screen is claimed in every language', () {
    for (final language in supportedLanguages) {
      final prefix = language == 'fa' ? '' : '/$language';
      for (final path in appPaths) {
        final claimed = path == '/' && prefix.isNotEmpty
            ? prefix
            : '$prefix$path';
        expect(claimedPaths, contains(claimed), reason: claimed);
      }
      for (final section in appPrefixes) {
        expect(claimedPrefixes, contains('$prefix$section'));
      }
    }
  });

  test('a language prefix comes off, and only a whole one', () {
    expect(stripLocalePrefix('/en/blog/how-we-work'), '/blog/how-we-work');
    expect(stripLocalePrefix('/de'), '/');
    expect(stripLocalePrefix('/es/'), '/');
    expect(stripLocalePrefix('/blog'), '/blog');
    expect(stripLocalePrefix('/english'), '/english');
    expect(stripLocalePrefix('/'), '/');
  });

  test('the staff preview of a proposal is not an app screen', () {
    expect(isAppPath('/proposal/PROJ1234'), isTrue);
    expect(isAppPath('/proposal/preview/abc'), isFalse);
    expect(isAppPath('/experts/sara'), isTrue);
    expect(isAppPath('/jobs/Q8HJYZRFGN'), isTrue);
    expect(isAppPath('/projects/P7YJ3A28J9'), isTrue);
    // Staff screens stay on the website.
    expect(isAppPath('/admin'), isFalse);
  });
}
