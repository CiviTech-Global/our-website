import 'package:flutter/material.dart';

/// The three garden palettes. B opens the app; A and C are chosen in settings.
///
/// Every value was calculated from OKLCH and checked against WCAG 2.2 AA in
/// both themes: text 4.5:1 or better, control edges and the primary against
/// the ground 3:1 or better, each tint's ink 8.6:1 or better on its tint. The
/// figures are in the plan of record. Change a value here only together with
/// a fresh contrast check.
enum GardenPalette {
  /// B: Pistachio & Pomegranate, the default.
  pistachio,

  /// A: Firouzeh & Saffron, the web's own colours.
  firouzeh,

  /// C: Lapis & Apricot, the calmest.
  lapis;

  static GardenPalette parse(String? name) =>
      values.firstWhere((p) => p.name == name, orElse: () => pistachio);
}

/// A pastel garden tint and the ink that reads on it.
@immutable
class GardenTint {
  const GardenTint(this.fill, this.ink);

  final Color fill;
  final Color ink;

  static GardenTint lerp(GardenTint a, GardenTint b, double t) =>
      GardenTint(Color.lerp(a.fill, b.fill, t)!, Color.lerp(a.ink, b.ink, t)!);
}

/// Bagh Ravan's colour roles, as a theme extension.
///
/// Components ask for a role (`colors.surface`, `colors.tints[2]`), never a
/// literal colour, so switching palette or theme changes tokens and nothing
/// else. Tints are in a fixed order: [0] the primary's tint, [1] the accent's,
/// then three more; modules take theirs by index (see `moduleTint`).
@immutable
class BaghColors extends ThemeExtension<BaghColors> {
  const BaghColors({
    required this.ground,
    required this.surface,
    required this.ink,
    required this.ink2,
    required this.edge,
    required this.primary,
    required this.onPrimary,
    required this.accent,
    required this.onAccent,
    required this.error,
    required this.onError,
    required this.tints,
    required this.isDark,
  });

  /// The ground every screen stands on.
  final Color ground;

  /// Cards, sheets and the navigation bar: one step lighter than the ground.
  final Color surface;
  final Color ink;
  final Color ink2;

  /// The edge of anything operable: 3:1 or better against ground and surface.
  final Color edge;
  final Color primary;
  final Color onPrimary;
  final Color accent;
  final Color onAccent;
  final Color error;
  final Color onError;
  final List<GardenTint> tints;
  final bool isDark;

  /// A fill between ground and surface, for wells and pressed states.
  Color get fill => Color.lerp(ground, edge, isDark ? 0.10 : 0.07)!;

  /// A hairline for dividers that do not mark anything operable.
  Color get hair => Color.lerp(surface, edge, isDark ? 0.30 : 0.22)!;

  GardenTint get primarySoft => tints[0];
  GardenTint get accentSoft => tints[1];

  /// The shadow colour: warm-tinted by day, plain black at night.
  Color get shadow =>
      isDark ? const Color(0xFF000000) : const Color(0xFF3C2814);

  static BaghColors of(BuildContext context) =>
      Theme.of(context).extension<BaghColors>()!;

  static BaghColors resolve(GardenPalette palette, Brightness brightness) =>
      brightness == Brightness.dark ? _dark[palette]! : _light[palette]!;

  @override
  BaghColors copyWith({Color? ground, Color? surface}) => BaghColors(
    ground: ground ?? this.ground,
    surface: surface ?? this.surface,
    ink: ink,
    ink2: ink2,
    edge: edge,
    primary: primary,
    onPrimary: onPrimary,
    accent: accent,
    onAccent: onAccent,
    error: error,
    onError: onError,
    tints: tints,
    isDark: isDark,
  );

  /// Interpolated, so switching palette in settings is a cross-fade, not a cut.
  @override
  BaghColors lerp(BaghColors? other, double t) {
    if (other == null) return this;
    Color c(Color a, Color b) => Color.lerp(a, b, t)!;
    return BaghColors(
      ground: c(ground, other.ground),
      surface: c(surface, other.surface),
      ink: c(ink, other.ink),
      ink2: c(ink2, other.ink2),
      edge: c(edge, other.edge),
      primary: c(primary, other.primary),
      onPrimary: c(onPrimary, other.onPrimary),
      accent: c(accent, other.accent),
      onAccent: c(onAccent, other.onAccent),
      error: c(error, other.error),
      onError: c(onError, other.onError),
      tints: [
        for (var i = 0; i < tints.length; i++)
          GardenTint.lerp(tints[i], other.tints[i], t),
      ],
      isDark: t < 0.5 ? isDark : other.isDark,
    );
  }
}

const _white = Color(0xFFFFFFFF);

final Map<GardenPalette, BaghColors> _light = {
  GardenPalette.pistachio: const BaghColors(
    ground: Color(0xFFF1F7F0),
    surface: Color(0xFFFCFEFC),
    ink: Color(0xFF111812),
    ink2: Color(0xFF4D554E),
    edge: Color(0xFF7A837C),
    primary: Color(0xFF21763C),
    onPrimary: _white,
    accent: Color(0xFFC72C4C),
    onAccent: _white,
    error: Color(0xFFB71A18),
    onError: _white,
    isDark: false,
    tints: [
      GardenTint(Color(0xFFCDF1C5), Color(0xFF0D371A)), // pistachio
      GardenTint(Color(0xFFFFE1E4), Color(0xFF78182B)), // anar
      GardenTint(Color(0xFFD0EFFF), Color(0xFF014263)), // sky
      GardenTint(Color(0xFFFFE5D8), Color(0xFF6C2D0A)), // apricot
      GardenTint(Color(0xFFF6EDB7), Color(0xFF463D00)), // quince
    ],
  ),
  GardenPalette.firouzeh: const BaghColors(
    ground: Color(0xFFF7F3EC),
    surface: Color(0xFFFFFDFB),
    ink: Color(0xFF191510),
    ink2: Color(0xFF56524B),
    edge: Color(0xFF857F78),
    primary: Color(0xFF057B6E),
    onPrimary: _white,
    accent: Color(0xFFF5AE39),
    onAccent: Color(0xFF351900),
    error: Color(0xFFC92F33),
    onError: _white,
    isDark: false,
    tints: [
      GardenTint(Color(0xFFC1F0E7), Color(0xFF013630)), // firouzeh
      GardenTint(Color(0xFFFFE8C2), Color(0xFF593301)), // saffron
      GardenTint(Color(0xFFDFEAFE), Color(0xFF183680)), // lajvard
      GardenTint(Color(0xFFFFE1E4), Color(0xFF751E2D)), // golab
      GardenTint(Color(0xFFDCF2C8), Color(0xFF2A4618)), // pistachio
    ],
  ),
  GardenPalette.lapis: const BaghColors(
    ground: Color(0xFFF1F6FA),
    surface: Color(0xFFFCFDFF),
    ink: Color(0xFF11161F),
    ink2: Color(0xFF4D535E),
    edge: Color(0xFF7A808D),
    primary: Color(0xFF325CBD),
    onPrimary: _white,
    accent: Color(0xFFF7A062),
    onAccent: Color(0xFF381706),
    error: Color(0xFFC2272D),
    onError: _white,
    isDark: false,
    tints: [
      GardenTint(Color(0xFFDAE7FE), Color(0xFF112C6F)), // lajvard
      GardenTint(Color(0xFFFFE6D3), Color(0xFF67310D)), // apricot
      GardenTint(Color(0xFFCDF3EB), Color(0xFF02423A)), // firouzeh
      GardenTint(Color(0xFFFFE0ED), Color(0xFF701F46)), // golab
      GardenTint(Color(0xFFDCF2C8), Color(0xFF2A4618)), // pistachio
    ],
  ),
};

final Map<GardenPalette, BaghColors> _dark = {
  GardenPalette.pistachio: const BaghColors(
    ground: Color(0xFF060D07),
    surface: Color(0xFF101812),
    ink: Color(0xFFEEF4EC),
    ink2: Color(0xFFB3B9B2),
    edge: Color(0xFF6C746D),
    primary: Color(0xFF73C881),
    onPrimary: Color(0xFF071009),
    accent: Color(0xFFFA7F8C),
    onAccent: Color(0xFF150A0A),
    error: Color(0xFFFD7466),
    onError: Color(0xFF071009),
    isDark: true,
    tints: [
      GardenTint(Color(0xFF153C1D), Color(0xFFC6EABE)),
      GardenTint(Color(0xFF512227), Color(0xFFF7D4D8)),
      GardenTint(Color(0xFF043247), Color(0xFFC4E4F4)),
      GardenTint(Color(0xFF482612), Color(0xFFFED8C4)),
      GardenTint(Color(0xFF363110), Color(0xFFECE3AE)),
    ],
  ),
  GardenPalette.firouzeh: const BaghColors(
    ground: Color(0xFF070B14),
    surface: Color(0xFF11161F),
    ink: Color(0xFFEDF2FA),
    ink2: Color(0xFFB3B8BF),
    edge: Color(0xFF6D727A),
    primary: Color(0xFF50C8B6),
    onPrimary: Color(0xFF0B0F18),
    accent: Color(0xFFF5AE39),
    onAccent: Color(0xFF231103),
    error: Color(0xFFFD736D),
    onError: Color(0xFF0B0F18),
    isDark: true,
    tints: [
      GardenTint(Color(0xFF013C35), Color(0xFFB2ECE1)),
      GardenTint(Color(0xFF462D0B), Color(0xFFF7DAAA)),
      GardenTint(Color(0xFF1B2C51), Color(0xFFD1DEF9)),
      GardenTint(Color(0xFF472024), Color(0xFFF7D4D8)),
      GardenTint(Color(0xFF233319), Color(0xFFD1E7BD)),
    ],
  ),
  GardenPalette.lapis: const BaghColors(
    ground: Color(0xFF060B16),
    surface: Color(0xFF101622),
    ink: Color(0xFFEEF2FA),
    ink2: Color(0xFFB3B7C1),
    edge: Color(0xFF6C727E),
    primary: Color(0xFF87ADFA),
    onPrimary: Color(0xFF070D1A),
    accent: Color(0xFFF7A062),
    onAccent: Color(0xFF1C0D06),
    error: Color(0xFFFD736D),
    onError: Color(0xFF070D1A),
    isDark: true,
    tints: [
      GardenTint(Color(0xFF182D5D), Color(0xFFD4E2FD)),
      GardenTint(Color(0xFF4D2809), Color(0xFFF9DBC4)),
      GardenTint(Color(0xFF063630), Color(0xFFBAE9E0)),
      GardenTint(Color(0xFF442032), Color(0xFFF7D7E5)),
      GardenTint(Color(0xFF233319), Color(0xFFD4EAC0)),
    ],
  ),
};
