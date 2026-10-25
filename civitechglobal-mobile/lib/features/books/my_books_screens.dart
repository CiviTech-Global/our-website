import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../jobs/jobs_format.dart' show postedAgo;
import '../jobs/seeker_screens.dart'
    show MemberListPage, ReviewNote, statusTone;
import 'book_data.dart';
import 'book_ui.dart';

Future<bool> _run(
  BuildContext context,
  WidgetRef ref,
  Future<void> Function() action, {
  String? done,
}) async {
  final s = ref.read(stringsProvider);
  final messenger = ScaffoldMessenger.of(context);
  try {
    await action();
    await ref.read(hapticsProvider).success();
    if (done != null) messenger.showSnackBar(SnackBar(content: Text(done)));
    return true;
  } catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(describeError(s, e))));
    return false;
  }
}

int _requestTone(String status) => switch (status) {
  'REQUESTED' => 1,
  'ACCEPTED' => 2,
  'DECLINED' => 3,
  'COMPLETED' => 0,
  _ => 4,
};

/// The seller's side, as the web's MyBookOffersPage: the copies they offer
/// and the requests to buy them, a tab each. Price and stock change in
/// place; the rest goes through the editor and back through review.
class MyBooksScreen extends ConsumerStatefulWidget {
  const MyBooksScreen({this.requests = false, super.key});

  /// Opened on the requests tab (`?tab=requests`).
  final bool requests;

  @override
  ConsumerState<MyBooksScreen> createState() => _MyBooksScreenState();
}

class _MyBooksScreenState extends ConsumerState<MyBooksScreen> {
  late bool _requests = widget.requests;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final language = ref.watch(l10nProvider).language;
    final offers = ref.watch(ownOffersProvider);
    final requests = ref.watch(bookRequestsProvider('seller'));
    final waiting =
        requests.value?.where((r) => r.status == 'REQUESTED').length ?? 0;
    return MemberListPage(
      title: b.myBooksTitle,
      helpId: 'my-books',
      onRefresh: () async {
        ref
          ..invalidate(ownOffersProvider)
          ..invalidate(bookRequestsProvider('seller'));
        await ref.read(ownOffersProvider.future);
      },
      children: [
        BaghKey(
          label: b.sellBook,
          icon: Icons.add_rounded,
          expand: true,
          onPressed: () => context.push('/dashboard/books/sell'),
        ),
        const SizedBox(height: BaghSpace.gutter),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ChoiceChip(
              label: Text(b.tabCopies),
              selected: !_requests,
              onSelected: (_) => setState(() => _requests = false),
            ),
            ChoiceChip(
              label: Text(
                waiting > 0
                    ? '${b.tabRequests} (${localDigits(waiting, language)})'
                    : b.tabRequests,
              ),
              selected: _requests,
              onSelected: (_) => setState(() => _requests = true),
            ),
          ],
        ),
        const SizedBox(height: BaghSpace.gutter),
        if (!_requests)
          AsyncView(
            value: offers,
            onRetry: () => ref.invalidate(ownOffersProvider),
            isEmpty: (list) => list.isEmpty,
            empty: b.myBooksEmpty,
            data: (list) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 12,
              children: [
                for (final o in list)
                  _OwnOfferCard(
                    o,
                    onRequests: () => setState(() => _requests = true),
                  ),
              ],
            ),
          )
        else
          AsyncView(
            value: requests,
            onRetry: () => ref.invalidate(bookRequestsProvider('seller')),
            isEmpty: (list) => list.isEmpty,
            empty: b.requestsEmpty,
            data: (list) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 12,
              children: [
                for (final r in list) BookRequestCard(r, seller: true),
              ],
            ),
          ),
      ],
    );
  }
}

/// The seller's own first photo, through the sign-in.
class _OwnPhoto extends ConsumerWidget {
  const _OwnPhoto(this.id);

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = BaghColors.of(context);
    final bytes = ref.watch(ownBookPhotoProvider(id)).value;
    return Container(
      color: c.fill,
      child: bytes == null
          ? Icon(Icons.image_outlined, color: c.ink2)
          : Image.memory(bytes, fit: BoxFit.cover, gaplessPlayback: true),
    );
  }
}

class _OwnOfferCard extends ConsumerWidget {
  const _OwnOfferCard(this.o, {required this.onRequests});

  final OwnOffer o;
  final VoidCallback onRequests;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final book = o.book;
    final actions = ref.read(bookActionsProvider);
    final waiting = o.requests['REQUESTED'] ?? 0;
    final accepted = o.requests['ACCEPTED'] ?? 0;
    String n(int v) => localDigits(v, language);

    return SoftSurface(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              SizedBox(
                width: 60,
                // No catalogue cover yet: the seller's own first photo.
                child: book?.coverUrl == null && o.photoIds.isNotEmpty
                    ? AspectRatio(
                        aspectRatio: 2 / 3,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(
                            BaghRadius.tile / 2,
                          ),
                          child: _OwnPhoto(o.photoIds.first),
                        ),
                      )
                    : BookCover(
                        url: book?.coverUrl,
                        title: book?.title ?? '',
                        small: true,
                      ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 6,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        StatusPill(
                          m.label(o.moderationStatus),
                          tone: statusTone(o.moderationStatus),
                        ),
                        if (o.live)
                          StatusPill(
                            m.label(o.state),
                            tone: o.state == 'OPEN' ? 0 : 4,
                          ),
                        if (o.grade case final g?) GradePill(g),
                        if (o.live)
                          StatusPill(
                            o.quantity > 0 ? b.inStock : b.outOfStock,
                            tone: o.quantity > 0 ? 0 : 4,
                          ),
                      ],
                    ),
                    InkWell(
                      onTap: book != null && o.live
                          ? () => context.push('/books/${book.code}')
                          : null,
                      child: Text(book?.title ?? '—', style: text.titleMedium),
                    ),
                    if (book != null && book.authors.isNotEmpty)
                      Text(namesText(book.authors, language), style: small),
                    Text(
                      '#${o.code}',
                      textDirection: TextDirection.ltr,
                      style: small,
                    ),
                  ],
                ),
              ),
            ],
          ),
          Wrap(
            spacing: 12,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                bookMoney(o.price, o.currency, s, language) ?? '',
                style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              if (o.negotiable) Text(b.negotiable, style: small),
              Text(b.quantityLeft.fill({'n': n(o.quantity)}), style: small),
              if (o.soldCount > 0)
                Text(b.sold.fill({'n': n(o.soldCount)}), style: small),
              Row(
                mainAxisSize: MainAxisSize.min,
                spacing: 3,
                children: [
                  Icon(Icons.visibility_outlined, size: 14, color: c.ink2),
                  Text(n(o.viewCount), style: small),
                ],
              ),
              if (accepted > 0)
                Text('${b.accepted}: ${n(accepted)}', style: small),
            ],
          ),
          if (waiting > 0)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                icon: const Icon(Icons.notifications_active_outlined),
                label: Text(b.waitingRequests.fill({'n': n(waiting)})),
                onPressed: onRequests,
              ),
            ),
          if (o.reviewNote != null &&
              (o.moderationStatus == 'REJECTED' ||
                  o.moderationStatus == 'CHANGES_REQUESTED'))
            ReviewNote(o.reviewNote!),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (o.live)
                BaghKey(
                  label: b.quickEdit,
                  icon: Icons.sell_outlined,
                  kind: BaghKeyKind.outline,
                  onPressed: () => showBaghSheet<void>(
                    context,
                    isScrollControlled: true,
                    useSafeArea: true,
                    builder: (_) => _QuickEditSheet(o),
                  ),
                ),
              // The server takes a full edit only before review or when sent
              // back; a live copy changes price and stock in place.
              if (o.submittable)
                BaghKey(
                  label: s.common.edit,
                  icon: Icons.edit_outlined,
                  kind: BaghKeyKind.outline,
                  onPressed: () =>
                      context.push('/dashboard/books/${o.id}/edit'),
                ),
              if (o.submittable)
                BaghKey(
                  label: b.submitForReview,
                  icon: Icons.send_rounded,
                  onPressed: o.photoIds.isEmpty
                      ? null
                      : () => _run(
                          context,
                          ref,
                          () => actions.submit(o.id),
                          done: b.submitted,
                        ),
                ),
              if (o.live)
                TextButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    () => actions.setOpen(o.id, open: o.state != 'OPEN'),
                    done: b.saved,
                  ),
                  child: Text(o.state == 'OPEN' ? b.close : b.open),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Price, stock and shipping on a live copy, without another review.
class _QuickEditSheet extends ConsumerStatefulWidget {
  const _QuickEditSheet(this.o);

  final OwnOffer o;

  @override
  ConsumerState<_QuickEditSheet> createState() => _QuickEditSheetState();
}

class _QuickEditSheetState extends ConsumerState<_QuickEditSheet> {
  final _form = GlobalKey<FormState>();
  late String _price = widget.o.price;
  late String _quantity = '${widget.o.quantity}';
  late bool _negotiable = widget.o.negotiable;
  late String _shipping = widget.o.shippingCost ?? '';
  bool _sending = false;
  String? _error;

  Future<void> _save() async {
    final s = ref.read(stringsProvider);
    if (!_form.currentState!.validate()) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final shipping = plainDigits(_shipping);
      await ref
          .read(bookActionsProvider)
          .quickEdit(
            widget.o.id,
            price: plainDigits(_price),
            quantity: (int.tryParse(plainDigits(_quantity)) ?? 0).clamp(0, 999),
            negotiable: _negotiable,
            shippingCost: shipping.isEmpty ? null : shipping,
          );
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.bookshop.quickEditSaved)));
      Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final text = Theme.of(context).textTheme;
    final digits = [FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]'))];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 14,
            children: [
              Text(b.quickEdit, style: text.titleLarge),
              TextFormField(
                initialValue: groupThousands(_price),
                keyboardType: TextInputType.number,
                textDirection: TextDirection.ltr,
                inputFormatters: [...digits, const ThousandsFormatter()],
                onChanged: (v) => _price = v,
                validator: (v) => plainDigits(v ?? '').isEmpty
                    ? s.mobile.fieldRules.required
                    : null,
                decoration: InputDecoration(labelText: b.priceLabel),
              ),
              TextFormField(
                initialValue: _quantity,
                keyboardType: TextInputType.number,
                textDirection: TextDirection.ltr,
                inputFormatters: digits,
                onChanged: (v) => _quantity = v,
                decoration: InputDecoration(labelText: b.quantityLabel),
              ),
              if (widget.o.ships)
                TextFormField(
                  initialValue: groupThousands(_shipping),
                  keyboardType: TextInputType.number,
                  textDirection: TextDirection.ltr,
                  inputFormatters: [...digits, const ThousandsFormatter()],
                  onChanged: (v) => _shipping = v,
                  decoration: InputDecoration(
                    labelText: b.shippingLabel,
                    helperText: b.shippingHint,
                    helperMaxLines: 3,
                  ),
                ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(b.negotiableLabel),
                value: _negotiable,
                onChanged: (v) => setState(() => _negotiable = v),
              ),
              if (_error case final e?) FormMessage(e),
              BaghKey(
                label: s.common.save,
                icon: Icons.check_rounded,
                loading: _sending,
                expand: true,
                onPressed: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The buyer's side, as the web's BookPurchasesPage: every book the reader
/// asked to buy, and where each stands.
class BookPurchasesScreen extends ConsumerWidget {
  const BookPurchasesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final requests = ref.watch(bookRequestsProvider('buyer'));
    return MemberListPage(
      title: b.purchasesTitle,
      helpId: 'my-books',
      onRefresh: () => ref.refresh(bookRequestsProvider('buyer').future),
      children: [
        AsyncView(
          value: requests,
          onRetry: () => ref.invalidate(bookRequestsProvider('buyer')),
          data: (list) => list.isEmpty
              ? EmptyNote(
                  message: b.purchasesEmpty,
                  action: (b.browseBooks, () => context.push('/books')),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 12,
                  children: [
                    for (final r in list) BookRequestCard(r, seller: false),
                  ],
                ),
        ),
      ],
    );
  }
}

/// One request to buy, as either side sees it, as the web's
/// BookRequestCard: the seller accepts or declines a waiting request, then
/// marks an accepted one handed over; the buyer can withdraw until then.
class BookRequestCard extends ConsumerWidget {
  const BookRequestCard(this.r, {required this.seller, super.key});

  final BookRequestRow r;
  final bool seller;

  Future<void> _decline(BuildContext context, WidgetRef ref) async {
    final s = ref.read(stringsProvider);
    final b = s.bookshop;
    final reason = TextEditingController();
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text(b.decline),
          content: TextField(
            controller: reason,
            minLines: 2,
            maxLines: 5,
            maxLength: 500,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: b.declineReason),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(s.common.cancel),
            ),
            FilledButton(
              onPressed: reason.text.trim().length < 3
                  ? null
                  : () => Navigator.of(context).pop(true),
              child: Text(b.decline),
            ),
          ],
        ),
      ),
    );
    final text = reason.text;
    reason.dispose();
    if (sure != true || !context.mounted) return;
    await _run(
      context,
      ref,
      () => ref.read(bookActionsProvider).answer(r.id, 'decline', reason: text),
      done: b.declined,
    );
  }

  Future<void> _handOver(BuildContext context, WidgetRef ref) async {
    final s = ref.read(stringsProvider);
    final b = s.bookshop;
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(b.markHandedOver),
        content: Text(b.markHandedOverConfirm),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(s.common.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(b.markHandedOver),
          ),
        ],
      ),
    );
    if (sure != true || !context.mounted) return;
    await _run(
      context,
      ref,
      () => ref.read(bookActionsProvider).answer(r.id, 'complete'),
      done: b.completed,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final b = s.bookshop;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final actions = ref.read(bookActionsProvider);
    final place = placeText(r.city, r.province, language);
    String n(int v) => localDigits(v, language);
    String money(String? v) => bookMoney(v, r.currency, s, language) ?? '';

    final facts = <(String, String)>[
      (b.deliveryMethod, b.delivery.label(r.deliveryMethod)),
      if (r.deliveryMethod != 'IN_PERSON')
        (
          b.shipping,
          r.shippingCost == null
              ? b.shippingAsk
              : r.shippingCost == '0'
              ? b.shippingFree
              : money(r.shippingCost),
        ),
      if (r.offeredPrice case final p?) (b.offeredPrice, money(p)),
      if (place.isNotEmpty) (b.location, place),
    ];

    return SoftSurface(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              SizedBox(
                width: 52,
                child: BookCover(
                  url: r.coverUrl,
                  title: r.bookTitle ?? '',
                  small: true,
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 5,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        StatusPill(
                          b.requestStatus.label(r.status),
                          tone: _requestTone(r.status),
                        ),
                        if (r.grade case final g?) GradePill(g),
                      ],
                    ),
                    InkWell(
                      onTap: r.bookCode == null
                          ? null
                          : () => context.push('/books/${r.bookCode}'),
                      child: Text(r.bookTitle ?? '—', style: text.titleMedium),
                    ),
                    if (r.bookAuthors.isNotEmpty)
                      Text(namesText(r.bookAuthors, language), style: small),
                    Text(
                      [
                        '#${r.code}',
                        b.requestedOn.fill({
                          'ago': postedAgo(r.createdAt, s, language),
                        }),
                      ].join(factSep(language)),
                      style: small,
                    ),
                  ],
                ),
              ),
            ],
          ),
          // The amount on its own line: beside the title a large total left
          // the title no room on a narrow phone.
          Wrap(
            spacing: 8,
            runSpacing: 2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                money(r.total),
                style: text.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              Text('${n(r.quantity)} × ${money(r.unitPrice)}', style: small),
            ],
          ),
          if (r.counterparty case final who?)
            Wrap(
              spacing: 6,
              runSpacing: 2,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text('${seller ? b.buyer : b.seller}:', style: small),
                InkWell(
                  onTap: () => context.push('/profiles/${who.username}'),
                  child: Text(
                    '@${who.username}',
                    textDirection: TextDirection.ltr,
                    style: text.titleSmall,
                  ),
                ),
                if (who.ratingCount > 0)
                  Text(
                    '★ ${localDecimal(who.ratingAvg, 1, language)} (${n(who.ratingCount)})',
                    style: small,
                  ),
              ],
            ),
          for (final (label, value) in facts)
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: '$label: ', style: small),
                  TextSpan(text: value),
                ],
              ),
              style: text.bodyMedium,
            ),
          if (r.note case final note?)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: c.fill,
                borderRadius: BorderRadius.circular(BaghRadius.tile),
              ),
              child: Text(
                note,
                style: text.bodyMedium?.copyWith(color: c.ink2),
                textDirection: textDirectionOf(
                  note,
                  Directionality.of(context),
                ),
              ),
            ),
          if (r.status == 'DECLINED' && r.declineReason != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: c.tints[3].fill,
                borderRadius: BorderRadius.circular(BaghRadius.tile),
              ),
              child: Text(
                r.declineReason!,
                style: text.bodyMedium?.copyWith(color: c.tints[3].ink),
              ),
            ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (seller && r.status == 'REQUESTED') ...[
                BaghKey(
                  label: b.accept,
                  icon: Icons.check_rounded,
                  onPressed: () => _run(
                    context,
                    ref,
                    () => actions.answer(r.id, 'accept'),
                    done: b.accepted,
                  ),
                ),
                BaghKey(
                  label: b.decline,
                  icon: Icons.close_rounded,
                  kind: BaghKeyKind.outline,
                  onPressed: () => _decline(context, ref),
                ),
              ],
              if (seller && r.status == 'ACCEPTED')
                BaghKey(
                  label: b.markHandedOver,
                  icon: Icons.done_all_rounded,
                  onPressed: () => _handOver(context, ref),
                ),
              if (!seller && r.open)
                BaghKey(
                  label: b.cancelRequest,
                  icon: Icons.close_rounded,
                  kind: BaghKeyKind.outline,
                  onPressed: () => _run(
                    context,
                    ref,
                    () => actions.answer(r.id, 'cancel'),
                    done: b.cancelled,
                  ),
                ),
              if (r.status == 'COMPLETED' && r.awardId != null)
                BaghKey(
                  label: b.leaveReview,
                  icon: Icons.star_outline_rounded,
                  kind: BaghKeyKind.outline,
                  onPressed: () => context.push('/dashboard/awards'),
                ),
              TextButton.icon(
                icon: const Icon(Icons.chat_bubble_outline_rounded),
                label: Text(
                  r.unreadMessages > 0
                      ? '${b.openChat} (${b.unreadMessages.fill({'n': n(r.unreadMessages)})})'
                      : b.openChat,
                ),
                onPressed: () => context.push('/dashboard/messages/k/${r.id}'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
