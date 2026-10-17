import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import 'help_library.dart';

/// Opens the guide [id] in a soft sheet that drags up to full height and down
/// to dismiss: the app's version of the web's help panel.
Future<void> showHelp(BuildContext context, String id) => showBaghSheet<void>(
  context,
  isScrollControlled: true,
  useSafeArea: true,
  // Framed inside the drag, so the glass pane moves with the sheet.
  framed: false,
  builder: (_) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.7,
    minChildSize: 0.4,
    maxChildSize: 0.95,
    builder: (context, scroll) => SheetFrame(
      child: _HelpBody(id: id, scroll: scroll),
    ),
  ),
);

/// The "?" in an app bar that opens this screen's guide.
class HelpAction extends ConsumerWidget {
  const HelpAction(this.id, {super.key});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    return IconButton(
      tooltip: s.help.openGuideLabel,
      icon: const Icon(Icons.help_outline_rounded),
      onPressed: () => showHelp(context, id),
    );
  }
}

class _HelpBody extends ConsumerWidget {
  const _HelpBody({required this.id, required this.scroll});

  final String id;
  final ScrollController scroll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final library = ref.watch(helpLibraryProvider);
    return library.when(
      loading: () => const Center(child: GirihSpinner()),
      error: (_, _) => Center(child: Text(s.common.error)),
      data: (library) {
        final article = library.article(id);
        if (article == null) {
          return Padding(
            padding: const EdgeInsets.all(BaghSpace.section),
            child: Text(s.help.noGuide),
          );
        }
        return _Article(article: article, library: library, scroll: scroll);
      },
    );
  }
}

class _Article extends ConsumerWidget {
  const _Article({
    required this.article,
    required this.library,
    required this.scroll,
  });

  final HelpArticle article;
  final HelpLibrary library;
  final ScrollController scroll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;

    Widget section(
      String title,
      List<(String, String)> items, {
      int tint = 0,
    }) => Padding(
      padding: const EdgeInsets.only(top: BaghSpace.section),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Text(title, style: text.titleMedium),
          for (final (head, body) in items)
            SoftSurface(
              tint: moduleTint(c, tint),
              radius: BaghRadius.tile,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 4,
                children: [
                  Text(
                    head,
                    style: BaghType.weight(
                      text.titleSmall!,
                      700,
                    ).copyWith(color: moduleTint(c, tint).ink),
                  ),
                  Text(
                    body,
                    style: text.bodyMedium?.copyWith(
                      color: moduleTint(c, tint).ink,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );

    return ListView(
      controller: scroll,
      // The sheet reaches the bottom edge, so its last lines clear the
      // system buttons by their own height.
      padding: BaghLayout.readablePadding(
        context,
        bottom:
            BaghSpace.section * 2 + MediaQuery.viewPaddingOf(context).bottom,
      ),
      children: [
        Text(article.heading ?? article.title, style: text.headlineSmall),
        const SizedBox(height: 6),
        Text(article.summary, style: text.bodyLarge?.copyWith(color: c.ink2)),
        if (article.fallback) ...[
          const SizedBox(height: 12),
          SoftSurface(
            tint: c.tints[2],
            radius: BaghRadius.tile,
            child: Text(s.help.fallbackNote),
          ),
        ],
        const SizedBox(height: 16),
        Text(article.intro, style: text.bodyLarge),
        if (article.steps.isNotEmpty) section(s.help.stepsTitle, article.steps),
        if (article.points.isNotEmpty)
          section(s.help.pointsTitle, article.points, tint: 2),
        if (article.tips.isNotEmpty)
          section(s.help.tipsTitle, article.tips, tint: 1),
        if (article.faqs.isNotEmpty) ...[
          const SizedBox(height: BaghSpace.section),
          Text(article.faqTitle ?? s.help.faqTitle, style: text.titleMedium),
          for (final (q, a) in article.faqs)
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              shape: const Border(),
              collapsedShape: const Border(),
              title: Text(q, style: text.titleSmall),
              childrenPadding: const EdgeInsets.only(bottom: 12),
              expandedCrossAxisAlignment: CrossAxisAlignment.start,
              children: [Text(a, style: text.bodyMedium)],
            ),
        ],
        if (article.related.isNotEmpty) ...[
          const SizedBox(height: BaghSpace.section),
          Text(s.help.relatedTitle, style: text.titleMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final id in article.related)
                if (library.article(id) case final related?)
                  ActionChip(
                    label: Text(related.title),
                    // On top of this sheet; dragging it down returns here.
                    onPressed: () => showHelp(context, id),
                  ),
            ],
          ),
        ],
      ],
    );
  }
}
