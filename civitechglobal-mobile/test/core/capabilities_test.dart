import 'package:civitech_global_flutter/core/capabilities.dart';
import 'package:civitech_global_flutter/core/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the update key goes to Cafe Bazaar only once it is an https link', () {
    Capabilities caps(Object? downloads) => Capabilities.fromJson({
      'mobile': {'downloads': downloads},
    });
    expect(
      caps({'bazaar': 'https://cafebazaar.ir/app/x'}).bazaarUrl,
      'https://cafebazaar.ir/app/x',
    );
    expect(caps({'bazaar': null}).bazaarUrl, isNull);
    expect(caps({'bazaar': 'http://cafebazaar.ir/app/x'}).bazaarUrl, isNull);
    expect(caps(null).bazaarUrl, isNull);
    expect(const Capabilities().bazaarUrl, isNull);
  });

  test(
    'an update comes from the store that installed the app, never another',
    () {
      const pkg = 'ir.rayantamaddonjahangostar.app';
      const unlisted = Capabilities();
      // A store page is at a fixed address, so no server setting is needed.
      expect(
        unlisted.updateUrlFor('com.farsitel.bazaar', pkg),
        'https://cafebazaar.ir/app/$pkg',
      );
      expect(
        unlisted.updateUrlFor('ir.mservices.market', pkg),
        'https://myket.ir/app/$pkg',
      );
      expect(
        unlisted.updateUrlFor('com.android.vending', pkg),
        'https://play.google.com/store/apps/details?id=$pkg',
      );
      // Installed from the website, by adb, or by a store we are not in: the
      // website, which is the only place that offers every way.
      expect(unlisted.updateUrlFor(null, pkg), isNull);
      expect(
        unlisted.updateUrlFor('com.sec.android.app.samsungapps', pkg),
        isNull,
      );
      // The server may name the pages; each store still gets only its own.
      final listed = Capabilities.fromJson({
        'mobile': {
          'downloads': {
            'bazaar': 'https://cafebazaar.ir/app/x',
            'myket': 'https://myket.ir/app/x',
          },
        },
      });
      expect(listed.myketUrl, 'https://myket.ir/app/x');
      expect(
        listed.updateUrlFor('com.farsitel.bazaar', pkg),
        'https://cafebazaar.ir/app/x',
      );
      expect(
        listed.updateUrlFor('ir.mservices.market', pkg),
        'https://myket.ir/app/x',
      );
    },
  );

  group('compareVersions', () {
    test('compares numerically, not as text', () {
      expect(compareVersions('1.10.0', '1.9.3'), 1);
      expect(compareVersions('1.2.0', '1.2.0'), 0);
      expect(compareVersions('1.2.0+7', '1.2.0'), 0);
      expect(compareVersions('0.9.9', '1.0.0'), -1);
    });
  });

  group('Capabilities.fromJson', () {
    test('reads providers, switches and the version floor', () {
      final caps = Capabilities.fromJson({
        'email': true,
        'sms': false,
        'features': {'tradeMaster': true, 'booksV2': false},
        'mobile': {'minVersion': '1.1.0', 'latestVersion': '1.2.0'},
      });
      expect(caps.email, isTrue);
      expect(caps.sms, isFalse);
      expect(caps.feature('tradeMaster'), isTrue);
      expect(caps.feature('booksV2'), isFalse);
      expect(caps.minVersion, '1.1.0');
      expect(caps.latestVersion, '1.2.0');
    });

    test('an older server that says nothing about switches turns them off', () {
      final caps = Capabilities.fromJson({'email': true, 'sms': true});
      expect(caps.feature('tradeMaster'), isFalse);
      expect(caps.minVersion, '1.0.0');
    });
  });

  group('digits and dates', () {
    test('converts between Persian and Latin digits', () {
      expect(toPersianDigits(2026), '۲۰۲۶');
      expect(toLatinDigits('۱۲۳٤٥'), '12345');
    });

    test('formats a Persian date in the Iranian calendar', () {
      // 17 October 2026 is 25 Mehr 1405.
      expect(formatDate(DateTime(2026, 10, 17, 12), 'fa'), '۲۵ مهر ۱۴۰۵');
      expect(formatDate(DateTime(2026, 10, 17, 12), 'en'), '2026-10-17');
    });
  });
}
