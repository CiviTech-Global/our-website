import 'package:flutter/material.dart';

import 'palette.dart';
import 'tokens.dart';

/// Material 3 wired to Bagh Ravan's tokens.
///
/// Material supplies behaviour (focus, semantics, text editing); the look
/// comes from here. With `highContrast` (the system's high-contrast text
/// setting) every surface gets a real border and shadows fall away, because a
/// shadow is the first thing such a reader cannot see.
ThemeData buildTheme(
  GardenPalette palette,
  Brightness brightness, {
  bool highContrast = false,
}) {
  final c = BaghColors.resolve(palette, brightness);
  final text = BaghType.textTheme(c);

  final scheme = ColorScheme(
    brightness: brightness,
    primary: c.primary,
    onPrimary: c.onPrimary,
    primaryContainer: c.primarySoft.fill,
    onPrimaryContainer: c.primarySoft.ink,
    secondary: c.accent,
    onSecondary: c.onAccent,
    secondaryContainer: c.accentSoft.fill,
    onSecondaryContainer: c.accentSoft.ink,
    tertiary: c.tints[2].ink,
    onTertiary: c.tints[2].fill,
    tertiaryContainer: c.tints[2].fill,
    onTertiaryContainer: c.tints[2].ink,
    error: c.error,
    onError: c.onError,
    surface: c.surface,
    onSurface: c.ink,
    onSurfaceVariant: c.ink2,
    surfaceContainerLowest: c.surface,
    surfaceContainerLow: c.surface,
    surfaceContainer: c.surface,
    surfaceContainerHigh: c.fill,
    surfaceContainerHighest: c.fill,
    outline: c.edge,
    outlineVariant: c.hair,
    shadow: c.shadow,
    inverseSurface: c.ink,
    onInverseSurface: c.surface,
    inversePrimary: c.primarySoft.fill,
  );

  final fieldBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(BaghRadius.field),
    borderSide: BorderSide(color: c.edge, width: 1.5),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    fontFamily: BaghType.family,
    textTheme: text,
    scaffoldBackgroundColor: c.ground,
    canvasColor: c.ground,
    splashFactory: NoSplash.splashFactory,
    extensions: [c],
    appBarTheme: AppBarTheme(
      backgroundColor: c.ground,
      foregroundColor: c.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: text.titleLarge,
    ),
    cardTheme: CardThemeData(
      color: c.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: highContrast
          ? RoundedSuperellipseBorder(
              borderRadius: BorderRadius.circular(BaghRadius.card),
              side: BorderSide(color: c.edge, width: 1.5),
            )
          : BaghRadius.shape(),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: fieldBorder,
      enabledBorder: fieldBorder,
      // Saffron-style focus: the accent at full strength, thicker, so focus is
      // never a colour change alone.
      focusedBorder: fieldBorder.copyWith(
        borderSide: BorderSide(color: c.primary, width: 2.5),
      ),
      errorBorder: fieldBorder.copyWith(
        borderSide: BorderSide(color: c.error, width: 1.5),
      ),
      focusedErrorBorder: fieldBorder.copyWith(
        borderSide: BorderSide(color: c.error, width: 2.5),
      ),
      labelStyle: text.labelMedium?.copyWith(color: c.ink2),
      floatingLabelStyle: text.labelMedium?.copyWith(color: c.primary),
      hintStyle: text.bodyMedium?.copyWith(color: c.ink2),
      errorStyle: text.labelSmall?.copyWith(color: c.error),
      helperStyle: text.bodySmall,
      helperMaxLines: 3,
      errorMaxLines: 3,
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: c.primary,
        textStyle: text.labelLarge,
        minimumSize: const Size(48, 44),
        shape: const StadiumBorder(),
      ),
    ),
    switchTheme: SwitchThemeData(
      trackOutlineColor: WidgetStatePropertyAll(c.edge),
      thumbColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? c.onPrimary : c.edge,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (s) => s.contains(WidgetState.selected) ? c.primary : c.fill,
      ),
    ),
    dividerTheme: DividerThemeData(color: c.hair, thickness: 1, space: 1),
    // The selected segment wears the primary's tint, the same as a selected
    // tab, rather than Material's secondary (which here is the accent).
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        side: WidgetStatePropertyAll(BorderSide(color: c.edge, width: 1.5)),
        textStyle: WidgetStatePropertyAll(text.labelMedium),
        backgroundColor: WidgetStateProperty.resolveWith(
          (s) =>
              s.contains(WidgetState.selected) ? c.primarySoft.fill : c.surface,
        ),
        foregroundColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? c.primarySoft.ink : c.ink,
        ),
      ),
    ),
    listTileTheme: ListTileThemeData(
      iconColor: c.ink2,
      textColor: c.ink,
      titleTextStyle: text.titleSmall,
      subtitleTextStyle: text.bodySmall,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
      minVerticalPadding: 12,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: c.ink,
      contentTextStyle: text.bodyMedium?.copyWith(color: c.surface),
      shape: RoundedSuperellipseBorder(
        borderRadius: BorderRadius.circular(BaghRadius.tile),
      ),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c.surface,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      dragHandleColor: c.edge,
      shape: const RoundedSuperellipseBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(BaghRadius.sheet),
        ),
      ),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: c.primary),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
  );
}
