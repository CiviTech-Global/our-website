import 'dart:convert';
import 'dart:io';

import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/geo.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:civitech_global_flutter/design/palette.dart';
import 'package:civitech_global_flutter/design/theme.dart';
import 'package:civitech_global_flutter/features/browse/browse.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/api_client_test.dart' show FakeServer, MemoryTokens;

final _strings = Strings(
  jsonDecode(File('assets/l10n/en.json').readAsStringSync())
      as Map<String, Object?>,
);

final _geo = GeoNames.fromJson(
  jsonDecode(File('assets/geo/en.json').readAsStringSync())
      as Map<String, Object?>,
);

void main() {
  Future<FakeServer> pump(WidgetTester tester) async {
    final server = FakeServer((o) async {
      return (
        200,
        {
          'data': {
            'items': [
              {'id': 'b1', 'title': 'One'},
            ],
            'page': 1,
            'totalPages': 1,
            'total': 3,
          },
        },
      );
    });
    tester.view
      ..physicalSize = const Size(900, 2400)
      ..devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({'settings.reduceMotion': true});
    final prefs = await SharedPreferences.getInstance();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          l10nProvider.overrideWith(
            () => L10nController(L10nState('en', _strings)),
          ),
          geoNamesProvider.overrideWith((ref) async => _geo),
          apiClientProvider.overrideWithValue(
            ApiClient(
              tokens: MemoryTokens(),
              language: () => 'en',
              dio: Dio(BaseOptions(baseUrl: 'https://api.test/api/v1'))
                ..httpClientAdapter = server,
            ),
          ),
        ],
        child: MaterialApp(
          theme: buildTheme(GardenPalette.pistachio, Brightness.light),
          home: BrowseScreen(
            title: 'Books',
            path: '/bookshop/board',
            searchHint: 'Search',
            sorts: const [('newest', 'Newest')],
            countText: '{count} books',
            emptyText: 'None',
            filters: (_) => const [
              TextFilter('Author', 'author'),
              NumberRangeFilter(
                'Year',
                minKey: 'yearFrom',
                maxKey: 'yearTo',
                minLabel: 'From',
                maxLabel: 'To',
              ),
            ],
            itemBuilder: (context, row) => Text('${row['title']}'),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return server;
  }

  Future<void> openFilters(WidgetTester tester) async {
    await tester.tap(find.byType(FilterChip));
    await tester.pumpAndSettle();
  }

  Future<void> apply(WidgetTester tester) async {
    await tester.tap(find.text(_strings.mobile.showResults));
    await tester.pumpAndSettle();
  }

  testWidgets('the count says what the list counts', (tester) async {
    await pump(tester);
    expect(find.text('3 books'), findsOneWidget);
  });

  testWidgets('typed filters go as the server reads them', (tester) async {
    final server = await pump(tester);
    await openFilters(tester);
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Author'),
      '  Hedayat ',
    );
    await tester.enterText(find.widgetWithText(TextFormField, 'From'), '۱۳۹۰');
    await apply(tester);
    final last = server.requests.last.queryParameters;
    expect(last['author'], 'Hedayat');
    expect(last['yearFrom'], '1390');
    expect(last.containsKey('yearTo'), isFalse);
  });

  testWidgets('clearing empties the boxes, not just the query', (tester) async {
    final server = await pump(tester);
    await openFilters(tester);
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Author'),
      'Hedayat',
    );
    await apply(tester);
    await openFilters(tester);
    expect(find.text('Hedayat'), findsOneWidget);
    await tester.tap(find.text(_strings.jobs.clearFilters));
    await tester.pumpAndSettle();
    expect(find.text('Hedayat'), findsNothing);
    await apply(tester);
    expect(server.requests.last.queryParameters.containsKey('author'), isFalse);
  });
}
