import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/content_page.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../intake/track_screen.dart';
import 'workspace_data.dart';

/// The requests a member made through the account-less intakes (insurance,
/// projects, consultations, CVs), kept by tracking code, each with where it
/// stands now: the web's MyRequestsPage. The full detail is the tracking
/// screen, one tap away. A row swipes away, with a moment to undo.
class RequestsScreen extends ConsumerStatefulWidget {
  const RequestsScreen({super.key});

  @override
  ConsumerState<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends ConsumerState<RequestsScreen> {
  final _code = TextEditingController();
  final _label = TextEditingController();
  bool _adding = false;
  String? _error;

  /// Rows already swiped away, hidden until the server's list catches up.
  final _gone = <String>{};

  @override
  void dispose() {
    _code.dispose();
    _label.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    final s = ref.read(stringsProvider);
    final code = toLatinDigits(
      _code.text,
    ).trim().toUpperCase().replaceAll(' ', '');
    if (code.length < 6 || code.length > 20) {
      setState(() => _error = s.mobile.fieldRules.minChars.fill({'n': 6}));
      return;
    }
    setState(() {
      _adding = true;
      _error = null;
    });
    try {
      final label = _label.text.trim();
      await ref
          .read(trackingActionsProvider)
          .track(code, label: label.isEmpty ? null : label);
      _code.clear();
      _label.clear();
      _gone.remove(code);
      await ref.read(hapticsProvider).success();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(s.workspace.added)));
      }
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  Future<void> _remove(TrackedRequest row) async {
    final s = ref.read(stringsProvider);
    final actions = ref.read(trackingActionsProvider);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _gone.add(row.code));
    try {
      await actions.untrack(row.code);
    } catch (e) {
      // Not removed after all: back it comes, with the reason.
      if (mounted) setState(() => _gone.remove(row.code));
      messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
      return;
    }
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(s.mobile.requestRemoved.fill({'code': row.code})),
          action: SnackBarAction(
            label: s.mobile.undo,
            onPressed: () async {
              try {
                await actions.track(row.code, label: row.label);
                if (mounted) setState(() => _gone.remove(row.code));
              } catch (e) {
                messenger.showSnackBar(
                  SnackBar(content: Text(describeError(s, e))),
                );
              }
            },
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.workspace;
    final rows = ref.watch(trackedRequestsProvider);
    return ContentPage(
      title: w.requestsTitle,
      subtitle: w.requestsIntro,
      helpId: 'my-requests',
      children: [
        const SizedBox(height: BaghSpace.section),
        SoftSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              TextField(
                controller: _code,
                textDirection: TextDirection.ltr,
                textCapitalization: TextCapitalization.characters,
                maxLength: 20,
                decoration: InputDecoration(
                  labelText: w.codeLabel,
                  counterText: '',
                ),
              ),
              TextField(
                controller: _label,
                maxLength: 80,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _add(),
                decoration: InputDecoration(
                  labelText: w.labelOptional,
                  counterText: '',
                ),
              ),
              if (_error != null) FormMessage(_error!),
              BaghKey(
                label: w.add,
                icon: Icons.add_rounded,
                loading: _adding,
                expand: true,
                onPressed: _add,
              ),
            ],
          ),
        ),
        const SizedBox(height: BaghSpace.section),
        AsyncView(
          value: rows,
          onRetry: () => ref.invalidate(trackedRequestsProvider),
          isEmpty: (list) => list.every((r) => _gone.contains(r.code)),
          empty: w.noRequests,
          data: (list) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 10,
            children: [
              for (final row in list)
                if (!_gone.contains(row.code))
                  Dismissible(
                    key: ValueKey(row.code),
                    onDismissed: (_) => _remove(row),
                    background: _SwipeBackground(label: w.remove),
                    child: _RequestRow(row: row, onRemove: () => _remove(row)),
                  ),
            ],
          ),
        ),
      ],
    );
  }
}

/// [text] isolated left to right inside a line in either direction (LRI ... PDI).
String _ltr(String text) =>
    '${String.fromCharCode(0x2066)}$text${String.fromCharCode(0x2069)}';

class _SwipeBackground extends StatelessWidget {
  const _SwipeBackground({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final t = BaghColors.of(context).tints[3];
    return DecoratedBox(
      decoration: ShapeDecoration(color: t.fill, shape: BaghRadius.shape()),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            for (var i = 0; i < 2; i++)
              Icon(
                Icons.delete_outline_rounded,
                color: t.ink,
                semanticLabel: i == 0 ? label : null,
              ),
          ],
        ),
      ),
    );
  }
}

class _RequestRow extends ConsumerWidget {
  const _RequestRow({required this.row, required this.onRemove});

  final TrackedRequest row;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.workspace;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final kind = switch (row.kind) {
      'insurance' => w.kindInsurance,
      'project' => w.kindProject,
      'resume' => w.kindResume,
      'consultation' => w.kindConsultation,
      _ => null,
    };
    final status = row.status;
    final details = Uri(
      path: '/track',
      queryParameters: {'code': row.code},
    ).toString();
    return SoftSurface(
      onTap: () async {
        await context.push(details);
        // A proposal answered or a consultation cancelled there moves the
        // status shown here.
        ref.invalidate(trackedRequestsProvider);
      },
      semanticLabel: row.label ?? kind ?? row.code,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 6,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                row.label ?? kind ?? row.code,
                style: BaghType.weight(text.titleSmall!, 750),
              ),
              if (row.kind != null && status != null)
                StatusPill(
                  requestStatusLabel(s, row.kind!, status),
                  tone: requestStatusTone(status),
                )
              else
                StatusPill(w.notFoundState, tone: 3),
            ],
          ),
          Text.rich(
            TextSpan(
              children: [
                if (row.label != null && kind != null)
                  TextSpan(text: '$kind${factSep(language)}'),
                // The code reads left to right in any language.
                TextSpan(text: _ltr(row.code)),
                if (row.createdAt case final at?)
                  TextSpan(
                    text: '${factSep(language)}${formatDate(at, language)}',
                  ),
              ],
            ),
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
          Align(
            alignment: AlignmentDirectional.centerEnd,
            child: TextButton.icon(
              icon: const Icon(Icons.delete_outline_rounded, size: 20),
              label: Text(w.remove),
              onPressed: onRemove,
            ),
          ),
        ],
      ),
    );
  }
}
