import type { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { IMAGE_EXTENSIONS, removeFile, storeFiles, type IncomingFile } from './attachment.service.js';
import { announceStaffAccount, createMemberAccount, type MemberAccountInput } from './accounts.service.js';
import { assertVerified } from './verification.service.js';
import { notifySafely } from './notifications.service.js';

/**
 * The club of experts.
 *
 * Somebody reads a profile, decides that is who they want to talk to, and asks
 * for them by name. Booking is never limited by plan.
 *
 * A profile reaches the club one of two ways:
 *   - staff write it, usually with a member account they open for the expert
 *     and hand over, so the expert can keep their own fee and links current;
 *   - a verified member submits their own, which waits for staff approval.
 *
 * Either way an expert who takes consultations links to where their work can
 * be read — GitHub, LinkedIn, a website — so a client can judge them before
 * asking. An hourly fee is optional: partner experts, for one, consult on
 * terms agreed between the companies rather than a public rate. No email: clients reach experts through
 * the platform, never around it.
 *
 * `acceptsConsultations` separates the two purposes the list serves: somebody
 * can be listed for their standing without being offered as an appointment.
 */

export interface ExpertInput {
  fullName: string;
  headline: string;
  /** The organisation they come from; staff only. */
  affiliation?: string | null;
  slug?: string;
  bio?: string;
  specialities?: string[];
  languages?: string[];
  yearsExperience?: number | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  /** Toman per hour; null clears it. */
  hourlyFee?: bigint | null;
  acceptsConsultations?: boolean;
  featured?: boolean;
  published?: boolean;
}

/** What an expert may change about their own profile. */
export type OwnExpertInput = Omit<ExpertInput, 'slug' | 'featured' | 'published' | 'affiliation'>;

/** The public URL for a photo, never its storage key. See showcase.service. */
const photoUrl = (id: string, storedName: string | null): string | null =>
  // The path the route is actually mounted at — the router lives under
  // /consult, and a URL that only looks right answers 404.
  storedName ? `/consult/experts/${id}/photo` : null;

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
    ...(input.affiliation !== undefined ? { affiliation: text(input.affiliation) } : {}),
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
    ...(input.hourlyFee !== undefined ? { hourlyFee: input.hourlyFee } : {}),
    ...(input.acceptsConsultations !== undefined
      ? { acceptsConsultations: input.acceptsConsultations }
      : {}),
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
    ...(input.published !== undefined ? { published: input.published } : {}),
  };
}

interface Publishable {
  published: boolean;
  acceptsConsultations: boolean;
  hourlyFee: bigint | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
}

/**
 * What a profile must have before the club shows it as bookable: at least one
 * place a client can read the expert's work. The fee may be left blank.
 */
function assertComplete(row: Publishable, context: 'publish' | 'submit') {
  if (!row.acceptsConsultations) return;
  if (context === 'publish' && !row.published) return;
  if (!row.linkedinUrl && !row.githubUrl && !row.websiteUrl) {
    throw new AppError('دست‌کم یکی از پیوندهای حرفه‌ای (لینکدین، گیت‌هاب یا وب‌سایت) لازم است.', 400);
  }
}

const publicFields = {
  id: true,
  slug: true,
  fullName: true,
  headline: true,
  affiliation: true,
  bio: true,
  specialities: true,
  languages: true,
  yearsExperience: true,
  linkedinUrl: true,
  githubUrl: true,
  websiteUrl: true,
  hourlyFee: true,
  feeCurrency: true,
  acceptsConsultations: true,
  featured: true,
  photoStoredName: true,
  user: { select: { username: true } },
} satisfies Prisma.ExpertSelect;

type PublicRow = Prisma.ExpertGetPayload<{ select: typeof publicFields }>;

/** BigInt does not survive JSON; the photo goes out as a URL, never a key. */
function present<T extends PublicRow>({ photoStoredName, hourlyFee, user, ...row }: T) {
  return {
    ...row,
    hourlyFee: hourlyFee === null ? null : hourlyFee.toString(),
    /** The expert's member profile, where their other work on the site is. */
    username: user?.username ?? null,
    photoUrl: photoUrl(row.id, photoStoredName),
  };
}

const PUBLIC_WHERE: Prisma.ExpertWhereInput = { published: true, moderationStatus: 'APPROVED' };

/** Featured first, then the order staff chose, then newest. */
const publicOrder: Prisma.ExpertOrderByWithRelationInput[] = [
  { featured: 'desc' },
  { displayOrder: 'asc' },
  { createdAt: 'desc' },
];

export async function listPublicExperts() {
  const rows = await prisma.expert.findMany({ where: PUBLIC_WHERE, orderBy: publicOrder, select: publicFields });
  return rows.map(present);
}

export async function getPublicExpert(slug: string) {
  const row = await prisma.expert.findFirst({ where: { slug, ...PUBLIC_WHERE }, select: publicFields });
  if (!row) throw new AppError('این کارشناس پیدا نشد.', 404);
  return present(row);
}

export async function listAllExperts() {
  const rows = await prisma.expert.findMany({
    orderBy: [{ moderationStatus: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
    select: {
      ...publicFields,
      published: true,
      displayOrder: true,
      moderationStatus: true,
      reviewNote: true,
      user: { select: { id: true, username: true, email: true, staffVouchedAt: true } },
      _count: { select: { requests: true } },
    },
  });
  return rows.map((row) => ({
    ...present(row),
    published: row.published,
    displayOrder: row.displayOrder,
    moderationStatus: row.moderationStatus,
    reviewNote: row.reviewNote,
    account: row.user ? { id: row.user.id, username: row.user.username, email: row.user.email } : null,
    _count: row._count,
  }));
}

async function storePhoto(file: IncomingFile | null) {
  return file ? ((await storeFiles([file], IMAGE_EXTENSIONS))[0] ?? null) : null;
}

function photoData(stored: Awaited<ReturnType<typeof storePhoto>>) {
  return stored
    ? { photoStoredName: stored.storedName, photoOriginalName: stored.originalName, photoMimeType: stored.mimeType }
    : {};
}

/** First and last name from one "full name" field, for the account staff open. */
function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] ?? fullName, lastName: parts.slice(1).join(' ') || parts[0] || fullName };
}

export type ExpertAccountInput = Omit<MemberAccountInput, 'firstName' | 'lastName'> & {
  firstName?: string;
  lastName?: string;
};

/**
 * Staff create a profile, optionally with a member account for the expert.
 *
 * With an account, the expert signs in with the credentials staff hand over
 * and keeps their own fee and links current from their dashboard.
 */
export async function createExpert(
  input: ExpertInput,
  photo: IncomingFile | null,
  options: { staffId?: string; account?: ExpertAccountInput } = {},
) {
  const data = normalize(input) as ExpertInput & { fullName: string; headline: string };
  assertComplete(
    {
      published: data.published ?? true,
      acceptsConsultations: data.acceptsConsultations ?? true,
      hourlyFee: data.hourlyFee ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      githubUrl: data.githubUrl ?? null,
      websiteUrl: data.websiteUrl ?? null,
    },
    'publish',
  );

  const last = await prisma.expert.findFirst({ orderBy: { displayOrder: 'desc' }, select: { displayOrder: true } });
  const slug = await uniqueSlug(input.slug?.trim() || slugify(input.fullName));

  const stored = await storePhoto(photo);
  let opened: Awaited<ReturnType<typeof createMemberAccount>> | null = null;
  try {
    const created = await prisma.$transaction(async (tx) => {
      const account = options.account
        ? await createMemberAccount(
            tx,
            { ...splitName(input.fullName), ...stripEmpty(options.account), accountKind: 'INDIVIDUAL' },
            options.staffId ?? null,
          )
        : null;
      opened = account;
      return tx.expert.create({
        data: {
          ...data,
          slug,
          displayOrder: (last?.displayOrder ?? 0) + 1,
          moderationStatus: 'APPROVED',
          userId: account?.id ?? null,
          ...photoData(stored),
        },
        select: { id: true, slug: true, fullName: true, userId: true },
      });
    });
    if (opened) announceStaffAccount(opened);
    return created;
  } catch (error) {
    // Nothing references the file yet; an orphan in storage is invisible and
    // never collected.
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

function stripEmpty(account: ExpertAccountInput) {
  return Object.fromEntries(
    Object.entries(account).filter(([, value]) => typeof value !== 'string' || value.trim() !== ''),
  ) as ExpertAccountInput;
}

export async function updateExpert(
  id: string,
  input: Partial<ExpertInput>,
  photo: IncomingFile | null,
  options: { staffId?: string; account?: ExpertAccountInput } = {},
) {
  const existing = await prisma.expert.findUnique({
    where: { id },
    select: {
      id: true,
      photoStoredName: true,
      fullName: true,
      userId: true,
      moderationStatus: true,
      published: true,
      acceptsConsultations: true,
      hourlyFee: true,
      linkedinUrl: true,
      githubUrl: true,
      websiteUrl: true,
    },
  });
  if (!existing) throw new AppError('این کارشناس پیدا نشد.', 404);
  if (options.account && existing.userId) throw new AppError('این کارشناس از پیش حساب کاربری دارد.', 409);

  const data = normalize(input);
  assertComplete({ ...existing, ...data } as Publishable, 'publish');

  // Publishing a submitted profile is approving it.
  const approving = data.published === true && existing.moderationStatus !== 'APPROVED';

  const stored = await storePhoto(photo);
  let opened: Awaited<ReturnType<typeof createMemberAccount>> | null = null;
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const account = options.account
        ? await createMemberAccount(
            tx,
            { ...splitName(existing.fullName), ...stripEmpty(options.account), accountKind: 'INDIVIDUAL' },
            options.staffId ?? null,
          )
        : null;
      opened = account;
      return tx.expert.update({
        where: { id },
        data: {
          ...data,
          ...(input.slug !== undefined && input.slug.trim() ? { slug: await uniqueSlug(slugify(input.slug), id) } : {}),
          ...(approving ? { moderationStatus: 'APPROVED' as const, reviewNote: null } : {}),
          ...(account ? { userId: account.id } : {}),
          ...photoData(stored),
        },
        select: { id: true, slug: true, fullName: true, userId: true },
      });
    });

    if (opened) announceStaffAccount(opened);
    if (approving && existing.userId) notifyDecision(existing.userId, 'APPROVED');
    // Only once the row points at the new file.
    if (stored && existing.photoStoredName) await removeFile(existing.photoStoredName);
    return updated;
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
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
    select: { photoStoredName: true, photoMimeType: true, photoOriginalName: true, published: true, moderationStatus: true },
  });
  const visible = row?.published && row.moderationStatus === 'APPROVED';
  if (!row || (!visible && !includeUnpublished) || !row.photoStoredName || !row.photoMimeType) {
    throw new AppError('این تصویر پیدا نشد.', 404);
  }
  return {
    storedName: row.photoStoredName,
    mimeType: row.photoMimeType,
    originalName: row.photoOriginalName ?? 'photo',
  };
}

// ---------------------------------------------------------------------------
// The expert's own side
// ---------------------------------------------------------------------------

export async function getOwnExpert(userId: string) {
  const row = await prisma.expert.findUnique({
    where: { userId },
    select: { ...publicFields, published: true, moderationStatus: true, reviewNote: true },
  });
  if (!row) return null;
  return { ...present(row), published: row.published, moderationStatus: row.moderationStatus, reviewNote: row.reviewNote };
}

/** The owner's own photo, whatever the profile's state. */
export async function getOwnPhoto(userId: string) {
  const row = await prisma.expert.findUnique({ where: { userId }, select: { id: true } });
  if (!row) throw new AppError('این تصویر پیدا نشد.', 404);
  return getPhoto(row.id, true);
}

/**
 * Create or edit one's own consultant profile.
 *
 * A new profile — or one refused before — goes to staff and is not shown until
 * approved; only verified members (or accounts staff opened) may submit one.
 * Edits to an approved profile go live at once: the fee and the links are the
 * expert's to keep current, and staff can unpublish a profile at any time.
 */
export async function saveOwnExpert(userId: string, input: OwnExpertInput, photo: IncomingFile | null) {
  await assertVerified(userId);

  const existing = await prisma.expert.findUnique({
    where: { userId },
    select: {
      id: true,
      moderationStatus: true,
      published: true,
      acceptsConsultations: true,
      hourlyFee: true,
      linkedinUrl: true,
      githubUrl: true,
      websiteUrl: true,
      photoStoredName: true,
    },
  });

  const data = normalize(input);
  const merged = {
    published: true,
    acceptsConsultations: existing?.acceptsConsultations ?? true,
    hourlyFee: existing?.hourlyFee ?? null,
    linkedinUrl: existing?.linkedinUrl ?? null,
    githubUrl: existing?.githubUrl ?? null,
    websiteUrl: existing?.websiteUrl ?? null,
    ...data,
  } as Publishable;
  assertComplete(merged, 'submit');

  const resubmitting = !existing || existing.moderationStatus === 'REJECTED';

  const stored = await storePhoto(photo);
  try {
    let result;
    if (existing) {
      result = await prisma.expert.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...(resubmitting ? { moderationStatus: 'PENDING_REVIEW' as const, reviewNote: null } : {}),
          ...photoData(stored),
        },
        select: { id: true, slug: true, moderationStatus: true },
      });
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
      const fullName = data.fullName ?? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
      if (!data.headline) throw new AppError('عنوان حرفه‌ای الزامی است.', 400);
      const last = await prisma.expert.findFirst({ orderBy: { displayOrder: 'desc' }, select: { displayOrder: true } });
      result = await prisma.expert.create({
        data: {
          ...(data as ExpertInput),
          fullName,
          headline: data.headline,
          userId,
          slug: await uniqueSlug(slugify(fullName)),
          displayOrder: (last?.displayOrder ?? 0) + 1,
          published: false,
          moderationStatus: 'PENDING_REVIEW',
          ...photoData(stored),
        },
        select: { id: true, slug: true, moderationStatus: true },
      });
    }
    if (stored && existing?.photoStoredName) await removeFile(existing.photoStoredName);
    return result;
  } catch (error) {
    if (stored) await removeFile(stored.storedName);
    throw error;
  }
}

function notifyDecision(userId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
  notifySafely(userId, {
    type: 'expert.reviewed',
    title: decision === 'APPROVED' ? 'پروفایل مشاورهٔ شما منتشر شد' : 'پروفایل مشاورهٔ شما تأیید نشد',
    body: decision === 'APPROVED' ? 'پروفایل شما در باشگاه کارشناسان نمایش داده می‌شود.' : (note ?? '').slice(0, 160),
    link: '/dashboard/expert',
  });
}

/** Staff decide on a submitted profile. A refusal needs a reason the expert can act on. */
export async function reviewExpert(id: string, decision: 'APPROVED' | 'REJECTED', reviewNote?: string) {
  const existing = await prisma.expert.findUnique({
    where: { id },
    select: {
      userId: true,
      published: true,
      acceptsConsultations: true,
      hourlyFee: true,
      linkedinUrl: true,
      githubUrl: true,
      websiteUrl: true,
    },
  });
  if (!existing) throw new AppError('این کارشناس پیدا نشد.', 404);
  if (decision === 'REJECTED' && !reviewNote?.trim()) throw new AppError('برای رد کردن، باید دلیل را بنویسید.', 400);
  if (decision === 'APPROVED') assertComplete({ ...existing, published: true }, 'publish');

  const updated = await prisma.expert.update({
    where: { id },
    data:
      decision === 'APPROVED'
        ? { moderationStatus: 'APPROVED', published: true, reviewNote: null }
        : { moderationStatus: 'REJECTED', published: false, reviewNote: reviewNote!.trim() },
    select: { id: true, moderationStatus: true, published: true },
  });
  if (existing.userId) notifyDecision(existing.userId, decision, reviewNote);
  return updated;
}
