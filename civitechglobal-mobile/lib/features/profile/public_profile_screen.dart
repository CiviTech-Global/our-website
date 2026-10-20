import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/format.dart';
import '../../core/links.dart';
import '../../design/palette.dart';
import '../../design/tokens.dart';
import '../../design/widgets/async_view.dart';
import '../../design/widgets/home_leading.dart';
import '../../design/widgets/soft_surface.dart';
import '../../l10n/l10n.dart';
import '../help/help_sheet.dart';
import '../intake/track_screen.dart' show StatusPill;
import 'profile_data.dart';

/// A member's public profile, as the web's public ProfilePage: the handle
/// they chose, what they say about themselves, whether they are verified,
/// their rating, live listings and the reviews they received. No contact
/// details: reaching this person happens through the platform. Listings
/// and the listings reviews were left on open on the website until the
/// boards arrive in the app.
class PublicProfileScreen extends ConsumerWidget {
  const PublicProfileScreen({required this.username, super.key});

  final String username;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final profile = ref.watch(publicProfileProvider(username));
    final c = BaghColors.of(context);
    return Scaffold(
      appBar: AppBar(
        leading: homeLeading(context),
        title: Text(
          profile.value == null ? s.market.publicProfileTitle : '@$username',
          textDirection: profile.value == null ? null : TextDirection.ltr,
        ),
        actions: const [HelpAction('freelancers')],
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          color: c.primary,
          onRefresh: () => ref.refresh(publicProfileProvider(username).future),
          child: ListView(
            padding: BaghLayout.readablePadding(
              context,
              top: BaghSpace.gutter,
              bottom: BaghSpace.section * 2,
            ),
            children: [
              // Gone is not the same as unreachable: only a 404 says so,
              // and anything else keeps its retry.
              if (profile.hasError &&
                  ApiException.from(profile.error!).status == 404)
                EmptyNote(
                  message: s.market.profileNotFound,
                  action: (s.errors.goHome, () => context.go('/')),
                )
              else
                AsyncView(
                  value: profile,
                  onRetry: () =>
                      ref.invalidate(publicProfileProvider(username)),
                  data: _Profile.new,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Profile extends ConsumerWidget {
  const _Profile(this.profile);

  final PublicProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final language = ref.watch(l10nProvider).language;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final p = profile;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: BaghSpace.gutter,
      children: [
        SoftSurface(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 10,
            children: [
              Row(
                spacing: 14,
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: c.primarySoft.fill,
                    child: Text(
                      p.username.characters.firstOrNull?.toUpperCase() ?? '؟',
                      style: text.titleLarge?.copyWith(
                        color: c.primarySoft.ink,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          '@${p.username}',
                          textDirection: TextDirection.ltr,
                          style: text.titleLarge,
                        ),
                        if (p.verified) _VerifiedBadge(m.verifiedBadge),
                      ],
                    ),
                  ),
                ],
              ),
              if (p.companyName case final company?)
                _IconLine(Icons.work_outline_rounded, company),
              if (p.headline case final headline?)
                Text(
                  headline,
                  textDirection: textDirectionOf(
                    headline,
                    Directionality.of(context),
                  ),
                  style: text.bodyLarge,
                ),
              Wrap(
                spacing: 16,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _Stars(
                    rating: p.ratingAvg,
                    count: p.ratingCount,
                    language: language,
                  ),
                  if (p.joinedAt case final joined?)
                    Text(
                      '${m.memberSince} ${formatDate(joined.toLocal(), language)}',
                      style: text.bodySmall?.copyWith(color: c.ink2),
                    ),
                ],
              ),
              if (p.website case final website?)
                InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => openLink(context, ref, website),
                  child: _IconLine(
                    Icons.language_rounded,
                    website,
                    color: c.primary,
                    ltr: true,
                  ),
                ),
              if (p.bio case final bio?)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    bio,
                    textDirection: textDirectionOf(
                      bio,
                      Directionality.of(context),
                    ),
                    style: text.bodyMedium,
                  ),
                ),
              if (p.skills.isNotEmpty)
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final (i, skill) in p.skills.indexed)
                      _Tag(skill, tint: c.tints[(i % 3) + 2]),
                  ],
                ),
            ],
          ),
        ),
        if (p.listings.isNotEmpty)
          SoftSurface(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 10,
              children: [
                Text(m.profileListings, style: text.titleMedium),
                for (final l in p.listings)
                  SoftSurface(
                    radius: BaghRadius.tile,
                    elevated: false,
                    tint: c.tints[l.isJob ? 2 : 4],
                    padding: const EdgeInsets.all(14),
                    semanticLabel: l.title,
                    onTap: () => openLink(
                      context,
                      ref,
                      l.isJob ? '/jobs/${l.code}' : '/projects/${l.code}',
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      spacing: 8,
                      children: [
                        _IconLine(
                          l.isJob
                              ? Icons.work_outline_rounded
                              : Icons.description_outlined,
                          l.title,
                          color: c.tints[l.isJob ? 2 : 4].ink,
                          strong: true,
                        ),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            // A job's employment type is a label; a
                            // project's category is the poster's own word.
                            if (l.tag case final tag?)
                              StatusPill(l.isJob ? m.label(tag) : tag, tone: 0),
                            StatusPill(m.label(l.state), tone: 1),
                          ],
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        SoftSurface(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              Text(m.profileReviews, style: text.titleMedium),
              if (p.reviews.isEmpty)
                Text(
                  m.noReviews,
                  style: text.bodyMedium?.copyWith(color: c.ink2),
                )
              else
                for (final (i, r) in p.reviews.indexed) ...[
                  if (i > 0) const Divider(height: 1),
                  _Review(r, language: language),
                ],
            ],
          ),
        ),
      ],
    );
  }
}

class _Review extends ConsumerWidget {
  const _Review(this.review, {required this.language});

  final ProfileReview review;
  final String language;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final m = s.market;
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final r = review;
    final role = switch (r.role) {
      'employer' => m.reviewRoleEmployer,
      'applicant' => m.reviewRoleApplicant,
      'client' => m.reviewRoleClient,
      'freelancer' => m.reviewRoleFreelancer,
      'buyer' => s.bookshop.reviewRoleBuyer,
      'seller' => s.bookshop.reviewRoleSeller,
      _ => '',
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 6,
      children: [
        _Stars(rating: r.rating.toDouble(), language: language),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text('$role ', style: text.bodySmall?.copyWith(color: c.ink2)),
            if (r.listingPath case final path?)
              InkWell(
                onTap: () => openLink(context, ref, path),
                child: Text(
                  r.listingTitle,
                  textDirection: textDirectionOf(
                    r.listingTitle,
                    Directionality.of(context),
                  ),
                  style: text.bodySmall?.copyWith(
                    color: c.primary,
                    decoration: TextDecoration.underline,
                    decorationColor: c.primary,
                  ),
                ),
              )
            else
              Text(
                r.listingTitle,
                textDirection: textDirectionOf(
                  r.listingTitle,
                  Directionality.of(context),
                ),
                style: text.bodySmall,
              ),
          ],
        ),
        // On its own line: a separating dot beside Persian digits reads as
        // a zero, and «· ۴ مهر» looked like the 40th.
        if (r.createdAt case final at?)
          Text(
            formatDate(at.toLocal(), language),
            style: text.bodySmall?.copyWith(color: c.ink2),
          ),
        if (r.text case final body?)
          Text(
            body,
            textDirection: textDirectionOf(body, Directionality.of(context)),
            style: text.bodyMedium,
          ),
      ],
    );
  }
}

/// Five stars, filled to [rating], and the count when there is one. Read
/// out as a sentence rather than five icons.
class _Stars extends StatelessWidget {
  const _Stars({required this.rating, required this.language, this.count});

  final double rating;
  final int? count;
  final String language;

  @override
  Widget build(BuildContext context) {
    final c = BaghColors.of(context);
    final text = Theme.of(context).textTheme;
    final value = localDecimal(rating, 1, language);
    final amber = c.tints[1].ink;
    return Semantics(
      label: count == null
          ? '$value / 5'
          : '$value / 5 (${localDigits(count!, language)})',
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 2,
        children: [
          for (var i = 1; i <= 5; i++)
            Icon(
              rating >= i
                  ? Icons.star_rounded
                  : rating >= i - 0.5
                  ? Icons.star_half_rounded
                  : Icons.star_outline_rounded,
              size: 18,
              color: amber,
            ),
          if (count != null) ...[
            const SizedBox(width: 4),
            Text(
              count! > 0 ? '$value (${localDigits(count!, language)})' : value,
              style: text.bodySmall?.copyWith(color: c.ink2),
            ),
          ],
        ],
      ),
    );
  }
}

/// The badge that means a person or company passed identity verification.
class _VerifiedBadge extends StatelessWidget {
  const _VerifiedBadge(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final t = BaghColors.of(context).primarySoft;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: ShapeDecoration(color: t.fill, shape: const StadiumBorder()),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        spacing: 4,
        children: [
          Icon(Icons.verified_rounded, size: 16, color: t.ink),
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.labelMedium?.copyWith(color: t.ink),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.label, {required this.tint});

  final String label;
  final GardenTint tint;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
    decoration: ShapeDecoration(color: tint.fill, shape: const StadiumBorder()),
    child: Text(
      label,
      style: Theme.of(context).textTheme.labelMedium?.copyWith(color: tint.ink),
    ),
  );
}

/// An icon and a line of text beside it.
class _IconLine extends StatelessWidget {
  const _IconLine(
    this.icon,
    this.label, {
    this.color,
    this.ltr = false,
    this.strong = false,
  });

  final IconData icon;
  final String label;
  final Color? color;
  final bool ltr;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final ink = color ?? BaghColors.of(context).ink2;
    final style = strong
        ? BaghType.weight(text.titleSmall!, 700).copyWith(color: ink)
        : text.bodyMedium?.copyWith(color: ink);
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 8,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 18, color: ink),
        ),
        Flexible(
          child: Text(
            label,
            // What a member wrote reads in its own direction (dir="auto").
            textDirection: ltr
                ? TextDirection.ltr
                : textDirectionOf(label, Directionality.of(context)),
            style: style,
          ),
        ),
      ],
    );
  }
}
