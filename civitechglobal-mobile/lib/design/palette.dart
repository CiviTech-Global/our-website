import 'package:flutter/material.dart';

/// The garden palettes. B opens the app; A, C and Glass are chosen in
/// settings.
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
  lapis,

  /// Abgineh (glass): frosted surfaces over a slowly drifting aurora, with
  /// layered elevation. A style as well as a palette; see [BaghColors.glass].
  abgineh;

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
    this.glass = false,
    this.aurora = const [],
    this.glassFill,
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

  /// The glass style: surfaces are translucent over an aurora instead of
  /// opaque plaster over a flat ground. [surface] is then the glass as it
  /// looks over the plain ground, the colour the contrast checks use.
  final bool glass;

  /// The aurora's colour fields, drawn behind every page in the glass style.
  final List<Color> aurora;

  /// The translucent fill of a glass surface; the opaque surface otherwise.
  final Color? glassFill;

  Color get pane => glassFill ?? surface;

  /// The light catching the top edge of a pane: brighter by day.
  Color get rim => isDark ? const Color(0x24FFFFFF) : const Color(0x99FFFFFF);

  /// A fill between ground and surface, for wells and pressed states.
  Color get fill => Color.lerp(ground, edge, isDark ? 0.10 : 0.07)!;

  /// A hairline for dividers that do not mark anything operable.
  Color get hair => Color.lerp(surface, edge, isDark ? 0.30 : 0.22)!;

  GardenTint get primarySoft => tints[0];
  GardenTint get accentSoft => tints[1];

  /// The shadow colour: warm-tinted by day, plain black at night.
  Color get shadow => isDark
      ? const Color(0xFF000000)
      : glass
      ? const Color(0xFF1B2250)
      : const Color(0xFF3C2814);

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
    glass: glass,
    aurora: aurora,
    glassFill: glassFill,
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
      glass: t < 0.5 ? glass : other.glass,
      aurora: t < 0.5 ? aurora : other.aurora,
      glassFill: Color.lerp(pane, other.pane, t),
    );
  }
}

const _white = Color(0xFFFFFFFF);

final Map<GardenPalette, BaghColors> _light = {
  GardenPalette.abgineh: const BaghColors(
    ground: Color(0xFFEFF4FC),
    surface: Color(0xFFFAFBFE),
    glass: true,
    glassFill: Color(0xA8FFFFFF),
    aurora: [Color(0xFFC8D6FF), Color(0xFFB4EFEA), Color(0xFFF7DAF3)],
    ink: Color(0xFF0E1321),
    ink2: Color(0xFF494F61),
    edge: Color(0xFF737A8D),
    primary: Color(0xFF3F4FBB),
    onPrimary: _white,
    accent: Color(0xFF029393),
    onAccent: Color(0xFF001617),
    error: Color(0xFFC2272D),
    onError: _white,
    isDark: false,
    tints: [
      GardenTint(Color(0xFFDBE4FF), Color(0xFF20287B)), // lajvard
      GardenTint(Color(0xFFC6F2F1), Color(0xFF004141)), // firouzeh
      GardenTint(Color(0xFFFAE0F7), Color(0xFF692256)), // golab
      GardenTint(Color(0xFFFFE7C8), Color(0xFF5F3808)), // saffron
      GardenTint(Color(0xFFD9F2D3), Color(0xFF1B451E)), // pistachio
    ],
  ),
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
  GardenPalette.abgineh: const BaghColors(
    ground: Color(0xFF040613),
    surface: Color(0xFF161724),
    glass: true,
    glassFill: Color(0x12FFFFFF),
    aurora: [Color(0xFF191D4E), Color(0xFF012828), Color(0xFF2F0F36)],
    ink: Color(0xFFEEF2FA),
    ink2: Color(0xFFB8BECB),
    edge: Color(0xFF788093),
    primary: Color(0xFF96ACFE),
    onPrimary: Color(0xFF06091C),
    accent: Color(0xFF65D2D2),
    onAccent: Color(0xFF001112),
    error: Color(0xFFFD736D),
    onError: Color(0xFF06091C),
    isDark: true,
    tints: [
      GardenTint(Color(0xFF1F285A), Color(0xFFD8E0FD)),
      GardenTint(Color(0xFF003636), Color(0xFFBCECEB)),
      GardenTint(Color(0xFF411F3E), Color(0xFFF1D8EE)),
      GardenTint(Color(0xFF432A08), Color(0xFFF9DCB6)),
      GardenTint(Color(0xFF1C3517), Color(0xFFCDECC6)),
    ],
  ),
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
