import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

/**
 * The club of experts.
 *
 * A curated list of people we vouch for, and the front door to consultations:
 * somebody reads a profile, decides that is who they want to talk to, and asks
 * for them by name.
 *
 * Editorial, like the team page and the customers club — every profile is
 * written by staff. `acceptsConsultations` separates the two purposes the list
 * serves: somebody can be listed for their standing without being offered as
 * an appointment.
 */

export interface ExpertInput {
  fullName: string;
  headline: string;
  slug?: string;
  bio?: string;
  specialities?: string[];
  languages?: string[];
  yearsExperience?: number | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  acceptsConsultations?: boolean;
  featured?: boolean;
  published?: boolean;
}

/** The public URL for a photo, never its storage key. See showcase.service. */
const photoUrl = (id: string, storedName: string | null): string | null =>
  storedName ? `/experts/${id}/photo` : null;

/**
 * A URL-safe slug from a name.
 *
 * Persian names transliterate badly and a machine cannot do it honestly, so a
 * name with no Latin letters falls back to a short random suffix rather than
 * producing an empty slug or a row of hyphens. Staff can always set one.
 */
function slugify(value: string): string {
  const latin = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  return latin || `expert-${Math.random().toString(36).slice(2, 8)}`;
}

/** Appends -2, -3 … until the slug is free. */
async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  let candidate = base;
  for (let attempt = 2; attempt < 50; attempt += 1) {
    const clash = await prisma.expert.findFirst({
      where: { slug: candidate, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${attempt}`;
  }
  throw new AppError('ساخت نشانی یکتا برای این کارشناس ممکن نشد.', 409);
}

function normalize(input: Partial<ExpertInput>) {
  const text = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);
  return {
    ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
    ...(input.headline !== undefined ? { headline: input.headline.trim() } : {}),
    ...(input.bio !== undefined ? { bio: text(input.bio) } : {}),
    ...(input.specialities !== undefined
      ? { specialities: input.specialities.map((s) => s.trim()).filter(Boolean) }
      : {}),
    ...(input.languages !== undefined
      ? { languages: input.languages.map((s) => s.trim()).filter(Boolean) }
      : {}),
    ...(input.yearsExperience !== undefined ? { yearsExperience: input.yearsExperience } : {}),
    ...(input.linkedinUrl !== undefined ? { linkedinUrl: text(input.linkedinUrl) } : {}),
    ...(input.githubUrl !== undefined ? { githubUrl: text(input.githubUrl) } : {}),
    ...(input.websiteUrl !== undefined ? { websiteUrl: text(input.websiteUrl) } : {}),
    ...(input.acceptsConsultations !== undefined
      ? { acceptsConsultations: input.acceptsConsultations }
      : {}),
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
  };
}

const publicFields = {
  id: true,
  slug: true,
  fullName: true,
  headline: true,
  bio: true,
  specialities: true,
  languages: true,
  yearsExperience: true,
  linkedinUrl: true,
  githubUrl: true,
  websiteUrl: true,
  acceptsConsultations: true,
  featured: true,
  photoStoredName: true,
} satisfies Prisma.ExpertSelect;

/** Featured first, then the order staff chose, then newest. */
const publicOrder: Prisma.ExpertOrderByWithRelationInput[] = [
  { featured: 'desc' },
  { displayOrder: 'asc' },
  { createdAt: 'desc' },
];

export async function listPublicExperts() {
  const rows = await prisma.expert.findMany({
    where: { published: true },
    orderBy: publicOrder,
    select: publicFields,
  });
  return rows.map(({ photoStoredName, ...row }) => ({ ...row, photoUrl: photoUrl(row.id, photoStoredName) }));
}

export async function getPublicExpert(slug: string) {
  const row = await prisma.expert.findFirst({
    where: { slug, published: true },
    select: publicFields,
  });
  if (!row) throw new AppError('این کارشناس پیدا نشد.', 404);

  const { photoStoredName, ...rest } = row;
  return { ...rest, photoUrl: photoUrl(row.id, photoStoredName) };
}

export async function listAllExperts() {
  const rows = await prisma.expert.findMany({
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    select: { ...publicFields, published: true, displayOrder: true, _count: { select: { requests: true } } },
  });
  return rows.map(({ photoStoredName, ...row }) => ({ ...row, photoUrl: photoUrl(row.id, photoStoredName) }));
}

async function storePhoto(file: IncomingFile | null) {
  return file ? ((await storeFiles([file], IMAGE_EXTENSIONS))[0] ?? null) : null;
}

export async function createExpert(input: ExpertInput, photo: IncomingFile | null) {
  const last = await prisma.expert.findFirst({
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });

  const stored = await storePhoto(photo);
  try {
    return await prisma.expert.create({
      data: {
        ...(normalize(input) as ExpertInput & { fullName: string; headline: string }),
        slug: await uniqueSlug(input.slug?.trim() || slugify(input.fullName)),
        displayOrder: (last?.displayOrder ?? 0) + 1,
        photoStoredName: stored?.storedName,
        photoOriginalName: stored?.originalName,
        photoMimeType: stored?.mimeType,
      },
      select: { id: true, slug: true, fullName: true },
    });
  } catch (error) {
    // Nothing references the file yet; an orphan in storage is invisible and
    // never collected.
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

export async function updateExpert(id: string, input: Partial<ExpertInput>, photo: IncomingFile | null) {
  const existing = await prisma.expert.findUnique({
    where: { id },
    select: { id: true, photoStoredName: true, fullName: true },
  });
  if (!existing) throw new AppError('این کارشناس پیدا نشد.', 404);

  const stored = await storePhoto(photo);
  const updated = await prisma.expert.update({
    where: { id },
    data: {
      ...normalize(input),
      ...(input.slug !== undefined && input.slug.trim()
        ? { slug: await uniqueSlug(slugify(input.slug), id) }
        : {}),
      ...(stored
        ? {
            photoStoredName: stored.storedName,
            photoOriginalName: stored.originalName,
            photoMimeType: stored.mimeType,
          }
        : {}),
    },
    select: { id: true, slug: true, fullName: true },
  });

  // Only once the row points at the new file.
  if (stored && existing.photoStoredName) await removeFile(existing.photoStoredName);
  return updated;
}

export async function deleteExpert(id: string) {
  const existing = await prisma.expert.findUnique({ where: { id }, select: { photoStoredName: true } });
  if (!existing) throw new AppError('این کارشناس پیدا نشد.', 404);

  await prisma.expert.delete({ where: { id } });
  if (existing.photoStoredName) await removeFile(existing.photoStoredName);
  return { ok: true };
}

/** Writes each id its index, in one transaction. See team.service for why. */
export async function reorderExperts(ids: string[]) {
  const found = await prisma.expert.count({ where: { id: { in: ids } } });
  if (found !== ids.length || new Set(ids).size !== ids.length) {
    throw new AppError('فهرست ارسالی با موارد موجود هم‌خوانی ندارد.', 400);
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.expert.update({ where: { id }, data: { displayOrder: index + 1 } }))
  );
  return { ok: true };
}

/**
 * The photo bytes.
 *
 * includeUnpublished is for the staff routes, where a profile has to be
 * checked before anybody agrees to publish it.
 */
export async function getPhoto(id: string, includeUnpublished = false) {
  const row = await prisma.expert.findUnique({
    where: { id },
    select: { photoStoredName: true, photoMimeType: true, photoOriginalName: true, published: true },
  });
  if (!row || (!row.published && !includeUnpublished) || !row.photoStoredName || !row.photoMimeType) {
    throw new AppError('این تصویر پیدا نشد.', 404);
  }
  return {
    storedName: row.photoStoredName,
    mimeType: row.photoMimeType,
    originalName: row.photoOriginalName ?? 'photo',
  };
}
