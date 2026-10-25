import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/markdown_blocks.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';

/// One article's listing: what the index shows before an article is opened.
class BlogPostMeta {
  const BlogPostMeta(this.j);

  final Map<String, Object?> j;

  String get slug => '${j['slug']}';
  String get locale => '${j['locale']}';
  String get title => '${j['title']}';
  String get description => '${j['description']}';
  String get dateLabel => '${j['dateLabel'] ?? ''}';
  int get minutes => (j['readingMinutes'] as num?)?.toInt() ?? 1;
}

/// The articles, from the export of the web's blog (assets/blog/index.json).
final blogIndexProvider = FutureProvider<List<BlogPostMeta>>((ref) async {
  final raw = await loadJsonList('assets/blog/index.json');
  return [for (final p in raw) BlogPostMeta(p as Map<String, Object?>)];
});

/// One article with its blocks and FAQs.
final blogPostProvider =
    FutureProvider.family<Map<String, Object?>?, (String, String)>((
      ref,
      key,
    ) async {
      final (slug, locale) = key;
      try {
        return await loadJsonAsset('assets/blog/$slug.$locale.json');
      } catch (_) {
        return null;
      }
    });

/// Articles are written in Persian first; a reader in another language sees
/// the ones in their language, or, when there are none yet, the Persian ones
/// under a note saying so, as the web's blog index does.
class BlogIndexScreen extends ConsumerWidget {
  const BlogIndexScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final index = ref.watch(blogIndexProvider);
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    return ContentPage(
      title: s.blog.title,
      subtitle: s.blog.subtitle,
      helpId: 'blog',
      children: [
        const SizedBox(height: BaghSpace.section),
        AsyncView(
          value: index,
          onRetry: () => ref.invalidate(blogIndexProvider),
          data: (all) {
            final own = all.where((p) => p.locale == language).toList();
            final shown = own.isNotEmpty
                ? own
                : all.where((p) => p.locale == 'fa').toList();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 12,
              children: [
                if (own.isEmpty)
                  SoftSurface(
                    tint: c.tints[2],
                    radius: BaghRadius.tile,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 4,
                      children: [
                        Text(
                          s.blog.otherLanguageTitle,
                          style: text.titleSmall?.copyWith(
                            color: c.tints[2].ink,
                          ),
                        ),
                        Text(
                          s.blog.otherLanguageBody,
                          style: text.bodyMedium?.copyWith(
                            color: c.tints[2].ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                for (final post in shown)
                  SoftSurface(
                    semanticLabel: post.title,
                    onTap: () =>
                        context.push('/blog/${post.slug}?lang=${post.locale}'),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 6,
                      children: [
                        Text(
                          post.title,
                          textDirection: isRtl(post.locale)
                              ? TextDirection.rtl
                              : TextDirection.ltr,
                          style: text.titleMedium,
                        ),
                        Text(
                          post.description,
                          textDirection: isRtl(post.locale)
                              ? TextDirection.rtl
                              : TextDirection.ltr,
                          style: text.bodyMedium?.copyWith(color: c.ink2),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${post.dateLabel}${factSep(language)}${s.blog.minutes.fill({'n': localDigits(post.minutes, language), 'count': localDigits(post.minutes, language)})}',
                          style: text.bodySmall,
                        ),
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class BlogPostScreen extends ConsumerWidget {
  const BlogPostScreen({required this.slug, this.locale, super.key});

  final String slug;
  final String? locale;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final language = ref.watch(l10nProvider).language;
    final key = (slug, locale ?? language);
    final post = ref.watch(blogPostProvider(key));

    return post.when(
      loading: () => const Scaffold(body: SizedBox.shrink()),
      error: (_, _) => _NotFound(s: s),
      data: (p) {
        // Not in the asked-for language: try the Persian edition.
        if (p == null && key.$2 != 'fa') {
          return BlogPostScreen(slug: slug, locale: 'fa');
        }
        if (p == null) return _NotFound(s: s);
        final postLocale = '${p['locale']}';
        final blocks = [
          for (final b in (p['blocks'] as List? ?? const []))
            b as Map<String, Object?>,
        ];
        return Directionality(
          // The article in its own direction, whatever the app's language.
          textDirection: isRtl(postLocale)
              ? TextDirection.rtl
              : TextDirection.ltr,
          child: ContentPage(
            title: '${p['title']}',
            subtitle: '${p['description']}',
            eyebrow:
                '${p['dateLabel'] ?? ''}${factSep(language)}${s.blog.minutes.fill({'n': localDigits(p['readingMinutes'] ?? 1, language), 'count': localDigits(p['readingMinutes'] ?? 1, language)})}',
            children: [
              const SizedBox(height: BaghSpace.gutter),
              MarkdownBlocks(blocks),
              CtaCard(
                title: s.blog.ctaTitle,
                body: s.blog.ctaBody,
                primary: (
                  s.blog.ctaButton,
                  () => openLink(context, ref, '/start-project'),
                ),
                secondary: (s.blog.backToBlog, () => context.pop()),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _NotFound extends StatelessWidget {
  const _NotFound({required this.s});

  final Strings s;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(leading: homeLeading(context)),
    body: EmptyNote(message: '${s.blog.notFoundTitle}\n${s.blog.notFoundBody}'),
  );
}
