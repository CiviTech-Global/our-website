import 'package:civitech_global_flutter/features/market/market_data.dart';
import 'package:civitech_global_flutter/features/market/my_shops_screens.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('the form rules, as the web\'s marketForms', () {
    test('a price is a whole amount over zero, Persian digits too', () {
      expect(parsePrice('۱۲۵٬۰۰۰'), '125000');
      expect(parsePrice('00120'), '120');
      expect(parsePrice('1 250 000'), '1250000');
      expect(parsePrice('12s'), isNull);
      expect(parsePrice('0'), isNull);
      expect(parsePrice('12.5'), isNull);
      expect(parsePrice('1234567890123456'), isNull);
    });

    test('a coordinate takes the Persian decimal mark, within its range', () {
      expect(parseCoordinate('۳۶٫۲۷۲۸', 90), closeTo(36.2728, 1e-9));
      expect(parseCoordinate('-50.01', 180), closeTo(-50.01, 1e-9));
      expect(parseCoordinate('91', 90), isNull);
      expect(parseCoordinate('36,2', 90), isNull);
    });

    test('a count is whole and at most a million', () {
      expect(parseCount('۴۲'), 42);
      expect(parseCount('1000001'), isNull);
      expect(parseCount('-1'), isNull);
    });
  });

  test('a category of the other kind is dropped, an unknown one kept '
      'while the list loads', () {
    final all = [
      ProductCategory.fromJson({'id': 'p', 'name': 'P', 'kind': 'PRODUCT'}),
      ProductCategory.fromJson({'id': 's', 'name': 'S', 'kind': 'SERVICE'}),
    ];
    expect(categoryForKind(all, 's', 'PRODUCT'), '');
    expect(categoryForKind(all, 's', ''), 's');
    expect(categoryForKind(all, 'gone', ''), '');
    expect(categoryForKind(null, 'x', 'PRODUCT'), 'x');
  });

  test('a search point travels rounded, and only when one is set', () {
    expect(const MarketLocation().query, isEmpty);
    final near = const MarketLocation().copyWith(
      latitude: 36.2728123,
      longitude: 50.0101987,
      radiusKm: 25,
    );
    expect(near.query, {
      'latitude': '36.27281',
      'longitude': '50.01020',
      'radiusKm': '25',
    });
    expect(near.copyWith(clear: true).query, isEmpty);
  });
}
