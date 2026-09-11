import 'dotenv/config';
import { PrismaClient, type Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { hashPassword } from '../src/utils/password.js';
import { generateSecurePassword } from '../src/utils/passwordPolicy.js';
import { CATALOG, CATALOG_VERSION, CATEGORIES } from '../src/insurance/catalog/index.js';
import { ALL_PERMISSIONS } from '../src/auth/permissions.js';

const prisma = new PrismaClient();

function emailHash(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

const SUPER_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@civitechglobal.com';


async function seedSuperAdmin(): Promise<void> {
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
    return;
  }

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

/**
 * Mirrors `src/insurance/catalog` into the database.
 *
 * The catalog in code is the source of truth; these rows are a read model that
 * the public API and the admin panel query. That makes the seed safe to re-run
 * on every deploy, and it is meant to be: it is how a catalog change reaches
 * production.
 *
 * Nothing is ever deleted. A product withdrawn from the catalog is deactivated
 * instead, because requests already reference it and an admin still needs to
 * read those. The same goes for the pre-refactor categories, which the
 * migration left in place and inactive.
 */
async function seedCatalog(): Promise<void> {
  const categoryIdBySlug = new Map<string, string>();

  for (const category of CATEGORIES) {
    const row = await prisma.insuranceCategory.upsert({
      where: { slug: category.slug },
      update: {
        title: category.title,
        titleEn: category.titleEn,
        emoji: category.emoji,
        icon: category.icon,
        displayOrder: category.order,
        active: true,
      },
      create: {
        slug: category.slug,
        title: category.title,
        titleEn: category.titleEn,
        emoji: category.emoji,
        icon: category.icon,
        displayOrder: category.order,
        active: true,
      },
    });
    categoryIdBySlug.set(category.slug, row.id);
  }

  for (const product of CATALOG) {
    const categoryId = categoryIdBySlug.get(product.categorySlug);
    if (!categoryId) {
      // assertCatalogIntegrity() already rules this out; belt and braces, since
      // a silent miss here would leave a product invisible on the site.
      throw new Error(`Product ${product.slug} references unknown category ${product.categorySlug}`);
    }

    const data = {
      categoryId,
      title: product.title,
      titleEn: product.titleEn,
      summary: product.summary,
      summaryEn: product.summaryEn,
      description: product.description,
      descriptionEn: product.descriptionEn,
      coverages: product.coverages,
      exclusions: product.exclusions ?? [],
      requiredDocuments: product.requiredDocuments ?? [],
      premiumFactors: product.premiumFactors ?? [],
      faq: (product.faq ?? []) as unknown as Prisma.InputJsonValue,
      keyFacts: (product.keyFacts ?? []) as unknown as Prisma.InputJsonValue,
      claimSteps: product.claimSteps ?? [],
      optionalCoverages: product.optionalCoverages ?? [],
      notes: product.notes ?? [],
      intakeMode: product.intake,
      audience: product.audience,
      icon: product.icon,
      displayOrder: product.order,
      active: true,
      formSchema: product.allFields as unknown as Prisma.InputJsonValue,
      catalogVersion: CATALOG_VERSION,
    };

    await prisma.insuranceProduct.upsert({
      where: { slug: product.slug },
      update: data,
      create: { slug: product.slug, ...data },
    });
  }

  // Withdraw anything the catalog no longer defines, without deleting it.
  const liveSlugs = CATALOG.map((p) => p.slug);
  const { count: retired } = await prisma.insuranceProduct.updateMany({
    where: { slug: { notIn: liveSlugs }, active: true },
    data: { active: false },
  });

  console.log(
    `Seeded ${CATEGORIES.length} categories and ${CATALOG.length} products ` +
      `(catalog version ${CATALOG_VERSION}).`,
  );
  if (retired > 0) console.log(`Deactivated ${retired} product(s) no longer in the catalog.`);
}

async function main(): Promise<void> {
  console.log('Seeding database...');
  await seedSuperAdmin();
  await seedCatalog();
  console.log('Seeding complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
