/// The local market's answers for the layout audit, in the longest shapes
/// real data takes. Null for a path that is not the market's.
(int, Object?)? marketFake(String path, Map<String, Object?> query) {
  const long =
      'Hand-thrown glazed and unglazed earthenware from our own workshop, '
      'fired in a wood kiln and finished by hand, with repairs and orders.';
  final shop = <String, Object?>{
    'id': 's1',
    'code': 'SHLONG01',
    'slug': 'long-shop',
    'name': 'Sofal va Seramik-e Alborz va Kargah-e Dast-saz-e Qazvin',
    'summary': long,
    'industry': 'Handicrafts and traditional arts',
    'province': 'سیستان و بلوچستان',
    'city': 'Zahedan and the surrounding villages',
    'latitude': 36.2728,
    'longitude': 50.0101,
    'address':
        'Ferdowsi Street, corner of the twelfth alley, second floor, unit 4',
    'phone': '+98 28 3322 1100',
    'email': 'orders@sofal-va-seramik-alborz.example',
    'website': 'https://sofal-va-seramik-alborz.example',
    'featured': true,
    'publishedAt': '2026-10-20T00:00:00Z',
    'businessCategory': {
      'id': 'bc2',
      'name': 'صنایع دستی، سفال، سرامیک و هنرهای سنتی',
    },
    'logoUrl': '/trademaster/shops/s1/logo',
    'coverUrl': '/trademaster/shops/s1/cover',
    'hasCover': true,
    'productCount': 12345,
    'kinds': ['PRODUCT', 'SERVICE'],
    'ownerProfile': null,
    'distanceKm': 123.4,
    'description': '$long $long',
    'createdAt': '2026-10-01T00:00:00Z',
  };
  final product = <String, Object?>{
    'id': 'p1',
    'code': 'PRLONG01',
    'slug': 'long-product',
    'kind': 'PRODUCT',
    'title':
        'A set of six hand-thrown glazed earthenware cups with matching saucers',
    'summary': long,
    'price': '12345678900',
    'currency': 'IRT',
    'stock': 3,
    'negotiable': true,
    'featured': true,
    'publishedAt': '2026-10-20T00:00:00Z',
    'coverUrl': '/trademaster/products/images/i1',
    'variantCount': 3,
    'available': true,
    'category': {'id': 'pc2', 'name': 'ظروف سفالی و سرامیکی دست‌ساز'},
    'distanceKm': 4.2,
    'business': {
      'slug': 'long-shop',
      'name': shop['name'],
      'province': shop['province'],
      'city': shop['city'],
    },
  };
  final variants = [
    {
      'id': 'v1',
      'label': 'Extra large, deep blue glaze',
      'sku': 'SKU-0001',
      'price': '23456789000',
      'stock': 0,
    },
    {'id': 'v2', 'label': 'Medium', 'sku': null, 'price': null, 'stock': 999},
    {
      'id': 'v3',
      'label': 'سایز ۵۲ با لعاب فیروزه‌ای',
      'sku': null,
      'price': null,
      'stock': 2,
    },
  ];
  final page = <String, Object?>{'page': 1, 'totalPages': 1};
  return switch (path) {
    '/trademaster/shops' => (
      200,
      {
        'data': {
          ...page,
          'items': [
            shop,
            {
              ...shop,
              'id': 's2',
              'hasCover': false,
              'coverUrl': null,
              'featured': false,
              'kinds': ['SERVICE'],
              'distanceKm': null,
              'address': null,
            },
          ],
          'total': 1234567,
        },
      },
    ),
    '/trademaster/map' => (
      200,
      {
        'data': {
          'items': [
            shop,
            {...shop, 'id': 's2', 'latitude': 36.3, 'longitude': 50.05},
          ],
          'total': 2,
          'truncated': true,
          'radiusKm': null,
          'nearestKm': null,
        },
      },
    ),
    '/trademaster/shops/long-shop' => (200, {'data': shop}),
    '/trademaster/shops/missing' => (404, {'success': false, 'message': 'x'}),
    '/trademaster/products' => (
      200,
      {
        'data': {
          ...page,
          'items': [
            product,
            {
              ...product,
              'id': 'p2',
              'kind': 'SERVICE',
              'available': true,
              'negotiable': false,
              'coverUrl': null,
            },
            {...product, 'id': 'p3', 'available': false, 'distanceKm': null},
          ],
          'total': 1234567,
        },
      },
    ),
    '/trademaster/products/long-shop/long-product' => (
      200,
      {
        'data': {
          ...product,
          'description': '$long $long $long',
          'views': 1234567,
          'images': [
            for (var i = 0; i < 6; i++)
              {
                'id': 'i$i',
                'caption': i == 0 ? long : null,
                'url': '/trademaster/products/images/i$i',
              },
          ],
          'variants': variants,
          'shop': {
            'id': 's1',
            'slug': 'long-shop',
            'name': shop['name'],
            'summary': long,
            'province': shop['province'],
            'city': shop['city'],
            'phone': shop['phone'],
            'email': shop['email'],
            'logoUrl': null,
          },
        },
      },
    ),
    '/trademaster/facets' => (
      200,
      {
        'data': {
          'provinces': ['قزوین', 'سیستان و بلوچستان'],
          'industries': ['صنایع دستی'],
        },
      },
    ),
    '/trademaster/business-categories' => (
      200,
      {
        'data': [
          {
            'id': 'bc1',
            'slug': 'crafts',
            'name': 'هنرهای سنتی و صنایع دستی',
            'parentId': null,
            'shopCount': 1234,
          },
          {
            'id': 'bc2',
            'slug': 'pottery',
            'name': 'صنایع دستی، سفال، سرامیک و هنرهای سنتی',
            'parentId': 'bc1',
            'shopCount': 0,
          },
        ],
      },
    ),
    '/trademaster/categories' => (
      200,
      {
        'data': [
          {
            'id': 'pc1',
            'slug': 'home',
            'name': 'خانه و آشپزخانه',
            'kind': 'PRODUCT',
            'parentId': null,
            'productCount': 12,
          },
          {
            'id': 'pc2',
            'slug': 'pottery',
            'name': 'ظروف سفالی و سرامیکی دست‌ساز',
            'kind': 'PRODUCT',
            'parentId': 'pc1',
            'productCount': 3,
          },
          {
            'id': 'pc3',
            'slug': 'repair',
            'name': 'تعمیر و مرمت',
            'kind': 'SERVICE',
            'parentId': null,
            'productCount': 0,
          },
        ],
      },
    ),
    // The owner's pictures load through the sign-in; the audit's server has
    // none to give, so the owner's shops and listings come without them.
    '/trademaster/me/shops' => (
      200,
      {
        'data': [
          {
            ...shop,
            'moderationStatus': 'APPROVED',
            'state': 'OPEN',
            'reviewNote': null,
            'logoUrl': null,
            'coverUrl': null,
            'businessCategoryId': 'bc2',
          },
          {
            ...shop,
            'id': 's3',
            'moderationStatus': 'CHANGES_REQUESTED',
            'state': 'OPEN',
            'reviewNote': '$long $long',
            'logoUrl': null,
            'coverUrl': null,
            'businessCategoryId': null,
            'featured': false,
          },
          {
            ...shop,
            'id': 's4',
            'moderationStatus': 'APPROVED',
            'state': 'CLOSED',
            'reviewNote': null,
            'logoUrl': null,
            'coverUrl': null,
            'businessCategoryId': 'bc2',
          },
        ],
      },
    ),
    '/trademaster/me/shops/s1' => (
      200,
      {
        'data': {
          ...shop,
          'businessCategoryId': 'bc2',
          'moderationStatus': 'DRAFT',
          'state': 'OPEN',
          'reviewNote': null,
          'logoUrl': null,
          'coverUrl': null,
        },
      },
    ),
    '/trademaster/me/shops/s1/products' => (
      200,
      {
        'data': [
          {
            ...product,
            'description': long,
            'categoryId': 'pc2',
            'moderationStatus': 'APPROVED',
            'state': 'OPEN',
            'reviewNote': null,
            'views': 1234567,
            'images': <Object>[],
            'variants': variants,
            'imageCount': 0,
            'variantCount': 3,
            'createdAt': '2026-10-01T00:00:00Z',
          },
          {
            ...product,
            'id': 'p4',
            'kind': 'SERVICE',
            'description': null,
            'categoryId': null,
            'moderationStatus': 'CHANGES_REQUESTED',
            'state': 'CLOSED',
            'reviewNote': '$long $long',
            'views': 0,
            'publishedAt': null,
            'images': <Object>[],
            'variants': <Object>[],
            'imageCount': 0,
            'variantCount': 0,
            'available': false,
            'createdAt': '2026-10-01T00:00:00Z',
          },
        ],
      },
    ),
    _ => null,
  };
}
