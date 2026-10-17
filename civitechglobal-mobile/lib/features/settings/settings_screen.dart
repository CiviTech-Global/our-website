import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../core/format.dart';
import '../../core/settings.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/pressable.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';

final _versionProvider = FutureProvider<String>(
  (ref) async => (await PackageInfo.fromPlatform()).version,
);

/// Appearance (palette and theme), motion and vibration, language.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final settings = ref.watch(settingsProvider);
    final controller = ref.read(settingsProvider.notifier);
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;

    Widget heading(String label) => Padding(
      padding: const EdgeInsets.fromLTRB(4, BaghSpace.section, 4, 10),
      child: Text(label, style: text.titleMedium),
    );

    return Scaffold(
      appBar: AppBar(title: Text(s.mobile.settingsTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          BaghSpace.gutter,
          0,
          BaghSpace.gutter,
          BaghSpace.section * 2,
        ),
        children: [
          heading(s.mobile.palette),
          for (final (palette, name) in [
            (GardenPalette.pistachio, s.mobile.paletteB),
            (GardenPalette.firouzeh, s.mobile.paletteA),
            (GardenPalette.lapis, s.mobile.paletteC),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _PaletteChoice(
                palette: palette,
                name: name,
                badge: palette == GardenPalette.pistachio
                    ? s.mobile.paletteDefault
                    : null,
                selected: settings.palette == palette,
                onTap: () => controller.setPalette(palette),
              ),
            ),
          heading(s.mobile.themeMode),
          SegmentedButton<ThemeMode>(
            showSelectedIcon: false,
            segments: [
              ButtonSegment(
                value: ThemeMode.system,
                label: Text(s.mobile.themeSystem),
              ),
              ButtonSegment(
                value: ThemeMode.light,
                label: Text(s.mobile.themeLight),
              ),
              ButtonSegment(
                value: ThemeMode.dark,
                label: Text(s.mobile.themeDark),
              ),
            ],
            selected: {settings.themeMode},
            onSelectionChanged: (v) {
              ref.read(hapticsProvider).selection();
              controller.setThemeMode(v.first);
            },
          ),
          heading(s.mobile.motionTitle),
          SoftSurface(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                SwitchListTile(
                  title: Text(s.mobile.reduceMotion),
                  subtitle: Text(s.mobile.reduceMotionHint),
                  value: settings.reduceMotion,
                  onChanged: controller.setReduceMotion,
                ),
                SwitchListTile(
                  title: Text(s.mobile.haptics),
                  subtitle: Text(s.mobile.hapticsHint),
                  value: settings.haptics,
                  onChanged: settings.reduceMotion
                      ? null
                      : controller.setHaptics,
                ),
              ],
            ),
          ),
          heading(s.mobile.language),
          SoftSurface(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: RadioGroup<String>(
              groupValue: language,
              onChanged: (v) {
                if (v == null) return;
                ref.read(hapticsProvider).selection();
                ref.read(l10nProvider.notifier).use(v);
              },
              child: Column(
                children: [
                  for (final code in supportedLanguages)
                    RadioListTile<String>(
                      value: code,
                      title: Text(languageNames[code]!),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: BaghSpace.section),
          Center(
            child: Text(
              '${s.mobile.version} ${localDigits(ref.watch(_versionProvider).value ?? '', language)}',
              style: text.bodySmall,
            ),
          ),
        ],
      ),
    );
  }
}

/// A palette as a card painted in its own colours, light and dark side by
/// side, so the choice is made by looking, not by reading names.
class _PaletteChoice extends StatelessWidget {
  const _PaletteChoice({
    required this.palette,
    required this.name,
    required this.selected,
    required this.onTap,
    this.badge,
  });

  final GardenPalette palette;
  final String name;
  final String? badge;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final light = BaghColors.resolve(palette, Brightness.light);
    final dark = BaghColors.resolve(palette, Brightness.dark);
    final text = Theme.of(context).textTheme;

    Widget dots(BaghColors p) => Row(
      mainAxisSize: MainAxisSize.min,
      spacing: 4,
      children: [
        for (final color in [
          p.primary,
          p.accent,
          p.tints[2].fill,
          p.tints[3].fill,
          p.tints[4].fill,
        ])
          Container(
            width: 18,
            height: 18,
            decoration: ShapeDecoration(
              color: color,
              shape: CircleBorder(
                side: BorderSide(color: p.edge.withValues(alpha: 0.4)),
              ),
            ),
          ),
      ],
    );

    return Semantics(
      selected: selected,
      inMutuallyExclusiveGroup: true,
      child: Pressable(
        onPressed: onTap,
        semanticLabel: name,
        focusRadius: BaghRadius.card,
        builder: (context, depth) => AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.all(14),
          decoration: ShapeDecoration(
            color: c.surface,
            shape: RoundedSuperellipseBorder(
              borderRadius: BorderRadius.circular(BaghRadius.card),
              side: BorderSide(
                color: selected ? c.primary : c.hair,
                width: selected ? 2.5 : 1,
              ),
            ),
            shadows: BaghDepth.rest(c),
          ),
          child: Row(
            spacing: 12,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: 8,
                  children: [
                    Row(
                      spacing: 8,
                      children: [
                        Flexible(child: Text(name, style: text.titleSmall)),
                        if (badge != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 1,
                            ),
                            decoration: ShapeDecoration(
                              color: c.accentSoft.fill,
                              shape: const StadiumBorder(),
                            ),
                            child: Text(
                              badge!,
                              style: text.labelSmall?.copyWith(
                                color: c.accentSoft.ink,
                              ),
                            ),
                          ),
                      ],
                    ),
                    Wrap(
                      spacing: 10,
                      runSpacing: 6,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: ShapeDecoration(
                            color: light.ground,
                            shape: const StadiumBorder(),
                          ),
                          child: dots(light),
                        ),
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: ShapeDecoration(
                            color: dark.ground,
                            shape: const StadiumBorder(),
                          ),
                          child: dots(dark),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_off_rounded,
                color: selected ? c.primary : c.edge,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
