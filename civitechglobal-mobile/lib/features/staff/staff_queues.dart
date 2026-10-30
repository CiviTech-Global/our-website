import 'package:flutter/material.dart';

import '../../core/format.dart';
import '../../core/geo.dart';
import '../../l10n/l10n.dart';
import '../freelance/freelance_ui.dart' show money;

/// The staff desk's queues: the web panel's daily work pages
/// (civitechglobal-web/src/pages/admin), described once each so a single
/// list screen and a single item screen serve them all.
///
/// Two kinds of work. Moderation queues (verification, postings, bids,
/// books, services, shops, products) share one contract: a decision of
/// approve, ask for changes or reject, with a note for the author and one
/// for staff. Intake queues (insurance, project requests, CVs, contact
/// messages, consultations) move through statuses of their own.
///
/// Setup pages (roles, team, showcase, categories, the book catalogue,
/// companies, demo data, the audit log) stay on the website.

typedef StaffRow = Map<String, Object?>;

/// A labelled value on the item screen.
typedef Fact = (String label, String value);

/// A file staff can open: its label, the API path that serves it with the
/// session, and the name it is opened under.
typedef StaffFile = (String label, String path, String name);

/// What the item screen shows about one row.
class StaffItemView {
  const StaffItemView({
    required this.title,
    this.subtitle,
    this.status,
    this.facts = const [],
    this.texts = const [],
    this.files = const [],
    this.images = const [],
  });

  final String title;
  final String? subtitle;
  final String? status;
  final List<Fact> facts;

  /// Longer passages: a description, a cover letter, a message.
  final List<Fact> texts;
  final List<StaffFile> files;

  /// Pictures staff are judging, by the API path that serves them with the
  /// session: a listing's photos can be unpublished, so the public ones 404.
  final List<String> images;
}

/// What staff do to an item.
sealed class StaffAction {
  const StaffAction();
}

/// Approve, ask for changes, or reject (`POST <path>/review`).
class ModerationAction extends StaffAction {
  const ModerationAction(this.reviewPath, {this.decisions = _all});

  static const _all = ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'];

  final String Function(String id) reviewPath;
  final List<String> decisions;
}

/// A new status, with the queue's own note field when it has one.
class StatusAction extends StaffAction {
  const StatusAction(
    this.updatePath, {
    this.method = 'patch',
    this.noteKey,
    this.replyPath,
  });

  final String Function(String id) updatePath;

  /// The insurance queue takes a PUT; the rest PATCH.
  final String method;

  /// `internalNotes` or `staffNote`; null when the queue keeps none.
  final String? noteKey;

  /// Contact messages are answered from the desk: `POST <path>`.
  final String Function(String id)? replyPath;
}

class StaffQueue {
  const StaffQueue({
    required this.key,
    required this.icon,
    required this.label,
    required this.path,
    required this.statuses,
    required this.statusLabel,
    required this.initialStatus,
    required this.searchHint,
    required this.describe,
    required this.action,
    this.params = const {},
    this.detailPath,
    this.currentStatus,
    this.note,
    this.webPath,
    this.webNote,
  });

  /// The workload's name for it (GET /admin/dashboard/workload).
  final String key;
  final IconData icon;
  final String Function(Strings s) label;

  /// The list endpoint, and anything it always sends.
  final String path;
  final Map<String, String> params;

  final List<String> statuses;
  final String Function(Strings s, String status) statusLabel;

  /// Where the list opens: what is waiting.
  final String initialStatus;
  final String Function(Strings s) searchHint;

  /// A fuller copy of a row, when the queue has one.
  final String Function(String id)? detailPath;
  final StaffItemView Function(StaffRow row, Strings s, String language)
  describe;
  final StaffAction action;

  /// The status the item holds now (moderation queues read
  /// moderationStatus; the rest read status).
  final String Function(StaffRow row)? currentStatus;

  /// The note already written, to edit rather than retype.
  final String? Function(StaffRow row)? note;

  /// The page on the website for what the app leaves there.
  final String Function(String id)? webPath;
  final String Function(Strings s)? webNote;

  String statusOf(StaffRow row) =>
      currentStatus?.call(row) ??
      '${row['moderationStatus'] ?? row['status'] ?? ''}';
}

String _s(Object? v) => v == null ? '' : '$v';

String _name(Object? person) {
  if (person is! Map) return '';
  final full = '${person['firstName'] ?? ''} ${person['lastName'] ?? ''}'
      .trim();
  return full.isEmpty ? _s(person['fullName']) : full;
}

String _date(Object? iso, String language) {
  final d = DateTime.tryParse(_s(iso));
  return d == null ? '' : formatDate(d.toLocal(), language);
}

List<Fact> _nonEmpty(List<Fact> facts) => [
  for (final f in facts)
    if (f.$2.trim().isNotEmpty) f,
];

const _moderation = [
  'PENDING_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
];

String _moderationLabel(Strings s, String status) => s.market.label(status);

String _leadLabel(Strings s, String status) => switch (status) {
  'NEW' => s.admin.newLeads,
  'CONTACTED' => s.admin.contacted,
  'IN_PROGRESS' => s.admin.inProgress,
  'COMPLETED' => s.admin.completed,
  'CANCELLED' => s.admin.cancelled,
  _ => status,
};

/// The Telegram bot stores a code; the website stores the words themselves.
String _contactTime(String value, String lang) {
  final fa = lang == 'fa';
  return switch (value) {
    'morning' => fa ? 'صبح (۹ تا ۱۲)' : 'Morning (9–12)',
    'noon' => fa ? 'ظهر (۱۲ تا ۱۶)' : 'Midday (12–16)',
    'evening' => fa ? 'عصر (۱۶ تا ۲۰)' : 'Evening (16–20)',
    'any' => fa ? 'فرقی ندارد' : 'Any time',
    _ => value,
  };
}

/// Who sent it and when, the two facts every moderation item carries.
List<Fact> _authorship(Strings s, Object? person, Object? at, String lang) => [
  (s.market.submittedBy, _name(person)),
  if (person is Map) (s.admin.email, _s(person['email'])),
  (s.market.submittedAt, _date(at, lang)),
];

StaffItemView _resume(StaffRow r, Strings s, String lang) => StaffItemView(
  title: _s(r['fullName']),
  subtitle: _s(r['trackingCode']),
  status: s.join.statuses.label(_s(r['status'])),
  facts: _nonEmpty([
    (s.join.email, _s(r['email'])),
    (s.join.phone, _s(r['phone'])),
    (s.join.city, _s(r['city'])),
    (s.join.birthYear, _s(r['birthYear'])),
    (s.join.matchedRole, _s(r['matchedRole'])),
    (s.admin.createdAt, _date(r['createdAt'], lang)),
    for (final link in ['githubUrl', 'portfolioUrl', 'linkedinUrl'])
      ('', _s(r[link])),
  ]),
  texts: _nonEmpty([(s.join.coverNote, _s(r['coverNote']))]),
  files: [
    if (r['resumeOriginalName'] != null)
      (
        s.join.download,
        '/resumes/admin/${r['id']}/file',
        _s(r['resumeOriginalName']),
      ),
  ],
);

final List<StaffQueue> staffQueues = [
  StaffQueue(
    key: 'insurance',
    icon: Icons.assignment_outlined,
    label: (s) => s.admin.requests,
    path: '/requests',
    statuses: const [
      'NEW',
      'CONTACTED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ],
    statusLabel: _leadLabel,
    initialStatus: 'NEW',
    searchHint: (s) => s.admin.searchRequests,
    detailPath: (id) => '/requests/$id',
    // The detail is {request, answers}; the list row is the request alone.
    currentStatus: (r) => _s((r['request'] as Map?)?['status'] ?? r['status']),
    describe: (row, s, lang) {
      final r = (row['request'] as Map?)?.cast<String, Object?>() ?? row;
      final product = r['product'] as Map?;
      return StaffItemView(
        title: _s(r['fullName']),
        subtitle: [
          _s(product?['title']),
          _s(r['trackingCode']),
        ].where((x) => x.isNotEmpty).join(factSep(lang)),
        status: _leadLabel(s, _s(r['status'])),
        facts: _nonEmpty([
          (s.admin.phone, _s(r['phoneNumber'])),
          (s.admin.email, _s(r['email'])),
          (s.admin.organization, _s(r['organizationName'])),
          (s.admin.city, _s(r['city'])),
          (
            s.admin.preferredContactTime,
            _contactTime(_s(r['preferredContactTime']), lang),
          ),
          (s.admin.callbackScheduled, _date(r['callbackScheduledAt'], lang)),
          (s.admin.createdAt, _date(r['createdAt'], lang)),
          for (final a in (row['answers'] as List? ?? const []))
            if (a is Map)
              (
                _s(lang == 'fa' ? a['label'] : a['labelEn']),
                _s(lang == 'fa' ? a['display'] : a['displayEn']),
              ),
        ]),
        texts: _nonEmpty([(s.admin.notes, _s(r['notes']))]),
      );
    },
    action: StatusAction((id) => '/requests/$id/status', method: 'put'),
  ),
  StaffQueue(
    key: 'projects',
    icon: Icons.code_rounded,
    label: (s) => s.proposal.adminTitle,
    path: '/projects/admin/requests',
    statuses: const [
      'SUBMITTED',
      'IN_REVIEW',
      'NEEDS_CLARIFICATION',
      'PROPOSAL_SENT',
      'ACCEPTED',
      'DECLINED',
      'WITHDRAWN',
      'EXPIRED',
    ],
    statusLabel: (s, v) => s.proposal.statuses.label(v),
    initialStatus: 'SUBMITTED',
    searchHint: (s) => s.proposal.searchRequests,
    detailPath: (id) => '/projects/admin/requests/$id',
    note: (r) => r['internalNotes']?.toString(),
    webPath: (id) => '/admin/projects/$id',
    webNote: (s) => s.mobile.staffProposalsOnWeb,
    describe: (r, s, lang) => StaffItemView(
      title: _s(r['title']),
      subtitle: [
        _s(r['contactName']),
        _s(r['organizationName']),
        _s(r['trackingCode']),
      ].where((x) => x.isNotEmpty).join(factSep(lang)),
      status: s.proposal.statuses.label(_s(r['status'])),
      facts: _nonEmpty([
        (s.admin.email, _s(r['email'])),
        (s.admin.phone, _s(r['phone'])),
        if (r['budgetUnknown'] == true)
          (s.market.clientBudget, s.proposal.budgetUnknown)
        else
          (
            s.market.clientBudget,
            [
              money(r['budgetMin']?.toString(), _s(r['currency']), s, lang),
              money(r['budgetMax']?.toString(), _s(r['currency']), s, lang),
            ].whereType<String>().join(' – '),
          ),
        (s.admin.createdAt, _date(r['createdAt'], lang)),
      ]),
      texts: _nonEmpty([
        (s.proposal.theBrief, _s(r['summary'])),
        (s.proposal.scope, _s(r['goals'])),
        (s.proposal.exclusions, _s(r['outOfScope'])),
        (s.proposal.assumptions, _s(r['constraints'])),
      ]),
      files: [
        for (final a in (r['attachments'] as List? ?? const []))
          if (a is Map)
            (
              _s(a['originalName']),
              '/projects/admin/attachments/${a['id']}',
              _s(a['originalName']),
            ),
      ],
    ),
    action: StatusAction(
      (id) => '/projects/admin/requests/$id/status',
      noteKey: 'internalNotes',
    ),
  ),
  for (final (key, track, icon) in [
    ('resumes', 'JOB', Icons.badge_outlined),
    ('programme', 'VOLUNTEER,INTERNSHIP', Icons.school_outlined),
  ])
    StaffQueue(
      key: key,
      icon: icon,
      label: (s) =>
          key == 'resumes' ? s.join.adminTitle : s.volunteer.adminTitle,
      path: '/resumes/admin',
      params: {'track': track},
      statuses: const [
        'RECEIVED',
        'IN_REVIEW',
        'SHORTLISTED',
        'MATCHED',
        'ON_HOLD',
        'DECLINED',
        'WITHDRAWN',
      ],
      statusLabel: (s, v) => s.join.statuses.label(v),
      initialStatus: 'RECEIVED',
      searchHint: (s) => s.join.searchResumes,
      detailPath: (id) => '/resumes/admin/$id',
      note: (r) => r['internalNotes']?.toString(),
      describe: _resume,
      action: StatusAction(
        (id) => '/resumes/admin/$id',
        noteKey: 'internalNotes',
      ),
    ),
  StaffQueue(
    key: 'messages',
    icon: Icons.mail_outline_rounded,
    label: (s) => s.contact.inboxTitle,
    path: '/contact',
    statuses: const ['OPEN', 'ANSWERED', 'CLOSED'],
    statusLabel: (s, v) => s.contact.statuses.label(v),
    initialStatus: 'OPEN',
    searchHint: (s) => s.contact.searchInbox,
    describe: (r, s, lang) => StaffItemView(
      title: _s(r['subject']).isEmpty ? s.contact.noSubject : _s(r['subject']),
      subtitle: [
        _s(r['name']),
        _s(r['trackingCode']),
      ].where((x) => x.isNotEmpty).join(factSep(lang)),
      status: s.contact.statuses.label(_s(r['status'])),
      facts: _nonEmpty([
        (s.admin.email, _s(r['email'])),
        (s.admin.createdAt, _date(r['createdAt'], lang)),
      ]),
      texts: _nonEmpty([
        (s.contact.formMessage, _s(r['message'])),
        for (final reply in (r['replies'] as List? ?? const []))
          if (reply is Map) (s.contact.staffReply, _s(reply['body'])),
      ]),
    ),
    action: StatusAction(
      (id) => '/contact/$id',
      replyPath: (id) => '/contact/$id/reply',
    ),
  ),
  StaffQueue(
    key: 'consultations',
    icon: Icons.forum_outlined,
    label: (s) => s.consult.queueTitle,
    path: '/consult/admin/requests',
    statuses: const [
      'NEW',
      'CONTACTED',
      'SCHEDULED',
      'COMPLETED',
      'NO_ANSWER',
      'CANCELLED',
    ],
    statusLabel: (s, v) => s.consult.statuses.label(v),
    initialStatus: 'NEW',
    searchHint: (s) => s.consult.searchQueue,
    note: (r) => r['staffNote']?.toString(),
    describe: (r, s, lang) => StaffItemView(
      title: _s(r['fullName']),
      subtitle: [
        s.consult.topics.label(_s(r['topic'])),
        _s(r['trackingCode']),
      ].where((x) => x.isNotEmpty).join(factSep(lang)),
      status: s.consult.statuses.label(_s(r['status'])),
      facts: _nonEmpty([
        (s.consult.phoneLabel, _s(r['phoneNumber'])),
        (s.consult.emailLabel, _s(r['email'])),
        (s.consult.prefers, s.consult.modes.label(_s(r['preferredMode']))),
        (s.consult.expertLabel, _s((r['expert'] as Map?)?['fullName'])),
        (s.consult.scheduledFor, _date(r['scheduledAt'], lang)),
        (s.consult.handledBy, _name(r['assignedTo'])),
        (s.admin.createdAt, _date(r['createdAt'], lang)),
      ]),
      texts: _nonEmpty([
        (s.consult.goalLabel, _s(r['goal'])),
        (s.consult.backgroundLabel, _s(r['background'])),
      ]),
    ),
    action: StatusAction(
      (id) => '/consult/admin/requests/$id',
      noteKey: 'staffNote',
    ),
  ),
  StaffQueue(
    key: 'verification',
    icon: Icons.verified_user_outlined,
    label: (s) => s.market.queueVerifications,
    path: '/market/admin/verifications',
    statuses: const ['PENDING', 'APPROVED', 'REJECTED'],
    statusLabel: _moderationLabel,
    initialStatus: 'PENDING',
    searchHint: (s) => s.list.searchPlaceholder,
    detailPath: (id) => '/market/admin/verifications/$id',
    note: (r) => r['internalNote']?.toString(),
    describe: (r, s, lang) => StaffItemView(
      title: '${_s(r['legalFirstName'])} ${_s(r['legalLastName'])}'.trim(),
      subtitle: _s(r['companyName']),
      status: s.market.label(_s(r['status'])),
      facts: _nonEmpty([
        ...(_authorship(s, r['user'], r['submittedAt'], lang)),
        (s.market.nationalId, _s(r['nationalId'])),
        (s.admin.phone, _s(r['phone'])),
        (
          s.admin.city,
          [
            displayProvince(r['province']?.toString(), lang),
            _s(r['city']),
          ].where((x) => x.isNotEmpty).join(factSep(lang)),
        ),
        (s.market.address, _s(r['addressLine'])),
        (s.market.companyRegistrationNo, _s(r['companyRegistrationNo'])),
        (s.market.companyEconomicCode, _s(r['companyEconomicCode'])),
        (s.market.companyRole, _s(r['companyRole'])),
        (s.market.companyWebsite, _s(r['companyWebsite'])),
      ]),
      files: [
        for (final d in (r['documents'] as List? ?? const []))
          if (d is Map)
            (
              s.market.label(_s(d['kind'])),
              '/market/admin/verification-documents/${d['id']}',
              _s(d['originalName']),
            ),
      ],
    ),
    action: ModerationAction(
      (id) => '/market/admin/verifications/$id/review',
      decisions: const ['APPROVED', 'REJECTED'],
    ),
  ),
  StaffQueue(
    key: 'jobPosts',
    icon: Icons.work_outline_rounded,
    label: (s) => s.market.queueJobs,
    path: '/market/admin/jobs',
    statuses: _moderation,
    statusLabel: _moderationLabel,
    initialStatus: 'PENDING_REVIEW',
    searchHint: (s) => s.list.searchPlaceholder,
    detailPath: (id) => '/market/admin/jobs/$id',
    note: (r) => r['internalNote']?.toString(),
    describe: (r, s, lang) => StaffItemView(
      title: _s(r['title']),
      subtitle: [
        _s(r['companyName']),
        _s(r['code']),
      ].where((x) => x.isNotEmpty).join(factSep(lang)),
      status: s.market.label(_s(r['moderationStatus'])),
      facts: _nonEmpty([
        ...(_authorship(s, r['author'], r['submittedAt'], lang)),
        (
          s.admin.city,
          [
            displayProvince(r['province']?.toString(), lang),
            _s(r['city']),
          ].where((x) => x.isNotEmpty).join(factSep(lang)),
        ),
        if (r['salaryUndisclosed'] != true)
          (
            s.market.salary,
            [
              money(r['salaryMin']?.toString(), _s(r['currency']), s, lang),
              money(r['salaryMax']?.toString(), _s(r['currency']), s, lang),
            ].whereType<String>().join(' – '),
          ),
        (
          s.jobs.skillsLabel,
          ((r['skills'] as List?) ?? const []).join(factSep(lang)),
        ),
      ]),
      texts: _nonEmpty([(s.market.description, _s(r['description']))]),
    ),
    action: ModerationAction((id) => '/market/admin/jobs/$id/review'),
  ),
  StaffQueue(
    key: 'applications',
    icon: Icons.description_outlined,
    label: (s) => s.market.queueApplications,
    path: '/market/admin/applications',
    statuses: _moderation,
    statusLabel: _moderationLabel,
    initialStatus: 'PENDING_REVIEW',
    searchHint: (s) => s.list.searchPlaceholder,
    describe: (r, s, lang) {
      final job = (r['job'] as Map?) ?? const {};
      return StaffItemView(
        title: _name(r['applicant']),
        subtitle: [
          _s(job['title']),
          _s(job['companyName']),
        ].where((x) => x.isNotEmpty).join(factSep(lang)),
        status: s.market.label(_s(r['moderationStatus'])),
        facts: _nonEmpty([
          (s.admin.email, _s((r['applicant'] as Map?)?['email'])),
          (
            s.market.expectedSalary,
            money(r['expectedSalary']?.toString(), 'IRT', s, lang) ?? '',
          ),
          (s.admin.createdAt, _date(r['createdAt'], lang)),
        ]),
        texts: _nonEmpty([
          (s.market.coverLetter, _s(r['coverLetter'])),
          (s.market.description, _s(job['description'])),
        ]),
        files: [
          if (r['cvOriginalName'] != null)
            (
              s.market.downloadDocument,
              '/market/admin/application-cvs/${r['id']}',
              _s(r['cvOriginalName']),
            ),
        ],
      );
    },
    action: ModerationAction((id) => '/market/admin/applications/$id/review'),
  ),
  StaffQueue(
    key: 'freelanceProjects',
    icon: Icons.folder_open_outlined,
    label: (s) => s.market.queueProjects,
    path: '/market/admin/projects',
    statuses: _moderation,
    statusLabel: _moderationLabel,
    initialStatus: 'PENDING_REVIEW',
    searchHint: (s) => s.list.searchPlaceholder,
    detailPath: (id) => '/market/admin/projects/$id',
    note: (r) => r['internalNote'] as String?,
    describe: (r, s, lang) => StaffItemView(
      title: _s(r['title']),
      subtitle: [
        _s(r['companyName']),
        _s(r['code']),
      ].where((x) => x.isNotEmpty).join(factSep(lang)),
      status: s.market.label(_s(r['moderationStatus'])),
      facts: _nonEmpty([
        ..._authorship(s, r['author'], r['submittedAt'], lang),
        if (r['budgetUnknown'] != true)
          (
            s.market.clientBudget,
            [
              money(r['budgetMin']?.toString(), _s(r['currency']), s, lang),
              money(r['budgetMax']?.toString(), _s(r['currency']), s, lang),
            ].whereType<String>().join(' – '),
          ),
        (
          s.market.skills,
          ((r['skills'] as List?) ?? const []).join(factSep(lang)),
        ),
      ]),
      texts: _nonEmpty([(s.market.description, _s(r['description']))]),
      files: [
        for (final a in (r['attachments'] as List? ?? const []))
          if (a is Map)
            (
              _s(a['originalName']),
              '/market/admin/project-attachments/${a['id']}',
              _s(a['originalName']),
            ),
      ],
    ),
    action: ModerationAction((id) => '/market/admin/projects/$id/review'),
  ),
  StaffQueue(
    key: 'bids',
    icon: Icons.gavel_rounded,
    label: (s) => s.market.queueBids,
    path: '/market/admin/bids',
    statuses: _moderation,
    statusLabel: _moderationLabel,
    initialStatus: 'PENDING_REVIEW',
    searchHint: (s) => s.list.searchPlaceholder,
    describe: (r, s, lang) {
      final project = (r['project'] as Map?) ?? const {};
      final currency = _s(r['currency']);
      return StaffItemView(
        title: _s(project['title']),
        subtitle: r['isCompanyOffer'] == true
            ? s.market.placeCompanyOffer
            : _name(r['bidder']),
        status: s.market.label(_s(r['moderationStatus'] ?? 'PENDING_REVIEW')),
        facts: _nonEmpty([
          (
            s.market.amount,
            money(r['amount']?.toString(), currency, s, lang) ?? '',
          ),
          (s.market.deliveryDays, _s(r['deliveryDays'])),
          if (project['budgetUnknown'] != true)
            (
              s.market.clientBudget,
              [
                money(
                  project['budgetMin']?.toString(),
                  _s(project['currency']),
                  s,
                  lang,
                ),
                money(
                  project['budgetMax']?.toString(),
                  _s(project['currency']),
                  s,
                  lang,
                ),
              ].whereType<String>().join(' – '),
            ),
          (s.admin.createdAt, _date(r['createdAt'], lang)),
        ]),
        texts: _nonEmpty([
          (s.market.bidMessage, _s(r['message'])),
          (s.market.projectScope, _s(project['description'])),
        ]),
      );
    },
    action: ModerationAction((id) => '/market/admin/bids/$id/review'),
  ),
  StaffQueue(
    key: 'books',
    icon: Icons.menu_book_outlined,
    label: (s) => s.books.queueTitle,
    path: '/bookshop/admin/offers',
    statuses: _moderation,
    statusLabel: _moderationLabel,
    initialStatus: 'PENDING_REVIEW',
    searchHint: (s) => s.list.searchPlaceholder,
    describe: (r, s, lang) {
      final book = (r['book'] as Map?) ?? const {};
      return StaffItemView(
        title: _s(book['title'] ?? r['title'] ?? r['code']),
        subtitle: [
          _name(r['seller']),
          _s(r['code']),
        ].where((x) => x.isNotEmpty).join(factSep(lang)),
        status: s.market.label(_s(r['moderationStatus'])),
        facts: _nonEmpty([
          ...(_authorship(s, r['seller'], r['submittedAt'], lang)),
          (
            s.trademaster.price,
            money(r['price']?.toString(), _s(r['currency']), s, lang) ?? '',
          ),
          (
            s.admin.city,
            [
              displayProvince(r['province']?.toString(), lang),
              _s(r['city']),
            ].where((x) => x.isNotEmpty).join(factSep(lang)),
          ),
          if (r['postedByCompany'] == true) (s.books.queueCompanyListing, '✓'),
        ]),
        texts: _nonEmpty([(s.market.description, _s(r['conditionNotes']))]),
        images: [
          for (final p in (r['photos'] as List? ?? const []))
            if (p is Map) '/bookshop/admin/photos/${p['id']}',
          if (r['coverUrl'] != null) '/market/admin/books/${r['id']}/cover',
        ],
      );
    },
    action: ModerationAction((id) => '/market/admin/books/$id/review'),
  ),
  StaffQueue(
    key: 'services',
    icon: Icons.design_services_outlined,
    label: (s) => s.work.serviceQueueTitle,
    path: '/work/admin/services',
    statuses: _moderation,
    statusLabel: _moderationLabel,
    initialStatus: 'PENDING_REVIEW',
    searchHint: (s) => s.list.searchPlaceholder,
    note: (r) => r['internalNote']?.toString(),
    describe: (r, s, lang) => StaffItemView(
      title: _s(r['title']),
      subtitle: [
        _name(r['owner']),
        _s(r['code']),
      ].where((x) => x.isNotEmpty).join(factSep(lang)),
      status: s.market.label(_s(r['moderationStatus'])),
      facts: _nonEmpty(_authorship(s, r['owner'], r['submittedAt'], lang)),
      texts: _nonEmpty([(s.market.description, _s(r['description']))]),
      images: [
        for (final i in (r['images'] as List? ?? const []))
          if (i is Map) '/work/admin/service-images/${i['id']}',
      ],
    ),
    action: ModerationAction((id) => '/work/admin/services/$id/review'),
  ),
  StaffQueue(
    key: 'tradeMasterShops',
    icon: Icons.storefront_outlined,
    label: (s) => s.trademaster.queueShops,
    path: '/trademaster/admin/shops',
    statuses: _moderation,
    statusLabel: _moderationLabel,
    initialStatus: 'PENDING_REVIEW',
    searchHint: (s) => s.list.searchPlaceholder,
    detailPath: (id) => '/trademaster/admin/shops/$id',
    note: (r) => r['internalNote']?.toString(),
    describe: (r, s, lang) => StaffItemView(
      title: _s(r['name']),
      subtitle: [
        _s(r['industry']),
        _s(r['code']),
      ].where((x) => x.isNotEmpty).join(factSep(lang)),
      status: s.market.label(_s(r['moderationStatus'])),
      facts: _nonEmpty([
        ...(_authorship(s, r['owner'], r['createdAt'], lang)),
        (
          s.admin.city,
          [
            displayProvince(r['province']?.toString(), lang),
            _s(r['city']),
          ].where((x) => x.isNotEmpty).join(factSep(lang)),
        ),
        (s.admin.phone, _s(r['phone'])),
        (s.trademaster.website, _s(r['website'])),
        (s.trademaster.address, _s(r['address'])),
      ]),
      texts: _nonEmpty([
        (s.market.description, _s(r['description'] ?? r['summary'])),
      ]),
      images: [
        if (r['logoUrl'] != null) '/trademaster/admin/shops/${r['id']}/logo',
        if (r['coverUrl'] != null) '/trademaster/admin/shops/${r['id']}/cover',
      ],
    ),
    action: ModerationAction((id) => '/trademaster/admin/shops/$id/review'),
  ),
  StaffQueue(
    key: 'tradeMasterProducts',
    icon: Icons.inventory_2_outlined,
    label: (s) => s.trademaster.queueProducts,
    path: '/trademaster/admin/products',
    statuses: _moderation,
    statusLabel: _moderationLabel,
    initialStatus: 'PENDING_REVIEW',
    searchHint: (s) => s.list.searchPlaceholder,
    detailPath: (id) => '/trademaster/admin/products/$id',
    note: (r) => r['internalNote']?.toString(),
    describe: (r, s, lang) {
      final business = (r['business'] as Map?) ?? const {};
      return StaffItemView(
        title: _s(r['title']),
        subtitle: [
          _s(business['name']),
          _s(r['code']),
        ].where((x) => x.isNotEmpty).join(factSep(lang)),
        status: s.market.label(_s(r['moderationStatus'])),
        facts: _nonEmpty([
          (
            s.trademaster.price,
            money(r['price']?.toString(), _s(r['currency']), s, lang) ?? '',
          ),
          (s.trademaster.stock, _s(r['stock'])),
          (s.admin.category, _s((r['category'] as Map?)?['name'])),
          (s.admin.createdAt, _date(r['createdAt'], lang)),
        ]),
        texts: _nonEmpty([
          (s.market.description, _s(r['description'] ?? r['summary'])),
        ]),
        images: [
          for (final i in (r['images'] as List? ?? const []))
            if (i is Map) '/trademaster/admin/products/images/${i['id']}',
        ],
      );
    },
    action: ModerationAction((id) => '/trademaster/admin/products/$id/review'),
  ),
];

StaffQueue? staffQueue(String key) {
  for (final q in staffQueues) {
    if (q.key == key) return q;
  }
  return null;
}
