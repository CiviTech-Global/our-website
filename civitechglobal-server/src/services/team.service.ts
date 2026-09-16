import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

/**
 * The people on the public "تیم ما" page, and the sections they sit under.
 *
 * Editorial rather than derived: who appears, under which heading, in what
 * order, and what is said about them are all decisions somebody makes, which
 * is why order is an explicit integer and not a sort on name or join date.
 */

export interface TeamMemberInput {
  name: string;
  title: string;
  bio?: string;
  /** Null takes a member out of their section; undefined leaves it alone. */
  sectionId?: string | null;
  email?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  published?: boolean;
}

export interface TeamSectionInput {
  name: string;
  description?: string;
}

/** What the public page shows. No stored names — those go through the photo route. */
const PUBLIC_MEMBER_FIELDS = {
  id: true,
  name: true,
  title: true,
  bio: true,
  sectionId: true,
  email: true,
  linkedin: true,
  github: true,
  website: true,
  displayOrder: true,
  photoStoredName: true,
} as const;

const MEMBER_ORDER = [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }];
const SECTION_ORDER = [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }];

/**
 * The stored name is a storage key. It is swapped for the route that serves
 * the image so it never becomes part of the public contract, and so an
 * unpublished member's key cannot be guessed from a published one's.
 */
function withPhotoUrl<T extends { id: string; photoStoredName: string | null }>(row: T) {
  const { photoStoredName, ...rest } = row;
  return { ...rest, photoUrl: photoStoredName ? `/team/photo/${row.id}` : null };
}

/**
 * The page, already arranged.
 *
 * Sections in their order, each holding its published members in theirs, then
 * the members who belong to no section. A section with nobody published in it
 * is left out: an empty heading on a public page reads as a department that
 * lost everyone.
 */
export async function listPublic() {
  const [sections, members] = await Promise.all([
    prisma.teamSection.findMany({
      orderBy: SECTION_ORDER,
      select: { id: true, name: true, description: true },
    }),
    prisma.teamMember.findMany({
      where: { published: true },
      orderBy: MEMBER_ORDER,
      select: PUBLIC_MEMBER_FIELDS,
    }),
  ]);

  const shaped = members.map(withPhotoUrl);
  const known = new Set(sections.map((section) => section.id));

  return {
    sections: sections
      .map((section) => ({
        ...section,
        members: shaped.filter((member) => member.sectionId === section.id),
      }))
      .filter((section) => section.members.length > 0),
    // A member whose section id points nowhere is treated as unsectioned rather
    // than dropped — SetNull makes that impossible today, but a page that
    // silently loses a person is the wrong failure to leave open.
    unsectioned: shaped.filter((member) => !member.sectionId || !known.has(member.sectionId)),
  };
}

/** Everything, published or not, for the person deciding what the page says. */
export async function listAll() {
  const [sections, members] = await Promise.all([
    prisma.teamSection.findMany({
      orderBy: SECTION_ORDER,
      include: { _count: { select: { members: true } } },
    }),
    prisma.teamMember.findMany({ orderBy: MEMBER_ORDER }),
  ]);

  return {
    sections,
    members: members.map(({ photoMimeType: _m, photoOriginalName: _o, ...member }) =>
      withPhotoUrl(member),
    ),
  };
}

export async function getPhoto(id: string) {
  const member = await prisma.teamMember.findUnique({
    where: { id },
    select: { photoStoredName: true, photoMimeType: true, photoOriginalName: true, published: true },
  });

  if (!member?.photoStoredName || !member.photoMimeType) {
    throw new AppError('تصویری برای این عضو ثبت نشده است.', 404);
  }

  return {
    storedName: member.photoStoredName,
    mimeType: member.photoMimeType,
    originalName: member.photoOriginalName ?? 'photo',
    published: member.published,
  };
}

/** A section id from a form must name a section that exists. */
async function assertSection(sectionId: string | null | undefined) {
  if (!sectionId) return;
  const found = await prisma.teamSection.findUnique({ where: { id: sectionId }, select: { id: true } });
  if (!found) throw new AppError('این بخش پیدا نشد.', 400);
}

/**
 * New members go to the end of the list.
 *
 * Appending rather than prepending: somebody added today has not earned the
 * top of the page, and putting them there silently reorders everyone else.
 */
export async function create(input: TeamMemberInput, photo: IncomingFile | null) {
  await assertSection(input.sectionId);

  const last = await prisma.teamMember.findFirst({
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });

  const stored = photo ? (await storeFiles([photo], IMAGE_EXTENSIONS))[0] : null;

  try {
    return await prisma.teamMember.create({
      data: {
        ...input,
        displayOrder: (last?.displayOrder ?? 0) + 1,
        photoStoredName: stored?.storedName,
        photoOriginalName: stored?.originalName,
        photoMimeType: stored?.mimeType,
      },
      select: { id: true, name: true, displayOrder: true },
    });
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

export async function update(id: string, input: Partial<TeamMemberInput>, photo: IncomingFile | null) {
  const existing = await prisma.teamMember.findUnique({
    where: { id },
    select: { id: true, photoStoredName: true },
  });
  if (!existing) throw new AppError('این عضو پیدا نشد.', 404);
  await assertSection(input.sectionId);

  const stored = photo ? (await storeFiles([photo], IMAGE_EXTENSIONS))[0] : null;

  try {
    const updated = await prisma.teamMember.update({
      where: { id },
      data: {
        ...input,
        ...(stored
          ? {
              photoStoredName: stored.storedName,
              photoOriginalName: stored.originalName,
              photoMimeType: stored.mimeType,
            }
          : {}),
      },
      select: { id: true, name: true },
    });

    // Only once the row points at the new file. The other order leaves a
    // member with a photo field naming something that no longer exists.
    if (stored && existing.photoStoredName) await removeFile(existing.photoStoredName);
    return updated;
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

export async function remove(id: string) {
  const existing = await prisma.teamMember.findUnique({
    where: { id },
    select: { id: true, photoStoredName: true },
  });
  if (!existing) throw new AppError('این عضو پیدا نشد.', 404);

  await prisma.teamMember.delete({ where: { id } });

  // After the row is gone: a delete that fails must not leave a member whose
  // photograph has been removed from under them.
  if (existing.photoStoredName) await removeFile(existing.photoStoredName);
}

/**
 * Reordering, as one transaction over the whole list.
 *
 * The client sends the ids in the order it wants them and each is written its
 * index. Sending "move X to position 3" instead would need the server to
 * reason about what everything else shifts to, and two people reordering at
 * once would interleave into an order neither chose.
 */
export async function reorder(ids: string[]) {
  const known = await prisma.teamMember.count({ where: { id: { in: ids } } });
  if (known !== new Set(ids).size || known !== ids.length) {
    throw new AppError('فهرست ارسالی با اعضای موجود هم‌خوانی ندارد.', 400);
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.teamMember.update({ where: { id }, data: { displayOrder: index } })),
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function createSection(input: TeamSectionInput) {
  const last = await prisma.teamSection.findFirst({
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });
  return prisma.teamSection.create({
    data: { ...input, displayOrder: (last?.displayOrder ?? 0) + 1 },
  });
}

export async function updateSection(id: string, input: Partial<TeamSectionInput>) {
  const found = await prisma.teamSection.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new AppError('این بخش پیدا نشد.', 404);
  return prisma.teamSection.update({ where: { id }, data: input });
}

/**
 * Removes the heading, never the people under it.
 *
 * The foreign key is SetNull, so its members become unsectioned and stay on
 * the page — listed after the remaining sections — until somebody places them.
 */
export async function removeSection(id: string) {
  const found = await prisma.teamSection.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw new AppError('این بخش پیدا نشد.', 404);
  await prisma.teamSection.delete({ where: { id } });
}

export async function reorderSections(ids: string[]) {
  const known = await prisma.teamSection.count({ where: { id: { in: ids } } });
  if (known !== new Set(ids).size || known !== ids.length) {
    throw new AppError('فهرست ارسالی با بخش‌های موجود هم‌خوانی ندارد.', 400);
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.teamSection.update({ where: { id }, data: { displayOrder: index } })),
  );
}
