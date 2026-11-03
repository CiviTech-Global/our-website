/// The staff desk's answers for the layout audit, in the longest shapes real
/// data takes (field names as the API returned them). Null for a path that is
/// not the desk's.
const _long =
    'Rayan Tamaddon Jahan Gostar builds creative, innovative software that '
    'makes life simpler for people and organisations alike, with long '
    'paragraphs that a reviewer has to read on a small phone.';

const _person = {
  'id': 'u2',
  'firstName': 'Maryam-Alexandra',
  'lastName': 'Ahmadi-Khorasani',
  'email': 'maryam.ahmadi.long.address@example.com',
};

/// A draft as long as real ones get: every list filled, every price set.
const Map<String, Object?> _proposal = {
  'id': 'pp1',
  'status': 'DRAFT',
  'scopeSummary': _long,
  'deliverables': [_long, 'A second, shorter deliverable'],
  'assumptions': [_long],
  'exclusions': [_long],
  'priceMin': '700000000',
  'priceLikely': '1100000000',
  'priceMax': '1500000000',
  'currency': 'IRT',
  'timelineWeeksMin': 8,
  'timelineWeeksMax': 14,
  'validUntil': '2026-12-31T00:00:00Z',
  'message': _long,
  'milestones': [
    {
      'title': 'Discovery and a clickable prototype of every approval step',
      'description': _long,
      'durationDays': 21,
      'price': '300000000',
    },
  ],
};

Map<String, Object?> _page(List<Map<String, Object?>> items) => {
  'data': {
    'items': items,
    'page': 1,
    'pageSize': 20,
    'total': items.length,
    'totalPages': 1,
  },
};

const _account = {
  'id': 'u2',
  'firstName': 'Maryam-Alexandra',
  'lastName': 'Ahmadi-Khorasani',
  'email': 'maryam.ahmadi.long.address@example.com',
  'role': 'ADMIN',
  'permissions': ['messages'],
  'createdAt': '2026-10-20T08:00:00Z',
  'isActive': false,
};

const _customer = {
  'id': 'u3',
  'firstName': 'Maryam-Alexandra',
  'lastName': 'Ahmadi-Khorasani',
  'email': 'maryam.ahmadi.long.address@example.com',
  'role': 'USER',
  'permissions': <String>[],
  'createdAt': '2026-10-20T08:00:00Z',
  'isActive': true,
};

/// One row per queue, keyed as the workload names them.
const staffRows = <String, Map<String, Object?>>{
  'insurance': {
    'id': 'r1',
    'trackingCode': 'WZWCX7H7XA',
    'fullName': 'Maryam-Alexandra Ahmadi-Khorasani',
    'phoneNumber': '09121234567',
    'email': 'maryam.ahmadi.long.address@example.com',
    'organizationName': 'Sazman-e Fanavari-ye Ettelaat-e Shahrvandi-ye Iran',
    'city': 'Zahedan and the surrounding villages',
    'preferredContactTime': 'morning',
    'notes': _long,
    'status': 'NEW',
    'createdAt': '2026-10-20T08:00:00Z',
    'product': {'title': 'Third-party liability cover for commercial fleets'},
  },
  'projects': {
    'id': 'p1',
    'trackingCode': 'PROJLONG01',
    'title': 'A customer portal with long-running approval workflows',
    'contactName': 'Maryam-Alexandra Ahmadi-Khorasani',
    'organizationName': 'Sazman-e Fanavari-ye Ettelaat',
    'email': 'maryam.ahmadi.long.address@example.com',
    'phone': '09121234567',
    'summary': _long,
    'goals': _long,
    'outOfScope': _long,
    'constraints': _long,
    'budgetMin': '700000000',
    'budgetMax': '1500000000',
    'budgetUnknown': false,
    'currency': 'IRT',
    'status': 'SUBMITTED',
    'internalNotes': _long,
    'createdAt': '2026-10-20T08:00:00Z',
    'attachments': [
      {'id': 'a1', 'originalName': 'requirements-final-version-3.pdf'},
    ],
    'proposals': [_proposal],
  },
  'resumes': {
    'id': 'c1',
    'trackingCode': 'RESUMELONG',
    'track': 'JOB',
    'fullName': 'Maryam-Alexandra Ahmadi-Khorasani',
    'email': 'maryam.ahmadi.long.address@example.com',
    'phone': '09121234567',
    'city': 'Zahedan and the surrounding villages',
    'birthYear': 1370,
    'coverNote': _long,
    'status': 'RECEIVED',
    'matchedRole': 'Principal software architect and engineering lead',
    'internalNotes': _long,
    'resumeOriginalName': 'maryam-ahmadi-khorasani-resume-2026.pdf',
    'githubUrl': 'https://github.com/maryam-ahmadi-khorasani',
    'createdAt': '2026-10-20T08:00:00Z',
  },
  'messages': {
    'id': 'm1',
    'trackingCode': 'EYCEQWJ2KT',
    'status': 'OPEN',
    'name': 'Maryam-Alexandra Ahmadi-Khorasani',
    'email': 'maryam.ahmadi.long.address@example.com',
    'subject': 'A question about commercial liability cover for a fleet',
    'message': _long,
    'readAt': '2026-10-20T09:00:00Z',
    'createdAt': '2026-10-20T08:00:00Z',
    'replies': [
      {'id': 'x1', 'body': _long},
    ],
  },
  'consultations': {
    'id': 'k1',
    'trackingCode': 'CG7E2PKRMN',
    'fullName': 'Maryam-Alexandra Ahmadi-Khorasani',
    'phoneNumber': '09121234567',
    'email': 'maryam.ahmadi.long.address@example.com',
    'topic': 'CAREER',
    'preferredMode': 'ONLINE',
    'goal': _long,
    'background': _long,
    'status': 'NEW',
    'staffNote': _long,
    'createdAt': '2026-10-20T08:00:00Z',
    'expert': {'fullName': 'Maryam-Alexandra Ahmadi-Khorasani'},
    'assignedTo': _person,
  },
  'verification': {
    'id': 'v1',
    'kind': 'COMPANY',
    'status': 'PENDING',
    'legalFirstName': 'Maryam-Alexandra',
    'legalLastName': 'Ahmadi-Khorasani',
    'companyName': 'Sazman-e Fanavari-ye Ettelaat-e Shahrvandi-ye Iran',
    'submittedAt': '2026-10-20T08:00:00Z',
    'user': _person,
    'nationalId': '0012345678',
    'phone': '09121234567',
    'province': 'سیستان و بلوچستان',
    'city': 'Zahedan and the surrounding villages',
    'addressLine': 'Ferdowsi Street, corner of the twelfth alley, unit 4',
    'documents': [
      {
        'id': 'd1',
        'kind': 'NATIONAL_ID_CARD',
        'originalName': 'national-id-card-front-and-back.jpg',
      },
    ],
  },
  'jobPosts': {
    'id': 'j1',
    'code': 'NRRWEWNCMH',
    'title': 'Principal software architect and engineering lead',
    'companyName': 'Sazman-e Fanavari-ye Ettelaat',
    'moderationStatus': 'PENDING_REVIEW',
    'submittedAt': '2026-10-20T08:00:00Z',
    'author': _person,
    'description': _long,
    'province': 'سیستان و بلوچستان',
    'city': 'Zahedan',
    'salaryMin': '700000000',
    'salaryMax': '1500000000',
    'salaryUndisclosed': false,
    'currency': 'IRT',
    'skills': ['Kubernetes', 'PostgreSQL', 'Distributed systems'],
  },
  'applications': {
    'id': 'ap1',
    'coverLetter': _long,
    'expectedSalary': '900000000',
    'cvOriginalName': 'maryam-ahmadi-khorasani-resume-2026.pdf',
    'moderationStatus': 'PENDING_REVIEW',
    'createdAt': '2026-10-20T08:00:00Z',
    'applicant': _person,
    'job': {
      'title': 'Principal software architect and engineering lead',
      'companyName': 'Sazman-e Fanavari-ye Ettelaat',
      'description': _long,
    },
  },
  'freelanceProjects': {
    'id': 'f1',
    'code': '8KCJYVCRHB',
    'title': 'Landing page A/B testing setup with long analytics reports',
    'companyName': 'Sazman-e Fanavari-ye Ettelaat',
    'moderationStatus': 'PENDING_REVIEW',
    'submittedAt': '2026-10-20T08:00:00Z',
    'author': _person,
    'description': _long,
    'skills': ['Analytics', 'A/B testing'],
    'budgetMin': '700000000',
    'budgetMax': '1500000000',
    'budgetUnknown': false,
    'currency': 'IRT',
    'attachments': [
      {'id': 'fa1', 'originalName': 'brief-final-version-3.pdf'},
    ],
  },
  'bids': {
    'id': 'b1',
    'amount': '900000000',
    'currency': 'IRT',
    'deliveryDays': 45,
    'message': _long,
    'isCompanyOffer': false,
    'createdAt': '2026-10-20T08:00:00Z',
    'bidder': _person,
    'project': {
      'title': 'Landing page A/B testing setup with long analytics reports',
      'description': _long,
      'budgetMin': '700000000',
      'budgetMax': '1500000000',
      'budgetUnknown': false,
      'currency': 'IRT',
    },
  },
  'books': {
    'id': 'o1',
    'code': 'E2G28JXQJA',
    'conditionNotes': _long,
    'price': '450000',
    'currency': 'IRT',
    'province': 'سیستان و بلوچستان',
    'city': 'Zahedan',
    'moderationStatus': 'PENDING_REVIEW',
    'submittedAt': '2026-10-20T08:00:00Z',
    'postedByCompany': true,
    'seller': _person,
    'book': {'title': 'A very long book title that wraps on a narrow phone'},
  },
  'services': {
    'id': 's1',
    'code': 'MDRRNYDJC9',
    'title': 'Monthly bookkeeping and financial reports for small businesses',
    'description': _long,
    'moderationStatus': 'PENDING_REVIEW',
    'submittedAt': '2026-10-20T08:00:00Z',
    'owner': _person,
  },
  'tradeMasterShops': {
    'id': 'sh1',
    'code': '4GV3NMADYY',
    'name': 'Sofal va Seramik-e Alborz va Kargah-e Dast-saz-e Qazvin',
    'summary': _long,
    'description': _long,
    'industry': 'Handicrafts and traditional arts',
    'province': 'سیستان و بلوچستان',
    'city': 'Zahedan',
    'address': 'Ferdowsi Street, corner of the twelfth alley, unit 4',
    'phone': '+98 28 3322 1100',
    'website': 'https://sofal-va-seramik-alborz.example',
    'moderationStatus': 'PENDING_REVIEW',
    'createdAt': '2026-10-20T08:00:00Z',
    'owner': _person,
  },
  'tradeMasterProducts': {
    'id': 'pr1',
    'code': 'DA2HKC9Z8Z',
    'title': 'Hand-thrown turquoise glazed earthenware bowl, set of six',
    'summary': _long,
    'description': _long,
    'price': '4500000',
    'currency': 'IRT',
    'stock': 12,
    'moderationStatus': 'PENDING_REVIEW',
    'createdAt': '2026-10-20T08:00:00Z',
    'category': {'name': 'Pottery'},
    'images': [
      {'id': 'i1'},
      {'id': 'i2'},
    ],
    'business': {'name': 'Sofal va Seramik-e Alborz'},
  },
};

(int, Object?)? staffFake(String path, Map<String, Object?> query) {
  final detail = <String, Map<String, Object?>>{
    '/requests/r1': {
      'request': staffRows['insurance']!,
      'answers': [
        {
          'label': 'نوع خودرو',
          'labelEn': 'Vehicle type',
          'display': 'سواری',
          'displayEn': 'Passenger car',
        },
      ],
    },
    '/projects/admin/requests/p1': staffRows['projects']!,
    '/resumes/admin/c1': staffRows['resumes']!,
    '/market/admin/verifications/v1': staffRows['verification']!,
    '/market/admin/jobs/j1': staffRows['jobPosts']!,
    '/market/admin/projects/f1': staffRows['freelanceProjects']!,
    '/trademaster/admin/shops/sh1': staffRows['tradeMasterShops']!,
    '/trademaster/admin/products/pr1': staffRows['tradeMasterProducts']!,
  }[path];
  if (detail != null) return (200, {'data': detail});

  final list = <String, String>{
    '/requests': 'insurance',
    '/projects/admin/requests': 'projects',
    '/resumes/admin': 'resumes',
    '/contact': 'messages',
    '/consult/admin/requests': 'consultations',
    '/market/admin/verifications': 'verification',
    '/market/admin/jobs': 'jobPosts',
    '/market/admin/applications': 'applications',
    '/market/admin/projects': 'freelanceProjects',
    '/market/admin/bids': 'bids',
    '/bookshop/admin/offers': 'books',
    '/work/admin/services': 'services',
    '/trademaster/admin/shops': 'tradeMasterShops',
    '/trademaster/admin/products': 'tradeMasterProducts',
  }[path];
  if (list != null) return (200, _page([staffRows[list]!]));

  return switch (path) {
    '/projects/admin/proposals/pp1/document' => (
      200,
      {
        'data': {
          'trackingCode': 'PROJLONG01',
          'title': staffRows['projects']!['title'],
          'status': 'PROPOSAL_SENT',
          'proposal': _proposal,
        },
      },
    ),
    '/admin/users' => (200, _page(const [_account, _customer])),
    '/admin/roles' => (
      200,
      {
        'data': [
          {
            'id': 'r1',
            'name': 'Support and customer care',
            'permissions': ['messages', 'insurance'],
          },
        ],
      },
    ),
    '/admin/permissions' => (
      200,
      {
        'data': {
          'permissions': ['projects', 'resumes', 'insurance', 'messages'],
        },
      },
    ),
    '/market/admin/analytics' => (
      200,
      {
        'data': {
          'queues': {
            'jobs': {'PENDING_REVIEW': 2, 'APPROVED': 40},
          },
          'awards': {'total': 12000, 'openDisputes': 1, 'completionRate': 0.82},
          'featured': {'jobs': 3, 'projects': 2},
          'reviewSpeedHours': {'jobs': 4.5, 'projects': null},
          'topSkills': [
            {'value': 'Distributed systems engineering', 'total': 1200},
          ],
          'topCategories': <Object?>[],
        },
      },
    ),
    '/market/admin/disputes' => (
      200,
      {
        'data': [
          {
            'awardId': 'aw1',
            'kind': 'project',
            'listing': {'code': 'X', 'title': _long},
            'disputeReason': _long,
          },
        ],
      },
    ),
    '/market/admin/audit' => (
      200,
      _page([
        {
          'id': 'au1',
          'action': 'project.deadline_extended',
          'targetType': 'FreelanceProject',
          'targetId': 'cmvh1iwih01h0vc3opbfiocg3',
          'createdAt': '2026-10-20T08:00:00Z',
          'actor': _person,
        },
      ]),
    ),
    '/team/admin' => (
      200,
      {
        'data': {
          'sections': [
            {
              'id': 'se1',
              'name': 'Engineering and delivery',
              'description': _long,
            },
          ],
          'members': [
            {
              'id': 'te1',
              'name': 'Maryam-Alexandra Ahmadi-Khorasani',
              'title': 'Principal software architect and engineering lead',
              'bio': _long,
              'sectionId': 'se1',
              'published': false,
            },
          ],
        },
      },
    ),
    '/consult/admin/experts' => (
      200,
      {
        'data': [
          {
            'id': 'ex1',
            'fullName': 'Maryam-Alexandra Ahmadi-Khorasani',
            'headline': 'Principal software architect and engineering lead',
            'specialities': ['Architecture', 'Security'],
            'languages': ['fa', 'en'],
            'published': true,
          },
        ],
      },
    ),
    '/showcase/admin/organizations' => (
      200,
      {
        'data': [
          {
            'id': 'or1',
            'name': 'Sazman-e Fanavari-ye Ettelaat-e Shahrvandi-ye Iran',
            'industry': 'Public sector and civic technology',
            'published': true,
          },
        ],
      },
    ),
    '/showcase/admin/projects' => (
      200,
      {
        'data': [
          {
            'id': 'sp1',
            'title': 'A customer portal with long-running approval workflows',
            'summary': _long,
            'status': 'LAUNCHED',
            'technologies': ['Flutter', 'PostgreSQL'],
            'published': true,
            'screenshots': [
              {
                'id': 'sh1',
                'url': '/showcase/admin/shot/sh1',
                'caption':
                    'The approval queue, with a long caption that '
                    'has to wrap or be cut short beside its buttons',
              },
              {'id': 'sh2', 'url': '/showcase/admin/shot/sh2', 'caption': null},
            ],
          },
        ],
      },
    ),
    '/trademaster/admin/categories' ||
    '/trademaster/admin/business-categories' => (
      200,
      {
        'data': [
          {
            'id': 'ca1',
            'name': 'Handicrafts and traditional arts of the region',
            'slug': 'handicrafts-and-traditional-arts',
            'active': false,
          },
        ],
      },
    ),
    '/jobs/admin/companies' => (
      200,
      _page([
        {
          'id': 'co1',
          'name': 'Sazman-e Fanavari-ye Ettelaat',
          'hidden': true,
          'owner': _person,
        },
      ]),
    ),
    '/bookshop/admin/catalog' => (
      200,
      _page([
        {
          'id': 'bk1',
          'title': 'A very long book title that wraps on a narrow phone',
          'authors': ['Maryam-Alexandra Ahmadi-Khorasani'],
          'translators': <String>[],
          'tags': <String>[],
        },
      ]),
    ),
    '/admin/dashboard/workload' => (
      200,
      {
        'data': {
          'permissions': const [
            'users',
            'analytics',
            'experts',
            'showcase',
            'trademaster',
            'jobs',
            'books',
          ],
          'queues': {
            for (final key in staffRows.keys)
              if (key != 'services')
                key: {'open': key == 'insurance' ? 1200 : 3, 'total': 45000},
          },
          'recent': [
            {
              'kind': 'insurance',
              'id': 'r1',
              'title': 'Maryam-Alexandra Ahmadi-Khorasani',
              'status': 'NEW',
              'createdAt': '2026-10-20T08:00:00Z',
            },
          ],
          'trend': [
            for (var i = 0; i < 14; i++)
              {'day': '2026-10-${i + 10}', 'count': i % 5},
          ],
        },
      },
    ),
    '/auth/me/deletion' => (
      200,
      {
        'data': {'activeContracts': 0, 'booksInHandOver': 0, 'canDelete': true},
      },
    ),
    '/work/me/freelancer-profile' => (
      200,
      {
        'data': {
          'languages': ['fa', 'en', 'de'],
          'hourlyRate': '1500000',
          'hourlyCurrency': 'IRT',
          'availability': 'LIMITED',
          'country': 'IR',
        },
      },
    ),
    _ => null,
  };
}
