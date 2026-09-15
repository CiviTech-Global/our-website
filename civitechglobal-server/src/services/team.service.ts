import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';

/**
 * The people on the public "تیم ما" page.
 *
 * Editorial rather than derived: who appears, in what order, and what is said
 * about them are all decisions somebody makes, which is why order is an
 * explicit integer and not a sort on name or join date.
 */

export interface TeamMemberInput {
  name: string;
  title: string;
  bio?: string;
  team?: string;
  email?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  published?: boolean;
}

/** What the public page shows. No stored names — those go through the photo route. */
const PUBLIC_FIELDS = {
  id: true,
  name: true,
  title: true,
  bio: true,
  team: true,
  email: true,
  linkedin: true,
  github: true,
  website: true,
  displayOrder: true,
  photoStoredName: true,
} as const;

export async function listPublic() {
  const rows = await prisma.teamMember.findMany({
    where: { published: true },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    select: PUBLIC_FIELDS,
  });

  // The stored name is a storage key. It is swapped for the route that serves
  // the image so it never becomes part of the public contract, and so an
  // unpublished member's key cannot be guessed from a published one's.
  return rows.map(({ photoStoredName, ...member }) => ({
    ...member,
    photoUrl: photoStoredName ? `/team/photo/${member.id}` : null,
  }));
}

/** Everything, published or not, for the person deciding what the page says. */
export async function listAll() {
  const rows = await prisma.teamMember.findMany({
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return rows.map(({ photoStoredName, photoMimeType: _m, ...member }) => ({
    ...member,
    photoUrl: photoStoredName ? `/team/photo/${member.id}` : null,
  }));
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

/**
 * New members go to the end of the list.
 *
 * Appending rather than prepending: somebody added today has not earned the
 * top of the page, and putting them there silently reorders everyone else.
 */
export async function create(input: TeamMemberInput, photo: IncomingFile | null) {
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
  const known = await prisma.teamMember.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  if (known.length !== ids.length) {
    throw new AppError('فهرست ارسالی با اعضای موجود هم‌خوانی ندارد.', 400);
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.teamMember.update({ where: { id }, data: { displayOrder: index } }),
    ),
  );
}
