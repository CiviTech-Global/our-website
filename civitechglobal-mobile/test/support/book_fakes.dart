/// The book market's answers for the layout audit, in the longest shapes
/// real data takes: long titles and names, every badge, every status. Null
/// for a path that is not the book market's.
(int, Object?)? bookFake(String path, Map<String, Object?> query) {
  const long =
      'A first edition in its original jacket, with the publisher\'s '
      'catalogue tipped in and a former owner\'s name on the endpaper.';
  const seller = {
    'username': 'maryam_alexandra_long',
    'verified': true,
    'ratingAvg': 4.75,
    'ratingCount': 1234,
  };
  const category = {
    'id': 'c2',
    'slug': 'b-iranian-novel',
    'name': 'رمان‌های ایرانی معاصر و کلاسیک',
    'nameEn': 'Contemporary and classic Iranian novels',
    'parentId': 'c1',
  };
  final facts = <String, Object?>{
    'id': 'bk1',
    'code': 'BKLONG01',
    'title':
        'The Blind Owl and other stories: a new annotated edition with the '
        'author\'s letters',
    'subtitle': 'With an introduction, notes and a chronology of the author',
    'authors': ['Sadegh Hedayat', 'Mohammad Ali Jamalzadeh'],
    'translators': ['Iraj Bashiri', 'Desmond Patrick Costello'],
    'publisher': 'Entesharat-e Amir Kabir va Sherkat-e Ketabha-ye Jibi',
    'isbn': '9786009900015',
    'publishYear': 1402,
    'yearCalendar': 'SOLAR',
    'edition': 124,
    'pageCount': 1312,
    'language': 'fa',
    'binding': 'HARDCOVER',
    'trimSize': 'VAZIRI',
    'listPrice': '12345678900',
    'currency': 'IRT',
    'verified': true,
    'categoryId': 'c2',
    'coverUrl': '/bookshop/photos/cover1',
  };
  final card = <String, Object?>{
    ...facts,
    'viewCount': 123456,
    'category': category,
    'lowestPrice': '9876543210',
    'offerCount': 1234,
    'copies': 2345,
    'sellerCount': 345,
    'bestGrade': 'VERY_GOOD',
    'discountPercent': 99,
    'featured': true,
    'freeShipping': true,
    'deliveryOptions': ['IN_PERSON', 'POST', 'COURIER'],
    'provinces': ['تهران', 'سیستان و بلوچستان'],
    'newestOfferAt': '2026-10-19T18:52:29.888Z',
  };
  final strip = [
    for (var i = 0; i < 6; i++)
      {
        'id': 'st$i',
        'code': 'ST$i',
        'title': facts['title'],
        'authors': facts['authors'],
        'coverUrl': i.isEven ? null : '/bookshop/photos/cover1',
        'listPrice': '12345678900',
        'lowestPrice': i == 0 ? null : '9876543210',
        'offerCount': 12,
      },
  ];
  final offer = <String, Object?>{
    'id': 'of1',
    'code': 'OFLONG01',
    'grade': 'ACCEPTABLE',
    'conditionNotes': '$long $long',
    'price': '9876543210',
    'currency': 'IRT',
    'negotiable': true,
    'quantity': 999,
    'soldCount': 12345,
    'deliveryOptions': ['IN_PERSON', 'POST', 'COURIER'],
    'shippingCost': '123456789',
    'province': 'سیستان و بلوچستان',
    'city': 'Zahedan and the surrounding villages',
    'postedByCompany': false,
    'publishedAt': '2026-10-19T00:00:00Z',
    'photos': [
      for (var i = 0; i < 6; i++) {'id': 'ph$i', 'originalName': 'p$i.webp'},
    ],
    'seller': seller,
    'sellerSales': 12345,
  };
  final request = <String, Object?>{
    'id': 'rq1',
    'code': 'RQLONG01',
    'quantity': 999,
    'deliveryMethod': 'COURIER',
    'unitPrice': '9876543210',
    'shippingCost': '123456789',
    'offeredPrice': '8765432100',
    'currency': 'IRT',
    'note': long,
    'status': 'REQUESTED',
    'respondedAt': null,
    'declineReason': null,
    'completedAt': null,
    'createdAt': '2026-10-20T00:00:00Z',
    'total': '9876543210123',
    'award': null,
    'listing': {
      'id': 'of1',
      'code': 'OFLONG01',
      'grade': 'LIKE_NEW',
      'city': 'Zahedan and the surrounding villages',
      'province': 'سیستان و بلوچستان',
    },
    'book': {
      'id': 'bk1',
      'code': 'BKLONG01',
      'title': facts['title'],
      'authors': facts['authors'],
      'coverUrl': null,
    },
    'counterparty': seller,
    'unreadMessages': 123,
  };
  return switch (path) {
    '/bookshop/categories' => (
      200,
      {
        'data': [
          {
            'id': 'c1',
            'slug': 'b-literature',
            'name': 'ادبیات داستانی، شعر و نمایشنامه',
            'nameEn': 'Literature, fiction, poetry and drama',
            'parentId': null,
            'position': 0,
            'bookCount': 12345,
          },
          {...category, 'position': 0, 'bookCount': 1234},
          {
            'id': 'c3',
            'slug': 'b-textbooks',
            'name': 'کتاب‌های درسی و کمک‌درسی',
            'nameEn': 'Textbooks and study guides',
            'parentId': null,
            'position': 1,
            'bookCount': 0,
          },
        ],
      },
    ),
    '/bookshop/board' => (
      200,
      {
        'data': {
          'items': [
            card,
            {
              ...card,
              'id': 'bk2',
              'code': 'BK2',
              'coverUrl': null,
              'translators': <String>[],
              'discountPercent': 0,
              'featured': false,
            },
            {
              ...card,
              'id': 'bk3',
              'code': 'BK3',
              'offerCount': 1,
              'bestGrade': null,
              'freeShipping': false,
              'verified': false,
            },
          ],
          'page': 1,
          'totalPages': 1,
          'total': 1234567,
        },
      },
    ),
    '/bookshop/books/BKLONG01' => (
      200,
      {
        'data': {
          ...facts,
          'printRun': 1234567,
          'originalTitle':
              'Buf-e Kur: the original 1936 Bombay mimeograph edition',
          'originalLanguage': 'de',
          'series': 'Classics of modern Persian literature in translation',
          'seriesNumber': 123,
          'weightGrams': 12345,
          'description': '$long $long $long',
          'tags': [
            'Modernism',
            'Surrealism',
            'Persian literature',
            'Twentieth-century fiction in translation',
          ],
          'viewCount': 1234567,
          'createdAt': '2026-10-01T00:00:00Z',
          'category': category,
          'lowestPrice': '9876543210',
          'discountPercent': 99,
          'offers': [
            offer,
            {
              ...offer,
              'id': 'of2',
              'grade': 'NEW',
              'negotiable': false,
              'quantity': 1,
              'soldCount': 0,
              'conditionNotes': null,
              'shippingCost': null,
              'postedByCompany': true,
              'photos': <Object>[],
              'seller': null,
              'sellerSales': 0,
            },
            {
              ...offer,
              'id': 'of3',
              'grade': 'GOOD',
              'deliveryOptions': ['IN_PERSON'],
              'shippingCost': '0',
            },
          ],
          'editions': [
            for (var i = 0; i < 2; i++)
              {
                'id': 'ed$i',
                'code': 'ED$i',
                'title': facts['title'],
                'publisher': facts['publisher'],
                'translators': facts['translators'],
                'publishYear': 1399,
                'yearCalendar': 'SOLAR',
                'edition': 123,
                'binding': 'PAPERBACK',
                'trimSize': 'ROGHEI',
                'lowestPrice': i == 0 ? '9876543210' : null,
                'offerCount': 1234,
              },
          ],
          'moreByAuthor': strip,
          'similar': strip,
        },
      },
    ),
    '/bookshop/books/missing' => (
      404,
      {'success': false, 'message': 'Not found'},
    ),
    '/bookshop/me/catalog' => (
      200,
      {
        'data': [
          {
            ...facts,
            '_count': {'listings': 1234},
          },
          {
            ...facts,
            'id': 'bk2',
            'coverUrl': null,
            'verified': false,
            '_count': {'listings': 0},
          },
        ],
      },
    ),
    '/bookshop/me/offers' => (
      200,
      {
        'data': [
          {
            ...offer,
            'moderationStatus': 'APPROVED',
            'reviewNote': null,
            'state': 'OPEN',
            'viewCount': 123456,
            'updatedAt': '2026-10-20T00:00:00Z',
            // Own photos load through the sign-in; the audit's server has
            // no image to give, so the copies show their covers.
            'photos': <Object>[],
            'book': facts,
            'requests': {'REQUESTED': 123, 'ACCEPTED': 45},
          },
          {
            ...offer,
            'id': 'of4',
            'moderationStatus': 'CHANGES_REQUESTED',
            'reviewNote': '$long $long',
            'state': 'CLOSED',
            'viewCount': 0,
            'updatedAt': '2026-10-20T00:00:00Z',
            'photos': <Object>[],
            'book': {...facts, 'coverUrl': null},
            'requests': <String, Object?>{},
          },
          {
            ...offer,
            'id': 'of6',
            'moderationStatus': 'REJECTED',
            'reviewNote': long,
            'state': 'CLOSED',
            'viewCount': 0,
            'updatedAt': '2026-10-20T00:00:00Z',
            'photos': <Object>[],
            'book': facts,
            'requests': <String, Object?>{},
          },
          {
            ...offer,
            'id': 'of5',
            'grade': null,
            'moderationStatus': 'DRAFT',
            'reviewNote': null,
            'state': 'OPEN',
            'viewCount': 0,
            'updatedAt': '2026-10-20T00:00:00Z',
            'photos': <Object>[],
            'book': null,
            'requests': <String, Object?>{},
          },
        ],
      },
    ),
    '/bookshop/me/requests' => (
      200,
      {
        'data': [
          request,
          {...request, 'id': 'rq2', 'status': 'ACCEPTED'},
          {
            ...request,
            'id': 'rq3',
            'status': 'DECLINED',
            'declineReason': long,
            'deliveryMethod': 'IN_PERSON',
            'offeredPrice': null,
            'unreadMessages': 0,
          },
          {
            ...request,
            'id': 'rq4',
            'status': 'COMPLETED',
            'award': {'id': 'aw1', 'status': 'COMPLETED'},
            'shippingCost': null,
            'counterparty': null,
          },
        ],
      },
    ),
    _ => null,
  };
}
