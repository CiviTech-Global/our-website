import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/session.dart';
import '../../core/format.dart';
import '../../core/geo.dart';
import '../../core/links.dart';
import '../../design/haptics.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/inline_link.dart';
import '../../design/widgets/remote_image.dart';
import '../../design/widgets/sheet.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../browse/browse.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import '../jobs/jobs_format.dart' show postedAgo;
import '../profile/profile_data.dart';
import 'freelance_data.dart';
import 'freelance_ui.dart';

const _deliveryDays = ['1', '3', '7', '14', '30'];

/// The talent directory, as the web's TalentPage: the people here with a
/// public profile who offer something.
class TalentScreen extends ConsumerWidget {
  const TalentScreen({this.onInvite, super.key});

  /// Set on the client side, where a card can invite to a project.
  final void Function(BuildContext context, TalentRow row)? onInvite;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.watch(workCategoriesProvider).value ?? const [];
    return BrowseScreen(
      title: w.talentTitle,
      subtitle: w.talentSubtitle,
      path: '/work/talent',
      helpId: 'freelancers',
      searchHint: w.talentSearchPlaceholder,
      emptyText: s.list.noResults,
      countText: w.resultsCount,
      sorts: [
        ('relevance', w.sortRelevance),
        ('rating', w.sortRating),
        ('newest', w.sortNewestMembers),
      ],
      filters: (_) => [
        PickerFilter(
          w.categoryLabel,
          'workCategoryId',
          workCategoryOptions(categories, language),
          all: s.jobs.allCategories,
        ),
        ChoiceFilter(w.levelAtLeast, 'level', [
          for (final l in freelancerLevels.skip(1))
            (l, '${w.levels.label(l)}+'),
        ], all: w.anyLevel),
        ChoiceFilter(w.minRating, 'minRating', [
          for (final r in const ['4.5', '4', '3'])
            (r, '${localDigits(r, language)}+ ★'),
        ], all: w.anyRating),
        ChoiceFilter(w.availabilityLabel, 'availability', [
          for (final a in availabilities) (a, w.availability.label(a)),
        ], all: s.list.allOption),
        PickerFilter(
          w.countryLabel,
          'country',
          geo.countryOptions(),
          all: w.anywhere,
        ),
        PickerFilter(w.languagesLabel, 'language', [
          for (final code in workLanguages) (code, geo.language(code)),
        ], all: s.list.allOption),
        SwitchFilter(w.verifiedOnly, 'verified'),
      ],
      itemBuilder: (context, row) {
        final talent = TalentRow.fromJson(row);
        return TalentCard(
          row: talent,
          onInvite: onInvite == null ? null : () => onInvite!(context, talent),
        );
      },
    );
  }
}

/// The service catalogue, as the web's ServiceCatalogPage: ready-made work
/// at a fixed price, chosen by its picture and seller as much as its words.
class ServiceCatalogScreen extends ConsumerWidget {
  const ServiceCatalogScreen({this.initial = const {}, super.key});

  /// A link's parameters: a seller's own services, from their card.
  final Map<String, String> initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final categories = ref.watch(workCategoriesProvider).value ?? const [];
    final seller = initial['sellerUsername'];
    return BrowseScreen(
      title: w.servicesTitle,
      subtitle: seller == null ? w.servicesSubtitle : '@$seller',
      path: '/work/services',
      helpId: 'freelance-services',
      searchHint: w.servicesSearchPlaceholder,
      emptyText: s.list.noResults,
      countText: w.resultsCount,
      fixed: {'sellerUsername': ?seller},
      initial: initial,

      sorts: [
        ('recommended', w.sortRecommended),
        ('bestSelling', w.sortBestSelling),
        ('rating', w.sortTopRated),
        ('newest', s.market.sortNewest),
        ('priceAsc', w.sortPriceLow),
        ('priceDesc', w.sortPriceHigh),
      ],
      filters: (_) => [
        PickerFilter(
          w.categoryLabel,
          'workCategoryId',
          workCategoryOptions(categories, language, counts: 'services'),
          all: s.jobs.allCategories,
        ),
        MoneyRangeFilter(
          w.priceRange,
          minKey: 'priceMin',
          maxKey: 'priceMax',
          minLabel: w.budgetMinLabel,
          maxLabel: w.budgetMaxLabel,
          currencyKey: 'currency',
        ),
        ChoiceFilter(w.deliveryTime, 'deliveryDays', [
          for (final d in _deliveryDays)
            (d, w.upToDays.fill({'days': localDigits(d, language)})),
        ], all: w.anyDelivery),
        ChoiceFilter(w.sellerLevel, 'sellerLevel', [
          for (final l in freelancerLevels.skip(1))
            (l, '${w.levels.label(l)}+'),
        ], all: w.anyLevel),
        PickerFilter(w.languagesLabel, 'language', [
          for (final code in workLanguages) (code, geo.language(code)),
        ], all: s.list.allOption),
        PickerFilter(
          w.fromCountry,
          'sellerCountry',
          geo.countryOptions(),
          all: w.anywhere,
        ),
        SwitchFilter(w.verifiedOnly, 'verifiedSeller'),
      ],
      itemBuilder: (_, row) =>
          ServiceTile(service: ServiceSummary.fromJson(row)),
    );
  }
}

String _revisions(int revisions, Strings s, String language) =>
    revisions == unlimitedRevisions
    ? s.work.unlimitedRevisions
    : s.work.revisionsCount.fill({'count': localDigits(revisions, language)});

/// One service, as the web's ServicePage: pictures, the packages with the
/// order, the seller, the questions and the reviews.
class ServiceScreen extends ConsumerWidget {
  const ServiceScreen({required this.code, super.key});

  final String code;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final service = ref.watch(serviceProvider(code));
    return Scaffold(
      appBar: AppBar(
        title: Text(s.work.servicesTitle),
        actions: const [HelpAction('freelance-services')],
      ),
      body: service.hasError && ApiException.from(service.error!).status == 404
          ? EmptyNote(
              message: s.errors.notFoundBody,
              action: (
                s.work.servicesTitle,
                () => context.go('/freelance-services'),
              ),
            )
          : AsyncView(
              value: service,
              onRetry: () => ref.invalidate(serviceProvider(code)),
              data: _ServiceBody.new,
            ),
    );
  }
}

class _ServiceBody extends ConsumerStatefulWidget {
  const _ServiceBody(this.v);

  final ServiceDetail v;

  @override
  ConsumerState<_ServiceBody> createState() => _ServiceBodyState();
}

class _ServiceBodyState extends ConsumerState<_ServiceBody> {
  late String _tier = widget.v.packages.firstOrNull?.tier ?? 'BASIC';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final v = widget.v;
    final pkg =
        v.packages.where((p) => p.tier == _tier).firstOrNull ??
        v.packages.firstOrNull;
    final stats = v.sellerStats;
    final total = v.reviews.length;
    final direction = Directionality.of(context);
    String n(int x) => localDigits(x, language);

    Widget section(String title, List<Widget> children) => SoftSurface(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 10,
        children: [
          Text(title, style: text.titleMedium),
          ...children,
        ],
      ),
    );

    return RefreshIndicator(
      color: c.primary,
      onRefresh: () => ref.refresh(serviceProvider(v.code).future),
      child: ListView(
        padding: BaghLayout.readablePadding(
          context,
          top: BaghSpace.gutter,
          bottom: BaghSpace.section * 2,
        ),
        children: [
          Text(
            v.title,
            textDirection: textDirectionOf(v.title, direction),
            style: text.headlineSmall,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (v.sellerUsername case final user?)
                InlineLink(
                  onTap: () => context.push('/profiles/$user'),
                  child: Text(
                    v.sellerName ?? user,
                    style: text.labelLarge?.copyWith(color: c.primary),
                  ),
                ),
              if (stats != null)
                StatusPill(
                  w.levels.label(stats.level),
                  tone: levelTone(stats.level),
                ),
              if (v.ratingCount > 0)
                Text(starsText(v.ratingAvg, v.ratingCount, language)),
              if (v.ordersInQueue > 0)
                Text(
                  w.ordersInQueue.fill({'count': n(v.ordersInQueue)}),
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
            ],
          ),
          if (v.images.isNotEmpty) ...[
            const SizedBox(height: BaghSpace.gutter),
            AspectRatio(
              aspectRatio: 16 / 10,
              child: PageView(
                children: [
                  for (final image in v.images)
                    RemoteImage(
                      url: apiAsset(serviceImagePath(image.id)),
                      fit: BoxFit.contain,
                      radius: BaghRadius.card,
                      semanticLabel: image.name,
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: BaghSpace.gutter),
          if (pkg != null)
            SoftSurface(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 10,
                children: [
                  if (v.packages.length > 1)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final p in v.packages)
                          ChoiceChip(
                            label: Text(w.tiers.label(p.tier)),
                            selected: pkg.tier == p.tier,
                            onSelected: (_) => setState(() => _tier = p.tier),
                          ),
                      ],
                    ),
                  // The price under the name: a large price in large text
                  // does not fit beside it.
                  Text(pkg.name, style: text.titleSmall),
                  Text(
                    money(pkg.price, pkg.currency, s, language) ?? '—',
                    style: text.titleLarge,
                  ),
                  if (pkg.description.isNotEmpty)
                    Text(
                      pkg.description,
                      style: text.bodyMedium?.copyWith(color: c.ink2),
                    ),
                  FactLine([
                    (
                      Icons.schedule_rounded,
                      w.deliveryIn.fill({'days': n(pkg.deliveryDays)}),
                    ),
                    (
                      Icons.autorenew_rounded,
                      _revisions(pkg.revisions, s, language),
                    ),
                  ]),
                  for (final feature in pkg.features)
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 8,
                      children: [
                        Icon(Icons.check_rounded, size: 18, color: c.primary),
                        Expanded(child: Text(feature, style: text.bodyMedium)),
                      ],
                    ),
                  BaghKey(
                    label: w.order,
                    icon: Icons.shopping_bag_outlined,
                    expand: true,
                    onPressed: () => showBaghSheet<void>(
                      context,
                      isScrollControlled: true,
                      builder: (_) => _OrderSheet(service: v, tier: pkg.tier),
                    ),
                  ),
                  if (stats != null)
                    Text(
                      w.availability.label(stats.availability),
                      textAlign: TextAlign.center,
                      style: text.bodySmall?.copyWith(color: c.ink2),
                    ),
                ],
              ),
            ),
          const SizedBox(height: BaghSpace.gutter),
          section(w.aboutService, [
            SelectableText(
              v.description,
              textDirection: textDirectionOf(v.description, direction),
              style: text.bodyLarge?.copyWith(color: c.ink2),
            ),
            if (v.skills.isNotEmpty) SkillChips(v.skills),
            if (v.languages.isNotEmpty)
              FactLine([
                (
                  Icons.translate_rounded,
                  v.languages.map(geo.language).join('، '),
                ),
              ]),
          ]),
          const SizedBox(height: BaghSpace.gutter),
          section(w.aboutSeller, [
            if (v.sellerName case final name?)
              Text(name, style: text.titleSmall),
            if (v.sellerHeadline case final h?)
              Text(h, style: text.bodyMedium?.copyWith(color: c.ink2)),
            if (stats != null) ...[
              FreelancerFacts(stats),
              FactLine([
                (Icons.place_outlined, geo.country(stats.country)),
                if (stats.memberSince case final at?)
                  (
                    Icons.event_outlined,
                    w.memberSince.fill({
                      'date': formatDate(at.toLocal(), language),
                    }),
                  ),
                if (stats.lastDeliveryAt case final at?)
                  (
                    Icons.local_shipping_outlined,
                    w.lastDelivery.fill({'ago': postedAgo(at, s, language)}),
                  ),
              ]),
            ],
            if (v.sellerBio case final bio?)
              Text(bio, style: text.bodyMedium?.copyWith(color: c.ink2)),
            if (v.sellerUsername case final user?)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton(
                  onPressed: () => context.push('/profiles/$user'),
                  child: Text(w.viewProfile),
                ),
              ),
          ]),
          if (v.faqs.isNotEmpty) ...[
            const SizedBox(height: BaghSpace.gutter),
            section(w.faq, [
              for (final f in v.faqs)
                ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: Text(f.question, style: text.titleSmall),
                  childrenPadding: const EdgeInsets.only(bottom: 10),
                  expandedCrossAxisAlignment: CrossAxisAlignment.start,
                  children: [Text(f.answer, style: text.bodyMedium)],
                ),
            ]),
          ],
          const SizedBox(height: BaghSpace.gutter),
          section(w.reviewsTitle, [
            if (total == 0)
              Text(
                w.noReviewsYet,
                style: text.bodyMedium?.copyWith(color: c.ink2),
              )
            else ...[
              Text(
                starsText(v.ratingAvg, v.ratingCount, language),
                style: text.titleSmall,
              ),
              for (final b in v.breakdown)
                Row(
                  spacing: 8,
                  children: [
                    SizedBox(width: 36, child: Text('${n(b.stars)} ★')),
                    Expanded(
                      child: LinearProgressIndicator(
                        value: total == 0 ? 0 : b.count / total,
                        minHeight: 8,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    SizedBox(
                      width: 36,
                      child: Text(
                        '(${n(b.count)})',
                        textAlign: TextAlign.end,
                        style: text.bodySmall,
                      ),
                    ),
                  ],
                ),
              for (final r in v.reviews)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: c.fill,
                    borderRadius: BorderRadius.circular(BaghRadius.tile),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 6,
                    children: [
                      FactLine([
                        (Icons.star_outline_rounded, n(r.rating)),
                        (Icons.place_outlined, geo.country(r.buyerCountry)),
                        if (r.createdAt case final at?)
                          (Icons.schedule_rounded, postedAgo(at, s, language)),
                      ]),
                      if (r.text case final t?) Text(t, style: text.bodyMedium),
                      FactLine([
                        (
                          Icons.payments_outlined,
                          '${w.reviewPrice}: ${money(r.price, r.currency, s, language) ?? '—'}',
                        ),
                        if (r.durationDays case final d?)
                          (
                            Icons.timelapse_rounded,
                            '${w.reviewDuration}: ${w.daysCount.fill({'count': n(d)})}',
                          ),
                        (
                          Icons.inventory_2_outlined,
                          '${w.packages}: ${w.tiers.label(r.tier)}',
                        ),
                      ]),
                    ],
                  ),
                ),
            ],
          ]),
          if (v.moreFromSeller.isNotEmpty) ...[
            const SizedBox(height: BaghSpace.section),
            Text(w.moreFromSeller, style: text.titleMedium),
            const SizedBox(height: 10),
            for (final m in v.moreFromSeller)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: SoftSurface(
                  padding: EdgeInsets.zero,
                  child: ListTile(
                    title: Text(m.title),
                    subtitle: Text(
                      '${w.startingAt} ${money(m.startingPrice, m.currency, s, language) ?? '—'}',
                    ),
                    onTap: () => context.push('/freelance-services/${m.code}'),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

/// The order: extras, the seller's questions, a note, and the total.
/// Nothing is charged; the seller accepts or declines.
class _OrderSheet extends ConsumerStatefulWidget {
  const _OrderSheet({required this.service, required this.tier});

  final ServiceDetail service;
  final String tier;

  @override
  ConsumerState<_OrderSheet> createState() => _OrderSheetState();
}

class _OrderSheetState extends ConsumerState<_OrderSheet> {
  final _form = GlobalKey<FormState>();
  final Set<String> _extras = {};
  late final List<String> _answers = [
    for (final _ in widget.service.requirements) '',
  ];
  String _note = '';
  bool _sending = false;
  String? _error;

  Future<void> _submit() async {
    final s = ref.read(stringsProvider);
    if (!_form.currentState!.validate()) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(freelanceActionsProvider)
          .placeOrder(
            widget.service.id,
            tier: widget.tier,
            extraIds: _extras.toList(),
            answers: _answers,
            note: _note,
          );
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.work.orderPlaced)));
      Navigator.of(context).pop();
      await openLink(context, ref, '/dashboard/service-orders');
    } catch (e) {
      setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final language = ref.watch(l10nProvider).language;
    final text = Theme.of(context).textTheme;
    final c = BaghColors.of(context);
    final v = widget.service;
    final pkg = v.packages.firstWhere((p) => p.tier == widget.tier);
    final chosen = v.extras.where((e) => _extras.contains(e.id));
    final total = chosen.fold(
      BigInt.tryParse(pkg.price) ?? BigInt.zero,
      (sum, e) => sum + (BigInt.tryParse(e.price) ?? BigInt.zero),
    );
    final days = chosen.fold(pkg.deliveryDays, (sum, e) => sum + e.extraDays);
    final signedIn = ref.watch(sessionProvider).value != null;
    final own =
        v.sellerUsername != null &&
        ref.watch(ownProfileProvider).value?.username == v.sellerUsername;

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
              Text(
                w.orderTitle.fill({'package': w.tiers.label(widget.tier)}),
                style: text.titleLarge,
              ),
              if (!signedIn)
                BaghKey(
                  label: w.signInToOrder,
                  expand: true,
                  onPressed: () {
                    Navigator.of(context).pop();
                    context.push(
                      Uri(
                        path: '/login',
                        queryParameters: {
                          'from': '/freelance-services/${v.code}',
                        },
                      ).toString(),
                    );
                  },
                )
              else if (own)
                Text(w.orderSelf, style: text.bodyMedium)
              else ...[
                if (v.extras.isNotEmpty) ...[
                  Text(w.extras, style: text.titleSmall),
                  for (final e in v.extras)
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      value: _extras.contains(e.id),
                      title: Text(e.title),
                      subtitle: e.extraDays > 0
                          ? Text(
                              w.extraDays.fill({
                                'days': localDigits(e.extraDays, language),
                              }),
                            )
                          : null,
                      secondary: Text(
                        money(e.price, pkg.currency, s, language) ?? '—',
                      ),
                      onChanged: (on) => setState(
                        () => on == true
                            ? _extras.add(e.id)
                            : _extras.remove(e.id),
                      ),
                    ),
                ],
                if (v.requirements.isNotEmpty) ...[
                  Text(w.requirementsTitle, style: text.titleSmall),
                  for (final (i, q) in v.requirements.indexed)
                    TextFormField(
                      minLines: 2,
                      maxLines: 5,
                      validator: (a) => (a ?? '').trim().isEmpty
                          ? s.mobile.fieldRules.required
                          : null,
                      onChanged: (a) => _answers[i] = a,
                      decoration: InputDecoration(
                        labelText: q,
                        alignLabelWithHint: true,
                      ),
                    ),
                ],
                TextFormField(
                  minLines: 2,
                  maxLines: 5,
                  maxLength: 2000,
                  onChanged: (a) => _note = a,
                  decoration: InputDecoration(
                    labelText: w.orderNote,
                    alignLabelWithHint: true,
                    counterText: '',
                  ),
                ),
                SoftSurface(
                  tint: c.tints[0],
                  elevated: false,
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    spacing: 6,
                    children: [
                      Row(
                        children: [
                          Expanded(child: Text(w.orderTotal)),
                          Text(
                            money('$total', pkg.currency, s, language) ?? '—',
                            style: text.titleSmall,
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Expanded(child: Text(w.orderDelivery)),
                          Text(
                            w.daysCount.fill({
                              'count': localDigits(days, language),
                            }),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Text(
                  w.orderPlaced,
                  style: text.bodySmall?.copyWith(color: c.ink2),
                ),
                if (_error case final e?) FormMessage(e),
                BaghKey(
                  label: w.order,
                  icon: Icons.shopping_bag_outlined,
                  loading: _sending,
                  expand: true,
                  onPressed: _submit,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
