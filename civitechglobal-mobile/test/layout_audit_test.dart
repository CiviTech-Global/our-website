import 'dart:async';

import 'package:civitech_global_flutter/app/app.dart';
import 'package:civitech_global_flutter/core/api/api_client.dart';
import 'package:civitech_global_flutter/core/auth/auth_user.dart';
import 'package:civitech_global_flutter/core/auth/session.dart';
import 'package:civitech_global_flutter/core/capabilities.dart';
import 'package:civitech_global_flutter/core/settings.dart';
import 'package:civitech_global_flutter/design/palette.dart';
import 'package:civitech_global_flutter/design/widgets/bagh_key.dart';
import 'package:civitech_global_flutter/features/account/security_screen.dart';
import 'package:civitech_global_flutter/features/help/help_sheet.dart';
import 'package:civitech_global_flutter/features/market/market_ui.dart';
import 'package:civitech_global_flutter/features/profile/profile_data.dart';
import 'package:civitech_global_flutter/features/start/modules.dart';
import 'package:civitech_global_flutter/features/start/start_sheet.dart';
import 'package:civitech_global_flutter/l10n/l10n.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/api_client_test.dart' show FakeServer, MemoryTokens;
import 'support/book_fakes.dart';
import 'support/freelance_fakes.dart';
import 'support/market_fakes.dart';
import 'support/staff_fakes.dart';

/// Every screen, in every place it can be squeezed.
///
/// A layout that overflows raises an exception in a widget test, so this
/// renders each screen and sheet across the dimensions that break layouts:
/// the narrowest common phone and a tablet, portrait and landscape, short
/// and long languages (German has the longest words of the six), normal and
/// doubled text, and every theme in light and dark (the glass style lays out
/// some parts differently). Any overflow fails the test with the screen and
/// the conditions in its name.
class _SignedIn extends SessionController {
  @override
  Future<AuthUser?> build() async => const AuthUser(
    id: 'u1',
    email: 'maryam.ahmadi.long.address@example.com',
    firstName: 'Maryam-Alexandra',
    lastName: 'Ahmadi-Khorasani',
    role: 'ADMIN',
  );
}

const _sizes = {
  'small phone': Size(320, 568),
  'phone': Size(412, 915),
  'landscape': Size(915, 412),
  'tablet': Size(800, 1280),
};

const _screens = [
  '/',
  '/explore',
  '/inbox',
  '/me',
  '/me/settings',
  '/me/security',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password?token=t',
  '/reset-password',
  '/services',
  '/about',
  '/team',
  '/portfolio',
  '/customers',
  '/partners',
  '/blog',
  '/blog/third-party-insurance-guide',
  '/help',
  '/help/consult',
  '/contact',
  '/start-project',
  '/start-project?step=1',
  '/start-project?step=2',
  '/start-project?step=3',
  '/start-project?step=4',
  '/consult',
  '/consult?expert=gone',
  '/experts',
  '/experts/x',
  '/experts/missing',
  '/proposal/PROJ1234',
  '/en/team',
  '/track?code=PROJ1234',
  '/track?code=CONS1234',
  '/track?code=INSU1234',
  '/track?code=RESU1234',
  '/join',
  '/volunteer',
  '/insurance',
  '/insurance/third-party',
  '/insurance/test-cover',
  '/insurance/test-cover/apply',
  '/insurance/test-cover/apply?step=1',
  '/profiles/maryam_long',
  '/profiles/missing',
  '/jobs',
  '/jobs/in/tehran',
  '/jobs/in/nowhere',
  '/jobs/country/DE',
  '/jobs/category/web-development',
  '/jobs/LONG1',
  '/jobs/missing',
  '/companies',
  '/companies/civic',
  '/companies/plain',
  '/companies/missing',
  '/projects',
  '/projects/category/web',
  '/projects/PRLONG01',
  '/freelancers',
  '/freelance-services',
  '/freelance-services/SVLONG01',
  '/books',
  '/books/shelf/b-literature',
  '/books/shelf/nowhere',
  '/books/BKLONG01',
  '/books/missing',
  '/marketplace',
  '/marketplace/map',
  '/marketplace/shops',
  '/marketplace/shops/long-shop',
  '/marketplace/shops/missing',
  '/marketplace/products',
  '/marketplace/products/long-shop/long-product',
  '/marketplace/join',
];

/// Screens a member sees: audited signed in only.
const _memberScreens = [
  '/dashboard/requests',
  '/dashboard/applications',
  '/dashboard/saved-jobs',
  '/dashboard/job-alerts',
  '/dashboard/jobs',
  '/dashboard/jobs/own1/applicants?title=Senior%20full-stack%20engineer',
  '/dashboard/jobs/new',
  '/dashboard/jobs/own2/edit',
  '/dashboard/company',
  '/dashboard/projects',
  '/dashboard/projects/new',
  '/dashboard/projects/op2/edit',
  '/dashboard/projects/op1/inbox',
  '/dashboard/bids',
  '/dashboard/awards',
  '/dashboard/invites',
  '/dashboard/saved-projects',
  '/dashboard/project-alerts',
  '/dashboard/services',
  '/dashboard/services/new',
  '/dashboard/service-orders?side=seller',
  '/dashboard/books',
  '/dashboard/books?tab=requests',
  '/dashboard/books/sell',
  '/dashboard/books/of4/edit',
  '/dashboard/book-purchases',
  '/dashboard/shops',
  '/dashboard/shops/new',
  '/dashboard/shops/s1/edit',
  '/dashboard/shops/s1/products',
  '/dashboard/shops/s1/products/new',
  '/dashboard/shops/s1/products/p1/edit',
  '/dashboard/shops/s1/products/p1/media',
  '/jobs?q=react&workArrangement=REMOTE',
  // Signed in, the apply section has its own states (here: not verified).
  '/jobs/LONG1#apply',
  '/dashboard/profile',
  '/dashboard/verification',
  '/inbox?tab=notifications',
  '/dashboard/messages/b/t1',
  '/dashboard/messages/a/t2',
  '/dashboard/messages/x/t1',
  '/me/security',
  '/me/security/password',
  '/me/security/delete',
  '/dashboard/profile/freelancer',
  '/staff',
  '/staff/q/insurance',
  '/staff/q/insurance/r1',
  '/staff/q/projects/p1',
  '/staff/q/resumes/c1',
  '/staff/q/verification/v1',
  '/staff/q/jobPosts',
  '/staff/q/jobPosts/j1',
  '/staff/q/freelanceProjects/f1',
  '/staff/q/tradeMasterShops/sh1',
  '/staff/q/tradeMasterProducts/pr1',
];

/// Member screens audited as a verified account: forms that need one.
const _verifiedScreens = {'/dashboard/company'};

/// Data with the longest real-world shapes: long names, bios, quotes and
/// technology lists, so content screens are laid out with something in them.
/// Postings sent to the fake server, so a test can tell whether a form
/// stopped on the phone or reached the server.
var _postedJobs = 0;

Future<(int, Object?)> _fakeApi(RequestOptions o) async {
  if (o.method == 'POST' && o.path == '/market/me/jobs') {
    _postedJobs++;
    return (201, {'data': <String, Object?>{}});
  }
  const long =
      'Rayan Tamaddon Jahan Gostar builds creative, innovative software '
      'that makes life simpler for people and organisations alike.';
  final member = {
    'id': 'm1',
    'name': 'Maryam-Alexandra Ahmadi-Khorasani',
    'title': 'Principal software architect and engineering lead',
    'bio': long,
    'email': 'maryam@example.com',
    'linkedin': 'https://linkedin.com/in/x',
    'github': 'https://github.com/x',
    'website': 'https://example.com',
  };
  final org = {
    'id': 'o1',
    'name':
        'Sazman-e Fanavari-ye Ettela'
        'at-e Shahrvandi-ye Iran',
    'description': long,
    'industry': 'Government and civic technology',
    'website': 'https://example.com',
    'featured': true,
    'active': true,
    'sinceYear': 2021,
    'partnershipType': 'TECHNOLOGY',
    'testimonialQuote': long,
    'testimonialAuthor': 'Dr. Seyed Mohammad-Reza Hosseini-Tabatabaei',
    'testimonialRole': 'Director of digital transformation',
  };
  final project = {
    'id': 'p1',
    'title': 'Municipal citizen-services platform for permits and complaints',
    'summary': long,
    'description': long,
    'status': 'IN_PROGRESS',
    'technologies': [
      'TypeScript',
      'PostgreSQL',
      'Flutter',
      'Kubernetes',
      'Elasticsearch',
      'Redis',
      'GraphQL',
    ],
    'screenshots': <Object>[],
    'client': {'id': 'o1', 'name': org['name']},
  };
  final expert = {
    'id': 'e1',
    'slug': 'x',
    'fullName': member['name'],
    'headline': member['title'],
    'bio': long,
    'specialities': [
      'Kubernetes and platform engineering',
      'PostgreSQL performance',
      'Career changes into software',
      'Flutter',
      'Hiring engineers',
      'Distributed systems',
    ],
    'languages': ['فارسی', 'English', 'Deutsch'],
    'yearsExperience': 17,
    'linkedinUrl': 'https://www.linkedin.com/in/example',
    'githubUrl': 'https://github.com/example',
    'websiteUrl': 'https://example.com',
    'acceptsConsultations': true,
    'featured': true,
    'photoUrl': null,
  };
  final conversation = {
    'threadId': 't1',
    'kind': 'bid',
    'listingTitle': project['title'],
    'listingCode': 'P1234',
    'path': '/projects/P1234',
    'counterpart': {'verified': true},
    'counterpartName': member['name'],
    'lastMessage': {
      'body': long,
      'createdAt': '2026-10-05T10:00:00Z',
      'mine': true,
    },
    'unreadCount': 128,
  };
  final notice = {
    'id': 'n1',
    'type': 'message.received',
    'title': 'A new offer on your project, from a verified freelancer',
    'body': long,
    'link': '/dashboard/messages/b/t1',
    'readAt': null,
    'createdAt': '2026-10-05T10:00:00Z',
  };
  if (freelanceFake(o.path, o.queryParameters) case final answer?) {
    return answer;
  }
  if (bookFake(o.path, o.queryParameters) case final answer?) {
    return answer;
  }
  if (staffFake(o.path, o.queryParameters) case final answer?) {
    return answer;
  }
  if (marketFake(o.path, o.queryParameters) case final answer?) {
    return answer;
  }
  return switch (o.path) {
    // A member who plays every part, with something waiting in each.
    '/market/me/workspace' => (
      200,
      {
        'data': {
          'verification': 'REJECTED',
          'hiring': {
            'postings': 12,
            'open': 9,
            'byStatus': {'CHANGES_REQUESTED': 2},
            'applicants': 1284,
            'unseen': 37,
            'byOutcome': {'SHORTLISTED': 18, 'INTERVIEW': 6},
            'recent': <Object>[],
            'company': null,
          },
          'jobSearch': {
            'applications': 44,
            'byOutcome': {'INTERVIEW': 3, 'PENDING': 20},
            'recent': <Object>[],
            'savedJobs': 15,
            'activeAlerts': 4,
          },
          'client': {
            'projects': 7,
            'open': 3,
            'byStatus': {'PENDING_REVIEW': 1},
            'bidsAwaiting': 26,
          },
          'freelance': {
            'bids': 31,
            'byOutcome': {'SHORTLISTED': 5, 'ACCEPTED': 2},
          },
          'selling': {
            'books': 9,
            'booksByStatus': {'APPROVED': 6, 'PENDING_REVIEW': 3},
          },
          'collaborations': {'active': 2, 'completed': 11},
          'unread': {'notifications': 7, 'messages': 128},
          'recentNotifications': [
            for (var i = 0; i < 3; i++)
              {
                'id': 'n$i',
                'title':
                    'A new offer on your project, from a verified freelancer',
                'body': long,
                'link': i == 2 ? null : '/dashboard/messages/b/t1',
                'readAt': i == 0 ? null : '2026-10-06T10:00:00Z',
                'createdAt': '2026-10-05T10:00:00Z',
              },
          ],
          'trackedRequests': 4,
        },
      },
    ),
    '/market/me/tracked-requests' => (
      200,
      {
        'data': [
          {
            'code': 'PROJ1234',
            'label':
                'Municipal permits platform, phase two, for the city council',
            'createdAt': '2026-10-01T10:00:00Z',
            'state': {'kind': 'project', 'status': 'NEEDS_CLARIFICATION'},
          },
          {
            'code': 'CONS1234',
            'label': null,
            'createdAt': '2026-10-01T10:00:00Z',
            'state': {'kind': 'consultation', 'status': 'NO_ANSWER'},
          },
          {
            'code': 'INSU1234',
            'label': '',
            'createdAt': '2026-10-01T10:00:00Z',
            'state': {'kind': 'insurance', 'status': 'IN_PROGRESS'},
          },
          {
            'code': 'RESU1234ABCDEFGHIJKL',
            'label': null,
            'createdAt': '2026-10-01T10:00:00Z',
            'state': null,
          },
        ],
      },
    ),
    '/market/me/conversations' => (
      200,
      {
        'data': [
          conversation,
          {
            ...conversation,
            'threadId': 't2',
            'kind': 'application',
            'unreadCount': 0,
            'counterpartName': null,
            'counterpart': null,
          },
        ],
      },
    ),
    '/market/me/notifications/unread-count' => (
      200,
      {
        'data': {'count': 7},
      },
    ),
    '/market/me/notifications' => (
      200,
      {
        'data': {
          // The page asked for, with its own rows, as the server does.
          'items': [
            for (final n in [
              notice,
              {...notice, 'id': 'n2', 'readAt': '2026-10-06T10:00:00Z'},
              {...notice, 'id': 'n3', 'link': null},
            ])
              {...n, 'id': '${n['id']}-p${o.queryParameters['page'] ?? 1}'},
          ],
          'page': o.queryParameters['page'] ?? 1,
          'pageSize': 20,
          'total': 30,
          'totalPages': 2,
          'unreadCount': 7,
        },
      },
    ),
    '/market/me/bids/t1/messages' => (
      200,
      {
        'data': {
          'anchor': {
            'kind': 'bid',
            'listingTitle': project['title'],
            'listingCode': 'P1234',
            'path': '/projects/P1234',
          },
          'messages': [
            for (var i = 0; i < 6; i++)
              {
                'id': 'm$i',
                'body': i.isEven ? long : 'Thanks, that works.',
                'senderId': i.isEven ? 'u1' : 'u2',
                'readAt': null,
                'createdAt': '2026-10-0${i + 1}T10:00:00Z',
                'mine': i.isEven,
              },
          ],
        },
      },
    ),
    '/market/me/applications/t2/messages' => (
      200,
      {
        'data': {
          'anchor': {
            'kind': 'application',
            'listingTitle': 'Senior Flutter engineer',
            'listingCode': 'J1',
            'path': '/jobs/J1',
          },
          'messages': <Object>[],
        },
      },
    ),
    '/team' => (
      200,
      {
        'data': {
          'sections': [
            {
              'id': 's1',
              'name': 'Engineering and product design',
              'description': long,
              'members': [member, member],
            },
          ],
          'unsectioned': [member],
        },
      },
    ),
    '/showcase/customers' || '/showcase/partners' => (
      200,
      {
        'data': [
          org,
          {...org, 'featured': false},
          {...org, 'active': false},
        ],
      },
    ),
    '/showcase/projects' => (
      200,
      {
        'data': [project, project],
      },
    ),
    '/consult/experts' => (
      200,
      {
        'data': [
          expert,
          {...expert, 'slug': 'y', 'acceptsConsultations': false},
        ],
      },
    ),
    '/consult/experts/x' => (200, {'data': expert}),
    '/consult/experts/missing' => (
      404,
      {'success': false, 'message': 'Not found'},
    ),
    '/track/PROJ1234' => (
      200,
      {
        'data': {
          'kind': 'project',
          'trackingCode': 'PROJ1234',
          'title': project['title'],
          'status': 'PROPOSAL_SENT',
          'submittedAt': '2026-10-01T10:00:00Z',
          'updatedAt': '2026-10-05T10:00:00Z',
          'proposal': {
            'status': 'SENT',
            'scopeSummary': long,
            'message': long,
            'deliverables': [long, long],
            'assumptions': [long],
            'exclusions': [long],
            'milestones': [
              {
                'title': long,
                'durationDays': 21,
                'price': '450000000',
                'description': long,
              },
            ],
            'pertHours': 512.5,
            'priceMin': '900000000',
            'priceLikely': '1200000000',
            'priceMax': '1800000000',
            'currency': 'IRT',
            'hourlyRate': '2500000',
            'discoveryRequired': true,
            'discoveryPrice': '90000000',
            'timelineWeeksMin': 10,
            'timelineWeeksMax': 16,
            'validUntil': '2026-12-01',
          },
        },
      },
    ),
    '/track/CONS1234' => (
      200,
      {
        'data': {
          'kind': 'consultation',
          'trackingCode': 'CONS1234',
          'fullName': member['name'],
          'topic': 'STARTING_OUT',
          'preferredMode': 'IN_PERSON',
          'status': 'SCHEDULED',
          'scheduledAt': '2026-10-20T09:00:00Z',
          'createdAt': '2026-10-01T10:00:00Z',
          'expert': {
            'fullName': member['name'],
            'slug': 'x',
            'headline': member['title'],
          },
          'availability': [
            {'day': '2026-10-20', 'part': 'AFTERNOON'},
            {'day': '2026-10-21', 'part': 'EVENING'},
          ],
        },
      },
    ),
    '/track/RESU1234' => (
      200,
      {
        'data': {
          'kind': 'resume',
          'trackingCode': 'RESU1234',
          'track': 'INTERNSHIP',
          'status': 'SHORTLISTED',
          'createdAt': '2026-10-01T10:00:00Z',
          'updatedAt': '2026-10-02T10:00:00Z',
        },
      },
    ),
    '/track/INSU1234' => (
      200,
      {
        'data': {
          'kind': 'insurance',
          'trackingCode': 'INSU1234',
          'status': 'IN_PROGRESS',
          'productTitle': 'بیمهٔ مسئولیت مدنی مهندسان ناظر ساختمان',
          'productTitleEn':
              'Supervising engineer professional liability insurance',
          'submittedAt': '2026-10-01T10:00:00Z',
          'updatedAt': '2026-10-05T10:00:00Z',
          'callbackScheduledAt': '2026-10-06T10:00:00Z',
        },
      },
    ),
    '/insurance/catalog' => (
      200,
      {
        'data': [
          {
            'slug': 'property',
            'title': 'بیمه‌های اموال و مسئولیت ساختمان‌های مسکونی و تجاری',
            'titleEn': 'Property and liability cover for homes and businesses',
            'emoji': '🏠',
            'products': [_insuranceProduct, _insuranceProduct],
          },
        ],
      },
    ),
    '/insurance/products/test-cover' => (200, {'data': _insuranceDetail}),
    '/market/me/profile' => (
      200,
      {
        'data': {
          'username': 'maryam_alexandra_ahmadi',
          'headline': member['title'],
          'bio': long,
          'website': 'https://maryam-alexandra-ahmadi-khorasani.example.com',
          'skills': [
            'Kubernetes',
            'PostgreSQL',
            'Flutter',
            'Distributed systems',
          ],
        },
      },
    ),
    // A company turned down once: the status, the reviewer's note and the
    // whole form again, with the company's own fields.
    '/market/me/verification' => (
      200,
      {
        'data': {
          'status': 'REJECTED',
          'kind': 'COMPANY',
          'legalFirstName': 'Maryam-Alexandra',
          'legalLastName': 'Ahmadi-Khorasani',
          'companyName': org['name'],
          'submittedAt': '2026-10-01T10:00:00Z',
          'reviewedAt': '2026-10-02T10:00:00Z',
          'reviewNote': long,
          'documents': <Object>[],
        },
      },
    ),
    '/market/jobs' => (
      200,
      {
        'data': {
          'items': [_longJob, _abroadJob, _plainJob],
          'page': 1,
          'pageSize': 20,
          'total': 12845,
          'totalPages': 643,
        },
      },
    ),
    '/market/jobs/LONG1' => (
      200,
      {
        'data': {
          ..._longJob,
          'description': '$long\n\n$long\n\n$long',
          'educationLevel': 'BACHELOR',
          'fieldOfStudy':
              'Computer engineering or a closely related field of study',
          'workingHours':
              'Saturday to Wednesday, 9 to 17, with two days a week from home',
          'genderRequirement': 'FEMALE',
          'ageMin': 22,
          'ageMax': 45,
          'militaryService': 'COMPLETED_OR_EXEMPT',
          'viewCount': 128451,
          '_count': {'applications': 1284},
          'responsiveness': {'rate': 0.97, 'sample': 40, 'responsive': true},
          'similar': [_abroadJob, _plainJob],
        },
      },
    ),
    '/jobs/categories' => (
      200,
      {
        'data': [
          {
            'id': 'c1',
            'slug': 'web-development',
            'name': 'توسعه وب (فرانت‌اند، بک‌اند، فول‌استک)',
            'nameEn': 'Web development, front end, back end and full stack',
            'parentId': null,
          },
        ],
      },
    ),
    '/jobs/me/saved/ids' => (
      200,
      {
        'data': ['j1'],
      },
    ),
    '/jobs/me/match/j1' => (
      200,
      {
        'data': {
          'matched': ['React', 'TypeScript'],
          'missing': ['GraphQL', 'Kubernetes and platform engineering'],
          'total': 4,
          'hasProfileSkills': true,
        },
      },
    ),
    // The employer's own postings: live with a busy pipeline, sent back with
    // a long note, and closed. Not LONG1, which the apply audit reads as
    // somebody else's.
    '/market/me/jobs' => (
      200,
      {
        'data': [
          for (final (id, status, state) in const [
            ('own1', 'APPROVED', 'OPEN'),
            ('own2', 'CHANGES_REQUESTED', 'OPEN'),
            ('own3', 'APPROVED', 'CLOSED'),
          ])
            {
              ..._longJob,
              'id': id,
              'code': 'J-${id.toUpperCase()}-2026',
              'moderationStatus': status,
              'state': state,
              'reviewNote': status == 'APPROVED' ? null : long,
              // What only the form shows, at its longest.
              'description': '$long\n\n$long',
              'jobCategoryId': 'c1',
              'workingHours':
                  'Saturday to Wednesday, 8:00 to 17:00, '
                  'and Thursday mornings by arrangement',
              'educationLevel': 'DOCTORATE',
              'fieldOfStudy': 'Computer engineering or information technology',
              'genderRequirement': 'ANY',
              'ageMin': 25,
              'ageMax': 45,
              'militaryService': 'COMPLETED_OR_EXEMPT',
              'createdAt': '2026-10-01T10:00:00Z',
              'viewCount': 1234567,
              '_count': {'applications': 4321},
            },
        ],
      },
    ),
    // The employer's own page, filled to every limit, abroad (so the region
    // is typed), and hidden by staff (so the notice shows). No pictures: the
    // fake server answers JSON, which is not image data.
    '/jobs/me/company' => (
      200,
      {
        'data': {
          ..._longCompany,
          'tagline': long,
          'about': '$long\n\n$long',
          'industry': 'SOFTWARE_INTERNET',
          'size': 'SIZE_1000_PLUS',
          'foundedYear': 1385,
          'website':
              'https://www.example-company-with-a-long-name.com/en/about',
          'country': 'DE',
          'province': 'Nordrhein-Westfalen',
          'city': 'Mönchengladbach',
          'hidden': true,
          'logoUrl': null,
          'coverUrl': null,
        },
      },
    ),
    '/jobs/me/pipeline' => (
      200,
      {
        'data': {
          'own1': {
            'total': 4321,
            'unseen': 1234,
            'byOutcome': {'SHORTLISTED': 987, 'INTERVIEW': 654},
          },
        },
      },
    ),
    // Somebody new with everything filled in, one who withdrew, and one who
    // sent nothing but their name.
    '/market/me/jobs/own1/applications' => (
      200,
      {
        'data': [
          {
            'id': 'ap1',
            'outcome': 'INTERVIEW',
            'coverLetter': '$long\n\n$long',
            'expectedSalary': '1250000000',
            'cvOriginalName':
                'Maryam-Alexandra Ahmadi-Khorasani - CV - final version 3.pdf',
            'employerNote': long,
            'createdAt': '2026-10-01T10:00:00Z',
            'employerSeenAt': null,
            'skillMatch': {'matched': 3, 'total': 12},
            'applicant': {
              'id': 'u1',
              'firstName': 'Maryam-Alexandra',
              'lastName': 'Ahmadi-Khorasani',
              'email': 'maryam.alexandra.ahmadi.khorasani@example.com',
            },
            'applicantProfile': {
              'username': 'maryam_alexandra_long',
              'verified': true,
              'ratingAvg': 4.75,
              'ratingCount': 1234,
            },
          },
          {
            'id': 'ap2',
            'outcome': 'WITHDRAWN',
            'createdAt': '2026-10-01T10:00:00Z',
            'applicant': {'id': 'u2', 'firstName': 'Ali', 'lastName': 'Rezaei'},
            'applicantProfile': null,
          },
          {
            'id': 'ap3',
            'outcome': 'PENDING',
            'createdAt': '2026-10-01T10:00:00Z',
            'employerSeenAt': '2026-10-02T10:00:00Z',
            'applicant': {
              'id': 'u3',
              'firstName': 'Sara',
              'lastName': 'Moradi',
            },
            'applicantProfile': null,
          },
        ],
      },
    ),
    // Every stage an application passes through, and one sent back with a
    // reviewer's note, all on the longest posting.
    '/market/me/applications' => (
      200,
      {
        'data': [
          for (final (status, outcome) in const [
            ('APPROVED', 'INTERVIEW'),
            ('APPROVED', 'DECLINED'),
            ('APPROVED', 'ACCEPTED'),
            ('PENDING_REVIEW', 'PENDING'),
            ('CHANGES_REQUESTED', 'PENDING'),
          ])
            {
              'id': 'a-$outcome-$status',
              'moderationStatus': status,
              'outcome': outcome,
              'expectedSalary': '1250000000',
              'reviewNote': status == 'CHANGES_REQUESTED' ? long : null,
              'createdAt': '2026-10-01T10:00:00Z',
              'employerSeenAt': '2026-10-02T10:00:00Z',
              'job': {
                'code': 'LONG1',
                'title': _longJob['title'],
                'companyName': _longJob['companyName'],
                'state': 'OPEN',
              },
            },
        ],
      },
    ),
    '/jobs/companies' => (
      200,
      {
        'data': {
          'items': [_longCompany, _plainCompany],
          'page': 1,
          'pageSize': 24,
          'total': 2,
          'totalPages': 1,
        },
      },
    ),
    '/jobs/companies/civic' => (
      200,
      {
        'data': {
          ..._longCompany,
          'about': '$long\n\n$long',
          'jobs': [_longJob, _abroadJob],
        },
      },
    ),
    '/jobs/companies/plain' => (
      200,
      {
        'data': {..._plainCompany, 'jobs': <Object>[]},
      },
    ),
    '/jobs/me/saved' => (
      200,
      {
        'data': [
          {'savedAt': '2026-10-01T10:00:00Z', 'open': true, 'job': _longJob},
          {'savedAt': '2026-09-01T10:00:00Z', 'open': false, 'job': _abroadJob},
        ],
      },
    ),
    '/jobs/me/alerts' => (
      200,
      {
        'data': [
          for (final active in [true, false])
            {
              'id': 'al-$active',
              'name':
                  'Senior full-stack roles in Sistan and Baluchestan, hybrid',
              'query': {
                'search': 'Kubernetes and platform engineering',
                'jobCategoryId': 'c1',
                'country': 'IR',
                'province': 'سیستان و بلوچستان',
                'employmentType': 'FULL_TIME',
                'workArrangement': 'HYBRID',
                'seniority': 'MANAGER',
                'salaryMin': '1250000000',
              },
              'active': active,
              'lastNotifiedAt': active ? '2026-10-05T10:00:00Z' : null,
            },
        ],
      },
    ),
    '/jobs/me/recommended' => (
      200,
      {
        'data': {
          'basis': 'skills',
          'items': [
            {
              ..._longJob,
              'match': {'matched': 3, 'total': 7},
            },
          ],
        },
      },
    ),
    '/market/profiles/maryam_long' => (
      200,
      {
        'data': {
          'username': 'maryam_alexandra_ahmadi_khorasani',
          'headline': member['title'],
          'bio': long,
          'skills': [
            'Kubernetes and platform engineering',
            'PostgreSQL',
            'Flutter',
            'Distributed systems',
          ],
          'website': 'https://maryam-alexandra-ahmadi-khorasani.example.com',
          'companyName': org['name'],
          'verified': true,
          'ratingAvg': 4.5,
          'ratingCount': 1284,
          'joinedAt': '2021-03-01T10:00:00Z',
          'jobs': [
            {
              'code': 'J1',
              'title': 'Senior Flutter engineer for a municipal services app',
              'employmentType': 'FULL_TIME',
              'state': 'OPEN',
              'publishedAt': '2026-10-01T10:00:00Z',
            },
          ],
          'projects': [
            {
              'code': 'P1',
              'title': project['title'],
              'category': 'Web development and civic technology',
              'state': 'AWARDED',
              'publishedAt': '2026-10-01T10:00:00Z',
            },
          ],
          'reviews': [
            for (final role in ['employer', 'client', 'buyer'])
              {
                'rating': 4,
                'text': long,
                'createdAt': '2026-10-01T10:00:00Z',
                'role': role,
                'listingCode': 'X1',
                'listingTitle': project['title'],
                'listingPath': role == 'buyer' ? null : '/projects/X1',
              },
          ],
        },
      },
    ),
    _ => (404, {'success': false, 'message': 'not found'}),
  };
}

const _sheets = ['start', 'module', 'help'];

Future<void> _pump(
  WidgetTester tester, {
  required String language,
  required Size size,
  required double textScale,
  required GardenPalette palette,
  required ThemeMode mode,
  bool signedIn = false,
  bool verified = false,
}) async {
  tester.view
    ..physicalSize = size * 2
    ..devicePixelRatio = 2;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  SharedPreferences.setMockInitialValues({
    'settings.reduceMotion': true,
    'settings.language': language,
    'settings.palette': palette.name,
    'settings.themeMode': mode.name,
  });
  final prefs = await SharedPreferences.getInstance();
  final strings = await loadStrings(language);
  await tester.pumpWidget(
    ProviderScope(
      // A new container every time: a rebuilt scope keeps its first
      // overrides, so a second language or palette would never apply.
      key: UniqueKey(),
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        l10nProvider.overrideWith(
          () => L10nController(L10nState(language, strings)),
        ),
        tokenStoreProvider.overrideWithValue(MemoryTokens()),
        apiClientProvider.overrideWithValue(
          ApiClient(
            tokens: MemoryTokens(),
            language: () => language,
            dio: Dio(BaseOptions(baseUrl: 'https://api.test/api/v1'))
              ..httpClientAdapter = FakeServer(_fakeApi),
          ),
        ),
        capabilitiesProvider.overrideWith(
          (ref) async => const Capabilities(
            email: true,
            sms: true,
            features: {
              'tradeMaster': true,
              'booksV2': true,
              'projectsV2': true,
              'jobsV2': true,
            },
          ),
        ),
        updateNeedProvider.overrideWith((ref) async => UpdateNeed.none),
        // Map tiles come from OpenStreetMap; the audit has no network.
        showMapTilesProvider.overrideWithValue(false),
        mfaStatusProvider.overrideWith(
          (ref) async => (enabled: true, codesLeft: 2),
        ),
        if (signedIn) sessionProvider.overrideWith(_SignedIn.new),
        // The fake account is turned down, for the verification screen; a
        // form that needs a verified identity is audited as one.
        if (verified)
          ownVerificationProvider.overrideWith(
            (ref) async => const OwnVerification(status: 'APPROVED'),
          ),
      ],
      child: const CiviTechApp(),
    ),
  );
  await _settle(tester);
}

Future<void> _settle(WidgetTester tester) async {
  await tester.pump();
  for (var i = 0; i < 4; i++) {
    await tester.pump(const Duration(milliseconds: 300));
  }
}

/// Steps every vertical list on screen to its end, most of a screen at a
/// time, so the rows below the first screen are laid out and measured too.
/// Returns the first exception a step raised.
Future<Object?> _scrollThrough(WidgetTester tester) async {
  final lists = tester
      .stateList<ScrollableState>(find.byType(Scrollable))
      .where((s) => s.position.axis == Axis.vertical)
      .toList();
  for (final list in lists) {
    final position = list.position;
    // A list that grows as it goes (the next page of notices) stops after a
    // bounded number of steps.
    for (var step = 0; step < 40; step++) {
      if (!list.mounted || position.pixels >= position.maxScrollExtent) break;
      position.jumpTo(
        (position.pixels + position.viewportDimension * 0.8).clamp(
          0,
          position.maxScrollExtent,
        ),
      );
      await tester.pump();
      if (tester.takeException() case final error?) return error;
    }
  }
  await _settle(tester);
  return tester.takeException();
}

void _open(WidgetTester tester, String target) {
  final context = tester.element(find.byType(Scaffold).first);
  // Opened, not awaited: a sheet's future completes only when it closes.
  switch (target) {
    case 'start':
      unawaited(showStartSheet(context));
    case 'module':
      unawaited(showModuleSoon(context, exploreModules.first));
    case 'help':
      unawaited(showHelp(context, 'home'));
    default:
      GoRouter.of(context).go(target);
  }
}

void main() {
  // The real font, not the test font (Ahem draws every glyph as a full
  // square, which makes text far wider than on a phone): measurements here
  // must match what a person sees.
  setUpAll(() async {
    final vazirmatn = FontLoader('Vazirmatn')
      ..addFont(rootBundle.load('assets/fonts/Vazirmatn-Variable.ttf'));
    await vazirmatn.load();
  });

  final cases = <(String, Size, double, GardenPalette, ThemeMode)>[
    // Layout depends mostly on language, width and text size.
    for (final language in ['fa', 'en', 'de'])
      for (final size in _sizes.entries)
        for (final scale in [1.0, 2.0])
          (
            language,
            size.value,
            scale,
            GardenPalette.pistachio,
            ThemeMode.light,
          ),
    // The glass style lays out the bar, keys and surfaces differently.
    for (final size in _sizes.entries)
      for (final scale in [1.0, 2.0])
        (
          size.key == 'phone' ? 'en' : 'fa',
          size.value,
          scale,
          GardenPalette.abgineh,
          ThemeMode.dark,
        ),
    // And every other theme once, light and dark, at the tightest size.
    for (final palette in GardenPalette.values)
      for (final mode in [ThemeMode.light, ThemeMode.dark])
        ('de', const Size(320, 568), 1.3, palette, mode),
  ];

  for (final (language, size, scale, palette, mode) in cases) {
    final where =
        '$language ${size.width.toInt()}x${size.height.toInt()} '
        'text×$scale ${palette.name} ${mode.name}';
    for (final signedIn in [false, true]) {
      for (final target in [..._screens, ..._sheets, ..._memberScreens]) {
        // Signed-in only changes Home, Me and the member screens; skip the
        // rest twice over, and the member screens signed out.
        final member = _memberScreens.contains(target);
        final changes =
            member ||
            [
              '/',
              '/me',
              '/inbox',
              '/jobs',
              '/projects/PRLONG01',
            ].contains(target);
        if (signedIn ? !changes : member) continue;
        testWidgets('$target ${signedIn ? '(signed in) ' : ''}fits: $where', (
          tester,
        ) async {
          await _pump(
            tester,
            language: language,
            size: size,
            textScale: scale,
            palette: palette,
            mode: mode,
            signedIn: signedIn,
            verified: _verifiedScreens.contains(target),
          );
          _open(tester, target);
          await _settle(tester);
          // No screen may land in its error state: that is a missing asset
          // or a broken request, not a layout, and it hid a missing blog
          // export from this audit once.
          final retry = (await loadStrings(language)).common.retry;
          expect(
            find.text(retry),
            findsNothing,
            reason: '$target shows its error state',
          );
          // A key stretched to the room it was given does not overflow, so
          // it is checked on its own: a pinned key once filled the screen.
          for (final key in tester.widgetList(find.byType(BaghKey))) {
            final height = tester.getSize(find.byWidget(key)).height;
            expect(
              height,
              lessThan(48 * scale + 64),
              reason: '$target draws a key ${height.round()} px tall',
            );
          }
          var error = tester.takeException();
          // A list lays out only what is near the screen, so the rest of a
          // long page is measured by scrolling through it.
          error ??= await _scrollThrough(tester);
          // The full report names the widget that overflowed and by how much.
          expect(
            error,
            isNull,
            reason: error is FlutterError ? error.toStringDeep() : '$error',
          );
        });
      }
    }
  }

  testWidgets('the raised + key is drawn whole and tappable to its top edge', (
    tester,
  ) async {
    for (final palette in GardenPalette.values) {
      await _pump(
        tester,
        language: 'en',
        size: const Size(412, 915),
        textScale: 1,
        palette: palette,
        mode: ThemeMode.light,
      );
      final key = find.bySemanticsLabel('Start');
      final rect = tester.getRect(key);
      // Tap 4px inside its top edge: the part raised above the bar.
      await tester.tapAt(Offset(rect.center.dx, rect.top + 4));
      await _settle(tester);
      expect(
        find.text('What would you like to start?'),
        findsOneWidget,
        reason: '${palette.name}: the raised part of + did not respond',
      );
    }
  });

  testWidgets('tab labels stay readable in every language on a 320 px phone', (
    tester,
  ) async {
    // 1.0 and 1.3: the bar caps its own text scaling at 1.3, its largest.
    for (final (language, textScale) in [
      for (final l in supportedLanguages) ...[(l, 1.0), (l, 1.3)],
    ]) {
      await _pump(
        tester,
        language: language,
        size: const Size(320, 568),
        textScale: textScale,
        palette: GardenPalette.pistachio,
        mode: ThemeMode.light,
      );
      final strings = await loadStrings(language);
      final tabs = {
        strings.mobile.tabHome,
        strings.mobile.tabExplore,
        strings.mobile.tabInbox,
        strings.mobile.tabMe,
      };
      final labels = find.byWidgetPredicate(
        (w) =>
            w is FittedBox &&
            w.child is Text &&
            tabs.contains((w.child! as Text).data),
      );
      expect(labels, findsNWidgets(4), reason: language);
      for (final element in labels.evaluate()) {
        final box = element.renderObject! as RenderBox;
        final text =
            find
                    .descendant(
                      of: find.byWidget(element.widget),
                      matching: find.byType(Text),
                    )
                    .evaluate()
                    .single
                    .renderObject!
                as RenderBox;
        final fit = (box.size.width / text.size.width).clamp(0.0, 1.0);
        // What the reader sees: the 12 px label, grown by their text size,
        // shrunk to fit. Never below 11 px, i.e. never noticeably smaller
        // than at the normal text size.
        final onScreen = 12 * textScale * fit;
        expect(
          onScreen,
          greaterThanOrEqualTo(11),
          reason:
              '$language at text×$textScale: '
              '"${((element.widget as FittedBox).child! as Text).data}" '
              'renders at ${onScreen.toStringAsFixed(1)} px',
        );
      }
    }
  });

  // A ListView drops the fields scrolled out of sight, and a dropped field
  // is never checked: an empty posting reached the server that way on a
  // phone, and came back as a bare "Validation failed".
  testWidgets('an empty posting is stopped on the phone, every field checked', (
    tester,
  ) async {
    await _pump(
      tester,
      language: 'en',
      size: const Size(360, 640),
      textScale: 1,
      palette: GardenPalette.pistachio,
      mode: ThemeMode.light,
      signedIn: true,
    );
    _open(tester, '/dashboard/jobs/new');
    await _settle(tester);
    _postedJobs = 0;
    final save = find.text('Save draft');
    await tester.scrollUntilVisible(
      save,
      400,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(save);
    await _settle(tester);
    expect(_postedJobs, 0, reason: 'the empty form reached the server');
    // Brought back to the first problem, at the top of the form.
    expect(find.text('This field is required'), findsWidgets);
  });

  // The form's starting point was taken lazily, on the first Back, so it
  // always matched what had just been typed and the guard never asked.
  for (final target in ['/dashboard/jobs/own2/edit', '/dashboard/company']) {
    testWidgets('$target asks before throwing a change away', (tester) async {
      await _pump(
        tester,
        language: 'en',
        size: const Size(412, 915),
        textScale: 1,
        palette: GardenPalette.pistachio,
        mode: ThemeMode.light,
        signedIn: true,
        verified: true,
      );
      _open(tester, target);
      await _settle(tester);
      await tester.enterText(find.byType(TextFormField).first, 'Changed');
      await tester.pump();
      await tester.binding.handlePopRoute();
      await _settle(tester);
      expect(find.text('Leave this form?'), findsOneWidget);
    });
  }

  testWidgets('pressing a key moves nothing around it', (tester) async {
    for (final palette in GardenPalette.values) {
      await _pump(
        tester,
        language: 'en',
        size: const Size(412, 915),
        textScale: 1,
        palette: palette,
        mode: ThemeMode.light,
      );
      await tester.tap(find.text('Me').last);
      await _settle(tester);
      final below = find.text('Settings');
      final before = tester.getRect(below);
      final gesture = await tester.startGesture(
        tester.getCenter(find.text('Login').first),
      );
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.getRect(below), before, reason: palette.name);
      await gesture.cancel();
      await _settle(tester);
    }
  });

  // TalkBack and fingers: every tappable thing on every screen is at least
  // 48 points square and says what it is, in Persian and in English.
  for (final language in ['fa', 'en']) {
    for (final target in [..._screens, ..._memberScreens]) {
      final member = _memberScreens.contains(target);
      testWidgets(
        '$target is usable with TalkBack and high contrast: $language',
        (tester) async {
          final semantics = tester.ensureSemantics();
          // With the system's high-contrast text on, as many who use
          // TalkBack have it.
          tester.platformDispatcher.accessibilityFeaturesTestValue =
              const FakeAccessibilityFeatures(highContrast: true);
          addTearDown(
            tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
          );
          await _pump(
            tester,
            language: language,
            size: const Size(412, 915),
            textScale: 1,
            palette: GardenPalette.pistachio,
            mode: ThemeMode.light,
            signedIn: member,
            verified: _verifiedScreens.contains(target),
          );
          _open(tester, target);
          await _settle(tester);
          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          // Contrast is checked on the colours themselves (palette_test):
          // the screenshot-based textContrastGuideline misreads thin,
          // antialiased text and underlines, flagging 5.6:1 links as 2:1.
          semantics.dispose();
        },
      );
    }
  }
}

/// A product with the longest shapes: long names and a question of every
/// type, so the product page and each step of its form are laid out full.
const _insuranceProduct = {
  'slug': 'test-cover',
  'title': 'بیمهٔ آتش‌سوزی، زلزله و حوادث طبیعی ساختمان و اثاثیه منزل',
  'titleEn':
      'Fire, earthquake and natural-disaster cover for building and contents',
  'summary':
      'پوشش کامل ساختمان و اثاثیه در برابر آتش‌سوزی، انفجار، صاعقه، زلزله، سیل و طوفان با امکان افزودن پوشش‌های تکمیلی',
  'summaryEn':
      'Full cover for the building and its contents against fire, explosion, lightning, earthquake, flood and storm, with optional extras',
  'intakeMode': 'CALLBACK',
  'audience': 'CORPORATE',
};

final _insuranceDetail = {
  ..._insuranceProduct,
  'description':
      'این بیمه ساختمان و اثاثیه را در برابر خطرهای اصلی پوشش می‌دهد و با پوشش‌های تکمیلی گسترش می‌یابد. ' *
      3,
  'descriptionEn':
      'This cover protects the building and its contents against the main perils and extends with optional cover. ' *
      3,
  'category': {
    'slug': 'property',
    'title': 'اموال',
    'titleEn': 'Property',
    'emoji': '🏠',
  },
  'coverages': [
    'آتش‌سوزی، انفجار و صاعقه با هزینهٔ پاک‌سازی آوار',
    'Earthquake and volcanic eruption with the cost of temporary housing',
  ],
  'optionalCoverages': [
    'سیل',
    'طوفان',
    'ترکیدگی لوله‌های آب و نشت فاضلاب',
    'Theft with forced entry',
  ],
  'exclusions': ['خسارت ناشی از جنگ، شورش و انرژی هسته‌ای و استهلاک تدریجی'],
  'claimSteps': [
    'Report the loss within five working days',
    'An assessor visits',
  ],
  'requiredDocuments': ['Title deed or lease', 'Photos of the property'],
  'premiumFactors': ['Building age', 'Construction type', 'Sum insured'],
  'notes': ['Underinsurance reduces the payout in proportion.'],
  'faq': [
    {
      'question': 'Does it cover rented homes and the tenant’s furniture?',
      'answer': 'Yes. ' * 20,
    },
  ],
  'keyFacts': [
    {
      'label': 'Maximum sum insured for contents',
      'value': '۵۰٬۰۰۰٬۰۰۰٬۰۰۰ ریال',
    },
    {
      'label': 'Waiting period',
      'value': 'None for fire; 15 days for earthquake',
    },
    {'label': 'Term', 'value': 'One year, renewable'},
  ],
  'formSchema': [
    {
      'name': 'subject',
      'label': 'موضوع بیمه',
      'labelEn': 'What to insure',
      'type': 'select',
      'required': true,
      'options': [
        {
          'value': 'BOTH',
          'label': 'ساختمان و اثاثیه',
          'labelEn': 'Building and contents, with all fixtures and fittings',
        },
        {
          'value': 'BUILDING',
          'label': 'فقط ساختمان',
          'labelEn': 'Building only',
        },
      ],
    },
    {
      'name': 'contentsValue',
      'label': 'ارزش اثاثیه',
      'labelEn': 'Value of the contents',
      'type': 'currency',
      'required': true,
      'unit': 'ریال',
      'unitEn': 'rials',
      'help': 'ارزش جایگزینی همهٔ اثاثیه به قیمت روز، بدون کسر استهلاک',
      'helpEn':
          'What it would cost to replace everything today, without deducting wear',
    },
    {
      'name': 'area',
      'label': 'متراژ',
      'labelEn': 'Floor area',
      'type': 'number',
      'unit': 'متر مربع',
      'unitEn': 'm²',
    },
    {
      'name': 'startDate',
      'label': 'تاریخ شروع پوشش',
      'labelEn': 'Cover starts on',
      'type': 'date',
      'min': 'today',
      'required': true,
    },
    {
      'name': 'perils',
      'label': 'پوشش‌های تکمیلی مورد نیاز',
      'labelEn': 'Optional cover you need',
      'type': 'multiselect',
      'options': [
        {
          'value': 'FLOOD',
          'label': 'سیل و آب‌گرفتگی',
          'labelEn': 'Flood and water damage',
        },
        {'value': 'STORM', 'label': 'طوفان', 'labelEn': 'Storm'},
        {
          'value': 'THEFT',
          'label': 'سرقت با شکست حرز',
          'labelEn': 'Theft with forced entry',
        },
        {'value': 'PIPES', 'label': 'ترکیدگی لوله', 'labelEn': 'Burst pipes'},
      ],
    },
    {
      'name': 'hasAlarm',
      'label': 'سیستم اعلام حریق دارد',
      'labelEn': 'Has a fire alarm system installed and serviced',
      'type': 'bool',
    },
    {
      'name': 'ownerId',
      'label': 'کد ملی مالک',
      'labelEn': 'Owner national ID',
      'type': 'nationalId',
      'required': true,
    },
    {'name': 'plate', 'label': 'پلاک', 'labelEn': 'Plate', 'type': 'plate'},
    {
      'name': 'fullName',
      'label': 'نام و نام خانوادگی',
      'labelEn': 'Full name',
      'type': 'text',
      'required': true,
    },
    {
      'name': 'notes',
      'label': 'توضیحات',
      'labelEn': 'Notes',
      'type': 'textarea',
      'maxLength': 1000,
    },
  ],
};

/// A posting with everything a card can show, all of it long.
const _longJob = <String, Object?>{
  'id': 'j1',
  'code': 'LONG1',
  'title':
      'Senior full-stack engineer for the municipal citizen-services platform (React, Node.js, PostgreSQL)',
  'companyName': 'Sazman-e Fanavari-ye Ettelaat-e Shahrvandi-ye Iran',
  'company': {
    'slug': 'civic',
    'name': 'Sazman-e Fanavari-ye Ettelaat-e Shahrvandi-ye Iran',
    'logoUrl': null,
  },
  'featured': true,
  'urgent': true,
  'employmentType': 'FULL_TIME',
  'workArrangement': 'HYBRID',
  'country': 'IR',
  'province': 'سیستان و بلوچستان',
  'city': 'Zahedan, the provincial capital and its surrounding districts',
  'remoteWorldwide': false,
  'salaryMin': '1250000000',
  'salaryMax': '1850000000',
  'salaryUndisclosed': false,
  'currency': 'IRT',
  'salaryPeriod': 'MONTH',
  'publishedAt': '2026-10-19T10:00:00Z',
  'closesAt': '2030-10-22T10:00:00Z',
  'skills': [
    'React',
    'TypeScript',
    'GraphQL',
    'Kubernetes and platform engineering',
    'PostgreSQL performance tuning',
    'Accessibility',
    'Jest',
  ],
  'jobCategory': {
    'id': 'c1',
    'slug': 'web-development',
    'name': 'توسعه وب (فرانت‌اند، بک‌اند، فول‌استک)',
    'nameEn': 'Web development, front end, back end and full stack',
  },
  'seniority': 'MANAGER',
  'minExperienceYears': 12,
  'benefits': [
    'SUPPLEMENTARY_INSURANCE',
    'FOREIGN_CURRENCY_PAY',
    'OCCASION_GIFTS',
    'CAREER_GROWTH',
    'FLEXIBLE_HOURS',
  ],
  'amriehEligible': true,
  'disabilityFriendly': true,
  'openings': 128,
  'authorProfile': {
    'username': 'maryam_alexandra_ahmadi_khorasani',
    'verified': true,
    'ratingAvg': 4.6,
    'ratingCount': 1284,
  },
  'applicantCount': 1284,
  'reviewingNow': true,
  'responsiveEmployer': true,
};

/// Abroad, hourly, in euros, open to anyone anywhere.
final _abroadJob = <String, Object?>{
  ..._longJob,
  'id': 'j2',
  'code': 'ABROAD1',
  'featured': false,
  'urgent': false,
  'workArrangement': 'REMOTE',
  'remoteWorldwide': true,
  'country': 'DE',
  'province': null,
  'city': 'Berlin-Charlottenburg-Wilmersdorf',
  'currency': 'EUR',
  'salaryPeriod': 'HOUR',
  'salaryMin': '45',
  'salaryMax': '95',
  'seniority': 'INTERN',
  'employmentType': 'INTERNSHIP',
};

/// The least a posting can carry.
const _plainJob = <String, Object?>{
  'id': 'j3',
  'code': 'PLAIN1',
  'title': 'Driver',
  'employmentType': 'PART_TIME',
  'workArrangement': 'ONSITE',
  'salaryUndisclosed': true,
  'skills': <String>[],
  'benefits': <String>[],
};

/// An employer with everything a company page can show, all of it long.
const _longCompany = <String, Object?>{
  'id': 'co1',
  'slug': 'civic',
  'name': 'Sazman-e Fanavari-ye Ettelaat-e Shahrvandi-ye Iran',
  'tagline':
      'Citizen-services platforms for municipalities, permits and complaints, across every province',
  'industry': 'GAMING_ENTERTAINMENT',
  'size': 'SIZE_1000_PLUS',
  'foundedYear': 1395,
  'website': 'https://sazman-e-fanavari-ye-ettelaat.example.com/careers',
  'country': 'IR',
  'province': 'سیستان و بلوچستان',
  'city': 'Zahedan, the provincial capital and its surrounding districts',
  'logoUrl': null,
  'coverUrl': null,
  'openJobs': 1284,
  'responsiveness': {'rate': 0.97, 'sample': 40, 'responsive': true},
  'hiredCount': 1284,
};

/// The least an employer can carry.
const _plainCompany = <String, Object?>{
  'id': 'co2',
  'slug': 'plain',
  'name': 'Co',
  'openJobs': 0,
};
