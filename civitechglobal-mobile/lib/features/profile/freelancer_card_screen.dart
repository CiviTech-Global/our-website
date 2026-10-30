import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/geo.dart';
import '../../design/haptics.dart';
import '../../design/tokens.dart';
import '../../design/widgets/bagh_key.dart';
import '../../design/widgets/girih.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/list_picker.dart';
import '../../design/widgets/soft_surface.dart';
import '../../design/widgets/thousands_formatter.dart';
import '../../l10n/l10n.dart';
import '../account/account_page.dart';
import '../freelance/freelance_data.dart' show workLanguages;
import '../help/help_sheet.dart';

/// What the talent card says beyond the public profile, as
/// `GET/PATCH /work/me/freelancer-profile` holds it.
class FreelancerCard {
  FreelancerCard({
    required this.languages,
    required this.hourlyRate,
    required this.currency,
    required this.availability,
    required this.country,
  });

  factory FreelancerCard.fromJson(Map<String, Object?> j) => FreelancerCard(
    languages: [for (final l in (j['languages'] as List? ?? const [])) '$l'],
    hourlyRate: j['hourlyRate']?.toString() ?? '',
    currency: (j['hourlyCurrency'] as String?) ?? 'IRT',
    availability: (j['availability'] as String?) ?? 'AVAILABLE',
    country: (j['country'] as String?) ?? 'IR',
  );

  List<String> languages;
  String hourlyRate;
  String currency;
  String availability;
  String country;
}

const availabilityValues = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE'];

final freelancerCardProvider = FutureProvider.autoDispose<FreelancerCard>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/work/me/freelancer-profile',
        parse: (d) => FreelancerCard.fromJson(d! as Map<String, Object?>),
      ),
);

/// The web's freelancer profile form (FreelancerProfileForm.tsx), as a
/// screen: rate, availability, country and working languages.
class FreelancerCardScreen extends ConsumerStatefulWidget {
  const FreelancerCardScreen({super.key});

  @override
  ConsumerState<FreelancerCardScreen> createState() =>
      _FreelancerCardScreenState();
}

class _FreelancerCardScreenState extends ConsumerState<FreelancerCardScreen> {
  FreelancerCard? _card;
  final _rate = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _rate.dispose();
    super.dispose();
  }

  void _adopt(FreelancerCard card) {
    _card = card;
    _rate.text = card.hourlyRate;
  }

  Future<void> _save() async {
    final card = _card;
    if (card == null || _busy) return;
    final s = ref.read(stringsProvider);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final rate = plainDigits(_rate.text);
      await ref
          .read(apiClientProvider)
          .patch<Object?>(
            '/work/me/freelancer-profile',
            body: {
              'languages': card.languages,
              'hourlyRate': rate.isEmpty ? null : rate,
              'hourlyCurrency': card.currency,
              'availability': card.availability,
              'country': card.country,
            },
          );
      await ref.read(hapticsProvider).success();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(s.work.profileSaved)));
    } catch (e) {
      if (mounted) setState(() => _error = describeError(s, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final w = s.work;
    final text = Theme.of(context).textTheme;
    final geo = ref.watch(geoNamesProvider).value ?? GeoNames.empty();
    final loaded = ref.watch(freelancerCardProvider);
    if (_card == null) {
      if (loaded case AsyncData(:final value)) _adopt(value);
    }
    final card = _card;

    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(w.freelancerProfileTitle),
        actions: const [HelpAction('profile')],
      ),
      body: SafeArea(
        top: false,
        child: switch ((loaded, card)) {
          (AsyncError(:final error), null) => Center(
            child: Text(describeError(s, error)),
          ),
          (_, null) => const Center(child: GirihSpinner()),
          (_, final card?) => ListView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            children: [
              Text(w.freelancerProfileIntro, style: text.bodyMedium),
              const SizedBox(height: BaghSpace.gutter),
              SoftSurface(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: 16,
                  children: [
                    TextField(
                      controller: _rate,
                      keyboardType: TextInputType.number,
                      textDirection: TextDirection.ltr,
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                          RegExp(r'[0-9۰-۹٠-٩,٬]'),
                        ),
                        const ThousandsFormatter(),
                      ],
                      decoration: InputDecoration(labelText: w.hourlyRateLabel),
                    ),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(w.currencyLabel),
                      subtitle: Text(
                        geo.currency(card.currency, s.market.currency),
                      ),
                      trailing: const Icon(Icons.expand_more_rounded),
                      onTap: () async {
                        final picked = await pickFromList(
                          context,
                          title: w.currencyLabel,
                          all: geo.currency('IRT', s.market.currency),
                          searchable: true,
                          options: [
                            for (final code in currencyCodes)
                              (code, geo.currency(code, s.market.currency)),
                          ],
                        );
                        if (picked != null) {
                          setState(
                            () =>
                                card.currency = picked.isEmpty ? 'IRT' : picked,
                          );
                        }
                      },
                    ),
                    DropdownButtonFormField<String>(
                      initialValue: card.availability,
                      isExpanded: true,
                      decoration: InputDecoration(
                        labelText: w.availabilityLabel,
                      ),
                      items: [
                        for (final value in availabilityValues)
                          DropdownMenuItem(
                            value: value,
                            child: Text(
                              w.availability.label(value),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                      onChanged: (value) => setState(
                        () => card.availability = value ?? card.availability,
                      ),
                    ),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(w.countryLabel),
                      subtitle: Text(geo.country(card.country)),
                      trailing: const Icon(Icons.expand_more_rounded),
                      onTap: () async {
                        final picked = await pickFromList(
                          context,
                          title: w.countryLabel,
                          all: '—',
                          searchable: true,
                          options: geo.countryOptions(),
                        );
                        if (picked != null && picked.isNotEmpty) {
                          setState(() => card.country = picked);
                        }
                      },
                    ),
                    Text(w.languagesLabel, style: text.labelLarge),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final code in workLanguages)
                          FilterChip(
                            label: Text(geo.language(code)),
                            selected: card.languages.contains(code),
                            onSelected: (on) => setState(
                              () => card.languages = on
                                  ? [...card.languages, code]
                                  : [
                                      for (final x in card.languages)
                                        if (x != code) x,
                                    ],
                            ),
                          ),
                      ],
                    ),
                    if (_error != null) FormMessage(_error!),
                    BaghKey(
                      label: s.common.save,
                      onPressed: _save,
                      loading: _busy,
                      expand: true,
                    ),
                  ],
                ),
              ),
            ],
          ),
        },
      ),
    );
  }
}
