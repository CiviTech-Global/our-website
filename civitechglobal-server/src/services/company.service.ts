import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { toPage } from '../utils/page.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';
import { assertMarketplaceAllowed, assertVerified } from './verification.service.js';
import { PUBLIC_LISTING_WHERE } from './moderation.js';
import { slugify } from './trademaster-common.js';
import { JOB_CARD_SELECT, presentJobCards } from './job-cards.service.js';

/**
 * Company pages: who an employer is, and every role they have open.
 *
 * One per account, created by the employer and shown only while the account
 * behind it is verified, not paused, and the page is not hidden by staff. The
 * verification is the point — the page vouches for the postings on it, and an
 * unverified one would vouch for nothing.
 *
 * Postings link to the page at write time (and all of an owner's postings are
 * linked when the page is first made), so a company renaming itself renames
 * every advert at once instead of leaving them saying something else.
 */

export interface CompanyInput {
  name: string;
  tagline?: string | null;
  about?: string | null;
  industry?: string | null;
  size?: 'SIZE_1_10' | 'SIZE_11_50' | 'SIZE_51_200' | 'SIZE_201_500' | 'SIZE_501_1000' | 'SIZE_1000_PLUS' | null;
  foundedYear?: number | null;
  website?: string | null;
  province?: string | null;
  city?: string | null;
}

export interface CompanyImages {
  logo: IncomingFile | null;
  cover: IncomingFile | null;
}

/** What a company page shows of itself, and what a posting carries of it. */
export const PUBLIC_COMPANY_WHERE: Prisma.CompanyWhereInput = {
  hidden: false,
  owner: { deletedAt: null, marketplacePaused: false, verification: { status: 'APPROVED' } },
};

// The summary a job row carries, in a module of its own so job-cards can use
// it without importing this one (which imports job-cards).
export { companySummarySelect, coverUrl, logoUrl, presentCompanySummary } from './company-summary.js';
import { coverUrl, logoUrl } from './company-summary.js';

async function storeImage(file: IncomingFile | null) {
  return file ? ((await storeFiles([file], IMAGE_EXTENSIONS))[0] ?? null) : null;
}

/**
 * A slug nobody else has: the name's own, then numbered.
 *
 * Persian letters are kept — slugify keeps any script — so a company called
 * «رایان تمدن» is reachable as itself rather than as a transliteration.
 */
async function freeSlug(name: string): Promise<string> {
  const base = slugify(name) || 'company';
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await prisma.company.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function getOwnCompany(userId: string) {
  const company = await prisma.company.findUnique({
    where: { ownerId: userId },
    include: { _count: { select: { jobs: true } } },
  });
  if (!company) return null;
  const { logoStoredName, coverStoredName, ...rest } = company;
  return {
    ...rest,
    logoUrl: logoUrl(company.id, logoStoredName),
    coverUrl: coverUrl(company.id, coverStoredName),
  };
}

/**
 * Create or update the account's company page.
 *
 * One call for both, because there is one page per account and the form is
 * the same either way. The slug is set once and does not follow later
 * renames: links people shared should keep working.
 */
export async function saveOwnCompany(userId: string, input: CompanyInput, images: CompanyImages) {
  await assertVerified(userId);
  await assertMarketplaceAllowed(userId);

  const existing = await prisma.company.findUnique({
    where: { ownerId: userId },
    select: { id: true, logoStoredName: true, coverStoredName: true },
  });

  const logo = await storeImage(images.logo);
  const cover = await storeImage(images.cover);
  const imageData = {
    ...(logo
      ? { logoStoredName: logo.storedName, logoOriginalName: logo.originalName, logoMimeType: logo.mimeType }
      : {}),
    ...(cover
      ? { coverStoredName: cover.storedName, coverOriginalName: cover.originalName, coverMimeType: cover.mimeType }
      : {}),
  };

  try {
    const saved = existing
      ? await prisma.company.update({
          where: { id: existing.id },
          data: { ...input, ...imageData },
          select: { id: true, slug: true },
        })
      : await prisma.company.create({
          data: { ...input, ...imageData, ownerId: userId, slug: await freeSlug(input.name) },
          select: { id: true, slug: true },
        });

    if (!existing) {
      // Everything the owner already posted now belongs to the page.
      await prisma.jobPost.updateMany({ where: { authorId: userId, companyId: null }, data: { companyId: saved.id } });
    }

    if (logo && existing?.logoStoredName) await removeFile(existing.logoStoredName);
    if (cover && existing?.coverStoredName) await removeFile(existing.coverStoredName);
    return saved;
  } catch (error) {
    if (logo) await removeFile(logo.storedName);
    if (cover) await removeFile(cover.storedName);
    throw error;
  }
}

/**
 * How quickly an employer answers, from what applicants have seen happen.
 *
 * "Answered" means the employer opened the application or moved it to a
 * stage. Counted over the last six months, and only over applications at
 * least three days old, so a burst of fresh ones does not make a prompt
 * employer look slow. Fewer than three is not a sample, and says nothing.
 */
export async function employerResponsiveness(authorId: string) {
  const since = new Date(Date.now() - 180 * 86_400_000);
  const settled = new Date(Date.now() - 3 * 86_400_000);
  const where: Prisma.JobApplicationWhereInput = {
    job: { authorId },
    moderationStatus: 'APPROVED',
    outcome: { not: 'WITHDRAWN' },
    createdAt: { gte: since, lte: settled },
  };

  const [total, answered] = await Promise.all([
    prisma.jobApplication.count({ where }),
    prisma.jobApplication.count({
      where: { ...where, OR: [{ employerSeenAt: { not: null } }, { outcome: { not: 'PENDING' } }] },
    }),
  ]);

  if (total < 3) return { rate: null, sample: total, responsive: false };
  const rate = answered / total;
  return { rate: Math.round(rate * 100) / 100, sample: total, responsive: rate >= 0.8 };
}

export interface CompanyQuery {
  page: number;
  pageSize: number;
  search?: string;
  industry?: string;
  province?: string;
}

/** The directory of companies, those with open roles first. */
export async function listCompanies(query: CompanyQuery) {
  const where: Prisma.CompanyWhereInput = {
    AND: [
      PUBLIC_COMPANY_WHERE,
      query.industry ? { industry: query.industry } : {},
      query.province ? { province: query.province } : {},
      query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { tagline: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {},
    ],
  };

  const openJobs = { where: { ...PUBLIC_LISTING_WHERE } };
  const [rows, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: [{ jobs: { _count: 'desc' } }, { name: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        industry: true,
        size: true,
        province: true,
        city: true,
        logoStoredName: true,
        _count: { select: { jobs: openJobs } },
      },
    }),
    prisma.company.count({ where }),
  ]);

  const items = rows.map(({ logoStoredName, _count, ...row }) => ({
    ...row,
    logoUrl: logoUrl(row.id, logoStoredName),
    openJobs: _count.jobs,
  }));
  return toPage(items, total, query.page, query.pageSize);
}

/** One company's public page: the company, its open roles, how it answers. */
export async function getPublicCompany(slug: string) {
  const company = await prisma.company.findFirst({
    where: { slug, ...PUBLIC_COMPANY_WHERE },
    select: {
      id: true,
      ownerId: true,
      slug: true,
      name: true,
      tagline: true,
      about: true,
      industry: true,
      size: true,
      foundedYear: true,
      website: true,
      province: true,
      city: true,
      logoStoredName: true,
      coverStoredName: true,
      createdAt: true,
    },
  });
  if (!company) throw new AppError('این شرکت پیدا نشد.', 404);

  const [jobs, responsiveness, hired] = await Promise.all([
    prisma.jobPost.findMany({
      where: {
        companyId: company.id,
        ...PUBLIC_LISTING_WHERE,
        OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
      },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      take: 50,
      select: JOB_CARD_SELECT,
    }),
    employerResponsiveness(company.ownerId),
    prisma.jobApplication.count({ where: { job: { companyId: company.id }, outcome: 'ACCEPTED' } }),
  ]);

  const { ownerId: _owner, logoStoredName, coverStoredName, ...rest } = company;
  return {
    ...rest,
    logoUrl: logoUrl(company.id, logoStoredName),
    coverUrl: coverUrl(company.id, coverStoredName),
    jobs: await presentJobCards(jobs),
    responsiveness,
    hiredCount: hired,
  };
}

/** A company picture, for anybody, while the page itself is public. */
export async function getCompanyImage(id: string, which: 'logo' | 'cover') {
  const company = await prisma.company.findFirst({
    where: { id, ...PUBLIC_COMPANY_WHERE },
    select: {
      logoStoredName: true,
      logoOriginalName: true,
      logoMimeType: true,
      coverStoredName: true,
      coverOriginalName: true,
      coverMimeType: true,
    },
  });
  const storedName = which === 'logo' ? company?.logoStoredName : company?.coverStoredName;
  const originalName = which === 'logo' ? company?.logoOriginalName : company?.coverOriginalName;
  const mimeType = which === 'logo' ? company?.logoMimeType : company?.coverMimeType;
  if (!storedName || !originalName || !mimeType) throw new AppError('تصویری پیدا نشد.', 404);
  return { storedName, originalName, mimeType };
}

/** The owner's own pictures, which they see even while the page is not public. */
export async function getOwnCompanyImage(userId: string, which: 'logo' | 'cover') {
  const company = await prisma.company.findUnique({
    where: { ownerId: userId },
    select: {
      logoStoredName: true,
      logoOriginalName: true,
      logoMimeType: true,
      coverStoredName: true,
      coverOriginalName: true,
      coverMimeType: true,
    },
  });
  const storedName = which === 'logo' ? company?.logoStoredName : company?.coverStoredName;
  const originalName = which === 'logo' ? company?.logoOriginalName : company?.coverOriginalName;
  const mimeType = which === 'logo' ? company?.logoMimeType : company?.coverMimeType;
  if (!storedName || !originalName || !mimeType) throw new AppError('تصویری پیدا نشد.', 404);
  return { storedName, originalName, mimeType };
}

/** Staff take a page down, or put it back. The owner keeps editing it either way. */
export async function setCompanyHidden(id: string, hidden: boolean) {
  const company = await prisma.company.findUnique({ where: { id }, select: { id: true } });
  if (!company) throw new AppError('این شرکت پیدا نشد.', 404);
  return prisma.company.update({ where: { id }, data: { hidden }, select: { id: true, hidden: true } });
}

/** The staff list, hidden pages included. */
export async function listCompaniesForStaff(query: { page: number; pageSize: number; search?: string }) {
  const where: Prisma.CompanyWhereInput = query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { slug: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : {};
  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        hidden: true,
        createdAt: true,
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: { select: { jobs: true } },
      },
    }),
    prisma.company.count({ where }),
  ]);
  return toPage(items, total, query.page, query.pageSize);
}
