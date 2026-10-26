import 'package:civitech_global_flutter/main.dart' as app;
import 'package:flutter_driver/driver_extension.dart';

/// The app as it ships, with the driver extension on, for perf_test.dart.
Future<void> main() async {
  enableFlutterDriverExtension();
  await app.main();
}
