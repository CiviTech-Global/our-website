/// Where the app talks to. Overridden per build with
/// `--dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1` for a local
/// server (10.0.2.2 is the host machine from the Android emulator).
abstract final class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://rayantamaddonjahangostar.ir/api/v1',
  );

  static const websiteUrl = String.fromEnvironment(
    'WEBSITE_URL',
    defaultValue: 'https://rayantamaddonjahangostar.ir',
  );

  /// The website's address for [path] in [language]: Persian owns the root,
  /// the others sit under their prefix, as on the web (localePath.ts).
  static Uri website(String path, String language) {
    final prefix = language == 'fa' ? '' : '/$language';
    final clean = path == '/' ? '' : path;
    return Uri.parse('$websiteUrl$prefix$clean');
  }
}
