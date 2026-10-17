import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../design/palette.dart';

/// The six languages the web offers, Persian first.
const supportedLanguages = ['fa', 'en', 'tr', 'de', 'fr', 'es'];

/// What the person chose, kept on the device.
@immutable
class AppSettings {
  const AppSettings({
    this.language,
    this.themeMode = ThemeMode.system,
    this.palette = GardenPalette.pistachio,
    this.reduceMotion = false,
    this.haptics = true,
  });

  /// Null until the first-run language choice has been made.
  final String? language;
  final ThemeMode themeMode;
  final GardenPalette palette;

  /// On top of the system's own setting, never instead of it: either one
  /// turns motion into fades (see `BaghMotion`).
  final bool reduceMotion;
  final bool haptics;

  AppSettings copyWith({
    String? language,
    ThemeMode? themeMode,
    GardenPalette? palette,
    bool? reduceMotion,
    bool? haptics,
  }) => AppSettings(
    language: language ?? this.language,
    themeMode: themeMode ?? this.themeMode,
    palette: palette ?? this.palette,
    reduceMotion: reduceMotion ?? this.reduceMotion,
    haptics: haptics ?? this.haptics,
  );
}

/// The preferences store, opened once in `main` before the first frame.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('Overridden in main()'),
);

final settingsProvider = NotifierProvider<SettingsController, AppSettings>(
  SettingsController.new,
);

class SettingsController extends Notifier<AppSettings> {
  static const _language = 'settings.language';
  static const _theme = 'settings.themeMode';
  static const _palette = 'settings.palette';
  static const _motion = 'settings.reduceMotion';
  static const _haptics = 'settings.haptics';

  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);

  @override
  AppSettings build() {
    final language = _prefs.getString(_language);
    return AppSettings(
      language: supportedLanguages.contains(language) ? language : null,
      themeMode: ThemeMode.values.firstWhere(
        (m) => m.name == _prefs.getString(_theme),
        orElse: () => ThemeMode.system,
      ),
      palette: GardenPalette.parse(_prefs.getString(_palette)),
      reduceMotion: _prefs.getBool(_motion) ?? false,
      haptics: _prefs.getBool(_haptics) ?? true,
    );
  }

  Future<void> setLanguage(String language) async {
    state = state.copyWith(language: language);
    await _prefs.setString(_language, language);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = state.copyWith(themeMode: mode);
    await _prefs.setString(_theme, mode.name);
  }

  Future<void> setPalette(GardenPalette palette) async {
    state = state.copyWith(palette: palette);
    await _prefs.setString(_palette, palette.name);
  }

  Future<void> setReduceMotion(bool value) async {
    state = state.copyWith(reduceMotion: value);
    await _prefs.setBool(_motion, value);
  }

  Future<void> setHaptics(bool value) async {
    state = state.copyWith(haptics: value);
    await _prefs.setBool(_haptics, value);
  }
}
