import { prisma } from '../../config/database.js';
import { generateTrackingCode } from '../insurance-request.service.js';
import { emailLookupHash } from '../auth.service.js';
import type { DemoManifest } from './manifest.js';

/**
 * Demo data for the rest of the site.
 *
 * Aimed at the screens rather than at the tables: the point is that somebody
 * opening the site sees every list populated, every queue with something in it,
 * and every empty state replaced by the thing it is a placeholder for. So each
 * intake gets a spread of statuses rather than five identical NEW rows — a
 * queue where everything is pending shows one state of one screen.
 *
 * Insurance products and categories are NOT seeded here. Those come from the
 * real seeder (seed.ts) because they are the company's actual catalogue, not
 * demonstration data, and a teardown must never remove them.
 */

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

export async function seedSite(manifest: DemoManifest) {
  const counts = {
    contactMessages: 0,
    insuranceRequests: 0,
    consultations: 0,
    experts: 0,
    team: 0,
    showcase: 0,
    books: 0,
    jobs: 0,
    freelance: 0,
  };

  // ---- contact messages ---------------------------------------------------
  const MESSAGES = [
    { name: 'مریم رضایی', subject: 'درخواست همکاری', status: 'OPEN' as const, days: 1 },
    { name: 'حسین کاظمی', subject: 'سؤال دربارهٔ بیمهٔ مسئولیت', status: 'OPEN' as const, days: 2 },
    { name: 'Sara Ahmadi', subject: 'Request for a quote', status: 'ANSWERED' as const, days: 5 },
    { name: 'علی نوری', subject: 'پیگیری سفارش قبلی', status: 'CLOSED' as const, days: 12 },
  ];

  for (const message of MESSAGES) {
    const email = `${message.name.replace(/\s+/g, '.').toLowerCase()}@demo.invalid`;
    const row = await prisma.contactMessage.create({
      data: {
        trackingCode: generateTrackingCode(),
        name: message.name,
        email,
        emailHash: emailLookupHash(email),
        subject: message.subject,
        message:
          'این یک پیام نمونه است تا شکل صفحهٔ پیام‌ها و صف پاسخ‌گویی مشخص باشد. متن آن عمداً چند خطی است.',
        status: message.status,
        createdAt: daysAgo(message.days),
      },
      select: { id: true },
    });
    await manifest.record('contactMessage', row.id);
    counts.contactMessages += 1;
  }

  // ---- insurance requests -------------------------------------------------
  // Attached to whichever product the real seeder created, so the admin screen
  // shows a real product name rather than an orphan.
  const product = await prisma.insuranceProduct.findFirst({ select: { id: true } });

  const REQUESTS = [
    { name: 'زهرا موسوی', city: 'قزوین', status: 'NEW' as const, days: 0 },
    { name: 'محمد حسینی', city: 'قزوین', status: 'NEW' as const, days: 1 },
    { name: 'فاطمه شریفی', city: 'تهران', status: 'CONTACTED' as const, days: 4 },
    { name: 'رضا عباسی', city: 'کرج', status: 'IN_PROGRESS' as const, days: 9 },
    { name: 'نرگس یزدانی', city: 'قزوین', status: 'COMPLETED' as const, days: 20 },
  ];

  for (const [index, request] of REQUESTS.entries()) {
    const row = await prisma.insuranceRequest.create({
      data: {
        trackingCode: generateTrackingCode(),
        productId: product?.id,
        fullName: request.name,
        phoneNumber: `0912000000${index}`,
        city: request.city,
        preferredContactTime: index % 2 === 0 ? 'صبح' : 'عصر',
        status: request.status,
        source: index % 3 === 0 ? 'TELEGRAM' : 'WEB',
        createdAt: daysAgo(request.days),
      },
      select: { id: true },
    });
    await manifest.record('insuranceRequest', row.id);
    counts.insuranceRequests += 1;
  }

  // ---- experts and consultations ------------------------------------------
  const EXPERTS = [
    { name: 'دکتر شیرین مرادی', headline: 'مشاور بیمه‌های درمان و عمر', slug: 'shirin-moradi' },
    { name: 'مهندس بابک احمدی', headline: 'مشاور فنی نرم‌افزار و زیرساخت', slug: 'babak-ahmadi' },
    { name: 'سمیرا قاسمی', headline: 'مشاور حقوقی قراردادها', slug: 'samira-ghasemi' },
  ];

  const expertIds: string[] = [];
  for (const [index, expert] of EXPERTS.entries()) {
    const row = await prisma.expert.create({
      data: {
        slug: expert.slug,
        fullName: expert.name,
        headline: expert.headline,
        bio: 'زیست‌نامهٔ نمونه برای نمایش صفحهٔ کارشناسان. چند جمله دربارهٔ سابقه و حوزهٔ کاری.',
        displayOrder: index,
        published: true,
      },
      select: { id: true },
    });
    await manifest.record('expert', row.id);
    expertIds.push(row.id);
    counts.experts += 1;
  }

  const CONSULTATIONS = [
    { name: 'پیمان صادقی', status: 'NEW' as const, days: 1 },
    { name: 'لیلا کریمی', status: 'CONTACTED' as const, days: 3 },
    { name: 'آرش جعفری', status: 'SCHEDULED' as const, days: 6 },
    { name: 'مینا رستمی', status: 'COMPLETED' as const, days: 15 },
  ];

  for (const [index, consultation] of CONSULTATIONS.entries()) {
    const row = await prisma.consultationRequest.create({
      data: {
        trackingCode: generateTrackingCode(),
        expertId: expertIds[index % expertIds.length],
        fullName: consultation.name,
        phoneNumber: `0935000000${index}`,
        topic: index % 2 === 0 ? 'TECHNICAL' : 'CAREER',
        preferredMode: index % 2 === 0 ? 'ONLINE' : 'PHONE',
        goal: 'پرسش نمونه برای نمایش صف مشاوره و صفحهٔ جزئیات آن.',
        status: consultation.status,
        createdAt: daysAgo(consultation.days),
      },
      select: { id: true },
    });
    await manifest.record('consultationRequest', row.id);
    counts.consultations += 1;
  }

  // ---- the team page ------------------------------------------------------
  const section = await prisma.teamSection.create({
    data: { name: 'تیم اصلی', displayOrder: 0 },
    select: { id: true },
  });
  await manifest.record('teamSection', section.id);

  const TEAM = [
    { name: 'سارا محمدی', title: 'مدیر محصول' },
    { name: 'امیر تهرانی', title: 'مهندس ارشد نرم‌افزار' },
    { name: 'نگار اسدی', title: 'طراح تجربهٔ کاربری' },
    { name: 'کاوه رحیمی', title: 'مسئول زیرساخت' },
  ];

  for (const [index, member] of TEAM.entries()) {
    const row = await prisma.teamMember.create({
      data: {
        sectionId: section.id,
        name: member.name,
        title: member.title,
        bio: 'معرفی کوتاه نمونه برای نمایش صفحهٔ تیم.',
        displayOrder: index,
        published: true,
      },
      select: { id: true },
    });
    await manifest.record('teamMember', row.id);
    counts.team += 1;
  }

  // ---- showcase -----------------------------------------------------------
  const ORGS = [
    { kind: 'CUSTOMER' as const, name: 'شرکت داده‌پردازی البرز', industry: 'فناوری اطلاعات' },
    { kind: 'CUSTOMER' as const, name: 'تعاونی کشاورزی قزوین', industry: 'کشاورزی' },
    { kind: 'PARTNER' as const, name: 'دانشگاه بین‌المللی امام خمینی', industry: 'آموزش' },
  ];

  const orgIds: string[] = [];
  for (const [index, org] of ORGS.entries()) {
    const row = await prisma.showcaseOrganization.create({
      data: {
        kind: org.kind,
        name: org.name,
        description: 'توضیح کوتاه نمونه دربارهٔ این همکاری.',
        industry: org.industry,
        displayOrder: index,
        published: true,
        active: true,
        featured: index === 0,
      },
      select: { id: true },
    });
    await manifest.record('showcaseOrganization', row.id);
    orgIds.push(row.id);
    counts.showcase += 1;
  }

  const PROJECTS = [
    { title: 'سامانهٔ مدیریت انبار', status: 'LAUNCHED' as const },
    { title: 'درگاه خدمات شهروندی', status: 'IN_PROGRESS' as const },
    { title: 'اپلیکیشن پایش کیفیت آب', status: 'MAINTAINED' as const },
  ];

  for (const [index, showcaseProject] of PROJECTS.entries()) {
    const row = await prisma.showcaseProject.create({
      data: {
        title: showcaseProject.title,
        summary: 'خلاصهٔ نمونه برای کارت پروژه در صفحهٔ نمونه‌کارها.',
        clientId: orgIds[index % orgIds.length],
        status: showcaseProject.status,
        technologies: ['TypeScript', 'PostgreSQL', 'React'],
        displayOrder: index,
        published: true,
      },
      select: { id: true },
    });
    await manifest.record('showcaseProject', row.id);
    counts.showcase += 1;
  }

  return counts;
}
