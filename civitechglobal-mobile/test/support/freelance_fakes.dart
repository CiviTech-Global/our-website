/// The freelance side's answers for the layout audit, in the longest shapes
/// real data takes: long titles, every badge, every stage, every count. Null
/// for a path that is not the freelance side's.
(int, Object?)? freelanceFake(String path, Map<String, Object?> query) {
  const long =
      'A municipal citizen-services platform for permits, complaints and '
      'payments, with a public dashboard and an officer back office.';
  const user = {
    'username': 'maryam_alexandra_long',
    'headline': 'Principal software architect and engineering lead',
    'verified': true,
    'ratingAvg': 4.75,
    'ratingCount': 1234,
  };
  const stats = {
    'completed': 123,
    'active': 4,
    'jobSuccess': 98,
    'onTime': 96,
    'ratingAvg': 4.9,
    'ratingCount': 321,
    'level': 'TOP_RATED',
    'memberSince': '2021-03-01T00:00:00Z',
    'lastActiveAt': '2026-10-20T00:00:00Z',
    'lastDeliveryAt': '2026-10-18T00:00:00Z',
    'country': 'DE',
    'languages': ['fa', 'en', 'de', 'tr'],
    'hourlyRate': '1250000',
    'hourlyCurrency': 'IRT',
    'availability': 'LIMITED',
    'verified': true,
    'skills': [
      'TypeScript',
      'PostgreSQL',
      'Flutter',
      'Kubernetes',
      'Distributed systems and platform engineering',
    ],
  };
  final project = <String, Object?>{
    'id': 'pr1',
    'code': 'PRLONG01',
    'title':
        'Municipal citizen-services platform for permits, complaints and online payments',
    'excerpt': '$long $long',
    'companyName': 'Sazman-e Fanavari-ye Ettelaat-e Shahrvandi-ye Iran',
    'workCategory': {
      'id': 'w1',
      'slug': 'web',
      'name': 'توسعه وب (فرانت‌اند، بک‌اند، فول‌استک)',
      'nameEn': 'Web development (front end, back end, full stack)',
    },
    'skills': [
      'React',
      'TypeScript',
      'Node.js',
      'PostgreSQL',
      'Kubernetes',
      'Accessibility',
      'Security',
      'Payments',
      'Redis',
      'Elasticsearch',
    ],
    'featured': true,
    'urgent': true,
    'nda': true,
    'contractToHire': true,
    'visibility': 'SIGNED_IN',
    'pricingType': 'HOURLY',
    'experienceLevel': 'EXPERT',
    'duration': 'MORE_THAN_SIX_MONTHS',
    'weeklyHours': 'MORE_THAN_THIRTY',
    'budgetMin': '1250000000',
    'budgetMax': '98765000000',
    'budgetUnknown': false,
    'currency': 'IRT',
    'deliverBy': '2027-03-01T00:00:00Z',
    'publishedAt': '2026-10-24T00:00:00Z',
    'closesAt': '2026-11-02T00:00:00Z',
    'state': 'OPEN',
    'onsite': true,
    'country': 'DE',
    'province': 'Nordrhein-Westfalen',
    'city': 'Mönchengladbach',
    'languages': ['fa', 'en', 'de'],
    'preferredCountries': ['DE', 'TR', 'AE', 'IR'],
    'freelancersNeeded': 12,
    '_count': {'bids': 4321},
    'client': {
      'verified': true,
      'companyName': 'Sazman-e Fanavari-ye Ettelaat-e Shahrvandi-ye Iran',
      'country': 'IR',
      'province': 'تهران',
      'city': 'تهران',
      'memberSince': '2020-01-01T00:00:00Z',
      'lastActiveAt': '2026-10-24T00:00:00Z',
      'projectsPosted': 1234,
      'openProjects': 56,
      'hires': 789,
      'hireRate': 87,
      'committed': [
        {'currency': 'IRT', 'amount': '98765432100'},
        {'currency': 'EUR', 'amount': '123456'},
      ],
      'ratingAvg': 4.8,
      'ratingCount': 432,
      'username': 'civic_tech_client',
    },
    'activity': {
      'bidCount': 4321,
      'proposalRange': '50_PLUS',
      'interviewing': 123,
      'hired': 4,
      'invitesSent': 56,
      'unansweredInvites': 12,
      'lastViewedByClient': '2026-10-24T00:00:00Z',
      'averageBid': '45678900000',
    },
    'match': {'matched': 7, 'total': 10},
  };
  final detail = {
    ...project,
    'description': '$long\n\n$long\n\n$long',
    'openToCompanyOffer': true,
    'viewCount': 1234567,
    'screeningQuestions': [
      'Which similar public-sector platforms have you shipped, and what did you own?',
      'How would you keep the permit flow usable for people on old phones?',
    ],
    'attachments': [
      {
        'id': 'at1',
        'originalName': 'Requirements - permits and complaints - v3 final.pdf',
        'sizeBytes': 2400000,
      },
    ],
    'attachmentCount': 3,
    'similar': [
      for (var i = 0; i < 2; i++) {...project, 'id': 'sim$i', 'code': 'SIM$i'},
    ],
    'viewer': {
      'isAuthor': false,
      'briefOpen': true,
      'ndaSigned': {'signedAt': '2026-10-20T00:00:00Z', 'signedName': 'Sara'},
      'saved': true,
      'invite': {
        'id': 'inv1',
        'status': 'PENDING',
        'message': long,
        'createdAt': '2026-10-20T00:00:00Z',
      },
      'myBid': null,
      'match': {
        'matched': ['React', 'TypeScript', 'PostgreSQL'],
        'missing': ['Kubernetes'],
        'total': 10,
      },
      'canBid': true,
    },
  };
  final service = <String, Object?>{
    'id': 'sv1',
    'code': 'SVLONG01',
    'title':
        'I will design and build a complete accessible web application with an admin panel',
    'featured': true,
    'createdAt': '2026-10-01T00:00:00Z',
    'languages': ['fa', 'en'],
    'workCategory': project['workCategory'],
    'startingPrice': '98765000000',
    'currency': 'IRT',
    'fastestDelivery': 365,
    'packageCount': 3,
    'coverImageId': null,
    'ordersCompleted': 4321,
    'rating': {'avg': 4.9, 'count': 1234},
    'seller': {
      'username': 'maryam_alexandra_long',
      'level': 'TOP_RATED',
      'verified': true,
      'country': 'DE',
      'lastActiveAt': '2026-10-20T00:00:00Z',
    },
  };
  Map<String, Object?> package(String tier) => {
    'id': 'pk$tier',
    'tier': tier,
    'name': 'Complete accessible web application, $tier',
    'description': long,
    'price': '98765000000',
    'currency': 'IRT',
    'deliveryDays': 365,
    'revisions': tier == 'PREMIUM' ? -1 : 10,
    'features': [
      'Responsive design for every phone and tablet',
      'Admin panel with roles and audit history',
      'Accessibility audit against WCAG 2.2 AA',
    ],
  };
  final serviceDetail = {
    ...service,
    'description': '$long\n\n$long',
    'workCategoryId': 'w1',
    'skills': project['skills'],
    'faqs': [
      {
        'question': 'Do you work with an existing design system?',
        'answer': long,
      },
    ],
    'requirements': ['What should the application do, in a few sentences?'],
    'state': 'ACTIVE',
    'viewCount': 1234567,
    'packages': [
      for (final t in ['BASIC', 'STANDARD', 'PREMIUM']) package(t),
    ],
    'extras': [
      {
        'id': 'ex1',
        'title': 'Express delivery in half the time',
        'price': '12345000000',
        'extraDays': 0,
      },
      {
        'id': 'ex2',
        'title': 'Source code handover with documentation',
        'price': '1234000000',
        'extraDays': 14,
      },
    ],
    'images': <Object>[],
    'reviews': {
      'breakdown': [
        for (var s = 5; s >= 1; s--) {'stars': s, 'count': s * 123},
      ],
      'items': [
        {
          'rating': 5,
          'text': long,
          'createdAt': '2026-10-01T00:00:00Z',
          'tier': 'PREMIUM',
          'price': '98765000000',
          'currency': 'IRT',
          'durationDays': 365,
          'buyerCountry': 'DE',
        },
      ],
    },
    'seller': {
      'profile': user,
      'displayName': 'Maryam-Alexandra Ahmadi-Khorasani',
      'bio': long,
      'stats': stats,
      'ordersInQueue': 12,
    },
    'moreFromSeller': [
      {
        'code': 'SV2',
        'title': service['title'],
        'startingPrice': '12345000000',
        'currency': 'IRT',
      },
    ],
  };
  final ownProject = {
    ...project,
    'id': 'op1',
    'description': '$long\n\n$long',
    'moderationStatus': 'APPROVED',
    'reviewNote': null,
    'createdAt': '2026-10-01T00:00:00Z',
    'viewCount': 1234567,
    'screeningQuestions': detail['screeningQuestions'],
    'unseenBids': 1234,
  };
  Map<String, Object?> bid(String id, String outcome, {bool company = false}) =>
      {
        'id': id,
        'amount': '98765000000',
        'currency': 'IRT',
        'deliveryDays': 365,
        'message': '$long\n\n$long',
        'isCompanyOffer': company,
        'attachmentOriginalName':
            'Proposal - Maryam-Alexandra Ahmadi-Khorasani - final.pdf',
        'outcome': outcome,
        'createdAt': '2026-10-20T00:00:00Z',
        'milestones': [
          {
            'title': 'Discovery, research and an accessible design system',
            'amount': '48765000000',
            'days': 120,
          },
          {
            'title': 'Build, test and hand over',
            'amount': '50000000000',
            'days': 245,
          },
        ],
        'screeningAnswers': [long, long],
        'clientSeenAt': outcome == 'PENDING' ? null : '2026-10-21T00:00:00Z',
        'clientNote': long,
        'invited': true,
        'bidder': {
          'id': 'u1',
          'firstName': 'Maryam-Alexandra',
          'lastName': 'Ahmadi-Khorasani',
        },
        'bidderProfile': user,
        'bidderStats': stats,
      };
  Map<String, Object?> award({required bool mine, required bool hourly}) => {
    'award': {
      'id': 'aw${mine ? 1 : 2}${hourly ? 'h' : 'f'}',
      'status': 'ACTIVE',
      'agreedAmount': '98765000000',
      'currency': 'IRT',
      'disputeStatus': 'NONE',
      'pricingType': hourly ? 'HOURLY' : 'FIXED',
      'hourlyRate': hourly ? '1250000' : null,
      'weeklyHourLimit': hourly ? 40 : null,
    },
    'kind': 'project',
    'listing': {'code': 'PRLONG01', 'title': project['title']},
    'myRole': mine ? 'author' : 'counterparty',
    'counterpartyProfile': user,
    'milestones': [
      for (final status in ['APPROVED', 'IN_REVIEW', 'PENDING'])
        {
          'id': 'm$status',
          'title': 'Discovery, research and an accessible design system',
          'dueDate': '2026-12-01T00:00:00Z',
          'status': status,
          'deliveryNote': status == 'PENDING' ? null : long,
          'deliveredAt': status == 'PENDING' ? null : '2026-10-20T00:00:00Z',
          'deliveryOriginalName': status == 'PENDING'
              ? null
              : 'Delivery - design system - v2.zip',
        },
    ],
    'myReview': null,
    'theirReview': {'rating': 5, 'text': long},
    'timesheets': hourly
        ? [
            for (final status in ['SUBMITTED', 'APPROVED', 'QUERIED'])
              {
                'id': 'ts$status',
                'weekStart': '2026-10-17',
                'minutes': 2345,
                'memo': long,
                'status': status,
                'clientNote': status == 'QUERIED' ? long : null,
              },
          ]
        : <Object>[],
  };
  Map<String, Object?> page(List<Object> items) => {
    'data': {
      'items': items,
      'page': 1,
      'pageSize': 20,
      'total': 1234567,
      'totalPages': 1,
    },
  };

  return switch (path) {
    '/work/categories' => (
      200,
      {
        'data': [
          {
            ...project['workCategory']! as Map,
            'parentId': null,
            'projectCount': 1234,
            'serviceCount': 567,
          },
          {
            'id': 'w2',
            'slug': 'mobile',
            'name': 'توسعه اپلیکیشن موبایل',
            'nameEn': 'Mobile app development',
            'parentId': 'w1',
            'projectCount': 89,
            'serviceCount': 12,
          },
        ],
      },
    ),
    '/market/projects' => (
      200,
      page([
        project,
        {
          ...project,
          'id': 'pr2',
          'urgent': false,
          'featured': false,
          'nda': false,
          'client': null,
          'activity': null,
        },
      ]),
    ),
    '/market/projects/PRLONG01' ||
    '/work/me/projects/PRLONG01/view' => (200, {'data': detail}),
    '/work/me/projects/pr1/price-guide' => (
      200,
      {
        'data': {
          'pricingType': 'HOURLY',
          'currency': 'IRT',
          'budget': {'min': '1250000000', 'max': '98765000000'},
          'market': {
            'sample': 1234,
            'low': '1000000',
            'median': '45678900000',
            'high': '98765000000',
          },
        },
      },
    ),
    '/work/me/recommended-projects' => (
      200,
      {
        'data': {
          'basis': 'skills',
          'items': [project],
        },
      },
    ),
    '/work/me/saved-projects/ids' => (
      200,
      {
        'data': ['pr1'],
      },
    ),
    '/work/talent' => (
      200,
      page([
        {
          'username': 'maryam_alexandra_long',
          'displayName': 'Maryam-Alexandra Ahmadi-Khorasani',
          'headline': long,
          'serviceCount': 1234,
          'stats': stats,
        },
      ]),
    ),
    '/work/services' => (
      200,
      page([
        service,
        {...service, 'id': 'sv2', 'featured': false},
      ]),
    ),
    '/work/services/SVLONG01' => (200, {'data': serviceDetail}),
    '/market/me/projects' => (
      200,
      {
        'data': [
          ownProject,
          {
            ...ownProject,
            'id': 'op2',
            'moderationStatus': 'CHANGES_REQUESTED',
            'reviewNote': long,
          },
        ],
      },
    ),
    '/work/me/client-pipeline' => (
      200,
      {
        'data': {
          'projects': {'OPEN': 1234},
          'bids': {'SHORTLISTED': 567, 'INTERVIEW': 89, 'ACCEPTED': 12},
          'unseenBids': 1234,
          'invites': {'PENDING': 56, 'ACCEPTED': 7},
        },
      },
    ),
    '/market/me/projects/op1/bids' => (
      200,
      {
        'data': [
          bid('b1', 'PENDING'),
          bid('b2', 'SHORTLISTED', company: true),
          bid('b3', 'DECLINED'),
        ],
      },
    ),
    '/work/me/projects/op1/invites' => (
      200,
      {
        'data': [
          {
            'id': 'i1',
            'status': 'PENDING',
            'createdAt': '2026-10-20T00:00:00Z',
            'profile': user,
            'stats': stats,
          },
        ],
      },
    ),
    '/work/me/projects/op1/nda' => (
      200,
      {
        'data': [
          {
            'signedName': 'Maryam-Alexandra Ahmadi-Khorasani',
            'signedAt': '2026-10-20T00:00:00Z',
            'user': {
              'firstName': 'Maryam',
              'lastName': 'A',
              'username': 'maryam_alexandra_long',
            },
          },
        ],
      },
    ),
    '/work/me/proposals' => (
      200,
      {
        'data': [
          {
            ...bid('mp1', 'INTERVIEW'),
            'moderationStatus': 'APPROVED',
            'project': {...project, 'screeningQuestions': <Object>[]},
            'award': null,
          },
        ],
      },
    ),
    '/work/me/invites' => (
      200,
      {
        'data': [
          {
            'id': 'ri1',
            'status': 'PENDING',
            'message': long,
            'createdAt': '2026-10-20T00:00:00Z',
            'project': project,
          },
        ],
      },
    ),
    '/work/me/saved-projects' => (
      200,
      {
        'data': [
          {...project, 'savedAt': '2026-10-20T00:00:00Z'},
        ],
      },
    ),
    '/work/me/project-alerts' => (
      200,
      {
        'data': [
          {
            'id': 'pa1',
            'name':
                'Accessible public-sector web platforms, hourly, expert level',
            'query': {
              'search': 'React accessibility',
              'workCategoryId': 'w1',
              'pricingType': 'HOURLY',
              'experienceLevel': 'EXPERT',
              'budgetMin': '1250000000',
              'country': 'DE',
              'language': 'de',
            },
            'active': true,
            'lastNotifiedAt': '2026-10-20T00:00:00Z',
          },
        ],
      },
    ),
    '/market/me/awards' => (
      200,
      {
        'data': [
          award(mine: true, hourly: true),
          award(mine: false, hourly: true),
          award(mine: false, hourly: false),
        ],
      },
    ),
    '/work/me/services' => (
      200,
      {
        'data': [
          {
            ...serviceDetail,
            'moderationStatus': 'CHANGES_REQUESTED',
            'reviewNote': long,
            'state': 'PAUSED',
            'orders': {'REQUESTED': 1234, 'ACCEPTED': 567},
          },
        ],
      },
    ),
    '/work/me/orders' => (
      200,
      {
        'data': [
          {
            'id': 'o1',
            'code': 'ORDLONG01',
            'tier': 'PREMIUM',
            'packageName': 'Complete accessible web application, PREMIUM',
            'price': '98765000000',
            'currency': 'IRT',
            'deliveryDays': 365,
            'revisions': -1,
            'extras': [
              {
                'title': 'Express delivery in half the time',
                'price': '12345000000',
                'extraDays': 0,
              },
            ],
            'requirementAnswers': [long],
            'note': long,
            'status': 'REQUESTED',
            'createdAt': '2026-10-20T00:00:00Z',
            'service': {
              'id': 'sv1',
              'code': 'SVLONG01',
              'title': service['title'],
              'requirements': serviceDetail['requirements'],
              'images': <Object>[],
            },
            'award': null,
            'counterparty': user,
          },
        ],
      },
    ),
    _ => null,
  };
}
