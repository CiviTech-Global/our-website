import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/files.dart';
import '../../core/format.dart';
import '../../core/location.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/leave_guard.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../jobs/seeker_screens.dart' show MemberListPage, statusTone;
import '../profile/profile_data.dart';
import 'market_data.dart';
import 'market_ui.dart';

/// The shop owner's side, as the web's MyShopsPage and ShopProductsPage,
/// with the rules of lib/marketForms.

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

Future<bool> _confirm(
  BuildContext context,
  WidgetRef ref,
  String body, {
  required String action,
}) async {
  final s = ref.read(stringsProvider);
  final sure = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      content: Text(body),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(s.common.cancel),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(action),
        ),
      ],
    ),
  );
  return sure == true;
}

/// A picture the owner holds, through the sign-in.
class _OwnImage extends ConsumerWidget {
  const _OwnImage(this.path, {this.icon = Icons.image_outlined});

  final String path;
  final IconData icon;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = BaghColors.of(context);
    final bytes = ref.watch(ownMarketImageProvider(path)).value;
    return Container(
      color: c.fill,
      child: bytes == null
          ? Icon(icon, color: c.ink2)
          : Image.memory(bytes, fit: BoxFit.cover, gaplessPlayback: true),
    );
  }
}

// ---------------------------------------------------------------------------
// The form rules (the web's marketForms.ts)
// ---------------------------------------------------------------------------

final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final _phone = RegExp(r'^\+?[0-9][0-9\s-]{5,24}$');

bool _webUrl(String value) {
  final uri = Uri.tryParse(value);
  return uri != null &&
      (uri.scheme == 'http' || uri.scheme == 'https') &&
      uri.host.isNotEmpty;
}

/// A coordinate as typed, the Persian decimal mark included.
double? parseCoordinate(String value, double limit) {
  final text = toLatinDigits(value).trim().replaceAll('٫', '.');
  if (!RegExp(r'^-?\d+(\.\d+)?$').hasMatch(text)) return null;
  final n = double.tryParse(text);
  return n != null && n.abs() <= limit ? n : null;
}

/// A whole price over zero, at most fifteen digits; null otherwise.
String? parsePrice(String value) {
  // Only the grouping marks go: anything else makes it not a price.
  final digits = toLatinDigits(value).trim().replaceAll(RegExp(r'[,،٬\s]'), '');
  if (!RegExp(r'^\d{1,15}$').hasMatch(digits)) return null;
  final trimmed = digits.replaceFirst(RegExp(r'^0+(?=\d)'), '');
  return BigInt.parse(trimmed) > BigInt.zero ? trimmed : null;
}

int? parseCount(String value) {
  final digits = toLatinDigits(value).trim();
  if (!RegExp(r'^\d+$').hasMatch(digits)) return null;
  final n = int.parse(digits);
  return n <= 1000000 ? n : null;
}

// ---------------------------------------------------------------------------
// My shops
// ---------------------------------------------------------------------------

class MyShopsScreen extends ConsumerWidget {
  const MyShopsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final shops = ref.watch(ownShopsProvider);
    final verified =
        ref.watch(ownVerificationProvider).value?.status == 'APPROVED';
    return MemberListPage(
      title: tm.myShops,
      subtitle: tm.myShopsSubtitle,
      helpId: 'my-shops',
      onRefresh: () => ref.refresh(ownShopsProvider.future),
      children: [
        if (verified)
          BaghKey(
            label: tm.newShop,
            icon: Icons.add_rounded,
            expand: true,
            onPressed: () => context.push('/dashboard/shops/new'),
          )
        else
          SoftSurface(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 10,
              children: [
                Text(tm.verificationRequired),
                BaghKey(
                  label: tm.goToVerification,
                  kind: BaghKeyKind.outline,
                  onPressed: () => context.push('/dashboard/verification'),
                ),
              ],
            ),
          ),
        const SizedBox(height: BaghSpace.gutter),
        AsyncView(
          value: shops,
          onRetry: () => ref.invalidate(ownShopsProvider),
          isEmpty: (list) => list.isEmpty,
          empty: tm.noOwnShops,
          data: (list) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [for (final shop in list) _OwnShopCard(shop)],
          ),
        ),
      ],
    );
  }
}

class _OwnShopCard extends ConsumerWidget {
  const _OwnShopCard(this.shop);

  final OwnShop shop;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final actions = ref.read(marketActionsProvider);
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
              SizedBox.square(
                dimension: 60,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(BaghRadius.tile),
                  child: shop.hasLogo
                      ? _OwnImage(
                          ownShopLogoPath(shop.id),
                          icon: Icons.storefront_outlined,
                        )
                      : Container(
                          color: c.fill,
                          child: Icon(Icons.storefront_outlined, color: c.ink2),
                        ),
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 6,
                  children: [
                    Text(shop.name, style: text.titleMedium),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        StatusPill(
                          m.label(shop.moderationStatus),
                          tone: statusTone(shop.moderationStatus),
                        ),
                        if (shop.approved && shop.state != 'EXPIRED')
                          StatusPill(
                            m.label(shop.state),
                            tone: shop.state == 'OPEN' ? 0 : 4,
                          ),
                        if (shop.featured)
                          StatusPill(s.showcase.featured, tone: 1),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          Text(shop.summary, maxLines: 3, overflow: TextOverflow.ellipsis),
          Text(
            [
              tm.productCount.fill({
                'count': localDigits(shop.productCount, language),
              }),
              shop.code,
            ].join(factSep(language)),
            style: small,
          ),
          if (shop.reviewNote case final note?)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: c.tints[1].fill,
                borderRadius: BorderRadius.circular(BaghRadius.tile),
              ),
              child: Text(
                '${m.reviewNote}: $note',
                style: text.bodyMedium?.copyWith(color: c.tints[1].ink),
              ),
            ),
          if (shop.moderationStatus == 'APPROVED')
            Text(hub.approvedShopHint, style: small),
          if (shop.moderationStatus == 'PENDING_REVIEW')
            Text(hub.pendingShopHint, style: small),
          // Said here rather than in a confirmation: it stays true for as
          // long as the shop is shut.
          if (shop.state == 'CLOSED') Text(tm.closedHint, style: small),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (shop.approved)
                BaghKey(
                  label: hub.manageListings,
                  icon: Icons.inventory_2_outlined,
                  onPressed: () =>
                      context.push('/dashboard/shops/${shop.id}/products'),
                ),
              if (shop.editable) ...[
                BaghKey(
                  label: tm.editShop,
                  icon: Icons.edit_outlined,
                  kind: BaghKeyKind.outline,
                  onPressed: () =>
                      context.push('/dashboard/shops/${shop.id}/edit'),
                ),
                BaghKey(
                  label: tm.submitForReview,
                  icon: Icons.send_rounded,
                  onPressed: () {
                    final messenger = ScaffoldMessenger.of(context);
                    if (!shop.hasLogo) {
                      messenger.showSnackBar(
                        SnackBar(content: Text(tm.logoRequired)),
                      );
                      return;
                    }
                    if (shop.businessCategoryId == null) {
                      messenger.showSnackBar(
                        SnackBar(content: Text(hub.categoryRequiredToSubmit)),
                      );
                      context.push('/dashboard/shops/${shop.id}/edit');
                      return;
                    }
                    _run(
                      context,
                      ref,
                      () => actions.shop(shop.id, 'submit'),
                      done: tm.shopSubmitted,
                    );
                  },
                ),
              ],
              if (shop.moderationStatus == 'APPROVED' ||
                  shop.moderationStatus == 'PENDING_REVIEW')
                TextButton(
                  onPressed: () async {
                    if (shop.approved &&
                        !await _confirm(
                          context,
                          ref,
                          hub.withdrawShopConfirm,
                          action: tm.withdraw,
                        )) {
                      return;
                    }
                    if (!context.mounted) return;
                    await _run(
                      context,
                      ref,
                      () => actions.shop(shop.id, 'withdraw'),
                      done: tm.withdrawn,
                    );
                  },
                  child: Text(tm.withdraw),
                ),
              if (shop.open)
                TextButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    () => actions.shop(shop.id, 'close'),
                    done: tm.shopClosed,
                  ),
                  child: Text(tm.closeShop),
                ),
              // Only from CLOSED: an expired shop is not the seller's to
              // revive.
              if (shop.state == 'CLOSED')
                BaghKey(
                  label: tm.reopenShop,
                  onPressed: () => _run(
                    context,
                    ref,
                    () => actions.shop(shop.id, 'reopen'),
                    done: tm.shopReopened,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// The shop form
// ---------------------------------------------------------------------------

/// Opening a shop, or changing one in draft or sent back.
class ShopEditorScreen extends ConsumerWidget {
  const ShopEditorScreen({this.shopId, super.key});

  final String? shopId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final id = shopId;
    if (id == null) return const _ShopForm();
    final detail = ref.watch(ownShopDetailProvider(id));
    return detail.hasValue
        ? _ShopForm(id: id, raw: detail.value!)
        : Scaffold(
            appBar: AppBar(title: Text(s.trademaster.editShop)),
            body: AsyncView(
              value: detail,
              onRetry: () => ref.invalidate(ownShopDetailProvider(id)),
              data: (_) => const SizedBox.shrink(),
            ),
          );
  }
}

class _ShopForm extends ConsumerStatefulWidget {
  const _ShopForm({this.id, this.raw = const {}});

  final String? id;
  final Map<String, Object?> raw;

  @override
  ConsumerState<_ShopForm> createState() => _ShopFormState();
}

class _ShopFormState extends ConsumerState<_ShopForm> {
  final _form = GlobalKey<FormState>();
  late final Map<String, String> _v = {
    for (final k in const [
      'name',
      'summary',
      'businessCategoryId',
      'description',
      'industry',
      'province',
      'city',
      'address',
      'phone',
      'email',
      'website',
    ])
      k: '${widget.raw[k] ?? ''}',
    'latitude': '${widget.raw['latitude'] ?? ''}',
    'longitude': '${widget.raw['longitude'] ?? ''}',
  };

  /// Bumped when the coordinates are filled from outside the boxes, so the
  /// boxes show them.
  int _located = 0;
  PreparedImage? _logo;
  PreparedImage? _cover;
  late final String _start;
  bool _tried = false;
  bool _sending = false;
  bool _locating = false;
  bool _shrinking = false;
  double? _progress;
  String? _error;
  String? _locationNote;

  bool get _editing => widget.id != null;
  bool get _hadLogo => _text(widget.raw['logoUrl']) != null;
  bool get _hadCover => _text(widget.raw['coverUrl']) != null;

  static String? _text(Object? v) =>
      v is String && v.trim().isNotEmpty ? v : null;

  @override
  void initState() {
    super.initState();
    _start = _snapshot();
  }

  String _snapshot() => '$_v${_logo?.name}${_cover?.name}';

  /// What the form sends, as the web's shopPayload(): on an edit an emptied
  /// field is removed (null); on a new shop it is not sent.
  Map<String, Object?> _payload() {
    Object? optional(String key) {
      final v = _v[key]!.trim();
      return v.isNotEmpty ? v : (_editing ? null : _absent);
    }

    final lat = parseCoordinate(_v['latitude']!, 90);
    final lng = parseCoordinate(_v['longitude']!, 180);
    final out = <String, Object?>{
      'name': _v['name']!.trim(),
      'summary': _v['summary']!.trim(),
      'businessCategoryId': _v['businessCategoryId']!.isNotEmpty
          ? _v['businessCategoryId']
          : (_editing ? null : _absent),
      for (final k in const [
        'description',
        'industry',
        'province',
        'city',
        'address',
        'email',
        'website',
      ])
        k: optional(k),
      'phone': switch (toLatinDigits(_v['phone']!).trim()) {
        final p when p.isNotEmpty => p,
        _ => _editing ? null : _absent,
      },
      if (lat != null && lng != null) ...{
        'latitude': lat,
        'longitude': lng,
      } else if (_editing) ...{
        'latitude': null,
        'longitude': null,
      },
    };
    return out..removeWhere((_, v) => identical(v, _absent));
  }

  static const _absent = Object();

  Future<PreparedImage?> _pickImage() async {
    final s = ref.read(stringsProvider);
    final messenger = ScaffoldMessenger.of(context);
    final picked = await FilePicker.pickFiles(type: FileType.image);
    if (picked.isEmpty || !mounted) return null;
    setState(() => _shrinking = true);
    try {
      return await prepareImage(picked.first.xFile.path, picked.first.name);
    } on ImageNotReady catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            e.problem == ImageProblem.tooLarge
                ? s.upload.errors.imageTooLarge
                : s.upload.errors.unreadableImage,
          ),
        ),
      );
      return null;
    } finally {
      if (mounted) setState(() => _shrinking = false);
    }
  }

  Future<void> _locate() async {
    final hub = ref.read(stringsProvider).trademaster.hub;
    setState(() {
      _locating = true;
      _locationNote = null;
    });
    try {
      final fix = await currentLocation();
      _setPoint(fix.latitude, fix.longitude);
    } on LocationNotReady catch (e) {
      _locationNote = e.problem == LocationProblem.denied
          ? hub.locationDenied
          : hub.locationUnavailable;
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _setPoint(double lat, double lng) => setState(() {
    _v['latitude'] = lat.toStringAsFixed(6);
    _v['longitude'] = lng.toStringAsFixed(6);
    _located++;
  });

  Future<void> _save() async {
    final s = ref.read(stringsProvider);
    final tm = s.trademaster;
    if (!_tried) setState(() => _tried = true);
    if (!_form.currentState!.validate()) {
      revealFirstError(_form);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(tm.hub.fixErrors)));
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
      _progress = null;
    });
    try {
      await ref
          .read(marketActionsProvider)
          .saveShop(
            _payload(),
            id: widget.id,
            logo: _logo,
            cover: _cover,
            onProgress: _logo == null && _cover == null
                ? null
                : (p) => setState(() => _progress = p),
          );
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_editing ? tm.shopSaved : tm.shopCreated)),
      );
      context.pop();
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final guilds = ref.watch(businessCategoriesProvider).value ?? const [];
    final lat = parseCoordinate(_v['latitude']!, 90);
    final lng = parseCoordinate(_v['longitude']!, 180);

    String? lengthRule(String? v, int min, int max, String tooShort) {
      final t = (v ?? '').trim();
      if (t.isEmpty) return hub.errRequired;
      if (t.length < min || t.length > max) return tooShort;
      return null;
    }

    String? tooLong(String? v, int max) =>
        (v ?? '').trim().length > max ? hub.errTooLong : null;

    Widget field(
      String key,
      String label, {
      int max = 120,
      String? Function(String?)? validator,
      String? helper,
      int lines = 1,
      bool ltr = false,
      TextInputType? keyboard,
      Key? fieldKey,
    }) => TextFormField(
      key: fieldKey,
      initialValue: _v[key],
      maxLength: max,
      minLines: lines > 1 ? 2 : null,
      maxLines: lines,
      keyboardType: keyboard ?? (lines > 1 ? TextInputType.multiline : null),
      textDirection: ltr ? TextDirection.ltr : null,
      onChanged: (v) => setState(() => _v[key] = v),
      validator: validator ?? (v) => tooLong(v, max),
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        helperMaxLines: 3,
        counterText: '',
        alignLabelWithHint: lines > 1,
      ),
    );

    Widget picture(
      String label,
      String hint,
      PreparedImage? fresh,
      bool had,
      String path,
      ValueChanged<PreparedImage?> onPicked,
    ) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: 6,
      children: [
        Text(label, style: text.labelLarge),
        Row(
          spacing: 12,
          children: [
            SizedBox.square(
              dimension: 84,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(BaghRadius.tile),
                child: fresh != null
                    ? Image.memory(fresh.bytes, fit: BoxFit.cover)
                    : had && widget.id != null
                    ? _OwnImage(path)
                    : Container(
                        color: c.fill,
                        child: Icon(Icons.image_outlined, color: c.ink2),
                      ),
              ),
            ),
            Expanded(
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: OutlinedButton.icon(
                  icon: _shrinking
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.add_photo_alternate_outlined),
                  label: Text(label),
                  onPressed: _shrinking
                      ? null
                      : () async {
                          final image = await _pickImage();
                          if (image != null) setState(() => onPicked(image));
                        },
                ),
              ),
            ),
          ],
        ),
        Text(hint, style: small),
      ],
    );

    final body = Form(
      key: _form,
      autovalidateMode: _tried
          ? AutovalidateMode.always
          : AutovalidateMode.disabled,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 14,
        children: [
          Text(hub.requiredHint, style: small),
          field(
            'name',
            '${tm.shopName} *',
            validator: (v) => lengthRule(v, 2, 120, hub.errNameLength),
          ),
          field(
            'summary',
            '${tm.shopSummary} *',
            max: 300,
            lines: 3,
            helper: hub.summaryHint,
            validator: (v) => lengthRule(v, 10, 300, hub.errSummaryLength),
          ),
          // Every shop is filed under a guild: the filters find shops by
          // it, and one without would be invisible to them.
          FormField<String>(
            initialValue: _v['businessCategoryId'],
            validator: (_) =>
                _v['businessCategoryId']!.isEmpty ? hub.errRequired : null,
            builder: (state) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 6,
              children: [
                Text('${hub.businessCategory} *', style: text.labelLarge),
                OutlinedButton.icon(
                  icon: const Icon(Icons.arrow_drop_down_rounded),
                  label: Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: Text(
                      guilds
                              .where((g) => g.id == _v['businessCategoryId'])
                              .firstOrNull
                              ?.name ??
                          hub.chooseBusinessCategory,
                    ),
                  ),
                  onPressed: () async {
                    final picked = await pickFromList(
                      context,
                      title: hub.businessCategory,
                      all: hub.chooseBusinessCategory,
                      searchable: true,
                      options: twoLevel(
                        guilds,
                        id: (g) => g.id,
                        parent: (g) => g.parentId,
                        label: (g) => g.name,
                      ),
                    );
                    FocusManager.instance.primaryFocus?.unfocus();
                    if (picked != null) {
                      setState(() => _v['businessCategoryId'] = picked);
                      state.didChange(picked);
                    }
                  },
                ),
                Text(
                  state.errorText ?? hub.businessCategoryHint,
                  style: small?.copyWith(
                    color: state.hasError
                        ? Theme.of(context).colorScheme.error
                        : null,
                  ),
                ),
              ],
            ),
          ),
          field('description', tm.shopDescription, max: 5000, lines: 6),
          picture(
            tm.logo,
            tm.logoHint,
            _logo,
            _hadLogo,
            ownShopLogoPath(widget.id ?? ''),
            (i) => _logo = i,
          ),
          picture(
            hub.coverField,
            hub.coverHint,
            _cover,
            _hadCover,
            ownShopCoverPath(widget.id ?? ''),
            (i) => _cover = i,
          ),
          field('industry', tm.industry, max: 80),
          field('province', tm.province, max: 60),
          field('city', tm.city, max: 60),
          field(
            'phone',
            tm.phone,
            max: 30,
            ltr: true,
            keyboard: TextInputType.phone,
            validator: (v) {
              final p = toLatinDigits(v ?? '').trim();
              return p.isNotEmpty && !_phone.hasMatch(p) ? hub.errPhone : null;
            },
          ),
          field(
            'email',
            tm.email,
            max: 160,
            ltr: true,
            keyboard: TextInputType.emailAddress,
            validator: (v) {
              final e = (v ?? '').trim();
              return e.isNotEmpty && !_email.hasMatch(e) ? hub.errEmail : null;
            },
          ),
          field(
            'website',
            tm.website,
            max: 200,
            ltr: true,
            keyboard: TextInputType.url,
            validator: (v) {
              final w = (v ?? '').trim();
              return w.isNotEmpty && !_webUrl(w) ? hub.errUrl : null;
            },
          ),
          field('address', tm.address, max: 300, lines: 2),
          Text(tm.location, style: text.titleSmall),
          Text(hub.shopLocationHint, style: small),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                icon: _locating
                    ? const SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.my_location_rounded, size: 18),
                label: Text(_locating ? tm.locating : hub.useMyLocationForShop),
                onPressed: _locating ? null : _locate,
              ),
              if (_v['latitude']!.isNotEmpty || _v['longitude']!.isNotEmpty)
                TextButton.icon(
                  icon: const Icon(Icons.close_rounded, size: 18),
                  label: Text(hub.removeLocation),
                  onPressed: () => setState(() {
                    _v['latitude'] = '';
                    _v['longitude'] = '';
                    _located++;
                  }),
                ),
            ],
          ),
          if (_locationNote case final note?) Text(note, style: small),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 10,
            children: [
              for (final (key, label, limit, err) in [
                ('latitude', tm.latitude, 90.0, hub.errLatitude),
                ('longitude', tm.longitude, 180.0, hub.errLongitude),
              ])
                Expanded(
                  child: field(
                    key,
                    label,
                    max: 20,
                    ltr: true,
                    fieldKey: ValueKey((key, _located)),
                    keyboard: const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    ),
                    validator: (v) {
                      final has = toLatinDigits(v ?? '').trim().isNotEmpty;
                      final other = key == 'latitude'
                          ? 'longitude'
                          : 'latitude';
                      final otherHas = _v[other]!.trim().isNotEmpty;
                      if (has && parseCoordinate(v!, limit) == null) return err;
                      // Half a coordinate puts a pin in the Gulf of Guinea.
                      if (!has && otherHas) return hub.errLocationHalf;
                      return null;
                    },
                  ),
                ),
            ],
          ),
          // The map fills the boxes above; it does not replace them.
          // A still preview inside the scrolling form; the point is chosen
          // on a full-screen map, where a swipe pans the map.
          if (lat != null && lng != null)
            MarketMap(
              key: ValueKey((lat, lng)),
              height: 200,
              interactive: false,
              point: (lat, lng),
            ),
          OutlinedButton.icon(
            icon: const Icon(Icons.map_outlined, size: 18),
            label: Text(hub.chooseOnMap),
            onPressed: () async {
              final picked = await pickPoint(
                context,
                title: tm.location,
                hint: hub.shopLocationHint,
                confirm: s.common.save,
                initial: lat != null && lng != null ? (lat, lng) : null,
              );
              if (picked != null) _setPoint(picked.$1, picked.$2);
            },
          ),
          Text(tm.submitWarning, style: small),
          if (_sending && _progress != null)
            LinearProgressIndicator(
              value: _progress,
              minHeight: 6,
              borderRadius: BorderRadius.circular(3),
            ),
          if (_error case final e?) FormMessage(e),
          BaghKey(
            label: tm.saveDraft,
            icon: Icons.save_outlined,
            loading: _sending,
            expand: true,
            onPressed: _save,
          ),
        ],
      ),
    );

    return LeaveGuard(
      isDirty: () => _snapshot() != _start,
      busy: _sending,
      child: Scaffold(
        appBar: AppBar(
          title: Text(_editing ? tm.editShop : tm.newShop),
          actions: const [HelpAction('my-shops')],
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            child: body,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// A shop's listings
// ---------------------------------------------------------------------------

class ShopListingsScreen extends ConsumerStatefulWidget {
  const ShopListingsScreen({required this.shopId, super.key});

  final String shopId;

  @override
  ConsumerState<ShopListingsScreen> createState() => _ShopListingsState();
}

class _ShopListingsState extends ConsumerState<ShopListingsScreen> {
  String _kind = '';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final shops = ref.watch(ownShopsProvider);
    final shop = shops.value?.where((x) => x.id == widget.shopId).firstOrNull;
    final products = ref.watch(shopProductsProvider(widget.shopId));
    final notOpen = shop == null
        ? null
        : !shop.approved
        ? hub.shopNotApproved
        : shop.state != 'OPEN'
        ? hub.shopClosedForListings
        : null;
    return MemberListPage(
      title: shop == null
          ? tm.products
          : tm.productsIn.fill({'shop': shop.name}),
      subtitle: hub.listingsManageHint,
      helpId: 'my-shops',
      onRefresh: () async {
        ref
          ..invalidate(ownShopsProvider)
          ..invalidate(shopProductsProvider(widget.shopId));
        await ref.read(shopProductsProvider(widget.shopId).future);
      },
      children: [
        if (shops.hasValue && shop == null)
          EmptyNote(message: s.errors.notFoundBody)
        else ...[
          if (notOpen != null)
            SoftSurface(padding: const EdgeInsets.all(14), child: Text(notOpen))
          else if (shop != null)
            BaghKey(
              label: hub.newListing,
              icon: Icons.add_rounded,
              expand: true,
              onPressed: () => context.push(
                '/dashboard/shops/${widget.shopId}/products/new',
              ),
            ),
          const SizedBox(height: BaghSpace.gutter),
          if ((products.value ?? const []).isNotEmpty) ...[
            KindChips(
              value: _kind,
              onChanged: (k) => setState(() => _kind = k),
            ),
            const SizedBox(height: BaghSpace.gutter),
          ],
          AsyncView(
            value: products,
            onRetry: () => ref.invalidate(shopProductsProvider(widget.shopId)),
            isEmpty: (list) => list.isEmpty,
            empty: hub.noListingsYet,
            data: (list) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 12,
              children: [
                for (final p in list)
                  if (_kind.isEmpty || p.kind == _kind)
                    _OwnProductCard(
                      p,
                      shopId: widget.shopId,
                      shopOpen: shop?.open ?? false,
                    ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// To review, or live where the server allows; a listing needs a picture.
Future<void> _publish(
  BuildContext context,
  WidgetRef ref,
  OwnProduct p,
  String shopId,
) async {
  final s = ref.read(stringsProvider);
  final hub = s.trademaster.hub;
  if (p.imageCount == 0) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(s.trademaster.imageRequired)));
    await context.push('/dashboard/shops/$shopId/products/${p.id}/media');
    return;
  }
  var status = '';
  await _run(context, ref, () async {
    status = await ref.read(marketActionsProvider).submitProduct(p.id);
  });
  if (status.isNotEmpty && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(status == 'APPROVED' ? hub.published : hub.sentForReview),
      ),
    );
  }
}

class _OwnProductCard extends ConsumerWidget {
  const _OwnProductCard(this.p, {required this.shopId, required this.shopOpen});

  final OwnProduct p;
  final String shopId;
  final bool shopOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final actions = ref.read(marketActionsProvider);
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
              SizedBox.square(
                dimension: 60,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(BaghRadius.tile),
                  child: p.images.isEmpty
                      ? Container(
                          color: c.fill,
                          child: Icon(Icons.hide_image_outlined, color: c.ink2),
                        )
                      : _OwnImage(ownProductImagePath(p.images.first.id)),
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 6,
                  children: [
                    Text(p.title, style: text.titleMedium),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        StatusPill(
                          p.service ? hub.kindService : hub.kindProduct,
                          tone: p.service ? 2 : 4,
                        ),
                        StatusPill(
                          p.moderationStatus == 'APPROVED'
                              ? hub.statusPublished
                              : m.label(p.moderationStatus),
                          tone: statusTone(p.moderationStatus),
                        ),
                        if (p.state == 'CLOSED')
                          StatusPill(hub.statusHidden, tone: 1),
                        if (!p.service && !p.available)
                          StatusPill(tm.outOfStock, tone: 1),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          Text(
            [
              marketMoney(p.price, s, language) ?? '',
              if (p.negotiable) tm.negotiable,
            ].join(factSep(language)),
            style: text.titleSmall,
          ),
          Text(
            [
              if (!p.service && p.variantCount == 0)
                '${tm.stock}: ${n(p.stock)}',
              '${tm.images}: ${n(p.imageCount)}',
              '${tm.variants}: ${n(p.variantCount)}',
              if (p.publishedAt != null) '${tm.viewsLabel}: ${n(p.views)}',
            ].join(factSep(language)),
            style: small,
          ),
          if (p.reviewNote case final note?)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: c.tints[1].fill,
                borderRadius: BorderRadius.circular(BaghRadius.tile),
              ),
              child: Text(
                '${m.reviewNote}: $note',
                style: text.bodyMedium?.copyWith(color: c.tints[1].ink),
              ),
            ),
          if (p.moderationStatus == 'PENDING_REVIEW')
            Text(hub.pendingListingHint, style: small),
          if (p.moderationStatus == 'REJECTED')
            Text(hub.rejectedListingHint, style: small),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (p.editable) ...[
                BaghKey(
                  label: s.common.edit,
                  icon: Icons.edit_outlined,
                  kind: BaghKeyKind.outline,
                  onPressed: () => context.push(
                    '/dashboard/shops/$shopId/products/${p.id}/edit',
                  ),
                ),
                BaghKey(
                  label: hub.picturesAndOptions,
                  icon: Icons.photo_library_outlined,
                  kind: BaghKeyKind.outline,
                  onPressed: () => context.push(
                    '/dashboard/shops/$shopId/products/${p.id}/media',
                  ),
                ),
              ],
              if (p.moderationStatus == 'DRAFT' ||
                  p.moderationStatus == 'CHANGES_REQUESTED')
                BaghKey(
                  label: p.moderationStatus == 'CHANGES_REQUESTED'
                      ? hub.resubmit
                      : hub.publish,
                  icon: Icons.send_rounded,
                  onPressed: shopOpen
                      ? () => _publish(context, ref, p, shopId)
                      : null,
                ),
              if (p.moderationStatus == 'APPROVED' && p.state == 'OPEN')
                TextButton.icon(
                  icon: const Icon(Icons.visibility_off_outlined, size: 18),
                  label: Text(hub.hide),
                  onPressed: () => _run(
                    context,
                    ref,
                    () => actions.product(p.id, 'close'),
                    done: hub.hidden,
                  ),
                ),
              if (p.state == 'CLOSED')
                BaghKey(
                  label: hub.show,
                  icon: Icons.visibility_outlined,
                  onPressed: () => _run(
                    context,
                    ref,
                    () => actions.product(p.id, 'reopen'),
                    done: hub.shown,
                  ),
                ),
              if (p.moderationStatus == 'PENDING_REVIEW')
                TextButton(
                  onPressed: () => _run(
                    context,
                    ref,
                    () => actions.product(p.id, 'withdraw'),
                    done: tm.withdrawn,
                  ),
                  child: Text(tm.withdraw),
                ),
              TextButton.icon(
                icon: Icon(Icons.delete_outline_rounded, color: c.tints[3].ink),
                label: Text(
                  s.common.delete,
                  style: TextStyle(color: c.tints[3].ink),
                ),
                onPressed: () async {
                  if (!await _confirm(
                    context,
                    ref,
                    hub.deleteConfirm.fill({'title': p.title}),
                    action: s.common.delete,
                  )) {
                    return;
                  }
                  if (!context.mounted) return;
                  await _run(
                    context,
                    ref,
                    () => actions.deleteProduct(p.id),
                    done: hub.deleted,
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// The listing form
// ---------------------------------------------------------------------------

class ListingEditorScreen extends ConsumerWidget {
  const ListingEditorScreen({required this.shopId, this.productId, super.key});

  final String shopId;
  final String? productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final id = productId;
    if (id == null) return _ListingForm(shopId: shopId);
    final list = ref.watch(shopProductsProvider(shopId));
    return list.hasValue
        ? switch (list.value!.where((p) => p.id == id).firstOrNull) {
            final p? when p.editable => _ListingForm(
              shopId: shopId,
              product: p,
            ),
            _ => Scaffold(
              appBar: AppBar(title: Text(s.trademaster.hub.editListing)),
              body: EmptyNote(message: s.list.noResults),
            ),
          }
        : Scaffold(
            appBar: AppBar(title: Text(s.trademaster.hub.editListing)),
            body: AsyncView(
              value: list,
              onRetry: () => ref.invalidate(shopProductsProvider(shopId)),
              data: (_) => const SizedBox.shrink(),
            ),
          );
  }
}

class _ListingForm extends ConsumerStatefulWidget {
  const _ListingForm({required this.shopId, this.product});

  final String shopId;
  final OwnProduct? product;

  @override
  ConsumerState<_ListingForm> createState() => _ListingFormState();
}

class _ListingFormState extends ConsumerState<_ListingForm> {
  final _form = GlobalKey<FormState>();
  late final Map<String, Object?> _raw = widget.product?.raw ?? const {};
  late String _kind = '${_raw['kind'] ?? 'PRODUCT'}';
  late String _title = '${_raw['title'] ?? ''}';
  late String _summary = '${_raw['summary'] ?? ''}';
  late String _description = '${_raw['description'] ?? ''}';
  late String _categoryId = '${_raw['categoryId'] ?? ''}';
  late String _price = '${_raw['price'] ?? ''}';
  late String _stock = widget.product == null || widget.product!.service
      ? ''
      : '${widget.product!.stock}';
  late bool _negotiable = _raw['negotiable'] == true;
  late final String _start;
  bool _tried = false;
  bool _sending = false;
  String? _error;

  bool get _editing => widget.product != null;

  @override
  void initState() {
    super.initState();
    _start = _snapshot();
  }

  String _snapshot() => '${_payload()}';

  /// The web's listingPayload(): an emptied description or category is
  /// removed on an edit, not sent on a new listing.
  Map<String, Object?> _payload() {
    final description = _description.trim();
    return {
      'kind': _kind,
      'title': _title.trim(),
      'summary': _summary.trim(),
      if (description.isNotEmpty)
        'description': description
      else if (_editing)
        'description': null,
      if (_categoryId.isNotEmpty)
        'categoryId': _categoryId
      else if (_editing)
        'categoryId': null,
      'price': parsePrice(_price) ?? '',
      if (_kind == 'PRODUCT') 'stock': parseCount(_stock) ?? 0,
      'negotiable': _negotiable,
    };
  }

  Future<void> _save() async {
    final s = ref.read(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    if (!_tried) setState(() => _tried = true);
    if (!_form.currentState!.validate()) {
      revealFirstError(_form);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(hub.fixErrors)));
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    final actions = ref.read(marketActionsProvider);
    try {
      final messenger = ScaffoldMessenger.of(context);
      final router = GoRouter.of(context);
      if (_editing) {
        await actions.updateProduct(widget.product!.id, _payload());
        await ref.read(hapticsProvider).success();
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              widget.product!.moderationStatus == 'APPROVED'
                  ? hub.savedLive
                  : tm.productSaved,
            ),
          ),
        );
        if (mounted) context.pop();
      } else {
        final id = await actions.createProduct(widget.shopId, _payload());
        await ref.read(hapticsProvider).success();
        messenger.showSnackBar(SnackBar(content: Text(hub.listingCreated)));
        // Straight on to its pictures: a listing is not published without.
        unawaited(
          router.pushReplacement(
            '/dashboard/shops/${widget.shopId}/products/$id/media',
          ),
        );
      }
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final categories = ref.watch(productCategoriesProvider).value ?? const [];
    final ofKind = [
      for (final c in categories)
        if (c.kind == _kind) c,
    ];

    String? lengthRule(String? v, int min, int max, String bad) {
      final t = (v ?? '').trim();
      if (t.isEmpty) return hub.errRequired;
      if (t.length < min || t.length > max) return bad;
      return null;
    }

    final body = Form(
      key: _form,
      autovalidateMode: _tried
          ? AutovalidateMode.always
          : AutovalidateMode.disabled,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 14,
        children: [
          Text(hub.requiredHint, style: small),
          Text('${hub.kindField} *', style: text.labelLarge),
          for (final (k, label, hint, icon) in [
            (
              'PRODUCT',
              hub.kindProduct,
              hub.kindProductHint,
              Icons.inventory_2_outlined,
            ),
            (
              'SERVICE',
              hub.kindService,
              hub.kindServiceHint,
              Icons.handyman_outlined,
            ),
          ])
            Semantics(
              selected: _kind == k,
              button: true,
              child: InkWell(
                borderRadius: BorderRadius.circular(BaghRadius.tile),
                onTap: () => setState(() {
                  _kind = k;
                  // A category of the other kind would only ever come back
                  // empty.
                  final cat = categories
                      .where((x) => x.id == _categoryId)
                      .firstOrNull;
                  if (cat != null && cat.kind != k) _categoryId = '';
                }),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _kind == k ? c.primarySoft.fill : null,
                    border: Border.all(
                      color: _kind == k ? c.primary : c.edge,
                      width: _kind == k ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(BaghRadius.tile),
                  ),
                  child: Row(
                    spacing: 10,
                    children: [
                      Icon(icon, color: _kind == k ? c.primary : c.ink2),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          spacing: 2,
                          children: [
                            Text(label, style: text.titleSmall),
                            Text(hint, style: small),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          TextFormField(
            initialValue: _title,
            maxLength: 160,
            onChanged: (v) => setState(() => _title = v),
            validator: (v) => lengthRule(v, 2, 160, hub.errTitleLength),
            decoration: InputDecoration(
              labelText: '${hub.titleField} *',
              counterText: '',
            ),
          ),
          TextFormField(
            initialValue: _summary,
            maxLength: 300,
            minLines: 2,
            maxLines: 4,
            onChanged: (v) => setState(() => _summary = v),
            validator: (v) => lengthRule(v, 10, 300, hub.errSummaryLength),
            decoration: InputDecoration(
              labelText: '${tm.productSummary} *',
              helperText: hub.summaryHint,
              helperMaxLines: 3,
              counterText: '',
              alignLabelWithHint: true,
            ),
          ),
          TextFormField(
            initialValue: _description,
            maxLength: 5000,
            minLines: 3,
            maxLines: 10,
            keyboardType: TextInputType.multiline,
            onChanged: (v) => setState(() => _description = v),
            validator: (v) =>
                (v ?? '').trim().length > 5000 ? hub.errTooLong : null,
            decoration: InputDecoration(
              labelText: tm.productDescription,
              counterText: '',
              alignLabelWithHint: true,
            ),
          ),
          Text(tm.category, style: text.labelLarge),
          OutlinedButton.icon(
            icon: const Icon(Icons.arrow_drop_down_rounded),
            label: Align(
              alignment: AlignmentDirectional.centerStart,
              child: Text(
                ofKind.where((x) => x.id == _categoryId).firstOrNull?.name ??
                    tm.noCategory,
              ),
            ),
            onPressed: () async {
              final picked = await pickFromList(
                context,
                title: tm.category,
                all: tm.noCategory,
                searchable: true,
                options: twoLevel(
                  ofKind,
                  id: (x) => x.id,
                  parent: (x) => x.parentId,
                  label: (x) => x.name,
                ),
              );
              FocusManager.instance.primaryFocus?.unfocus();
              if (picked != null) setState(() => _categoryId = picked);
            },
          ),
          TextFormField(
            initialValue: groupThousands(_price),
            keyboardType: TextInputType.number,
            textDirection: TextDirection.ltr,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]')),
              const ThousandsFormatter(),
            ],
            onChanged: (v) => setState(() => _price = v),
            validator: (v) => plainDigits(v ?? '').isEmpty
                ? hub.errRequired
                : parsePrice(v!) == null
                ? hub.errPrice
                : null,
            decoration: InputDecoration(
              labelText: '${tm.price} *',
              helperText: s.market.currency,
            ),
          ),
          if (_kind == 'PRODUCT')
            TextFormField(
              initialValue: _stock,
              keyboardType: TextInputType.number,
              textDirection: TextDirection.ltr,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]')),
              ],
              onChanged: (v) => setState(() => _stock = v),
              validator: (v) {
                final t = toLatinDigits(v ?? '').trim();
                return t.isNotEmpty && parseCount(t) == null
                    ? hub.errStock
                    : null;
              },
              decoration: InputDecoration(
                labelText: tm.stock,
                helperText: hub.stockHint,
                helperMaxLines: 3,
              ),
            )
          else
            Text(hub.serviceNoStock, style: small),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(tm.negotiableLabel),
            value: _negotiable,
            onChanged: (v) => setState(() => _negotiable = v),
          ),
          if (widget.product?.moderationStatus == 'APPROVED')
            Text(hub.liveEditHint, style: small),
          if (_error case final e?) FormMessage(e),
          BaghKey(
            label: _editing ? s.common.save : hub.createAndAddPictures,
            icon: _editing ? Icons.check_rounded : Icons.arrow_forward_rounded,
            loading: _sending,
            expand: true,
            onPressed: _save,
          ),
        ],
      ),
    );

    return LeaveGuard(
      isDirty: () => _snapshot() != _start,
      busy: _sending,
      child: Scaffold(
        appBar: AppBar(
          title: Text(_editing ? hub.editListing : hub.newListing),
          actions: const [HelpAction('my-shops')],
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            child: body,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Pictures and options
// ---------------------------------------------------------------------------

class ListingMediaScreen extends ConsumerStatefulWidget {
  const ListingMediaScreen({
    required this.shopId,
    required this.productId,
    super.key,
  });

  final String shopId;
  final String productId;

  @override
  ConsumerState<ListingMediaScreen> createState() => _ListingMediaState();
}

class _ListingMediaState extends ConsumerState<ListingMediaScreen> {
  bool _uploading = false;
  double? _progress;

  Future<void> _addImages(OwnProduct p) async {
    final s = ref.read(stringsProvider);
    final tm = s.trademaster;
    final language = ref.read(l10nProvider).language;
    final messenger = ScaffoldMessenger.of(context);
    final room = maxProductImages - p.imageCount;
    if (room <= 0) return;
    final picked = await FilePicker.pickFiles(type: FileType.image);
    if (picked.isEmpty || !mounted) return;
    if (picked.length > room) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            tm.imageLimit.fill({'count': localDigits(room, language)}),
          ),
        ),
      );
      return;
    }
    setState(() {
      _uploading = true;
      _progress = null;
    });
    final ready = <PreparedImage>[];
    for (final f in picked) {
      try {
        ready.add(await prepareImage(f.xFile.path, f.name));
      } on ImageNotReady catch (e) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(
              e.problem == ImageProblem.tooLarge
                  ? s.upload.errors.imageTooLarge
                  : s.upload.errors.unreadableImage,
            ),
          ),
        );
      }
    }
    if (ready.isNotEmpty && mounted) {
      await _run(
        context,
        ref,
        () => ref
            .read(marketActionsProvider)
            .addImages(
              p.id,
              ready,
              onProgress: (v) => setState(() => _progress = v),
            ),
        done: tm.imagesAdded,
      );
    }
    if (mounted) setState(() => _uploading = false);
  }

  Future<void> _option(OwnProduct p, [ProductVariant? v]) async {
    final saved = await showBaghSheet<bool>(
      context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _OptionSheet(product: p, variant: v),
    );
    if (saved == true && mounted) {
      final tm = ref.read(stringsProvider).trademaster;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(v == null ? tm.variantAdded : tm.variantUpdated),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final small = text.bodySmall?.copyWith(color: c.ink2);
    final list = ref.watch(shopProductsProvider(widget.shopId));
    final shop = ref
        .watch(ownShopsProvider)
        .value
        ?.where((x) => x.id == widget.shopId)
        .firstOrNull;
    final p = list.value?.where((x) => x.id == widget.productId).firstOrNull;
    final actions = ref.read(marketActionsProvider);
    String n(int v) => localDigits(v, language);

    if (p == null) {
      return Scaffold(
        appBar: AppBar(title: Text(hub.picturesAndOptions)),
        body: list.hasValue
            ? EmptyNote(message: s.list.noResults)
            : AsyncView(
                value: list,
                onRetry: () =>
                    ref.invalidate(shopProductsProvider(widget.shopId)),
                data: (_) => const SizedBox.shrink(),
              ),
      );
    }
    final lastOfLive = p.moderationStatus == 'APPROVED' && p.imageCount <= 1;
    return Scaffold(
      appBar: AppBar(
        title: Text(p.title),
        actions: const [HelpAction('my-shops')],
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: BaghLayout.readablePadding(
            context,
            top: BaghSpace.gutter,
            bottom: BaghSpace.section * 2,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: BaghSpace.gutter,
            children: [
              SoftSurface(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 10,
                  children: [
                    Text(tm.images, style: text.titleMedium),
                    Text(tm.imagesHint, style: small),
                    for (final image in p.images)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: 10,
                        children: [
                          SizedBox.square(
                            dimension: 76,
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(
                                BaghRadius.tile,
                              ),
                              child: _OwnImage(ownProductImagePath(image.id)),
                            ),
                          ),
                          Expanded(child: _CaptionField(image: image)),
                          IconButton(
                            tooltip: lastOfLive
                                ? hub.lastPictureHint
                                : tm.removeImage,
                            icon: const Icon(Icons.delete_outline_rounded),
                            onPressed: lastOfLive
                                ? null
                                : () async {
                                    if (!await _confirm(
                                      context,
                                      ref,
                                      hub.removePictureConfirm,
                                      action: tm.removeImage,
                                    )) {
                                      return;
                                    }
                                    if (!context.mounted) return;
                                    await _run(
                                      context,
                                      ref,
                                      () => actions.removeImage(image.id),
                                      done: tm.imageRemoved,
                                    );
                                  },
                          ),
                        ],
                      ),
                    if (_uploading)
                      LinearProgressIndicator(
                        value: _progress,
                        minHeight: 6,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    BaghKey(
                      label: tm.addImages,
                      icon: Icons.add_photo_alternate_outlined,
                      kind: BaghKeyKind.outline,
                      loading: _uploading,
                      onPressed: p.imageCount >= maxProductImages
                          ? null
                          : () => _addImages(p),
                    ),
                    Text(
                      tm.imageLimit.fill({
                        'count': n(
                          (maxProductImages - p.imageCount).clamp(0, 99),
                        ),
                      }),
                      style: small,
                    ),
                    if (p.moderationStatus == 'DRAFT' &&
                        p.imageCount > 0 &&
                        (shop?.open ?? false))
                      BaghKey(
                        label: hub.publishNow,
                        icon: Icons.send_rounded,
                        onPressed: () =>
                            _publish(context, ref, p, widget.shopId),
                      ),
                  ],
                ),
              ),
              SoftSurface(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 10,
                  children: [
                    Text(tm.variants, style: text.titleMedium),
                    Text(
                      p.service ? hub.serviceOptionsHint : tm.variantsHint,
                      style: small,
                    ),
                    for (final v in p.variants)
                      Row(
                        spacing: 8,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              spacing: 2,
                              children: [
                                Text(v.label, style: text.titleSmall),
                                Text(
                                  [
                                    // Null price is "same as the listing".
                                    marketMoney(v.price, s, language) ??
                                        hub.sameAsListing,
                                    if (!p.service)
                                      '${tm.stock}: ${n(v.stock)}',
                                  ].join(factSep(language)),
                                  style: small,
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            tooltip: tm.editVariant,
                            icon: const Icon(Icons.edit_outlined),
                            onPressed: () => _option(p, v),
                          ),
                          IconButton(
                            tooltip: tm.removeVariant,
                            icon: const Icon(Icons.delete_outline_rounded),
                            onPressed: () async {
                              if (!await _confirm(
                                context,
                                ref,
                                hub.removeOptionConfirm.fill({
                                  'label': v.label,
                                }),
                                action: tm.removeVariant,
                              )) {
                                return;
                              }
                              if (!context.mounted) return;
                              await _run(
                                context,
                                ref,
                                () => actions.removeVariant(v.id),
                                done: tm.variantRemoved,
                              );
                            },
                          ),
                        ],
                      ),
                    BaghKey(
                      label: tm.addVariant,
                      icon: Icons.add_rounded,
                      kind: BaghKeyKind.outline,
                      onPressed: () => _option(p),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A caption, saved when the reader is done with it: a sentence typed once,
/// not a request per keystroke.
class _CaptionField extends ConsumerStatefulWidget {
  const _CaptionField({required this.image});

  final ProductImage image;

  @override
  ConsumerState<_CaptionField> createState() => _CaptionFieldState();
}

class _CaptionFieldState extends ConsumerState<_CaptionField> {
  late final _text = TextEditingController(text: widget.image.caption ?? '');
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() {
      if (!_focus.hasFocus) _save();
    });
  }

  @override
  void dispose() {
    _text.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _save() {
    final caption = _text.text.trim();
    if (caption == (widget.image.caption ?? '')) return;
    final tm = ref.read(stringsProvider).trademaster;
    _run(
      context,
      ref,
      () =>
          ref.read(marketActionsProvider).setCaption(widget.image.id, caption),
      done: tm.captionSaved,
    );
  }

  @override
  Widget build(BuildContext context) {
    final tm = ref.watch(stringsProvider).trademaster;
    return TextField(
      controller: _text,
      focusNode: _focus,
      maxLength: 160,
      textInputAction: TextInputAction.done,
      onSubmitted: (_) => _focus.unfocus(),
      decoration: InputDecoration(
        labelText: tm.imageCaption,
        helperText: tm.imageCaptionHint,
        helperMaxLines: 2,
        counterText: '',
      ),
    );
  }
}

/// An option (a size, a colour, a session length): its label, code, its
/// own price if it differs, and its stock.
class _OptionSheet extends ConsumerStatefulWidget {
  const _OptionSheet({required this.product, this.variant});

  final OwnProduct product;
  final ProductVariant? variant;

  @override
  ConsumerState<_OptionSheet> createState() => _OptionSheetState();
}

class _OptionSheetState extends ConsumerState<_OptionSheet> {
  final _form = GlobalKey<FormState>();
  late String _label = widget.variant?.label ?? '';
  late String _sku = widget.variant?.sku ?? '';
  late String _price = widget.variant?.price ?? '';
  late String _stock = widget.variant == null || widget.product.service
      ? ''
      : '${widget.variant!.stock}';
  bool _sending = false;
  String? _error;

  Future<void> _save() async {
    final s = ref.read(stringsProvider);
    if (!_form.currentState!.validate()) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    final sku = _sku.trim();
    try {
      await ref
          .read(marketActionsProvider)
          .saveVariant(
            {
              'label': _label.trim(),
              'sku': sku.isEmpty ? null : sku,
              // Empty is "same as the listing", and null removes an
              // override on an edit.
              'price': parsePrice(_price),
              if (!widget.product.service) 'stock': parseCount(_stock) ?? 0,
            },
            productId: widget.product.id,
            id: widget.variant?.id,
          );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final tm = s.trademaster;
    final hub = tm.hub;
    final text = Theme.of(context).textTheme;
    final digits = [FilteringTextInputFormatter.allow(RegExp('[0-9۰-۹٠-٩]'))];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 14,
            children: [
              Text(
                widget.variant == null ? tm.addVariant : tm.editVariant,
                style: text.titleLarge,
              ),
              TextFormField(
                initialValue: _label,
                maxLength: 60,
                onChanged: (v) => _label = v,
                validator: (v) {
                  final t = (v ?? '').trim();
                  if (t.isEmpty) return hub.errRequired;
                  return t.length > 60 ? hub.errTooLong : null;
                },
                decoration: InputDecoration(
                  labelText: '${tm.variantLabel} *',
                  helperText: tm.variantLabelHint,
                  helperMaxLines: 2,
                  counterText: '',
                ),
              ),
              TextFormField(
                initialValue: _sku,
                maxLength: 60,
                textDirection: TextDirection.ltr,
                onChanged: (v) => _sku = v,
                decoration: InputDecoration(
                  labelText: tm.variantSku,
                  counterText: '',
                ),
              ),
              TextFormField(
                initialValue: groupThousands(_price),
                keyboardType: TextInputType.number,
                textDirection: TextDirection.ltr,
                inputFormatters: [...digits, const ThousandsFormatter()],
                onChanged: (v) => _price = v,
                validator: (v) =>
                    plainDigits(v ?? '').isNotEmpty && parsePrice(v!) == null
                    ? hub.errPrice
                    : null,
                decoration: InputDecoration(
                  labelText: tm.variantPrice,
                  helperText: hub.optionPriceHint,
                  helperMaxLines: 3,
                ),
              ),
              if (!widget.product.service)
                TextFormField(
                  initialValue: _stock,
                  keyboardType: TextInputType.number,
                  textDirection: TextDirection.ltr,
                  inputFormatters: digits,
                  onChanged: (v) => _stock = v,
                  validator: (v) {
                    final t = toLatinDigits(v ?? '').trim();
                    return t.isNotEmpty && parseCount(t) == null
                        ? hub.errStock
                        : null;
                  },
                  decoration: InputDecoration(labelText: tm.variantStock),
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
