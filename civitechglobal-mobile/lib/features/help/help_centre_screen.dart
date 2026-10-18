import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/content_page.dart';
import '../../l10n/l10n.dart';
import 'help_library.dart';
import 'help_sheet.dart';

/// Every guide in one place, grouped by collection, with a search over the
/// titles and summaries: the web's help centre. A guide opens in the help
/// sheet; member guides carry a "for members" mark.
class HelpCentreScreen extends ConsumerStatefulWidget {
  const HelpCentreScreen({super.key});

  @override
  ConsumerState<HelpCentreScreen> createState() => _HelpCentreScreenState();
}

class _HelpCentreScreenState extends ConsumerState<HelpCentreScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final library = ref.watch(helpLibraryProvider);
    return ContentPage(
      title: s.help.centreTitle,
      subtitle: s.help.centreSubtitle,
      children: [
        const SizedBox(height: BaghSpace.section),
        TextField(
          onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: s.help.searchPlaceholder,
            prefixIcon: const Icon(Icons.search_rounded),
          ),
        ),
        AsyncView(
          value: library,
          onRetry: () => ref.invalidate(helpLibraryProvider),
          data: (lib) {
            final groups = <String, List<HelpArticle>>{};
            final audience = <String, String>{};
            for (final (id, collection, aud) in lib.entries) {
              final article = lib.article(id);
              if (article == null) continue;
              final hit =
                  _query.isEmpty ||
                  article.title.toLowerCase().contains(_query) ||
                  article.summary.toLowerCase().contains(_query);
              if (!hit) continue;
              (groups[collection] ??= []).add(article);
              audience[id] = aud;
            }
            if (groups.isEmpty) return EmptyNote(message: s.help.searchEmpty);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final (i, entry) in groups.entries.indexed)
                  ContentSection(
                    title: lib.collection(entry.key)?.$1 ?? entry.key,
                    subtitle: _query.isEmpty
                        ? lib.collection(entry.key)?.$2
                        : null,
                    children: [
                      for (final article in entry.value)
                        InfoCard(
                          title: audience[article.id] == 'member'
                              ? '${article.title} · ${s.help.audienceMember}'
                              : article.title,
                          body: article.summary,
                          tint: i,
                          onTap: () => showHelp(context, article.id),
                        ),
                    ],
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}
