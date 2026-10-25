import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/session.dart';
import '../../design/widgets/attachments_field.dart';
import '../me/workspace_data.dart';

/// The freelance side, second generation, as the web's types/work.ts reads
/// it: categories, projects with their client and activity, freelancers'
/// records, and services. Money is a decimal string everywhere.

int? _int(Object? v) => v is num ? v.toInt() : null;

double _double(Object? v) => v is num ? v.toDouble() : 0;

String? _text(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

DateTime? _date(Object? v) => v is String ? DateTime.tryParse(v) : null;

List<String> _strings(Object? v) =>
    v is List ? v.whereType<String>().toList() : const [];

Map<String, Object?> _map(Object? v) =>
    v is Map<String, Object?> ? v : const {};

final _accountProvider = Provider<String?>(
  (ref) => ref.watch(sessionProvider.select((s) => s.value?.id)),
);

const experienceLevels = ['ENTRY', 'INTERMEDIATE', 'EXPERT'];
const projectDurations = [
  'LESS_THAN_WEEK',
  'ONE_TO_FOUR_WEEKS',
  'ONE_TO_THREE_MONTHS',
  'THREE_TO_SIX_MONTHS',
  'MORE_THAN_SIX_MONTHS',
];
const weeklyHoursOptions = [
  'LESS_THAN_10',
  'TEN_TO_THIRTY',
  'MORE_THAN_THIRTY',
];
const workLanguages = [
  'fa', 'en', 'ar', 'tr', 'de', 'fr', 'es', 'ru', 'zh', //
  'it', 'ku', 'az', 'ur', 'hi', 'pt', 'ja', 'ko', 'nl',
];
const freelancerLevels = ['NEW', 'RISING', 'ESTABLISHED', 'TOP_RATED'];
const availabilities = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE'];
const packageTiers = ['BASIC', 'STANDARD', 'PREMIUM'];

/// A package's revisions when it promises no limit.
const unlimitedRevisions = -1;

/// A category of the freelance tree. Choosing a parent matches its children.
class WorkCategory {
  WorkCategory.fromJson(Map<String, Object?> c)
    : id = '${c['id']}',
      slug = '${c['slug'] ?? ''}',
      name = '${c['name'] ?? ''}',
      nameEn = '${c['nameEn'] ?? ''}',
      parentId = _text(c['parentId']),
      projectCount = _int(c['projectCount']) ?? 0,
      serviceCount = _int(c['serviceCount']) ?? 0;

  final String id;
  final String slug;
  final String name;
  final String nameEn;
  final String? parentId;
  final int projectCount;
  final int serviceCount;

  String label(String language) =>
      language == 'fa' || nameEn.isEmpty ? name : nameEn;
}

final workCategoriesProvider = FutureProvider<List<WorkCategory>>(
  (ref) => ref
      .read(apiClientProvider)
      .get(
        '/work/categories',
        parse: (d) => [
          for (final c in (d as List? ?? const []))
            if (c is Map<String, Object?>) WorkCategory.fromJson(c),
        ],
      ),
);

/// The tree as picker rows: each parent, then its children indented, with
/// the count of what each holds when asked.
List<(String, String)> workCategoryOptions(
  List<WorkCategory> all,
  String language, {
  String? counts,
}) {
  String label(WorkCategory c) {
    final n = switch (counts) {
      'projects' => c.projectCount,
      'services' => c.serviceCount,
      _ => 0,
    };
    return n > 0 ? '${c.label(language)} ($n)' : c.label(language);
  }

  return [
    for (final parent in all.where((c) => c.parentId == null)) ...[
      (parent.id, label(parent)),
      for (final child in all.where((c) => c.parentId == parent.id))
        (child.id, '    ${label(child)}'),
    ],
  ];
}

/// "About the client", from what the platform actually knows.
class ClientStats {
  ClientStats.fromJson(Map<String, Object?> c)
    : verified = c['verified'] == true,
      companyName = _text(c['companyName']),
      country = '${c['country'] ?? 'IR'}',
      province = _text(c['province']),
      city = _text(c['city']),
      memberSince = _date(c['memberSince']),
      lastActiveAt = _date(c['lastActiveAt']),
      projectsPosted = _int(c['projectsPosted']) ?? 0,
      openProjects = _int(c['openProjects']) ?? 0,
      hires = _int(c['hires']) ?? 0,
      hireRate = _int(c['hireRate']),
      committed = [
        for (final row in (c['committed'] as List? ?? const []))
          if (row is Map)
            (currency: '${row['currency']}', amount: '${row['amount']}'),
      ],
      ratingAvg = _double(c['ratingAvg']),
      ratingCount = _int(c['ratingCount']) ?? 0,
      username = _text(c['username']);

  final bool verified;
  final String? companyName;
  final String country;
  final String? province;
  final String? city;
  final DateTime? memberSince;
  final DateTime? lastActiveAt;
  final int projectsPosted;
  final int openProjects;
  final int hires;
  final int? hireRate;
  final List<({String currency, String amount})> committed;
  final double ratingAvg;
  final int ratingCount;
  final String? username;
}

/// The competition on a project, counted, never itemised.
class ProjectActivity {
  ProjectActivity.fromJson(Map<String, Object?> a)
    : bidCount = _int(a['bidCount']) ?? 0,
      proposalRange = '${a['proposalRange'] ?? 'LT5'}',
      interviewing = _int(a['interviewing']) ?? 0,
      hired = _int(a['hired']) ?? 0,
      invitesSent = _int(a['invitesSent']) ?? 0,
      unansweredInvites = _int(a['unansweredInvites']) ?? 0,
      lastViewedByClient = _date(a['lastViewedByClient']),
      averageBid = _text(a['averageBid']);

  final int bidCount;
  final String proposalRange;
  final int interviewing;
  final int hired;
  final int invitesSent;
  final int unansweredInvites;
  final DateTime? lastViewedByClient;

  /// Null when the bids are sealed.
  final String? averageBid;
}

/// A freelancer's earned record.
class FreelancerStats {
  FreelancerStats.fromJson(Map<String, Object?> f)
    : completed = _int(f['completed']) ?? 0,
      active = _int(f['active']) ?? 0,
      jobSuccess = _int(f['jobSuccess']),
      onTime = _int(f['onTime']),
      ratingAvg = _double(f['ratingAvg']),
      ratingCount = _int(f['ratingCount']) ?? 0,
      level = '${f['level'] ?? 'NEW'}',
      memberSince = _date(f['memberSince']),
      lastActiveAt = _date(f['lastActiveAt']),
      lastDeliveryAt = _date(f['lastDeliveryAt']),
      country = '${f['country'] ?? 'IR'}',
      languages = _strings(f['languages']),
      hourlyRate = _text(f['hourlyRate']),
      hourlyCurrency = '${f['hourlyCurrency'] ?? 'IRT'}',
      availability = '${f['availability'] ?? 'AVAILABLE'}',
      verified = f['verified'] == true,
      skills = _strings(f['skills']);

  final int completed;
  final int active;
  final int? jobSuccess;
  final int? onTime;
  final double ratingAvg;
  final int ratingCount;
  final String level;
  final DateTime? memberSince;
  final DateTime? lastActiveAt;
  final DateTime? lastDeliveryAt;
  final String country;
  final List<String> languages;
  final String? hourlyRate;
  final String hourlyCurrency;
  final String availability;
  final bool verified;
  final List<String> skills;
}

/// A project as every list shows it: `GET /market/projects`.
class ProjectSummary {
  ProjectSummary.fromJson(Map<String, Object?> p)
    : id = '${p['id']}',
      code = '${p['code'] ?? ''}',
      title = '${p['title'] ?? ''}',
      excerpt = _text(p['excerpt']),
      companyName = _text(p['companyName']),
      category = switch (p['workCategory']) {
        final Map<String, Object?> c => WorkCategory.fromJson(c),
        _ => null,
      },
      skills = _strings(p['skills']),
      featured = p['featured'] == true,
      urgent = p['urgent'] == true,
      nda = p['nda'] == true,
      sealed = p['sealed'] == true,
      visibility = '${p['visibility'] ?? 'PUBLIC'}',
      pricingType = '${p['pricingType'] ?? 'FIXED'}',
      experienceLevel = _text(p['experienceLevel']),
      duration = _text(p['duration']),
      weeklyHours = _text(p['weeklyHours']),
      budgetMin = _text(p['budgetMin']),
      budgetMax = _text(p['budgetMax']),
      budgetUnknown = p['budgetUnknown'] == true,
      currency = '${p['currency'] ?? 'IRT'}',
      deliverBy = _date(p['deliverBy']),
      publishedAt = _date(p['publishedAt']),
      closesAt = _date(p['closesAt']),
      state = '${p['state'] ?? 'OPEN'}',
      onsite = p['onsite'] == true,
      country = _text(p['country']),
      province = _text(p['province']),
      city = _text(p['city']),
      languages = _strings(p['languages']),
      preferredCountries = _strings(p['preferredCountries']),
      contractToHire = p['contractToHire'] == true,
      freelancersNeeded = _int(p['freelancersNeeded']) ?? 1,
      bidCount = _int(_map(p['_count'])['bids']) ?? 0,
      client = switch (p['client']) {
        final Map<String, Object?> c => ClientStats.fromJson(c),
        _ => null,
      },
      activity = switch (p['activity']) {
        final Map<String, Object?> a => ProjectActivity.fromJson(a),
        _ => null,
      },
      match = switch (p['match']) {
        {'matched': final num m, 'total': final num t} => (
          matched: m.toInt(),
          total: t.toInt(),
        ),
        _ => null,
      };

  final String id;
  final String code;
  final String title;
  final String? excerpt;
  final String? companyName;
  final WorkCategory? category;
  final List<String> skills;
  final bool featured;
  final bool urgent;
  final bool nda;
  final bool sealed;
  final String visibility;
  final String pricingType;
  final String? experienceLevel;
  final String? duration;
  final String? weeklyHours;
  final String? budgetMin;
  final String? budgetMax;
  final bool budgetUnknown;
  final String currency;
  final DateTime? deliverBy;
  final DateTime? publishedAt;
  final DateTime? closesAt;
  final String state;
  final bool onsite;
  final String? country;
  final String? province;
  final String? city;
  final List<String> languages;
  final List<String> preferredCountries;
  final bool contractToHire;
  final int freelancersNeeded;
  final int bidCount;
  final ClientStats? client;
  final ProjectActivity? activity;

  /// On recommendations: how many of the project's skills the reader has.
  final ({int matched, int total})? match;

  bool get hourly => pricingType == 'HOURLY';
}

/// A milestone a proposal plans.
typedef ProposedMilestone = ({String title, String amount, int days});

List<ProposedMilestone>? _milestones(Object? v) => v is List
    ? [
        for (final m in v)
          if (m is Map)
            (
              title: '${m['title'] ?? ''}',
              amount: '${m['amount'] ?? ''}',
              days: _int(m['days']) ?? 1,
            ),
      ]
    : null;

/// The reader's own proposal on a project.
class MyBid {
  MyBid.fromJson(Map<String, Object?> b)
    : id = '${b['id']}',
      amount = '${b['amount'] ?? ''}',
      currency = '${b['currency'] ?? 'IRT'}',
      deliveryDays = _int(b['deliveryDays']),
      message = '${b['message'] ?? ''}',
      milestones = _milestones(b['milestones']),
      screeningAnswers = _strings(b['screeningAnswers']),
      moderationStatus = '${b['moderationStatus'] ?? 'PENDING_REVIEW'}',
      outcome = '${b['outcome'] ?? 'PENDING'}',
      clientSeenAt = _date(b['clientSeenAt']),
      reviewNote = _text(b['reviewNote']);

  final String id;
  final String amount;
  final String currency;
  final int? deliveryDays;
  final String message;
  final List<ProposedMilestone>? milestones;
  final List<String> screeningAnswers;
  final String moderationStatus;
  final String outcome;
  final DateTime? clientSeenAt;
  final String? reviewNote;

  /// The stages a bidder may still change it from.
  bool get editable =>
      const {'PENDING', 'SHORTLISTED', 'INTERVIEW'}.contains(outcome);
}

/// Who is reading a project: only on the signed-in read.
class ProjectViewer {
  ProjectViewer.fromJson(Map<String, Object?> v)
    : isAuthor = v['isAuthor'] == true,
      briefOpen = v['briefOpen'] == true,
      ndaSignedAt = _date(_map(v['ndaSigned'])['signedAt']),
      saved = v['saved'] == true,
      inviteId = _text(_map(v['invite'])['id']),
      inviteStatus = _text(_map(v['invite'])['status']),
      inviteMessage = _text(_map(v['invite'])['message']),
      myBid = switch (v['myBid']) {
        final Map<String, Object?> b => MyBid.fromJson(b),
        _ => null,
      },
      matched = _strings(_map(v['match'])['matched']),
      matchTotal = _int(_map(v['match'])['total']) ?? 0,
      canBid = v['canBid'] == true;

  final bool isAuthor;
  final bool briefOpen;
  final DateTime? ndaSignedAt;
  final bool saved;
  final String? inviteId;
  final String? inviteStatus;
  final String? inviteMessage;
  final MyBid? myBid;
  final List<String> matched;
  final int matchTotal;
  final bool canBid;
}

typedef ProjectAttachment = ({String id, String name, int bytes});

/// One project page: the public read, or the signed-in one with [viewer].
class ProjectDetail extends ProjectSummary {
  ProjectDetail.fromJson(super.p)
    : description = '${p['description'] ?? ''}',
      openToCompanyOffer = p['openToCompanyOffer'] == true,
      viewCount = _int(p['viewCount']) ?? 0,
      screeningQuestions = _strings(p['screeningQuestions']),
      attachments = [
        for (final a in (p['attachments'] as List? ?? const []))
          if (a is Map)
            (
              id: '${a['id']}',
              name: '${a['originalName'] ?? ''}',
              bytes: _int(a['sizeBytes']) ?? 0,
            ),
      ],
      attachmentCount = _int(p['attachmentCount']) ?? 0,
      similar = [
        for (final s in (p['similar'] as List? ?? const []))
          if (s is Map<String, Object?>) ProjectSummary.fromJson(s),
      ],
      viewer = switch (p['viewer']) {
        final Map<String, Object?> v => ProjectViewer.fromJson(v),
        _ => null,
      },
      super.fromJson();

  /// Empty while an NDA hides the brief.
  final String description;
  final bool openToCompanyOffer;
  final int viewCount;
  final List<String> screeningQuestions;

  /// Empty when locked; [attachmentCount] still says how many there are.
  final List<ProjectAttachment> attachments;
  final int attachmentCount;
  final List<ProjectSummary> similar;
  final ProjectViewer? viewer;
}

/// Signed out, the public cached copy; signed in, the copy that knows who
/// is asking (members-only briefs, the NDA, an invitation, the reader's own
/// proposal and how well they match).
final projectProvider = FutureProvider.autoDispose
    .family<ProjectDetail, String>((ref, code) {
      final signedIn = ref.watch(_accountProvider) != null;
      final path = signedIn
          ? '/work/me/projects/${Uri.encodeComponent(code)}/view'
          : '/market/projects/${Uri.encodeComponent(code)}';
      return ref
          .read(apiClientProvider)
          .get(
            path,
            parse: (d) => ProjectDetail.fromJson(d! as Map<String, Object?>),
          );
    });

/// What the market pays for work like this, beside the proposal form.
typedef PriceGuide = ({
  String pricingType,
  String currency,
  String? budgetMin,
  String? budgetMax,
  bool hasBudget,
  ({int sample, String low, String median, String high})? market,
});

final priceGuideProvider = FutureProvider.autoDispose
    .family<PriceGuide, String>(
      (ref, projectId) => ref
          .read(apiClientProvider)
          .get(
            '/work/me/projects/${Uri.encodeComponent(projectId)}/price-guide',
            parse: (d) {
              final g = _map(d);
              final budget = g['budget'];
              final market = g['market'];
              return (
                pricingType: '${g['pricingType'] ?? 'FIXED'}',
                currency: '${g['currency'] ?? 'IRT'}',
                budgetMin: budget is Map ? _text(budget['min']) : null,
                budgetMax: budget is Map ? _text(budget['max']) : null,
                hasBudget: budget is Map,
                market: market is Map
                    ? (
                        sample: _int(market['sample']) ?? 0,
                        low: '${market['low']}',
                        median: '${market['median']}',
                        high: '${market['high']}',
                      )
                    : null,
              );
            },
          ),
    );

/// The projects picked for this member: from their skills, from what they
/// have looked at, or none yet (ask them for skills).
typedef RecommendedProjects = ({String basis, List<ProjectSummary> items});

final recommendedProjectsProvider =
    FutureProvider.autoDispose<RecommendedProjects?>((ref) async {
      if (ref.watch(_accountProvider) == null) return null;
      return ref
          .read(apiClientProvider)
          .get(
            '/work/me/recommended-projects',
            parse: (d) {
              final m = _map(d);
              return (
                basis: '${m['basis'] ?? 'none'}',
                items: [
                  for (final p in (m['items'] as List? ?? const []))
                    if (p is Map<String, Object?>) ProjectSummary.fromJson(p),
                ],
              );
            },
          );
    });

/// The ids of the projects this member saved, for every bookmark.
final savedProjectIdsProvider = FutureProvider<Set<String>>((ref) async {
  if (ref.watch(_accountProvider) == null) return const {};
  return ref
      .read(apiClientProvider)
      .get(
        '/work/me/saved-projects/ids',
        parse: (d) => {for (final id in (d as List? ?? const [])) '$id'},
      );
});

/// One freelancer in the talent directory: `GET /work/talent`.
class TalentRow {
  TalentRow.fromJson(Map<String, Object?> t)
    : username = '${t['username'] ?? ''}',
      displayName = '${t['displayName'] ?? t['username'] ?? ''}',
      headline = _text(t['headline']),
      serviceCount = _int(t['serviceCount']) ?? 0,
      stats = FreelancerStats.fromJson(_map(t['stats']));

  final String username;
  final String displayName;
  final String? headline;
  final int serviceCount;
  final FreelancerStats stats;
}

/// A freelancer's record and live services, for their profile:
/// `GET /work/talent/:username`. Null for somebody who offers nothing.
typedef FreelancerCard = ({
  FreelancerStats? stats,
  List<({String code, String title, String? startingPrice, String currency})>
  services,
});

final freelancerCardProvider = FutureProvider.autoDispose
    .family<FreelancerCard?, String>((ref, username) async {
      try {
        return await ref
            .read(apiClientProvider)
            .get(
              '/work/talent/${Uri.encodeComponent(username)}',
              parse: (d) {
                final m = _map(d);
                return (
                  stats: switch (m['stats']) {
                    final Map<String, Object?> s => FreelancerStats.fromJson(s),
                    _ => null,
                  },
                  services: [
                    for (final s in (m['services'] as List? ?? const []))
                      if (s is Map)
                        (
                          code: '${s['code']}',
                          title: '${s['title'] ?? ''}',
                          startingPrice: _text(s['startingPrice']),
                          currency: '${s['currency'] ?? 'IRT'}',
                        ),
                  ],
                );
              },
            );
      } catch (_) {
        // A member with no freelance record: the profile goes without it.
        return null;
      }
    });

/// A service as the catalogue shows it: `GET /work/services`.
class ServiceSummary {
  ServiceSummary.fromJson(Map<String, Object?> s)
    : id = '${s['id']}',
      code = '${s['code'] ?? ''}',
      title = '${s['title'] ?? ''}',
      featured = s['featured'] == true,
      startingPrice = _text(s['startingPrice']),
      currency = '${s['currency'] ?? 'IRT'}',
      fastestDelivery = _int(s['fastestDelivery']),
      coverImageId = _text(s['coverImageId']),
      ordersCompleted = _int(s['ordersCompleted']) ?? 0,
      ratingAvg = _double(_map(s['rating'])['avg']),
      ratingCount = _int(_map(s['rating'])['count']) ?? 0,
      sellerUsername = _text(_map(s['seller'])['username']),
      sellerLevel = '${_map(s['seller'])['level'] ?? 'NEW'}',
      sellerVerified = _map(s['seller'])['verified'] == true;

  final String id;
  final String code;
  final String title;
  final bool featured;
  final String? startingPrice;
  final String currency;
  final int? fastestDelivery;
  final String? coverImageId;
  final int ordersCompleted;
  final double ratingAvg;
  final int ratingCount;
  final String? sellerUsername;
  final String sellerLevel;
  final bool sellerVerified;
}

/// The public address of a service's picture.
String serviceImagePath(String id) =>
    '/work/service-images/${Uri.encodeComponent(id)}';

typedef ServicePackage = ({
  String tier,
  String name,
  String description,
  String price,
  String currency,
  int deliveryDays,
  int revisions,
  List<String> features,
});

ServicePackage _package(Map<Object?, Object?> p, String currency) => (
  tier: '${p['tier'] ?? 'BASIC'}',
  name: '${p['name'] ?? ''}',
  description: '${p['description'] ?? ''}',
  price: '${p['price'] ?? '0'}',
  currency: '${p['currency'] ?? currency}',
  deliveryDays: _int(p['deliveryDays']) ?? 1,
  revisions: _int(p['revisions']) ?? 0,
  features: _strings(p['features']),
);

typedef ServiceExtra = ({String id, String title, String price, int extraDays});

typedef ServiceReview = ({
  int rating,
  String? text,
  DateTime? createdAt,
  String tier,
  String price,
  String currency,
  int? durationDays,
  String buyerCountry,
});

/// One service page: `GET /work/services/:code`.
class ServiceDetail {
  ServiceDetail.fromJson(Map<String, Object?> s)
    : id = '${s['id']}',
      code = '${s['code'] ?? ''}',
      title = '${s['title'] ?? ''}',
      description = '${s['description'] ?? ''}',
      category = switch (s['workCategory']) {
        final Map<String, Object?> c => WorkCategory.fromJson(c),
        _ => null,
      },
      skills = _strings(s['skills']),
      languages = _strings(s['languages']),
      faqs = [
        for (final f in (s['faqs'] as List? ?? const []))
          if (f is Map)
            (
              question: '${f['question'] ?? ''}',
              answer: '${f['answer'] ?? ''}',
            ),
      ],
      requirements = _strings(s['requirements']),
      packages = [
        for (final p in (s['packages'] as List? ?? const []))
          if (p is Map) _package(p, 'IRT'),
      ],
      extras = [
        for (final e in (s['extras'] as List? ?? const []))
          if (e is Map)
            (
              id: '${e['id']}',
              title: '${e['title'] ?? ''}',
              price: '${e['price'] ?? '0'}',
              extraDays: _int(e['extraDays']) ?? 0,
            ),
      ],
      images = [
        for (final i in (s['images'] as List? ?? const []))
          if (i is Map) (id: '${i['id']}', name: '${i['originalName'] ?? ''}'),
      ],
      ratingAvg = _double(_map(s['rating'])['avg']),
      ratingCount = _int(_map(s['rating'])['count']) ?? 0,
      breakdown = [
        for (final b in (_map(s['reviews'])['breakdown'] as List? ?? const []))
          if (b is Map)
            (stars: _int(b['stars']) ?? 0, count: _int(b['count']) ?? 0),
      ],
      reviews = [
        for (final r in (_map(s['reviews'])['items'] as List? ?? const []))
          if (r is Map)
            (
              rating: _int(r['rating']) ?? 0,
              text: _text(r['text']),
              createdAt: _date(r['createdAt']),
              tier: '${r['tier'] ?? 'BASIC'}',
              price: '${r['price'] ?? '0'}',
              currency: '${r['currency'] ?? 'IRT'}',
              durationDays: _int(r['durationDays']),
              buyerCountry: '${r['buyerCountry'] ?? 'IR'}',
            ),
      ],
      sellerUsername = _text(_map(_map(s['seller'])['profile'])['username']),
      sellerName = _text(_map(s['seller'])['displayName']),
      sellerHeadline = _text(_map(_map(s['seller'])['profile'])['headline']),
      sellerBio = _text(_map(s['seller'])['bio']),
      sellerStats = switch (_map(s['seller'])['stats']) {
        final Map<String, Object?> st => FreelancerStats.fromJson(st),
        _ => null,
      },
      ordersInQueue = _int(_map(s['seller'])['ordersInQueue']) ?? 0,
      moreFromSeller = [
        for (final m in (s['moreFromSeller'] as List? ?? const []))
          if (m is Map)
            (
              code: '${m['code']}',
              title: '${m['title'] ?? ''}',
              startingPrice: _text(m['startingPrice']),
              currency: '${m['currency'] ?? 'IRT'}',
            ),
      ];

  final String id;
  final String code;
  final String title;
  final String description;
  final WorkCategory? category;
  final List<String> skills;
  final List<String> languages;
  final List<({String question, String answer})> faqs;
  final List<String> requirements;
  final List<ServicePackage> packages;
  final List<ServiceExtra> extras;
  final List<({String id, String name})> images;
  final double ratingAvg;
  final int ratingCount;
  final List<({int stars, int count})> breakdown;
  final List<ServiceReview> reviews;
  final String? sellerUsername;
  final String? sellerName;
  final String? sellerHeadline;
  final String? sellerBio;
  final FreelancerStats? sellerStats;
  final int ordersInQueue;
  final List<
    ({String code, String title, String? startingPrice, String currency})
  >
  moreFromSeller;
}

final serviceProvider = FutureProvider.autoDispose
    .family<ServiceDetail, String>(
      (ref, code) => ref
          .read(apiClientProvider)
          .get(
            '/work/services/${Uri.encodeComponent(code)}',
            parse: (d) => ServiceDetail.fromJson(d! as Map<String, Object?>),
          ),
    );

/// The freelance writes a visitor makes from the public pages.
final freelanceActionsProvider = Provider<FreelanceActions>(
  FreelanceActions.new,
);

class FreelanceActions {
  const FreelanceActions(this._ref);

  final Ref _ref;

  ApiClient get _api => _ref.read(apiClientProvider);

  void _projectChanged(String code) => _ref
    ..invalidate(projectProvider(code))
    ..invalidate(workspaceProvider);

  Future<void> setSaved(String projectId, {required bool saved}) async {
    final path = '/work/me/saved-projects/${Uri.encodeComponent(projectId)}';
    if (saved) {
      await _api.put<void>(path);
    } else {
      await _api.delete<void>(path);
    }
    _ref.invalidate(savedProjectIdsProvider);
  }

  Future<void> signNda(String code, String projectId, String name) async {
    await _api.post<void>(
      '/work/me/projects/${Uri.encodeComponent(projectId)}/nda',
      body: {'signedName': name.trim(), 'accept': true},
    );
    _projectChanged(code);
  }

  Future<void> declineInvite(String code, String inviteId) async {
    await _api.post<void>(
      '/work/me/invites/${Uri.encodeComponent(inviteId)}/decline',
    );
    _projectChanged(code);
  }

  /// A new proposal, with one file if given: multipart, as the web sends it.
  Future<void> placeBid(
    String code,
    String projectId,
    Map<String, Object?> payload, {
    PickedFile? attachment,
    void Function(double progress)? onProgress,
  }) async {
    final parts = attachment == null
        ? null
        : await multipartParts([attachment]);
    await _api.upload<void>(
      '/market/me/projects/${Uri.encodeComponent(projectId)}/bid',
      form: () => FormData.fromMap({
        'payload': jsonEncode(payload),
        if (parts != null) 'attachment': parts().first,
      }),
      onProgress: onProgress,
    );
    _projectChanged(code);
  }

  Future<void> reviseBid(
    String code,
    String bidId,
    Map<String, Object?> payload,
  ) async {
    await _api.patch<void>(
      '/market/me/bids/${Uri.encodeComponent(bidId)}',
      body: payload,
    );
    _projectChanged(code);
  }

  Future<void> withdrawBid(String code, String bidId) async {
    await _api.post<void>(
      '/work/me/bids/${Uri.encodeComponent(bidId)}/withdraw',
    );
    _projectChanged(code);
  }

  /// A saved search over the project board.
  Future<void> createProjectAlert(String name, Map<String, Object?> query) =>
      _api.post<void>(
        '/work/me/project-alerts',
        body: {'name': name.trim(), 'query': query},
      );

  /// An order for a package: nothing is charged; the seller accepts or not.
  Future<void> placeOrder(
    String serviceId, {
    required String tier,
    required List<String> extraIds,
    required List<String> answers,
    String note = '',
  }) async {
    await _api.post<void>(
      '/work/me/services/${Uri.encodeComponent(serviceId)}/order',
      body: {
        'tier': tier,
        'extraIds': extraIds,
        'requirementAnswers': [for (final a in answers) a.trim()],
        if (note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
    _ref.invalidate(workspaceProvider);
  }
}
