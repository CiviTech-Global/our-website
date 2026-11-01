import 'package:flutter/material.dart';

import '../../l10n/l10n.dart';
import 'staff_queues.dart' show StaffRow;

/// The web panel's setup pages, described once each: what a row is called,
/// where it lives, and the fields its form asks for. One list screen and one
/// form serve them all (staff_collection_screens.dart).

enum FieldKind { text, long, ltr, flag, number, tags, choice, lookup }

class StaffField {
  const StaffField(
    this.key,
    this.label,
    this.kind, {
    this.required = false,
    this.choices,
    this.fallback,
    this.lookupPath,
  });

  final String key;
  final String Function(Strings s) label;
  final FieldKind kind;
  final bool required;

  /// What a choice offers, read from the list's own answer when it depends
  /// on it (a member's section, a category's parent).
  final List<(String, String)> Function(Strings s, Object? data, StaffRow? row)?
  choices;

  /// A new row's value when the form leaves it alone.
  final Object? fallback;

  /// Searched with `?q=` for a person, whose id is the value.
  final String? lookupPath;
}

class StaffCollection {
  const StaffCollection({
    required this.key,
    required this.permission,
    required this.icon,
    required this.label,
    required this.path,
    required this.rows,
    required this.title,
    required this.fields,
    this.subtitle,
    this.basePath,
    this.query = const {},
    this.fixed = const {},
    this.imageField,
    this.imagePath,
    this.reorderPath,
    this.canDelete = true,
    this.deleteConfirm,
    this.hidden,
    this.canCreate = true,
    this.createOnly = false,
    this.mergePath,
  });

  final String key;

  /// The module the workload must list, or null for the super admin alone.
  final String? permission;
  final IconData icon;
  final String Function(Strings s) label;

  /// What the list reads.
  final String path;
  final Map<String, Object?> query;
  final List<StaffRow> Function(Object? data) rows;

  /// Where a row is created and addressed, when not [path].
  final String? basePath;

  /// Sent with every save, the page deciding it (a customer or a partner).
  final Map<String, Object?> fixed;
  final String Function(StaffRow row) title;
  final String Function(StaffRow row, Strings s)? subtitle;
  final List<StaffField> fields;

  /// The multipart field a picture travels in; rows with one are sent as a
  /// form, with the rest as a JSON `payload` part.
  final String? imageField;
  final String? Function(StaffRow row)? imagePath;
  final String? reorderPath;
  final bool canDelete;
  final String Function(Strings s)? deleteConfirm;

  /// Rows the public cannot see.
  final bool Function(StaffRow row)? hidden;

  final bool canCreate;

  /// A form with no list: the desk opens it straight away.
  final bool createOnly;

  /// Folding one row into another: `{keepId, dropId}`.
  final String? mergePath;

  String get base => basePath ?? path;
}

List<StaffRow> _list(Object? data) => [
  for (final r in (data as List? ?? const []))
    if (r is Map) r.cast<String, Object?>(),
];

List<StaffRow> _under(Object? data, String key) => _list((data as Map?)?[key]);

String _s(Object? v) => v == null ? '' : '$v';

List<(String, String)> _sections(Strings s, Object? data, StaffRow? row) => [
  ('', s.team.noSection),
  for (final section in _under(data, 'sections'))
    (_s(section['id']), _s(section['name'])),
];

/// A parent is any other row: a category cannot sit under itself.
List<(String, String)> _parents(Strings s, Object? data, StaffRow? row) => [
  ('', s.categoryDesk.topLevel),
  for (final other in _list(data))
    if (other['id'] != row?['id']) (_s(other['id']), _s(other['name'])),
];

List<StaffField> _categoryFields() => [
  StaffField(
    'name',
    (s) => s.categoryDesk.name,
    FieldKind.text,
    required: true,
  ),
  StaffField('slug', (s) => s.categoryDesk.slug, FieldKind.ltr),
  StaffField(
    'parentId',
    (s) => s.categoryDesk.parent,
    FieldKind.choice,
    choices: _parents,
  ),
  StaffField('position', (s) => s.categoryDesk.position, FieldKind.number),
  StaffField(
    'active',
    (s) => s.categoryDesk.active,
    FieldKind.flag,
    fallback: true,
  ),
];

StaffCollection _organizations(
  String key,
  String kind,
  IconData icon,
  String Function(Strings s) label,
) => StaffCollection(
  key: key,
  permission: 'showcase',
  icon: icon,
  label: label,
  path: '/showcase/admin/organizations',
  query: {'kind': kind},
  fixed: {'kind': kind},
  rows: _list,
  title: (r) => _s(r['name']),
  subtitle: (r, s) => _s(r['industry']),
  imageField: 'logo',
  imagePath: (r) =>
      r['logoUrl'] == null ? null : '/showcase/admin/logo/${r['id']}',
  reorderPath: '/showcase/admin/organizations/reorder',
  deleteConfirm: (s) => s.showcase.deleteOrganizationConfirm,
  hidden: (r) => r['published'] == false,
  fields: [
    StaffField('name', (s) => s.showcase.name, FieldKind.text, required: true),
    StaffField('description', (s) => s.showcase.description, FieldKind.long),
    StaffField('industry', (s) => s.showcase.industry, FieldKind.text),
    StaffField('website', (s) => s.showcase.website, FieldKind.ltr),
    StaffField('sinceYear', (s) => s.showcase.sinceYear, FieldKind.number),
    if (kind == 'PARTNER')
      StaffField(
        'partnershipType',
        (s) => s.showcase.partnershipType,
        FieldKind.choice,
        choices: (s, _, _) => [
          ('', '—'),
          for (final t in const [
            'TECHNOLOGY',
            'STRATEGIC',
            'ACADEMIC',
            'RESELLER',
            'COMMUNITY',
            'OTHER',
          ])
            (t, s.showcase.partnershipTypes.label(t)),
        ],
      ),
    StaffField(
      'testimonialQuote',
      (s) => s.showcase.testimonialQuote,
      FieldKind.long,
    ),
    StaffField(
      'testimonialAuthor',
      (s) => s.showcase.testimonialAuthor,
      FieldKind.text,
    ),
    StaffField(
      'testimonialRole',
      (s) => s.showcase.testimonialRole,
      FieldKind.text,
    ),
    StaffField('featured', (s) => s.showcase.featuredLabel, FieldKind.flag),
    StaffField(
      'active',
      (s) => s.showcase.activeLabel,
      FieldKind.flag,
      fallback: true,
    ),
    StaffField(
      'published',
      (s) => s.showcase.published,
      FieldKind.flag,
      fallback: true,
    ),
  ],
);

final List<StaffCollection> staffCollections = [
  StaffCollection(
    key: 'team',
    permission: null,
    icon: Icons.groups_outlined,
    label: (s) => s.team.adminTitle,
    path: '/team/admin',
    rows: (d) => _under(d, 'members'),
    title: (r) => _s(r['name']),
    subtitle: (r, s) => _s(r['title']),
    imageField: 'photo',
    imagePath: (r) =>
        r['photoUrl'] == null ? null : '/team/admin/photo/${r['id']}',
    reorderPath: '/team/admin/reorder',
    deleteConfirm: (s) => s.team.deleteConfirm,
    hidden: (r) => r['published'] == false,
    fields: [
      StaffField('name', (s) => s.team.name, FieldKind.text, required: true),
      StaffField('title', (s) => s.team.role, FieldKind.text, required: true),
      StaffField(
        'sectionId',
        (s) => s.team.group,
        FieldKind.choice,
        choices: _sections,
      ),
      StaffField('bio', (s) => s.team.bio, FieldKind.long),
      StaffField('email', (s) => s.team.emailLabel, FieldKind.ltr),
      StaffField('linkedin', (_) => 'LinkedIn', FieldKind.ltr),
      StaffField('github', (_) => 'GitHub', FieldKind.ltr),
      StaffField('website', (s) => s.team.websiteLabel, FieldKind.ltr),
      StaffField(
        'published',
        (s) => s.team.published,
        FieldKind.flag,
        fallback: true,
      ),
    ],
  ),
  StaffCollection(
    key: 'team-sections',
    permission: null,
    icon: Icons.account_tree_outlined,
    label: (s) => s.team.sectionsTitle,
    path: '/team/admin',
    basePath: '/team/admin/sections',
    rows: (d) => _under(d, 'sections'),
    title: (r) => _s(r['name']),
    subtitle: (r, s) => _s(r['description']),
    reorderPath: '/team/admin/sections/reorder',
    deleteConfirm: (s) => s.team.sectionDeleteConfirm,
    fields: [
      StaffField(
        'name',
        (s) => s.team.sectionName,
        FieldKind.text,
        required: true,
      ),
      StaffField(
        'description',
        (s) => s.team.sectionDescription,
        FieldKind.long,
      ),
    ],
  ),
  StaffCollection(
    key: 'experts',
    permission: 'experts',
    icon: Icons.school_outlined,
    label: (s) => s.experts.adminTitle,
    path: '/consult/admin/experts',
    rows: _list,
    title: (r) => _s(r['fullName']),
    subtitle: (r, s) => _s(r['headline']),
    imageField: 'photo',
    imagePath: (r) => r['photoUrl'] == null
        ? null
        : '/consult/admin/experts/${r['id']}/photo',
    reorderPath: '/consult/admin/experts/reorder',
    deleteConfirm: (s) => s.experts.deleteConfirm,
    hidden: (r) => r['published'] == false,
    fields: [
      StaffField(
        'fullName',
        (s) => s.experts.fieldName,
        FieldKind.text,
        required: true,
      ),
      StaffField(
        'headline',
        (s) => s.experts.fieldHeadline,
        FieldKind.text,
        required: true,
      ),
      StaffField('slug', (s) => s.experts.fieldSlug, FieldKind.ltr),
      StaffField('bio', (s) => s.experts.fieldBio, FieldKind.long),
      StaffField(
        'specialities',
        (s) => s.experts.fieldSpecialities,
        FieldKind.tags,
      ),
      StaffField('languages', (s) => s.experts.fieldLanguages, FieldKind.tags),
      StaffField(
        'yearsExperience',
        (s) => s.experts.fieldYears,
        FieldKind.number,
      ),
      StaffField('linkedinUrl', (_) => 'LinkedIn', FieldKind.ltr),
      StaffField('githubUrl', (_) => 'GitHub', FieldKind.ltr),
      StaffField('websiteUrl', (s) => s.team.websiteLabel, FieldKind.ltr),
      StaffField(
        'acceptsConsultations',
        (s) => s.experts.fieldAccepts,
        FieldKind.flag,
        fallback: true,
      ),
      StaffField('featured', (s) => s.experts.fieldFeatured, FieldKind.flag),
      StaffField(
        'published',
        (s) => s.experts.fieldPublished,
        FieldKind.flag,
        fallback: true,
      ),
    ],
  ),
  _organizations(
    'customers',
    'CUSTOMER',
    Icons.handshake_outlined,
    (s) => s.showcase.adminCustomersTitle,
  ),
  _organizations(
    'partners',
    'PARTNER',
    Icons.diversity_3_outlined,
    (s) => s.showcase.adminPartnersTitle,
  ),
  StaffCollection(
    key: 'portfolio',
    permission: 'showcase',
    icon: Icons.collections_bookmark_outlined,
    label: (s) => s.showcase.adminProjectsTitle,
    path: '/showcase/admin/projects',
    rows: _list,
    title: (r) => _s(r['title']),
    subtitle: (r, s) => s.showcase.projectStatuses.label(_s(r['status'])),
    imageField: 'cover',
    imagePath: (r) =>
        r['coverUrl'] == null ? null : '/showcase/admin/cover/${r['id']}',
    reorderPath: '/showcase/admin/projects/reorder',
    deleteConfirm: (s) => s.showcase.deleteProjectConfirm,
    hidden: (r) => r['published'] == false,
    fields: [
      StaffField(
        'title',
        (s) => s.showcase.projectTitle,
        FieldKind.text,
        required: true,
      ),
      StaffField(
        'summary',
        (s) => s.showcase.summary,
        FieldKind.long,
        required: true,
      ),
      StaffField(
        'description',
        (s) => s.showcase.projectDescription,
        FieldKind.long,
      ),
      StaffField('category', (s) => s.showcase.category, FieldKind.text),
      StaffField(
        'status',
        (s) => s.showcase.status,
        FieldKind.choice,
        fallback: 'IN_PROGRESS',
        choices: (s, _, _) => [
          for (final t in const [
            'PLANNING',
            'IN_PROGRESS',
            'LAUNCHED',
            'MAINTAINED',
            'ARCHIVED',
          ])
            (t, s.showcase.projectStatuses.label(t)),
        ],
      ),
      StaffField(
        'technologies',
        (s) => s.showcase.technologies,
        FieldKind.tags,
      ),
      StaffField('projectUrl', (s) => s.showcase.projectUrl, FieldKind.ltr),
      StaffField(
        'repositoryUrl',
        (s) => s.showcase.repositoryUrl,
        FieldKind.ltr,
      ),
      StaffField('featured', (s) => s.showcase.featuredLabel, FieldKind.flag),
      StaffField(
        'published',
        (s) => s.showcase.published,
        FieldKind.flag,
        fallback: true,
      ),
    ],
  ),
  StaffCollection(
    key: 'product-categories',
    permission: 'trademaster',
    icon: Icons.category_outlined,
    label: (s) => s.categoryDesk.title,
    path: '/trademaster/admin/categories',
    rows: _list,
    title: (r) => _s(r['name']),
    subtitle: (r, s) => _s(r['slug']),
    deleteConfirm: (s) => s.categoryDesk.confirmDelete,
    hidden: (r) => r['active'] == false,
    fields: _categoryFields(),
  ),
  StaffCollection(
    key: 'business-categories',
    permission: 'trademaster',
    icon: Icons.store_mall_directory_outlined,
    label: (s) => s.trademaster.hub.guildDeskTitle,
    path: '/trademaster/admin/business-categories',
    rows: _list,
    title: (r) => _s(r['name']),
    subtitle: (r, s) => _s(r['slug']),
    deleteConfirm: (s) => s.categoryDesk.confirmDelete,
    hidden: (r) => r['active'] == false,
    fields: _categoryFields(),
  ),
];

/// A page of rows, from a paged list.
List<StaffRow> _items(Object? data) => _under(data, 'items');

final List<StaffCollection> staffTools = [
  StaffCollection(
    key: 'companies',
    permission: 'jobs',
    icon: Icons.apartment_outlined,
    label: (s) => s.jobs.companiesTitle,
    path: '/jobs/admin/companies',
    query: const {'pageSize': 50},
    rows: _items,
    title: (r) => _s(r['name']),
    subtitle: (r, s) => _s((r['owner'] as Map?)?['email']),
    canCreate: false,
    canDelete: false,
    hidden: (r) => r['hidden'] == true,
    fields: [StaffField('hidden', (s) => s.jobs.hidePage, FieldKind.flag)],
  ),
  StaffCollection(
    key: 'book-catalog',
    permission: 'books',
    icon: Icons.library_books_outlined,
    label: (s) => s.bookshop.catalogTitle,
    path: '/bookshop/admin/catalog',
    query: const {'pageSize': 50},
    rows: _items,
    title: (r) => _s(r['title']),
    subtitle: (r, s) => ((r['authors'] as List?) ?? const []).join('، '),
    canCreate: false,
    canDelete: false,
    mergePath: '/bookshop/admin/catalog/merge',
    fields: [
      StaffField(
        'title',
        (s) => s.bookshop.titleLabel,
        FieldKind.text,
        required: true,
      ),
      StaffField('subtitle', (s) => s.bookshop.subtitleLabel, FieldKind.text),
      StaffField('authors', (s) => s.bookshop.authorsLabel, FieldKind.tags),
      StaffField(
        'translators',
        (s) => s.bookshop.translatorsLabel,
        FieldKind.tags,
      ),
      StaffField('publisher', (s) => s.bookshop.publisher, FieldKind.text),
      StaffField('isbn', (s) => s.bookshop.isbn, FieldKind.ltr),
      StaffField('publishYear', (s) => s.bookshop.yearLabel, FieldKind.number),
      StaffField('pageCount', (s) => s.bookshop.pagesLabel, FieldKind.number),
      StaffField('series', (s) => s.bookshop.seriesLabel, FieldKind.text),
      StaffField(
        'description',
        (s) => s.bookshop.descriptionLabel,
        FieldKind.long,
      ),
      StaffField('tags', (s) => s.bookshop.tagsLabel, FieldKind.tags),
      StaffField('verified', (s) => s.bookshop.verifiedBook, FieldKind.flag),
    ],
  ),
  StaffCollection(
    key: 'open-shop',
    permission: 'trademaster',
    icon: Icons.add_business_outlined,
    label: (s) => s.trademaster.desk.openShop,
    path: '/trademaster/admin/business-categories',
    basePath: '/trademaster/admin/shops',
    rows: _list,
    title: (r) => _s(r['name']),
    createOnly: true,
    imageField: 'logo',
    fields: [
      StaffField(
        'ownerId',
        (s) => s.trademaster.desk.openShop,
        FieldKind.lookup,
        lookupPath: '/trademaster/admin/shop-owners',
      ),
      StaffField(
        'name',
        (s) => s.showcase.name,
        FieldKind.text,
        required: true,
      ),
      StaffField(
        'summary',
        (s) => s.showcase.summary,
        FieldKind.long,
        required: true,
      ),
      StaffField(
        'businessCategoryId',
        (s) => s.trademaster.hub.guildDeskTitle,
        FieldKind.choice,
        choices: (s, data, _) => [
          ('', '—'),
          for (final c in _list(data)) (_s(c['id']), _s(c['name'])),
        ],
      ),
      StaffField('description', (s) => s.showcase.description, FieldKind.long),
      StaffField('city', (s) => s.admin.city, FieldKind.text),
      StaffField('address', (s) => s.trademaster.address, FieldKind.text),
      StaffField('phone', (s) => s.admin.phone, FieldKind.ltr),
      StaffField('website', (s) => s.showcase.website, FieldKind.ltr),
      StaffField(
        'publish',
        (s) => s.team.publish,
        FieldKind.flag,
        fallback: true,
      ),
    ],
  ),
];

StaffCollection? staffCollection(String key) {
  for (final c in [...staffCollections, ...staffTools]) {
    if (c.key == key) return c;
  }
  return null;
}
