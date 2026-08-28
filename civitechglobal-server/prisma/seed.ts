import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { hashPassword } from '../src/utils/password.js';
import { generateSecurePassword } from '../src/utils/passwordPolicy.js';

const prisma = new PrismaClient();

function emailHash(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

const SUPER_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@civitechglobal.com';

const ALL_PERMISSIONS = ['leads', 'users', 'analytics'];

const INSURANCE_CATEGORIES: Array<{ title: string; emoji: string; subcategories: string[] }> = [
  {
    title: 'بیمه شخص ثالث',
    emoji: '🚗',
    subcategories: ['شخص ثالث خودرو', 'شخص ثالث موتورسیکلت', 'مازاد شخص ثالث'],
  },
  {
    title: 'بیمه بدنه',
    emoji: '🛡️',
    subcategories: ['بدنه خودرو سواری', 'بدنه موتورسیکلت', 'بدنه خودروهای سنگین'],
  },
  {
    title: 'بیمه عمر',
    emoji: '👨‍👩‍👧‍👦',
    subcategories: ['عمر و سرمایه‌گذاری', 'عمر گروهی', 'عمر مانده بدهکار', 'عمر و تأمین آتیه فرزندان'],
  },
  {
    title: 'بیمه درمان',
    emoji: '❤️',
    subcategories: ['درمان تکمیلی انفرادی', 'درمان تکمیلی خانواده', 'درمان تکمیلی شرکتی'],
  },
  {
    title: 'بیمه مسئولیت',
    emoji: '⚖️',
    subcategories: ['مسئولیت مدنی کارفرما', 'مسئولیت حرفه‌ای پزشکان', 'مسئولیت مدیران ساختمان'],
  },
  {
    title: 'بیمه آتش‌سوزی',
    emoji: '🏠',
    subcategories: ['آتش‌سوزی مسکونی', 'آتش‌سوزی اداری و تجاری', 'آتش‌سوزی صنعتی'],
  },
  {
    title: 'بیمه مسافرتی',
    emoji: '✈️',
    subcategories: ['مسافرت خارجی', 'مسافرت داخلی', 'زائرین عتبات'],
  },
];

async function main(): Promise<void> {
  console.log('Seeding database...');

  // --- Super Admin -------------------------------------------------------
  const existingSuperAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });

  if (existingSuperAdmin) {
    // If SEED_ADMIN_PASSWORD is explicitly set, treat it as the source of truth
    // and reset the existing Super Admin's credentials to match. This keeps the
    // seed idempotent and self-healing when the original (often randomly
    // generated, never-persisted) password has been lost/forgotten — without
    // this, a lost password would permanently lock everyone out of /admin.
    if (process.env.SEED_ADMIN_PASSWORD) {
      const hashed = await hashPassword(process.env.SEED_ADMIN_PASSWORD);
      await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: {
          email: SUPER_ADMIN_EMAIL,
          emailHash: emailHash(SUPER_ADMIN_EMAIL),
          password: hashed,
          // Invalidate any outstanding tokens issued under the old credentials.
          tokenVersion: { increment: 1 },
        },
      });
      console.log('----------------------------------------------------------');
      console.log('  Super Admin already existed — credentials reset from env');
      console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
      console.log('----------------------------------------------------------');
    } else {
      console.log('Super Admin already exists, skipping user creation.');
    }
  } else {
    const rawPassword = process.env.SEED_ADMIN_PASSWORD || generateSecurePassword(20);
    const hashed = await hashPassword(rawPassword);

    await prisma.user.create({
      data: {
        email: SUPER_ADMIN_EMAIL,
        emailHash: emailHash(SUPER_ADMIN_EMAIL),
        username: 'superadmin',
        password: hashed,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        permissions: ALL_PERMISSIONS,
        emailVerified: true,
      },
    });

    console.log('----------------------------------------------------------');
    console.log('  Super Admin created');
    console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
    console.log(`  Password: ${rawPassword}`);
    console.log('  Save this password now — it will not be shown again.');
    console.log('----------------------------------------------------------');
  }

  // --- Insurance categories + subcategories -------------------------------
  for (const category of INSURANCE_CATEGORIES) {
    const upserted = await prisma.insuranceCategory.upsert({
      where: { title: category.title },
      update: { emoji: category.emoji },
      create: { title: category.title, emoji: category.emoji },
    });

    for (const subcategoryTitle of category.subcategories) {
      await prisma.insuranceSubcategory.upsert({
        where: { categoryId_title: { categoryId: upserted.id, title: subcategoryTitle } },
        update: {},
        create: { categoryId: upserted.id, title: subcategoryTitle },
      });
    }
  }
  console.log(`Seeded ${INSURANCE_CATEGORIES.length} insurance categories with subcategories.`);

  console.log('Seeding complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
