import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'api/api_client.dart';

/// What this deployment can do, from `/api/capabilities`: whether it can
/// send email and SMS, which module switches are on, and the app version
/// floor. The app asks instead of assuming, as the web does, so an
/// affordance that cannot work is never drawn.
class Capabilities {
  const Capabilities({
    this.email = false,
    this.sms = false,
    this.features = const {},
    this.minVersion = '1.0.0',
    this.latestVersion = '1.0.0',
    this.bazaarUrl,
    this.myketUrl,
  });

  factory Capabilities.fromJson(Map<String, Object?> json) {
    final features = json['features'];
    final mobile = json['mobile'];
    return Capabilities(
      email: json['email'] == true,
      sms: json['sms'] == true,
      features: features is Map
          ? {for (final e in features.entries) '${e.key}': e.value == true}
          : const {},
      minVersion: mobile is Map
          ? '${mobile['minVersion'] ?? '1.0.0'}'
          : '1.0.0',
      latestVersion: mobile is Map
          ? '${mobile['latestVersion'] ?? '1.0.0'}'
          : '1.0.0',
      bazaarUrl: _storeUrl(mobile, 'bazaar'),
      myketUrl: _storeUrl(mobile, 'myket'),
    );
  }

  final bool email;
  final bool sms;
  final Map<String, bool> features;
  final String minVersion;
  final String latestVersion;

  /// The app's Cafe Bazaar page, once it is listed there.
  final String? bazaarUrl;

  /// The app's Myket page, once it is listed there.
  final String? myketUrl;

  /// Where an update comes from: the store this copy was installed from,
  /// never another one. Both stores require that a copy they installed is
  /// updated only through them and never points at another store or a
  /// download, and the same APK is uploaded to each, so the choice is made
  /// on the phone from the installer Android reports. A store's page for
  /// [package] is at a fixed address, which the server may override. Null
  /// (a copy from the website or adb) means the website's /app page.
  String? updateUrlFor(String? installer, String package) =>
      switch (installer) {
        'com.farsitel.bazaar' =>
          bazaarUrl ?? 'https://cafebazaar.ir/app/$package',
        'ir.mservices.market' => myketUrl ?? 'https://myket.ir/app/$package',
        _ => null,
      };

  /// A module switch; off when the server did not mention it.
  bool feature(String name) => features[name] ?? false;
}

/// A store page from the server's `mobile.downloads`, only when https.
String? _storeUrl(Object? mobile, String store) {
  final url = switch (mobile) {
    {'downloads': final Map<Object?, Object?> downloads} => downloads[store],
    _ => null,
  };
  return url is String && url.startsWith('https://') ? url : null;
}

/// Unknown capabilities read as "no", never as an error: the app must still
/// open offline, just without the parts that need the server to say yes.
final capabilitiesProvider = FutureProvider<Capabilities>((ref) async {
  try {
    return await ref
        .read(apiClientProvider)
        .get(
          '/capabilities',
          parse: (d) => Capabilities.fromJson(d! as Map<String, Object?>),
        );
  } catch (_) {
    return const Capabilities();
  }
});

/// Compares dotted versions numerically: 1.10.0 is newer than 1.9.3.
int compareVersions(String a, String b) {
  List<int> parts(String v) =>
      v.split('+').first.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  final x = parts(a), y = parts(b);
  for (var i = 0; i < 3; i++) {
    final d = (i < x.length ? x[i] : 0) - (i < y.length ? y[i] : 0);
    if (d != 0) return d.sign;
  }
  return 0;
}

enum UpdateNeed { none, suggested, required }

/// Whether this installed build must, or should, be updated.
final updateNeedProvider = FutureProvider<UpdateNeed>((ref) async {
  final caps = await ref.watch(capabilitiesProvider.future);
  final installed = (await PackageInfo.fromPlatform()).version;
  if (compareVersions(installed, caps.minVersion) < 0) {
    return UpdateNeed.required;
  }
  if (compareVersions(installed, caps.latestVersion) < 0) {
    return UpdateNeed.suggested;
  }
  return UpdateNeed.none;
});
