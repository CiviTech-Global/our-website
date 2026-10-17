import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/settings.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';

/// The first thing a new install shows: which language to use, each name in
/// its own language, as the web asks a first-time visitor. Shown once; the
/// choice can be changed in settings any time.
class LanguageChoiceScreen extends ConsumerWidget {
  const LanguageChoiceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final current = ref.watch(l10nProvider).language;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: BaghLayout.readablePadding(
            context,
            top: BaghSpace.section,
            bottom: BaghSpace.section,
          ),
          children: [
            const Center(child: GardenMotif(size: 180)),
            const SizedBox(height: BaghSpace.section),
            // Both, because this screen is read before a language is chosen.
            Text(
              'زبان خود را انتخاب کنید',
              textAlign: TextAlign.center,
              textDirection: TextDirection.rtl,
              style: text.headlineSmall,
            ),
            Text(
              'Choose your language',
              textAlign: TextAlign.center,
              textDirection: TextDirection.ltr,
              style: text.titleMedium?.copyWith(color: c.ink2),
            ),
            const SizedBox(height: BaghSpace.section),
            for (final code in supportedLanguages)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: SoftSurface(
                  tint: code == current ? c.primarySoft : null,
                  semanticLabel: languageNames[code],
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 16,
                  ),
                  onTap: () async {
                    await ref.read(hapticsProvider).selection();
                    await ref.read(l10nProvider.notifier).use(code);
                  },
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          languageNames[code]!,
                          textDirection: isRtl(code)
                              ? TextDirection.rtl
                              : TextDirection.ltr,
                          style: text.titleMedium?.copyWith(
                            color: code == current ? c.primarySoft.ink : null,
                          ),
                        ),
                      ),
                      if (code == current)
                        Icon(Icons.check_rounded, color: c.primarySoft.ink),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
