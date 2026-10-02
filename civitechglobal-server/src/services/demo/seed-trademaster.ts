import { prisma } from '../../config/database.js';
import { hashPassword } from '../../utils/password.js';
import { emailLookupHash } from '../auth.service.js';
import { generateTrackingCode } from '../insurance-request.service.js';
import { IMAGE_EXTENSIONS, storeFiles } from '../attachment.service.js';
import { slugify } from '../trademaster-common.js';
import { placeholderPng } from './placeholder-image.js';
import type { DemoManifest } from './manifest.js';

/**
 * Demo shops and products, in Qazvin.
 *
 * Coordinates are real places in Qazvin city, scattered over a couple of
 * kilometres, so the map has something honest to draw and "shops near me"
 * returns a sensible spread rather than a single pin or a cluster on one
 * rooftop.
 *
 * Every shop is APPROVED and OPEN. A demo full of drafts would show the review
 * queue and an empty public board, which is the opposite of what somebody
 * looking at the site wants to see — the review queues get their own pending
 * rows further down instead.
 */

/** Qazvin city centre, near the Grand Hotel. */
const QAZVIN = { latitude: 36.2688, longitude: 50.0041 };

/**
 * Scattered around the centre rather than randomised.
 *
 * Fixed offsets mean two runs of the seeder put the same shop in the same
 * place, so a screenshot taken today matches one taken next week.
 */
const SHOPS = [
  {
    name: 'سفال و سرامیک البرز',
    summary: 'ظروف سفالی دست‌ساز، لعاب‌دار و بدون لعاب، ساخت کارگاه خودمان در قزوین.',
    industry: 'صنایع دستی',
    offset: { lat: 0.004, lng: 0.006 },
    address: 'قزوین، خیابان فردوسی، نبش کوچه دوازدهم',
    phone: '02833221100',
  },
  {
    name: 'کتاب‌فروشی مینودر',
    summary: 'کتاب‌های تازه و دست‌دوم، با تمرکز بر تاریخ و ادبیات ایران.',
    industry: 'کتاب و نشر',
    offset: { lat: -0.003, lng: 0.002 },
    address: 'قزوین، بلوار مینودر، مجتمع تجاری نگین',
    phone: '02833445566',
  },
  {
    name: 'شیرینی قزوین',
    summary: 'باقلوا، نان چای و شیرینی سنتی قزوینی، پخت روزانه.',
    industry: 'مواد غذایی',
    offset: { lat: 0.002, lng: -0.005 },
    address: 'قزوین، خیابان سپه، روبه‌روی بازار',
    phone: '02833778899',
  },
  {
    name: 'ابزار و یراق کاسپین',
    summary: 'ابزار دستی و برقی، یراق‌آلات ساختمانی و لوازم جانبی.',
    industry: 'ابزار و ساختمان',
    offset: { lat: -0.006, lng: -0.003 },
    address: 'قزوین، خیابان طالقانی، پاساژ کاسپین',
    phone: '02833112233',
  },
  {
    name: 'گل و گیاه الوند',
    summary: 'گیاهان آپارتمانی، خاک و کود، و سفارش گل برای مراسم.',
    industry: 'گل و گیاه',
    offset: { lat: 0.007, lng: -0.001 },
    // No street address on purpose: a shop that only delivers has none, and the
    // UI needs an example of that.
    address: null,
    phone: '02833554433',
  },
  // Three that sell work rather than things, or clothes — so the products and
  // services split, and a category with children, have something to show.
  {
    name: 'آرایشگاه مردانه نگین',
    summary: 'اصلاح مو و صورت آقایان، با نوبت‌دهی تلفنی.',
    industry: 'آرایش و پیرایش',
    offset: { lat: -0.001, lng: 0.004 },
    address: 'قزوین، خیابان نادری، کوچه ۸',
    phone: '02833667788',
  },
  {
    name: 'تعمیرگاه خودرو مینودر',
    summary: 'مکانیکی، تعویض روغن و عیب‌یابی رایانه‌ای خودروهای سواری.',
    industry: 'خدمات خودرو',
    offset: { lat: 0.009, lng: 0.01 },
    address: 'قزوین، بلوار مینودر، روبه‌روی پمپ بنزین',
    phone: '02833990011',
  },
  {
    name: 'پوشاک پاییزه',
    summary: 'لباس زمستانی و پاییزی زنانه و مردانه، دوخت داخل.',
    industry: 'پوشاک',
    offset: { lat: -0.004, lng: 0.007 },
    address: 'قزوین، خیابان پیغمبریه، پاساژ ستاره',
    phone: '02833221144',
  },
] as const;

/**
 * Products and services, as two branches. Clothing has children, so choosing
 * the parent on the board — and finding what is filed under the children —
 * can be seen working.
 */
const CATEGORIES: Array<{ slug: string; name: string; kind: 'PRODUCT' | 'SERVICE'; parent?: string }> = [
  { slug: 'handicraft', name: 'صنایع دستی', kind: 'PRODUCT' },
  { slug: 'books', name: 'کتاب', kind: 'PRODUCT' },
  { slug: 'food', name: 'مواد غذایی', kind: 'PRODUCT' },
  { slug: 'tools', name: 'ابزار', kind: 'PRODUCT' },
  { slug: 'plants', name: 'گل و گیاه', kind: 'PRODUCT' },
  { slug: 'home', name: 'خانه و آشپزخانه', kind: 'PRODUCT' },
  { slug: 'clothing', name: 'پوشاک', kind: 'PRODUCT' },
  { slug: 'clothing-coats', name: 'کت و پالتو', kind: 'PRODUCT', parent: 'clothing' },
  { slug: 'clothing-knitwear', name: 'بافتنی', kind: 'PRODUCT', parent: 'clothing' },
  { slug: 'barbershop', name: 'آرایشگاه', kind: 'SERVICE' },
  { slug: 'auto-repair', name: 'تعمیر خودرو', kind: 'SERVICE' },
  { slug: 'tailoring', name: 'خیاطی و تعمیر لباس', kind: 'SERVICE' },
];

/** Products, keyed by the index of the shop that sells them. */
const PRODUCTS: Array<{
  shop: number;
  kind?: 'PRODUCT' | 'SERVICE';
  category: string;
  title: string;
  summary: string;
  price: bigint;
  stock: number;
  variants?: Array<{ label: string; price?: bigint; stock: number }>;
}> = [
  {
    shop: 0,
    category: 'handicraft',
    title: 'کاسه سفالی لعاب فیروزه‌ای',
    summary: 'قطر ۱۸ سانتی‌متر، مناسب سرو، قابل شست‌وشو در ماشین ظرف‌شویی.',
    price: 480_000n,
    stock: 0,
    variants: [
      { label: 'کوچک', price: 380_000n, stock: 12 },
      { label: 'متوسط', stock: 7 },
      { label: 'بزرگ', price: 620_000n, stock: 0 },
    ],
  },
  {
    shop: 0,
    category: 'home',
    title: 'ست شش‌تایی لیوان سفالی',
    summary: 'شش لیوان هم‌رنگ با زیرلیوانی چوبی.',
    price: 1_250_000n,
    stock: 4,
  },
  {
    shop: 1,
    category: 'books',
    title: 'تاریخ اجتماعی قزوین',
    summary: 'چاپ دوم، جلد سخت، ۴۳۰ صفحه.',
    price: 320_000n,
    stock: 9,
  },
  {
    shop: 1,
    category: 'books',
    title: 'مجموعه اشعار نیما یوشیج',
    summary: 'چاپ تازه، کاغذ بالکی، با مقدمهٔ پژوهشی.',
    price: 410_000n,
    stock: 2,
  },
  {
    shop: 2,
    category: 'food',
    title: 'باقلوای قزوینی — جعبهٔ نیم‌کیلویی',
    summary: 'پخت روز، با پستهٔ کرمان و گلاب قمصر.',
    price: 890_000n,
    stock: 25,
  },
  {
    shop: 2,
    category: 'food',
    title: 'نان چای سنتی',
    summary: 'جعبهٔ ۴۰۰ گرمی، بدون افزودنی.',
    price: 340_000n,
    stock: 0,
  },
  {
    shop: 3,
    category: 'tools',
    title: 'دریل چکشی ۷۰۰ وات',
    summary: 'یک سال ضمانت، همراه کیف و مجموعه مته.',
    price: 4_800_000n,
    stock: 3,
    variants: [
      { label: 'بدون کیف', price: 4_300_000n, stock: 5 },
      { label: 'با کیف و مته', stock: 3 },
    ],
  },
  {
    shop: 4,
    category: 'plants',
    title: 'فیکوس بنجامین — گلدان ۲۵ سانتی',
    summary: 'ارتفاع تقریبی ۸۰ سانتی‌متر، به‌همراه راهنمای نگهداری.',
    price: 1_600_000n,
    stock: 6,
  },
  {
    shop: 5,
    kind: 'SERVICE',
    category: 'barbershop',
    title: 'اصلاح مو',
    summary: 'کوتاهی مو با قیچی یا ماشین، همراه شست‌وشو.',
    price: 350_000n,
    stock: 0,
    variants: [
      { label: 'فقط مو', stock: 0 },
      { label: 'مو و صورت', price: 500_000n, stock: 0 },
    ],
  },
  {
    shop: 5,
    kind: 'SERVICE',
    category: 'barbershop',
    title: 'اصلاح صورت با تیغ',
    summary: 'اصلاح سنتی با حولهٔ داغ و تیغ یک‌بارمصرف.',
    price: 200_000n,
    stock: 0,
  },
  {
    shop: 6,
    kind: 'SERVICE',
    category: 'auto-repair',
    title: 'تعویض روغن موتور',
    summary: 'با روغن انتخابی شما یا موجود تعمیرگاه، کمتر از نیم ساعت.',
    price: 250_000n,
    stock: 0,
  },
  {
    shop: 6,
    kind: 'SERVICE',
    category: 'auto-repair',
    title: 'عیب‌یابی رایانه‌ای',
    summary: 'اتصال دستگاه دیاگ و گزارش مکتوب ایرادهای ثبت‌شده.',
    price: 600_000n,
    stock: 0,
  },
  {
    shop: 7,
    category: 'clothing-coats',
    title: 'پالتو پشمی مردانه',
    summary: 'پشم ۷۰ درصد، آستر ساتن، دوخت داخل.',
    price: 7_900_000n,
    stock: 0,
    variants: [
      { label: 'سایز ۴۸', stock: 2 },
      { label: 'سایز ۵۰', stock: 3 },
      { label: 'سایز ۵۲', stock: 0 },
    ],
  },
  {
    shop: 7,
    category: 'clothing-knitwear',
    title: 'ژاکت بافت زنانه',
    summary: 'بافت دست، نخ اکریلیک نرم، در سه رنگ.',
    price: 1_850_000n,
    stock: 8,
  },
  {
    shop: 7,
    kind: 'SERVICE',
    category: 'tailoring',
    title: 'کوتاه کردن شلوار',
    summary: 'کوتاه کردن و دوخت لبهٔ شلوار، تحویل روز بعد.',
    price: 150_000n,
    stock: 0,
  },
];

/** A demo account. The domain is reserved by RFC 2606 and can never be real. */
async function demoUser(
  manifest: DemoManifest,
  input: { email: string; firstName: string; lastName: string; phone: string }
) {
  const user = await prisma.user.create({
    data: {
      email: input.email,
      emailHash: emailLookupHash(input.email),
      // A known, weak password on a local-only demo account. The seeder refuses
      // to run in production, so this never reaches a real deployment.
      password: await hashPassword('demo-password'),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      // Verified, so the account looks like one somebody finished setting up.
      emailVerified: true,
    },
    select: { id: true },
  });

  await manifest.record('demoUser', user.id);
  return user.id;
}

/** Verified, because a shop cannot be opened otherwise. */
async function verify(
  manifest: DemoManifest,
  userId: string,
  input: { firstName: string; lastName: string; phone: string }
) {
  const verification = await prisma.userVerification.create({
    data: {
      userId,
      kind: 'INDIVIDUAL',
      status: 'APPROVED',
      legalFirstName: input.firstName,
      legalLastName: input.lastName,
      // Structurally valid and deliberately not a real national id.
      nationalId: '0000000000',
      phone: input.phone,
      province: 'قزوین',
      city: 'قزوین',
      reviewedAt: new Date(),
    },
    select: { id: true },
  });

  await manifest.record('userVerification', verification.id);
}

/**
 * A placeholder image, recorded so teardown removes the file as well as the row.
 *
 * Without the manifest entry the rows go and the files stay: roughly a megabyte
 * per seed-and-clear cycle, referenced by nothing and collected by nothing.
 */
async function storePlaceholder(manifest: DemoManifest, seed: string) {
  const [stored] = await storeFiles(
    [{ originalName: `${slugify(seed) || 'demo'}.png`, buffer: placeholderPng(seed) }],
    IMAGE_EXTENSIONS
  );
  await manifest.record('storedFile', stored.storedName);
  return stored;
}

export async function seedTradeMaster(manifest: DemoManifest) {
  // ---- categories ---------------------------------------------------------
  const categoryIds = new Map<string, string>();

  // In order: a parent is always listed before its children above, so its id
  // is known by the time a child needs it.
  for (const [index, category] of CATEGORIES.entries()) {
    const row = await prisma.productCategory.create({
      data: {
        slug: category.slug,
        name: category.name,
        kind: category.kind,
        parentId: category.parent ? categoryIds.get(category.parent) : null,
        position: index,
      },
      select: { id: true },
    });
    await manifest.record('productCategory', row.id);
    categoryIds.set(category.slug, row.id);
  }

  // ---- shops --------------------------------------------------------------
  const shopIds: string[] = [];

  for (const [index, shop] of SHOPS.entries()) {
    const ownerEmail = `seller${index + 1}@demo.invalid`;
    const firstName = 'فروشندهٔ';
    const lastName = `نمونه ${index + 1}`;

    const ownerId = await demoUser(manifest, {
      email: ownerEmail,
      firstName,
      lastName,
      phone: shop.phone,
    });
    await verify(manifest, ownerId, { firstName, lastName, phone: shop.phone });

    const logo = await storePlaceholder(manifest, shop.name);
    const code = generateTrackingCode();

    const row = await prisma.business.create({
      data: {
        code,
        slug: `${slugify(shop.name) || 'shop'}-${index + 1}`,
        ownerId,
        name: shop.name,
        summary: shop.summary,
        industry: shop.industry,
        province: 'قزوین',
        city: 'قزوین',
        address: shop.address,
        latitude: QAZVIN.latitude + shop.offset.lat,
        longitude: QAZVIN.longitude + shop.offset.lng,
        phone: shop.phone,
        logoStoredName: logo.storedName,
        logoOriginalName: logo.originalName,
        logoMimeType: logo.mimeType,
        moderationStatus: 'APPROVED',
        state: 'OPEN',
        publishedAt: new Date(),
        // One featured shop, so the editorial ordering is visible.
        featured: index === 0,
      },
      select: { id: true },
    });

    await manifest.record('business', row.id);
    shopIds.push(row.id);
  }

  // ---- products -----------------------------------------------------------
  for (const product of PRODUCTS) {
    const image = await storePlaceholder(manifest, product.title);

    const row = await prisma.product.create({
      data: {
        code: generateTrackingCode(),
        slug: slugify(product.title) || generateTrackingCode().toLowerCase(),
        businessId: shopIds[product.shop],
        categoryId: categoryIds.get(product.category),
        kind: product.kind ?? 'PRODUCT',
        title: product.title,
        summary: product.summary,
        price: product.price,
        stock: product.stock,
        moderationStatus: 'APPROVED',
        state: 'OPEN',
        publishedAt: new Date(),
        views: 12 + product.title.length,
      },
      select: { id: true },
    });
    await manifest.record('product', row.id);

    const imageRow = await prisma.productImage.create({
      data: {
        productId: row.id,
        storedName: image.storedName,
        originalName: image.originalName,
        mimeType: image.mimeType,
        caption: product.title,
        position: 1,
      },
      select: { id: true },
    });
    await manifest.record('productImage', imageRow.id);

    for (const [position, variant] of (product.variants ?? []).entries()) {
      const variantRow = await prisma.productVariant.create({
        data: {
          productId: row.id,
          label: variant.label,
          price: variant.price,
          stock: variant.stock,
          position: position + 1,
        },
        select: { id: true },
      });
      await manifest.record('productVariant', variantRow.id);
    }
  }

  // ---- one of each pending, so the review queues are not empty -------------
  const pendingOwnerId = await demoUser(manifest, {
    email: 'seller-pending@demo.invalid',
    firstName: 'فروشندهٔ',
    lastName: 'در انتظار بررسی',
    phone: '02833000000',
  });
  await verify(manifest, pendingOwnerId, {
    firstName: 'فروشندهٔ',
    lastName: 'در انتظار بررسی',
    phone: '02833000000',
  });

  const pendingLogo = await storePlaceholder(manifest, 'نمایشگاه فرش قزوین');
  const pendingShop = await prisma.business.create({
    data: {
      code: generateTrackingCode(),
      slug: 'qazvin-carpet-demo',
      ownerId: pendingOwnerId,
      name: 'نمایشگاه فرش قزوین',
      summary: 'فرش دست‌باف و ماشینی، با امکان سفارش اندازهٔ دلخواه.',
      industry: 'فرش و منسوجات',
      province: 'قزوین',
      city: 'قزوین',
      latitude: QAZVIN.latitude - 0.001,
      longitude: QAZVIN.longitude + 0.008,
      phone: '02833000000',
      logoStoredName: pendingLogo.storedName,
      logoOriginalName: pendingLogo.originalName,
      logoMimeType: pendingLogo.mimeType,
      // Left in the queue on purpose: the review desk should have something to
      // show, and an empty queue tells a reviewer nothing about the screen.
      moderationStatus: 'PENDING_REVIEW',
    },
    select: { id: true },
  });
  await manifest.record('business', pendingShop.id);

  return {
    categories: CATEGORIES.length,
    shops: SHOPS.length + 1,
    products: PRODUCTS.length,
  };
}
