import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/format.dart';
import '../../core/links.dart';
import '../../l10n/l10n.dart';
import '../palette.dart';
import '../tokens.dart';

/// Renders the blocks the web's Markdown parser produces
/// (civitechglobal-web/src/lib/markdown.tsx): h2, h3, p, ul, ol, table and
/// quote, with **bold** and [links](...) inline, the only inline marks the
/// site uses. The parsing happens once, on the web side, at export; the app
/// draws the same structure natively.
class MarkdownBlocks extends ConsumerWidget {
  const MarkdownBlocks(this.blocks, {super.key});

  final List<Map<String, Object?>> blocks;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final language = ref.watch(l10nProvider.select((l) => l.language));
    final body = text.bodyLarge!;

    Widget inline(String source, TextStyle style) => Text.rich(
      TextSpan(
        children: inlineSpans(
          source,
          style,
          c,
          (href) => openLink(context, ref, href),
        ),
      ),
    );

    final children = <Widget>[];
    for (final block in blocks) {
      switch (block['kind']) {
        case 'h2':
          children.add(
            Padding(
              padding: const EdgeInsets.only(top: BaghSpace.section),
              child: inline('${block['text']}', text.titleLarge!),
            ),
          );
        case 'h3':
          children.add(
            Padding(
              padding: const EdgeInsets.only(top: BaghSpace.gutter),
              child: inline('${block['text']}', text.titleMedium!),
            ),
          );
        case 'p':
          children.add(inline('${block['text']}', body));
        case 'quote':
          children.add(
            Container(
              padding: const EdgeInsetsDirectional.only(
                start: 14,
                top: 4,
                bottom: 4,
              ),
              decoration: BoxDecoration(
                border: BorderDirectional(
                  start: BorderSide(color: c.primary, width: 3),
                ),
              ),
              child: inline('${block['text']}', body.copyWith(color: c.ink2)),
            ),
          );
        case 'ul' || 'ol':
          final ordered = block['kind'] == 'ol';
          final items = [
            for (final i in (block['items'] as List? ?? const [])) '$i',
          ];
          children.add(
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 6,
              children: [
                for (final (n, item) in items.indexed)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 10,
                    children: [
                      SizedBox(
                        width: 22,
                        child: Text(
                          ordered ? '${localDigits(n + 1, language)}.' : '•',
                          style: BaghType.weight(
                            body,
                            700,
                          ).copyWith(color: c.primary),
                        ),
                      ),
                      Expanded(child: inline(item, body)),
                    ],
                  ),
              ],
            ),
          );
        case 'table':
          final head = [
            for (final h in (block['head'] as List? ?? const [])) '$h',
          ];
          final rows = [
            for (final r in (block['rows'] as List? ?? const []))
              [for (final cell in r as List) '$cell'],
          ];
          children.add(_Table(head: head, rows: rows, inline: inline));
      }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 12,
      children: children,
    );
  }
}

final _token = RegExp(r'(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))');

/// **bold** and [label](href), as the web's renderInline.
List<InlineSpan> inlineSpans(
  String source,
  TextStyle style,
  BaghColors c,
  void Function(String href) onLink,
) {
  final spans = <InlineSpan>[];
  var last = 0;
  for (final m in _token.allMatches(source)) {
    if (m.start > last) {
      spans.add(TextSpan(text: source.substring(last, m.start), style: style));
    }
    final token = m[0]!;
    if (token.startsWith('**')) {
      spans.add(
        TextSpan(
          text: token.substring(2, token.length - 2),
          style: BaghType.weight(style, 750),
        ),
      );
    } else {
      final link = RegExp(r'^\[([^\]]+)\]\(([^)\s]+)\)$').firstMatch(token)!;
      spans.add(
        TextSpan(
          text: link[1],
          style: style.copyWith(
            color: c.primary,
            decoration: TextDecoration.underline,
            decorationColor: c.primary,
          ),
          recognizer: TapGestureRecognizer()..onTap = () => onLink(link[2]!),
        ),
      );
    }
    last = m.end;
  }
  if (last < source.length) {
    spans.add(TextSpan(text: source.substring(last), style: style));
  }
  return spans;
}

/// A table that scrolls sideways when it is wider than the screen, rather
/// than squeezing its columns until the words break letter by letter.
class _Table extends StatelessWidget {
  const _Table({required this.head, required this.rows, required this.inline});

  final List<String> head;
  final List<List<String>> rows;
  final Widget Function(String, TextStyle) inline;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    Widget cell(String value, {bool header = false}) => ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 96, maxWidth: 220),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: inline(
          value,
          header ? BaghType.weight(text.labelMedium!, 750) : text.bodyMedium!,
        ),
      ),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(BaghRadius.tile),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: c.pane,
            border: Border.all(color: c.hair),
            borderRadius: BorderRadius.circular(BaghRadius.tile),
          ),
          child: Table(
            defaultColumnWidth: const IntrinsicColumnWidth(),
            border: TableBorder(horizontalInside: BorderSide(color: c.hair)),
            children: [
              TableRow(
                decoration: BoxDecoration(color: c.primarySoft.fill),
                children: [for (final h in head) cell(h, header: true)],
              ),
              for (final row in rows)
                TableRow(
                  children: [
                    for (var i = 0; i < head.length; i++)
                      cell(i < row.length ? row[i] : ''),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
