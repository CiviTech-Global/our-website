import 'dart:io';

import 'package:flutter_driver/flutter_driver.dart';
import 'package:test/test.dart';

/// How smoothly the heaviest lists scroll on a real phone, in profile mode:
/// the two picture-led boards and two long text lists.
///
///     flutter drive --profile --target=test_driver/perf.dart \
///       --dart-define=API_BASE_URL=http://localhost:5000/api/v1
///
/// Each screen is opened by its website link, as a reader's tap on one
/// would, and flung up and down; build/SCREEN.timeline_summary.json then
/// holds its frame build and raster times and the frames that ran late.
void main() {
  late FlutterDriver driver;

  setUpAll(() async => driver = await FlutterDriver.connect());
  tearDownAll(() async => driver.close());

  final adb =
      '${Platform.environment['LOCALAPPDATA']}'
      r'\Android\Sdk\platform-tools\adb.exe';

  for (final (key, path) in [
    ('books', '/books'),
    ('market_products', '/marketplace/products'),
    ('projects', '/projects'),
    ('jobs', '/jobs'),
  ]) {
    test('$path scrolls smoothly', () async {
      await Process.run(adb, [
        'shell',
        'am',
        'start',
        '-n',
        'ir.rayantamaddonjahangostar.app/.MainActivity',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        'https://rayantamaddonjahangostar.ir/fa$path',
      ]);
      // Long enough for the list and its first pictures to arrive.
      await Future<void>.delayed(const Duration(seconds: 6));
      final list = find.byType('CustomScrollView');
      final timeline = await driver.traceAction(() async {
        for (var i = 0; i < 4; i++) {
          await driver.scroll(list, 0, -900, const Duration(milliseconds: 250));
          await Future<void>.delayed(const Duration(milliseconds: 900));
          await driver.scroll(list, 0, 900, const Duration(milliseconds: 250));
          await Future<void>.delayed(const Duration(milliseconds: 900));
        }
      });
      await TimelineSummary.summarize(
        timeline,
      ).writeTimelineToFile(key, pretty: true, includeSummary: true);
    }, timeout: const Timeout(Duration(minutes: 2)));
  }
}
