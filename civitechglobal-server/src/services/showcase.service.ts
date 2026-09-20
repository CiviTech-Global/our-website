import type { OrganizationKind, PartnershipType, ShowcaseProjectStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

/**
 * The company's showcase: the customers club, the partners page, and the
 * projects page.
 *
 * All three are editorial lists — somebody decides what appears, in what
 * order, and what it says — so they share one shape: a published flag, an
 * explicit display order, an optional image stored through the attachment
 * service, and a reorder that writes the whole list in one transaction.
 */

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

type StoredImage = Awaited<ReturnType<typeof storeFiles>>[number];

async function storeImage(file: IncomingFile | null): Promise<StoredImage | null> {
  return file ? ((await storeFiles([file], IMAGE_EXTENSIONS))[0] ?? null) : null;
}

/**
 * The public URL for an image, never its storage key.
 *
 * The key is swapped for the route that serves it, so it never becomes part of
 * the public contract and an unpublished row's key cannot be guessed from a
 * published one's.
 */
function imageUrl(kind: 'logo' | 'cover', id: string, storedName: string | null): string | null {
  return storedName ? `/showcase/${kind}/${id}` : null;
}

/** Writes each id its index, in one transaction. See team.service for why. */
async function assertAllKnown(found: number, ids: string[]) {
  if (found !== ids.length || new Set(ids).size !== ids.length) {
    throw new AppError('فهرست ارسالی با موارد موجود هم‌خوانی ندارد.', 400);
  }
}

// ---------------------------------------------------------------------------
// Organisations: customers and partners
// ---------------------------------------------------------------------------

export interface OrganizationInput {
  kind: OrganizationKind;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  featured?: boolean;
  active?: boolean;
  sinceYear?: number | null;
  partnershipType?: PartnershipType | null;
  testimonialQuote?: string;
  testimonialAuthor?: string;
  testimonialRole?: string;
  published?: boolean;
}

const ORG_ORDER = [
  // Featured first: "best customers" is the point of the club page, and a
  // visitor scanning a logo wall reads the top row and little else.
  { featured: 'desc' as const },
  { displayOrder: 'asc' as const },
  { createdAt: 'asc' as const },
];

/**
 * What the public pages show.
 *
 * Featured organisations lead, then current ones, then former — each group in
 * the order an admin chose. Former relationships stay listed, because "we
 * built this for them in 2022" is still true, but they are marked as such
 * rather than presented as current.
 */
export async function listPublicOrganizations(kind: OrganizationKind) {
  const rows = await prisma.showcaseOrganization.findMany({
    where: { kind, published: true },
    orderBy: [{ active: 'desc' }, ...ORG_ORDER],
    select: {
      id: true,
      name: true,
      description: true,
      industry: true,
      website: true,
      featured: true,
      active: true,
      sinceYear: true,
      partnershipType: true,
      testimonialQuote: true,
      testimonialAuthor: true,
      testimonialRole: true,
      logoStoredName: true,
      _count: { select: { projects: { where: { published: true } } } },
    },
  });

  return rows.map(({ logoStoredName, _count, ...row }) => ({
    ...row,
    logoUrl: imageUrl('logo', row.id, logoStoredName),
    projectCount: _count.projects,
  }));
}

export async function listAllOrganizations(kind?: OrganizationKind) {
  const rows = await prisma.showcaseOrganization.findMany({
    where: kind ? { kind } : {},
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { projects: true } } },
  });

  return rows.map(({ logoStoredName, logoMimeType: _m, logoOriginalName: _o, _count, ...row }) => ({
    ...row,
    logoUrl: imageUrl('logo', row.id, logoStoredName),
    projectCount: _count.projects,
  }));
}

export async function createOrganization(input: OrganizationInput, logo: IncomingFile | null) {
  const last = await prisma.showcaseOrganization.findFirst({
    where: { kind: input.kind },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });

  const stored = await storeImage(logo);
  try {
    return await prisma.showcaseOrganization.create({
      data: {
        ...normalizeOrganization(input),
        displayOrder: (last?.displayOrder ?? 0) + 1,
        logoStoredName: stored?.storedName,
        logoOriginalName: stored?.originalName,
        logoMimeType: stored?.mimeType,
      },
      select: { id: true, name: true, kind: true },
    });
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

export async function updateOrganization(
  id: string,
  input: Partial<OrganizationInput>,
  logo: IncomingFile | null,
) {
  const existing = await prisma.showcaseOrganization.findUnique({
    where: { id },
    select: { id: true, kind: true, logoStoredName: true },
  });
  if (!existing) throw new AppError('این مورد پیدا نشد.', 404);

  const stored = await storeImage(logo);
  try {
    const updated = await prisma.showcaseOrganization.update({
      where: { id },
      data: {
        ...normalizeOrganization({ kind: existing.kind, ...input }),
        ...(stored
          ? {
              logoStoredName: stored.storedName,
              logoOriginalName: stored.originalName,
              logoMimeType: stored.mimeType,
            }
          : {}),
      },
      select: { id: true, name: true, kind: true },
    });
    // Only after the row points at the new file.
    if (stored && existing.logoStoredName) await removeFile(existing.logoStoredName);
    return updated;
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

/**
 * A partnership type means nothing on a customer, so it is cleared rather
 * than stored where it would resurface if the row were ever switched back.
 */
function normalizeOrganization<T extends Partial<OrganizationInput>>(input: T): T {
  if (input.kind === 'CUSTOMER') return { ...input, partnershipType: null };
  return input;
}

export async function removeOrganization(id: string) {
  const existing = await prisma.showcaseOrganization.findUnique({
    where: { id },
    select: { logoStoredName: true },
  });
  if (!existing) throw new AppError('این مورد پیدا نشد.', 404);

  // Projects that named this client keep existing with no client: SetNull.
  await prisma.showcaseOrganization.delete({ where: { id } });
  if (existing.logoStoredName) await removeFile(existing.logoStoredName);
}

export async function reorderOrganizations(ids: string[]) {
  await assertAllKnown(await prisma.showcaseOrganization.count({ where: { id: { in: ids } } }), ids);
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.showcaseOrganization.update({ where: { id }, data: { displayOrder: index } }),
    ),
  );
}

/**
 * includeUnpublished is for the staff route only, so a logo can be checked
 * before the row it belongs to goes live.
 */
export async function getLogo(id: string, { includeUnpublished = false } = {}) {
  const row = await prisma.showcaseOrganization.findUnique({
    where: { id },
    select: { logoStoredName: true, logoMimeType: true, logoOriginalName: true, published: true },
  });
  // An unpublished organisation's logo is as private as the rest of its row:
  // an agreement not yet signed should not be discoverable by guessing an id.
  if (!row || (!row.published && !includeUnpublished) || !row.logoStoredName || !row.logoMimeType) {
    throw new AppError('تصویری پیدا نشد.', 404);
  }
  return { storedName: row.logoStoredName, mimeType: row.logoMimeType, originalName: row.logoOriginalName ?? 'logo' };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface ProjectInput {
  title: string;
  summary: string;
  description?: string;
  category?: string;
  status?: ShowcaseProjectStatus;
  technologies?: string[];
  projectUrl?: string;
  repositoryUrl?: string;
  startedAt?: Date | null;
  completedAt?: Date | null;
  clientId?: string | null;
  featured?: boolean;
  published?: boolean;
}

/** Statuses a visitor would call "current". */
const CURRENT: ShowcaseProjectStatus[] = ['PLANNING', 'IN_PROGRESS', 'MAINTAINED'];

export async function listPublicProjects(filter: 'current' | 'completed' | 'all' = 'all') {
  const status =
    filter === 'current'
      ? { in: CURRENT }
      : filter === 'completed'
        ? { in: ['LAUNCHED', 'ARCHIVED'] as ShowcaseProjectStatus[] }
        : undefined;

  const rows = await prisma.showcaseProject.findMany({
    where: { published: true, ...(status ? { status } : {}) },
    orderBy: [{ featured: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      summary: true,
      description: true,
      category: true,
      status: true,
      technologies: true,
      projectUrl: true,
      repositoryUrl: true,
      startedAt: true,
      completedAt: true,
      featured: true,
      coverStoredName: true,
      // A client is named only while their own listing is published: a
      // customer who asked to be taken off the club page has not agreed to be
      // named on a project card instead.
      client: {
        select: { id: true, name: true, website: true, published: true, logoStoredName: true },
      },
      screenshots: {
        orderBy: { displayOrder: 'asc' },
        select: { id: true, caption: true },
      },
    },
  });

  return rows.map(({ coverStoredName, client, screenshots, ...row }) => ({
    ...row,
    coverUrl: imageUrl('cover', row.id, coverStoredName),
    // The id is the URL: the storage key never becomes part of the public
    // contract, as with every other image here.
    screenshots: screenshots.map((shot) => ({
      id: shot.id,
      caption: shot.caption,
      url: `/showcase/shot/${shot.id}`,
    })),
    client:
      client?.published
        ? {
            id: client.id,
            name: client.name,
            website: client.website,
            logoUrl: imageUrl('logo', client.id, client.logoStoredName),
          }
        : null,
  }));
}

export async function listAllProjects() {
  const rows = await prisma.showcaseProject.findMany({
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      client: { select: { id: true, name: true, kind: true } },
      screenshots: { orderBy: { displayOrder: 'asc' }, select: { id: true, caption: true } },
    },
  });
  return rows.map(({ coverStoredName, coverMimeType: _m, coverOriginalName: _o, screenshots, ...row }) => ({
    ...row,
    coverUrl: imageUrl('cover', row.id, coverStoredName),
    // The staff route, which also serves an unpublished project's gallery.
    screenshots: screenshots.map((shot) => ({
      id: shot.id,
      caption: shot.caption,
      url: `/showcase/admin/shot/${shot.id}`,
    })),
  }));
}

async function assertClient(clientId: string | null | undefined) {
  if (!clientId) return;
  const found = await prisma.showcaseOrganization.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!found) throw new AppError('مشتری انتخاب‌شده پیدا نشد.', 400);
}

function assertDates(input: Partial<ProjectInput>) {
  if (input.startedAt && input.completedAt && input.completedAt < input.startedAt) {
    throw new AppError('تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد.', 400);
  }
}

export async function createProject(input: ProjectInput, cover: IncomingFile | null) {
  await assertClient(input.clientId);
  assertDates(input);

  const last = await prisma.showcaseProject.findFirst({
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });

  const stored = await storeImage(cover);
  try {
    return await prisma.showcaseProject.create({
      data: {
        ...input,
        displayOrder: (last?.displayOrder ?? 0) + 1,
        coverStoredName: stored?.storedName,
        coverOriginalName: stored?.originalName,
        coverMimeType: stored?.mimeType,
      },
      select: { id: true, title: true },
    });
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

export async function updateProject(id: string, input: Partial<ProjectInput>, cover: IncomingFile | null) {
  const existing = await prisma.showcaseProject.findUnique({
    where: { id },
    select: { coverStoredName: true, startedAt: true, completedAt: true },
  });
  if (!existing) throw new AppError('این پروژه پیدا نشد.', 404);
  await assertClient(input.clientId);
  // Checked against the stored value for whichever end is not being changed.
  assertDates({
    startedAt: input.startedAt === undefined ? existing.startedAt : input.startedAt,
    completedAt: input.completedAt === undefined ? existing.completedAt : input.completedAt,
  });

  const stored = await storeImage(cover);
  try {
    const updated = await prisma.showcaseProject.update({
      where: { id },
      data: {
        ...input,
        ...(stored
          ? {
              coverStoredName: stored.storedName,
              coverOriginalName: stored.originalName,
              coverMimeType: stored.mimeType,
            }
          : {}),
      },
      select: { id: true, title: true },
    });
    if (stored && existing.coverStoredName) await removeFile(existing.coverStoredName);
    return updated;
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

export async function removeProject(id: string) {
  const existing = await prisma.showcaseProject.findUnique({
    where: { id },
    select: { coverStoredName: true },
  });
  if (!existing) throw new AppError('این پروژه پیدا نشد.', 404);
  await prisma.showcaseProject.delete({ where: { id } });
  if (existing.coverStoredName) await removeFile(existing.coverStoredName);
}

export async function reorderProjects(ids: string[]) {
  await assertAllKnown(await prisma.showcaseProject.count({ where: { id: { in: ids } } }), ids);
  await prisma.$transaction(
    ids.map((id, index) => prisma.showcaseProject.update({ where: { id }, data: { displayOrder: index } })),
  );
}

export async function getCover(id: string, { includeUnpublished = false } = {}) {
  const row = await prisma.showcaseProject.findUnique({
    where: { id },
    select: { coverStoredName: true, coverMimeType: true, coverOriginalName: true, published: true },
  });
  if (!row || (!row.published && !includeUnpublished) || !row.coverStoredName || !row.coverMimeType) {
    throw new AppError('تصویری پیدا نشد.', 404);
  }
  return { storedName: row.coverStoredName, mimeType: row.coverMimeType, originalName: row.coverOriginalName ?? 'cover' };
}

// ---------------------------------------------------------------------------
// Project screenshots
// ---------------------------------------------------------------------------

/**
 * The gallery on a project.
 *
 * Separate from the cover because they do different jobs: the cover
 * identifies the project in a grid, these show what it actually looks like,
 * and there is no useful limit of one.
 */
const MAX_SHOTS = 12;

export async function addScreenshots(
  projectId: string,
  files: IncomingFile[],
  captions: Array<string | null> = []
) {
  const project = await prisma.showcaseProject.findUnique({
    where: { id: projectId },
    select: { id: true, _count: { select: { screenshots: true } } },
  });
  if (!project) throw new AppError('این پروژه پیدا نشد.', 404);

  if (project._count.screenshots + files.length > MAX_SHOTS) {
    throw new AppError(`حداکثر ${MAX_SHOTS} تصویر برای هر پروژه می‌توانید اضافه کنید.`, 400);
  }

  const stored = await storeFiles(files, IMAGE_EXTENSIONS);
  const last = await prisma.showcaseProjectShot.findFirst({
    where: { projectId },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });

  try {
    await prisma.showcaseProjectShot.createMany({
      data: stored.map((file, index) => ({
        projectId,
        storedName: file.storedName,
        originalName: file.originalName,
        mimeType: file.mimeType,
        caption: captions[index]?.trim() || null,
        displayOrder: (last?.displayOrder ?? 0) + index + 1,
      })),
    });
  } catch (error) {
    // Nothing references the files yet; an orphan in storage is invisible.
    for (const file of stored) await removeFile(file.storedName);
    throw error;
  }

  return { added: stored.length };
}

export async function removeScreenshot(id: string) {
  const shot = await prisma.showcaseProjectShot.findUnique({
    where: { id },
    select: { storedName: true },
  });
  if (!shot) throw new AppError('این تصویر پیدا نشد.', 404);

  await prisma.showcaseProjectShot.delete({ where: { id } });
  await removeFile(shot.storedName);
  return { ok: true };
}

export async function reorderScreenshots(projectId: string, ids: string[]) {
  const found = await prisma.showcaseProjectShot.count({ where: { id: { in: ids }, projectId } });
  if (found !== ids.length || new Set(ids).size !== ids.length) {
    throw new AppError('فهرست ارسالی با موارد موجود هم‌خوانی ندارد.', 400);
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.showcaseProjectShot.update({ where: { id }, data: { displayOrder: index + 1 } })
    )
  );
  return { ok: true };
}

/**
 * The bytes of one screenshot.
 *
 * An unpublished project's gallery is as private as the rest of its row;
 * includeUnpublished is for the staff route, where the pictures have to be
 * checked before anybody agrees to publish them.
 */
export async function getScreenshot(id: string, { includeUnpublished = false } = {}) {
  const row = await prisma.showcaseProjectShot.findUnique({
    where: { id },
    select: {
      storedName: true,
      mimeType: true,
      originalName: true,
      project: { select: { published: true } },
    },
  });
  if (!row || (!row.project.published && !includeUnpublished)) {
    throw new AppError('این تصویر پیدا نشد.', 404);
  }
  return { storedName: row.storedName, mimeType: row.mimeType, originalName: row.originalName ?? 'shot' };
}
