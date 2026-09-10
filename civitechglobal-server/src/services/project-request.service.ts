import type { EngagementModel, ProjectRequestStatus, ProjectType, ProjectUrgency } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { sha256Hex } from '../utils/hash.js';
import {
  assertWithinRateLimits,
  normalizeEmail,
  normalizePhone,
  recordRequest,
  resolveIdentity,
} from './client-identity.service.js';
import { removeFile, storeFiles, type IncomingFile } from './attachment.service.js';
import { generateTrackingCode, isUniqueViolation } from './insurance-request.service.js';

/**
 * Intake for software project enquiries.
 *
 * The submission is one transaction: identity, rate limits, the request row and
 * its attachment rows either all land or none do. Files are written to disk
 * BEFORE the transaction opens (a write cannot be rolled back by Postgres) and
 * removed by hand if the transaction then fails — so the failure mode is an
 * orphaned row in nothing, rather than a database row pointing at a file that
 * was never written.
 */

export interface ProjectRequestInput {
  contactName: string;
  contactRole?: string;
  organizationName?: string;
  website?: string;
  email: string;
  phone: string;

  title: string;
  summary: string;
  projectType: ProjectType;
  platforms: string[];
  goals?: string;
  targetUsers?: string;
  existingSystems?: string;
  constraints?: string;
  outOfScope?: string;

  urgency: ProjectUrgency;
  desiredStartAt?: Date;
  deadlineAt?: Date;
  deadlineReason?: string;

  budgetUnknown: boolean;
  budgetMin?: bigint;
  budgetMax?: bigint;
  suggestedPrice?: bigint;
  engagementModel: EngagementModel;

  ndaRequired: boolean;
  clientNotes?: string;
}

export interface SubmitResult {
  id: string;
  trackingCode: string;
  attachmentCount: number;
}

export async function submitRequest(
  input: ProjectRequestInput,
  files: IncomingFile[]
): Promise<SubmitResult> {
  // Cheap, order-dependent validation first: there is no point writing 25 MB
  // to disk for a caller who is over their daily limit.
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  assertBudgetIsCoherent(input);

  const stored = await storeFiles(files);

  try {
    return await prisma.$transaction(async (tx) => {
      const identity = await resolveIdentity(tx, { email, phone });
      await assertWithinRateLimits(tx, identity);

      const request = await createWithUniqueTrackingCode(tx, identity.id, email, phone, input, stored);
      await recordRequest(tx, identity.id);

      return {
        id: request.id,
        trackingCode: request.trackingCode,
        attachmentCount: stored.length,
      };
    });
  } catch (error) {
    // The rows are gone; the bytes would otherwise stay. Nothing references
    // them at this point, so they are pure litter.
    await Promise.all(stored.map((file) => removeFile(file.storedName)));
    throw error;
  }
}

/**
 * A budget range that reads backwards is a typo, not a preference, and it would
 * silently distort every report that averages over it.
 */
function assertBudgetIsCoherent(input: ProjectRequestInput): void {
  if (input.budgetUnknown) return;
  const { budgetMin, budgetMax } = input;
  if (budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax) {
    throw new AppError('حداقل بودجه نمی‌تواند از حداکثر آن بیشتر باشد.', 400);
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function createWithUniqueTrackingCode(
  tx: Tx,
  identityId: string,
  email: string,
  phone: string,
  input: ProjectRequestInput,
  stored: Awaited<ReturnType<typeof storeFiles>>
) {
  // Same three-attempt retry as the insurance flow: a collision in a 28-symbol
  // 10-character space is not expected, but P2002 is the only correct way to
  // find out, and a second draw costs nothing.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await tx.projectRequest.create({
        data: {
          trackingCode: generateTrackingCode(),
          identityId,
          contactName: input.contactName,
          contactRole: input.contactRole,
          organizationName: input.organizationName,
          website: input.website,
          email,
          phone,
          title: input.title,
          summary: input.summary,
          projectType: input.projectType,
          platforms: input.platforms,
          goals: input.goals,
          targetUsers: input.targetUsers,
          existingSystems: input.existingSystems,
          constraints: input.constraints,
          outOfScope: input.outOfScope,
          urgency: input.urgency,
          desiredStartAt: input.desiredStartAt,
          deadlineAt: input.deadlineAt,
          deadlineReason: input.deadlineReason,
          budgetUnknown: input.budgetUnknown,
          budgetMin: input.budgetUnknown ? null : input.budgetMin,
          budgetMax: input.budgetUnknown ? null : input.budgetMax,
          suggestedPrice: input.budgetUnknown ? null : input.suggestedPrice,
          engagementModel: input.engagementModel,
          ndaRequired: input.ndaRequired,
          clientNotes: input.clientNotes,
          attachments: {
            create: stored.map((file) => ({
              originalName: file.originalName,
              storedName: file.storedName,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              checksum: file.checksum,
            })),
          },
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 2) throw error;
    }
  }
  throw new AppError('ثبت درخواست ناموفق بود. لطفاً دوباره تلاش کنید.', 500);
}

/**
 * Public status lookup.
 *
 * Returns the request's own state plus whatever proposal has actually been
 * SENT — never a draft, and never the internal notes attached to either. The
 * tracking code is quotable over the phone, so it must not be a key to
 * anything confidential.
 */
export async function trackRequest(trackingCode: string) {
  const request = await prisma.projectRequest.findUnique({
    where: { trackingCode: trackingCode.trim().toUpperCase() },
    select: {
      trackingCode: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      proposals: {
        where: { status: { in: ['SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED'] } },
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          version: true,
          status: true,
          scopeSummary: true,
          deliverables: true,
          assumptions: true,
          exclusions: true,
          milestones: true,
          engagementModel: true,
          optimisticHours: true,
          likelyHours: true,
          pessimisticHours: true,
          pertHours: true,
          priceMin: true,
          priceLikely: true,
          priceMax: true,
          currency: true,
          hourlyRate: true,
          discoveryRequired: true,
          discoveryPrice: true,
          discoveryDays: true,
          timelineWeeksMin: true,
          timelineWeeksMax: true,
          message: true,
          validUntil: true,
          sentAt: true,
        },
      },
    },
  });

  if (!request) {
    throw new AppError('درخواستی با این کد رهگیری پیدا نشد.', 404);
  }

  const proposal = request.proposals[0] ?? null;
  return {
    trackingCode: request.trackingCode,
    title: request.title,
    status: request.status,
    submittedAt: request.createdAt,
    updatedAt: request.updatedAt,
    proposal: proposal
      ? { ...proposal, expired: isExpired(proposal.validUntil, proposal.status) }
      : null,
  };
}

/**
 * The same document, for staff, before it is sent.
 *
 * `trackRequest` deliberately refuses to hand out a draft — the tracking code
 * is quotable over the phone. But whoever is writing the proposal has to be
 * able to read it as the client will, and printing it is how you check that a
 * page of Persian actually breaks where you meant. Addressed by proposal id
 * rather than tracking code, so nothing about this path is guessable, and
 * behind the same staff authentication as the rest of /admin.
 */
export async function getProposalDocument(proposalId: string) {
  const proposal = await prisma.projectProposal.findUnique({
    where: { id: proposalId },
    select: {
      version: true,
      status: true,
      scopeSummary: true,
      deliverables: true,
      assumptions: true,
      exclusions: true,
      milestones: true,
      engagementModel: true,
      optimisticHours: true,
      likelyHours: true,
      pessimisticHours: true,
      pertHours: true,
      priceMin: true,
      priceLikely: true,
      priceMax: true,
      currency: true,
      hourlyRate: true,
      discoveryRequired: true,
      discoveryPrice: true,
      discoveryDays: true,
      timelineWeeksMin: true,
      timelineWeeksMax: true,
      message: true,
      validUntil: true,
      sentAt: true,
      request: {
        select: {
          trackingCode: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!proposal) {
    throw new AppError('پیش‌نهادی با این شناسه پیدا نشد.', 404);
  }

  const { request, ...rest } = proposal;

  // Same shape trackRequest returns, so the document page renders it with no
  // idea which of the two it is looking at.
  return {
    trackingCode: request.trackingCode,
    title: request.title,
    status: request.status,
    submittedAt: request.createdAt,
    updatedAt: request.updatedAt,
    proposal: { ...rest, expired: isExpired(rest.validUntil, rest.status) },
  };
}

/** A proposal past its date is expired whether or not anyone has said so. */
export function isExpired(validUntil: Date | null, status: string): boolean {
  if (status === 'ACCEPTED' || status === 'DECLINED') return false;
  return validUntil !== null && validUntil.getTime() < Date.now();
}

/**
 * The client's own answer to a sent proposal.
 *
 * Guarded by the tracking code plus the email the request was filed under, so
 * a leaked code alone cannot accept a contract on someone's behalf.
 */
export async function respondToProposal(
  trackingCode: string,
  email: string,
  decision: 'ACCEPTED' | 'DECLINED',
  note?: string
) {
  const code = trackingCode.trim().toUpperCase();
  const emailHash = sha256Hex(normalizeEmail(email));

  return prisma.$transaction(async (tx) => {
    const request = await tx.projectRequest.findUnique({
      where: { trackingCode: code },
      include: {
        identity: true,
        proposals: { where: { status: 'SENT' }, orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!request || request.identity.emailHash !== emailHash) {
      // Same message for "no such code" and "wrong email": distinguishing them
      // turns the endpoint into an oracle for which codes exist.
      throw new AppError('کد رهگیری یا ایمیل نادرست است.', 404);
    }

    const proposal = request.proposals[0];
    if (!proposal) {
      throw new AppError('در حال حاضر پیشنهادی برای پاسخ دادن وجود ندارد.', 409);
    }
    if (isExpired(proposal.validUntil, proposal.status)) {
      throw new AppError('مهلت اعتبار این پیشنهاد گذشته است. لطفاً با ما تماس بگیرید.', 409);
    }

    const now = new Date();
    await tx.projectProposal.update({
      where: { id: proposal.id },
      data: { status: decision, decidedAt: now },
    });
    await tx.projectRequest.update({
      where: { id: request.id },
      data: {
        status: decision === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED',
        clientNotes: note ? `${request.clientNotes ?? ''}\n\n[پاسخ به پیشنهاد] ${note}`.trim() : request.clientNotes,
      },
    });

    return { trackingCode: code, status: decision as ProjectRequestStatus };
  });
}
