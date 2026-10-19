import 'package:civitech_global_flutter/core/format.dart';
import 'package:civitech_global_flutter/design/widgets/remote_image.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('textDirectionOf', () {
    test('follows the first letter, like dir="auto"', () {
      expect(
        textDirectionOf('Yes, still here', TextDirection.rtl),
        TextDirection.ltr,
      );
      expect(
        textDirectionOf('سلام، hello', TextDirection.ltr),
        TextDirection.rtl,
      );
      // Digits and punctuation before the first letter do not decide it.
      expect(textDirectionOf('۱۲۳ کتاب', TextDirection.ltr), TextDirection.rtl);
      expect(textDirectionOf('12 books', TextDirection.rtl), TextDirection.ltr);
    });

    test('text with no letters keeps the screen\'s direction', () {
      expect(textDirectionOf('', TextDirection.rtl), TextDirection.rtl);
      expect(textDirectionOf('12:30 👍', TextDirection.ltr), TextDirection.ltr);
    });
  });

  group('initialsOf', () {
    test('takes the first letter of the first two words', () {
      expect(initialsOf('Maryam Ahmadi'), 'MA');
      expect(initialsOf('مریم احمدی'), 'ما');
      expect(initialsOf('  sara  '), 'S');
    });

    test('skips the marks in front of a handle', () {
      expect(initialsOf('@reza_data'), 'R');
      expect(initialsOf('(Hamid) Tech'), 'HT');
      expect(initialsOf('@@@'), '');
    });
  });
}
