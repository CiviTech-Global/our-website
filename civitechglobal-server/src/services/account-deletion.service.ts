import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { emailLookupHash, recordFailedAttempt } from './auth.service.js';
import * as mfaService from './mfa.service.js';
import { removeFile } from './attachment.service.js';

/**
 * A member closing their own account.
 *
 * Not a row delete. Other people hold things that point at this account — a
 * review it wrote, a conversation, a finished contract — and deleting the row
 * would either cascade those away from people who did nothing wrong or fail on
 * the foreign keys. So the account stays as a husk: everything that identifies
 * the person is overwritten or removed, everything they had open is closed,
 * and what others keep shows "deleted account" where the name was.
 *
 * What is removed outright is what only ever concerned them: identity
 * documents and national ID, CVs, photos of what they listed, saved searches,
 * alerts, devices, sessions.
 *
 * The public forms (insurance, a project, a CV, a consultation, a contact
 * message) ask for no account, so those records belong to whoever holds the
 * tracking code. Only two things prove that here: the code saved to this
 * account, or an address this account verified. Matching on an unverified
 * email would let anybody register a stranger's address, delete the account
 * and wipe the stranger's requests. What neither proves stays until its owner
 * asks through the contact page, and the privacy policy says so.
 *
 * The email is replaced rather than kept, so the same address can open a new,
 * empty account later. Re-registering must never bring this one back the way
 * it brings back a staff-deactivated account (auth.service register).
 */

export const DELETED_DISPLAY_NAME = 'حساب حذف‌شده';

/** The rows of the public forms that this account can show are its own. */
async function provenIntake(userId: string, verifiedEmail: string | null) {
  const tracked = await prisma.trackedRequest.findMany({ where: { userId }, select: { code: true } });
  const codes = tracked.map((row) => row.code);
  const email = verifiedEmail ? { equals: verifiedEmail, mode: 'insensitive' as const } : undefined;
  const mine = { OR: [{ trackingCode: { in: codes } }, ...(email ? [{ email }] : [])] };

  const [insurance, projects, resumes, messages, consultations] = await Promise.all([
    prisma.insuranceRequest.findMany({ where: mine, select: { id: true } }),
    prisma.projectRequest.findMany({
      where: mine,
      select: { id: true, identityId: true, attachments: { select: { storedName: true } } },
    }),
    prisma.resumeSubmission.findMany({
      where: mine,
      select: { id: true, identityId: true, resumeStoredName: true },
    }),
    prisma.contactMessage.findMany({ where: mine, select: { id: true } }),
    prisma.consultationRequest.findMany({ where: mine, select: { id: true } }),
  ]);
  return { insurance, projects, resumes, messages, consultations };
}

export interface DeleteAccountInput {
  password: string;
  /** Required when two-factor sign-in is on: a TOTP or a recovery code. */
  code?: string;
}

/** What still blocks deletion, so the screen can say what to finish first. */
export interface DeletionBlockers {
  activeContracts: number;
  booksInHandOver: number;
}

export async function deletionBlockers(userId: string): Promise<DeletionBlockers> {
  // An award names its bid by id only (no relation), so the bids come first.
  const bidIds = (await prisma.projectBid.findMany({ where: { bidderId: userId }, select: { id: true } })).map(
    (b) => b.id,
  );
  const [activeContracts, booksInHandOver] = await Promise.all([
    prisma.marketplaceAward.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { awardedById: userId },
          { projectBidId: { in: bidIds } },
          { serviceOrder: { OR: [{ buyerId: userId }, { sellerId: userId }] } },
        ],
      },
    }),
    prisma.bookRequest.count({
      where: { status: 'ACCEPTED', OR: [{ buyerId: userId }, { sellerId: userId }] },
    }),
  ]);
  return { activeContracts, booksInHandOver };
}

export async function deleteOwnAccount(userId: string, input: DeleteAccountInput): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      password: true,
      role: true,
      mfaEnabledAt: true,
    },
  });
  if (!user) throw new AppError('Invalid credentials', 401);

  // Staff accounts are the super admin's to close, from the users page: one
  // left behind by mistake is a locked door nobody has the key to.
  if (user.role !== 'USER') {
    throw new AppError('حساب کارکنان را فقط مدیر ارشد می‌تواند ببندد.', 403);
  }

  if (!(await comparePassword(input.password, user.password))) {
    await recordFailedAttempt(user.email);
    throw new AppError('رمز عبور درست نیست.', 400);
  }
  if (user.mfaEnabledAt) {
    if (!input.code) throw new AppError('کد ورود دومرحله‌ای لازم است.', 400);
    await mfaService.verifyChallenge(userId, input.code);
  }

  const blockers = await deletionBlockers(userId);
  if (blockers.activeContracts > 0 || blockers.booksInHandOver > 0) {
    throw new AppError(
      'هنوز قرارداد یا تحویل کتابی باز دارید. پیش از حذف حساب آن‌ها را به پایان برسانید یا لغو کنید.',
      409,
    );
  }

  // Collected before the transaction and removed after it commits: a file
  // removed for a transaction that then rolled back is gone for good.
  const intake = await provenIntake(userId, user.emailVerified ? user.email : null);
  const [documents, applications, bids, company, shops, productImages, bookPhotos, bookCovers, serviceImages] = await Promise.all([
    prisma.verificationDocument.findMany({
      where: { verification: { userId } },
      select: { storedName: true },
    }),
    prisma.jobApplication.findMany({
      where: { applicantId: userId, cvStoredName: { not: null } },
      select: { cvStoredName: true },
    }),
    prisma.projectBid.findMany({
      where: { bidderId: userId, attachmentStoredName: { not: null } },
      select: { attachmentStoredName: true },
    }),
    prisma.company.findUnique({
      where: { ownerId: userId },
      select: { logoStoredName: true, coverStoredName: true },
    }),
    prisma.business.findMany({
      where: { ownerId: userId },
      select: { logoStoredName: true, coverStoredName: true },
    }),
    prisma.productImage.findMany({
      where: { product: { business: { ownerId: userId } } },
      select: { storedName: true },
    }),
    prisma.bookListingPhoto.findMany({
      where: { listing: { sellerId: userId } },
      select: { storedName: true },
    }),
    prisma.bookListing.findMany({
      where: { sellerId: userId, coverStoredName: { not: null } },
      select: { coverStoredName: true },
    }),
    prisma.serviceImage.findMany({
      where: { service: { ownerId: userId } },
      select: { storedName: true },
    }),
  ]);

  const now = new Date();
  const husk = `deleted+${userId}@deleted.invalid`;
  const unusablePassword = await hashPassword(randomBytes(32).toString('base64url'));

  await prisma.$transaction(async (tx) => {
    // Their open things close, so nobody applies to a job, bids on a project
    // or asks for a book from a person who has gone.
    await tx.jobPost.updateMany({ where: { authorId: userId, state: 'OPEN' }, data: { state: 'CLOSED' } });
    await tx.freelanceProject.updateMany({ where: { authorId: userId, state: 'OPEN' }, data: { state: 'CLOSED' } });
    await tx.bookListing.updateMany({ where: { sellerId: userId, state: 'OPEN' }, data: { state: 'CLOSED' } });
    await tx.service.updateMany({ where: { ownerId: userId }, data: { state: 'PAUSED' } });
    await tx.business.updateMany({ where: { ownerId: userId, state: 'OPEN' }, data: { state: 'CLOSED' } });
    await tx.product.updateMany({
      where: { business: { ownerId: userId }, state: 'OPEN' },
      data: { state: 'CLOSED' },
    });

    // Requests waiting on them are answered, either way round.
    await tx.serviceOrder.updateMany({ where: { sellerId: userId, status: 'REQUESTED' }, data: { status: 'DECLINED' } });
    await tx.serviceOrder.updateMany({ where: { buyerId: userId, status: 'REQUESTED' }, data: { status: 'CANCELLED' } });
    await tx.bookRequest.updateMany({ where: { sellerId: userId, status: 'REQUESTED' }, data: { status: 'DECLINED' } });
    await tx.bookRequest.updateMany({ where: { buyerId: userId, status: 'REQUESTED' }, data: { status: 'CANCELLED' } });

    // Applications and bids stay as rows (the employer's pipeline and the
    // client's inbox count them) but are withdrawn and emptied.
    await tx.jobApplication.updateMany({
      where: { applicantId: userId },
      data: {
        coverLetter: null,
        expectedSalary: null,
        cvOriginalName: null,
        cvStoredName: null,
        cvMimeType: null,
        cvSizeBytes: null,
        cvChecksum: null,
      },
    });
    await tx.jobApplication.updateMany({
      where: { applicantId: userId, outcome: { in: ['PENDING', 'SHORTLISTED', 'INTERVIEW'] } },
      data: { outcome: 'WITHDRAWN', outcomeChangedAt: now },
    });
    await tx.projectBid.updateMany({
      where: { bidderId: userId },
      data: {
        attachmentOriginalName: null,
        attachmentStoredName: null,
        attachmentMimeType: null,
        attachmentSizeBytes: null,
        attachmentChecksum: null,
      },
    });
    await tx.projectBid.updateMany({
      where: { bidderId: userId, outcome: { in: ['PENDING', 'SHORTLISTED'] } },
      data: { outcome: 'WITHDRAWN', outcomeChangedAt: now },
    });

    // Their pictures go with what they listed.
    await tx.productImage.deleteMany({ where: { product: { business: { ownerId: userId } } } });
    await tx.bookListingPhoto.deleteMany({ where: { listing: { sellerId: userId } } });
    await tx.serviceImage.deleteMany({ where: { service: { ownerId: userId } } });
    await tx.bookListing.updateMany({ where: { sellerId: userId }, data: { coverStoredName: null } });
    await tx.business.updateMany({
      where: { ownerId: userId },
      data: { logoStoredName: null, coverStoredName: null },
    });
    await tx.company.updateMany({
      where: { ownerId: userId },
      data: { logoStoredName: null, coverStoredName: null },
    });

    // The public forms they proved are theirs keep their place in the staff
    // queues, with nothing left in them that says who sent them.
    await tx.insuranceRequest.updateMany({
      where: { id: { in: intake.insurance.map((row) => row.id) } },
      data: {
        fullName: DELETED_DISPLAY_NAME,
        phoneNumber: '',
        phoneNumberHash: null,
        email: null,
        organizationName: null,
        notes: null,
        answers: Prisma.DbNull,
        telegramUserId: null,
        telegramUsername: null,
        telegramFirstName: null,
      },
    });
    await tx.projectAttachment.deleteMany({
      where: { requestId: { in: intake.projects.map((row) => row.id) } },
    });
    await tx.projectRequest.updateMany({
      where: { id: { in: intake.projects.map((row) => row.id) } },
      data: {
        contactName: DELETED_DISPLAY_NAME,
        contactRole: null,
        organizationName: null,
        website: null,
        email: '',
        phone: '',
        clientNotes: null,
      },
    });
    for (const resume of intake.resumes) {
      await tx.resumeSubmission.update({
        where: { id: resume.id },
        data: {
          fullName: DELETED_DISPLAY_NAME,
          email: '',
          phone: '',
          city: null,
          province: null,
          birthYear: null,
          coverNote: null,
          university: null,
          fieldOfStudy: null,
          skills: [],
          githubUrl: null,
          portfolioUrl: null,
          linkedinUrl: null,
          resumeOriginalName: '',
          // Unique and required, so a marker rather than a blank.
          resumeStoredName: `deleted-${resume.id}`,
          resumeMimeType: '',
          resumeSizeBytes: 0,
          resumeChecksum: '',
        },
      });
    }
    await tx.contactReply.deleteMany({
      where: { messageId: { in: intake.messages.map((row) => row.id) } },
    });
    await tx.contactMessage.updateMany({
      where: { id: { in: intake.messages.map((row) => row.id) } },
      data: { name: DELETED_DISPLAY_NAME, email: '', emailHash: '', subject: null, message: '' },
    });
    await tx.consultationRequest.updateMany({
      where: { id: { in: intake.consultations.map((row) => row.id) } },
      data: {
        fullName: DELETED_DISPLAY_NAME,
        phoneNumber: '',
        phoneNumberHash: null,
        email: null,
        goal: null,
        background: null,
      },
    });
    // The identity behind those forms holds the same address and number. A
    // blocked one stays as it is: deleting an account is not a way out of a block.
    const identities = [...intake.projects, ...intake.resumes].map((row) => row.identityId);
    for (const id of new Set(identities)) {
      await tx.clientIdentity.updateMany({
        where: { id, blocked: false },
        data: { email: '', emailHash: `deleted-${id}`, phone: '', phoneHash: `deleted-${id}` },
      });
    }

    // What only ever concerned them.
    await tx.userVerification.deleteMany({ where: { userId } });
    await tx.savedJob.deleteMany({ where: { userId } });
    await tx.jobAlert.deleteMany({ where: { userId } });
    await tx.savedProject.deleteMany({ where: { userId } });
    await tx.projectAlert.deleteMany({ where: { userId } });
    await tx.trackedRequest.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.pushDevice.deleteMany({ where: { userId } });
    await tx.userToken.deleteMany({ where: { userId } });
    await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });

    await tx.user.update({
      where: { id: userId },
      data: {
        email: husk,
        emailHash: emailLookupHash(husk),
        username: null,
        password: unusablePassword,
        firstName: DELETED_DISPLAY_NAME,
        lastName: '',
        phone: null,
        headline: null,
        bio: null,
        website: null,
        skills: [],
        languages: [],
        hourlyRate: null,
        mfaSecret: null,
        mfaEnabledAt: null,
        mfaRecoveryCodes: [],
        emailVerified: false,
        tokenVersion: { increment: 1 },
        deletedAt: now,
      },
    });
  });

  const files = [
    ...documents.map((d) => d.storedName),
    ...applications.map((a) => a.cvStoredName!),
    ...bids.map((b) => b.attachmentStoredName!),
    ...[company, ...shops].flatMap((row) => [row?.logoStoredName, row?.coverStoredName]),
    ...[...productImages, ...bookPhotos, ...serviceImages].map((row) => row.storedName),
    ...bookCovers.map((row) => row.coverStoredName),
    ...intake.projects.flatMap((row) => row.attachments.map((a) => a.storedName)),
    ...intake.resumes.map((row) => row.resumeStoredName),
  ].filter((name): name is string => Boolean(name));
  const results = await Promise.allSettled(files.map((name) => removeFile(name)));
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    // The rows no longer name these files, so nothing serves them; the log is
    // how somebody finds and removes them by hand.
    logger.error({ userId, failed, files }, 'Account deleted, but some of its files could not be removed');
  }
  logger.info({ userId, files: files.length }, 'Account deleted by its owner');
}
