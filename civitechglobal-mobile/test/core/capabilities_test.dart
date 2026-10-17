import 'package:civitech_global_flutter/core/capabilities.dart';
import 'package:civitech_global_flutter/core/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
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
