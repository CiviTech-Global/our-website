import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config.dart';
import '../../design/palette.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/centered_scroll.dart';
import '../../design/widgets/girih.dart';
import '../../l10n/l10n.dart';

/// Where the app is installed from. Cafe Bazaar first: the store most Android
/// phones in Iran use. The website's download page covers everyone else.
const _bazaar = 'https://cafebazaar.ir/app/ir.rayantamaddonjahangostar.app';

/// Shown instead of the app when this build is below the server's version
/// floor: it would only fail request after request, so it says so plainly.
class UpdateRequiredScreen extends ConsumerWidget {
  const UpdateRequiredScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: CenteredScroll(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 16,
            children: [
              Center(child: GirihStar(color: c.accent, size: 64)),
              Text(
                s.mobile.updateRequiredTitle,
                style: text.headlineSmall,
                textAlign: TextAlign.center,
              ),
              Text(
                s.mobile.updateRequiredBody,
                style: text.bodyLarge,
                textAlign: TextAlign.center,
              ),
              BaghKey(
                label: s.mobile.updateAction,
                expand: true,
                onPressed: () => openStore(ref),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Opens the store page, or the website if no store app answers.
Future<void> openStore(WidgetRef ref) async {
  final opened = await launchUrl(
    Uri.parse(_bazaar),
    mode: LaunchMode.externalApplication,
  );
  if (!opened) {
    await launchUrl(
      AppConfig.website('/', ref.read(l10nProvider).language),
      mode: LaunchMode.externalApplication,
    );
  }
}
