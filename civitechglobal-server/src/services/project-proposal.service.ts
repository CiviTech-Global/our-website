import type { EngagementModel, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Our answer to an enquiry.
 *
 * The design decision worth stating: a proposal prices a RANGE, not a number.
 * An estimate made from a brief sits at the wide end of the cone of
 * uncertainty — the usual figure for a rough order of magnitude is about
 * -25%/+75% — so a single number is a claim to precision nobody has at that
 * stage. Three points (optimistic, likely, pessimistic) say what is actually
 * known, and the PERT weighting turns them into one headline figure without
 * throwing the range away.
 *
 * The other decision: `exclusions` is mandatory in practice, because scope
 * stated only as what IS included is the standard way fixed-price work ends in
 * an argument. Saying what we are not doing is not defensive; it is the part
 * the client most needs in order to compare us with anyone else.
 */

/** Default validity. Thirty days is the common commercial default. */
export const DEFAULT_VALIDITY_DAYS = 30;

/**
 * PERT weighted average: (O + 4M + P) / 6.
 *
 * The weighting exists because the most likely case deserves more than a third
 * of the answer, while the tails still have to move the number. Returns null
 * when the three points are not all present — half an estimate is not an
 * estimate.
 */
export function pertHours(
  optimistic: number | null | undefined,
  likely: number | null | undefined,
  pessimistic: number | null | undefined
): number | null {
  if (
    typeof optimistic !== 'number' ||
    typeof likely !== 'number' ||
    typeof pessimistic !== 'number'
  ) {
    return null;
  }
  return Math.round((optimistic + 4 * likely + pessimistic) / 6);
}

/**
 * The three points have to be ordered, or the estimate is nonsense that would
 * still produce a plausible-looking PERT number.
 */
export function assertEstimateIsOrdered(
  optimistic: number | null | undefined,
  likely: number | null | undefined,
  pessimistic: number | null | undefined
): void {
  const provided = [optimistic, likely, pessimistic].filter((v) => typeof v === 'number');
  if (provided.length === 0) return;
  if (provided.length !== 3) {
    throw new AppError('برآورد ساعت باید هر سه مقدار خوش‌بینانه، محتمل و بدبینانه را داشته باشد.', 400);
  }
  if (!(optimistic! <= likely! && likely! <= pessimistic!)) {
    throw new AppError(
      'برآورد باید به ترتیب خوش‌بینانه ≤ محتمل ≤ بدبینانه باشد.',
      400
    );
  }
}

export function assertPriceIsOrdered(
  min: bigint | null | undefined,
  likely: bigint | null | undefined,
  max: bigint | null | undefined
): void {
  if (min != null && likely != null && min > likely) {
    throw new AppError('کمترین قیمت نمی‌تواند از قیمت محتمل بیشتر باشد.', 400);
  }
  if (likely != null && max != null && likely > max) {
    throw new AppError('قیمت محتمل نمی‌تواند از بیشترین قیمت بیشتر باشد.', 400);
  }
  if (min != null && max != null && min > max) {
    throw new AppError('کمترین قیمت نمی‌تواند از بیشترین قیمت بیشتر باشد.', 400);
  }
}

export interface ProposalInput {
  scopeSummary: string;
  deliverables: string[];
  assumptions: string[];
  exclusions: string[];
  milestones?: Prisma.InputJsonValue;
  engagementModel: EngagementModel;
  optimisticHours?: number;
  likelyHours?: number;
  pessimisticHours?: number;
  priceMin?: bigint;
  priceLikely?: bigint;
  priceMax?: bigint;
  currency?: string;
  hourlyRate?: bigint;
  discoveryRequired?: boolean;
  discoveryPrice?: bigint;
  discoveryDays?: number;
  timelineWeeksMin?: number;
  timelineWeeksMax?: number;
  message?: string;
  internalNotes?: string;
  validUntil?: Date;
}

/**
 * Creates the next version rather than editing the current one.
 *
 * A revised offer is a new document. Overwriting the old one would destroy the
 * record of what the client was actually shown when they made a decision,
 * which is the one thing a proposal history exists to preserve.
 */
export async function createProposal(requestId: string, authorId: string, input: ProposalInput) {
  validate(input);

  return prisma.$transaction(async (tx) => {
    const request = await tx.projectRequest.findUnique({
      where: { id: requestId },
      select: { id: true },
    });
    if (!request) throw new AppError('درخواست پیدا نشد.', 404);

    const latest = await tx.projectProposal.findFirst({
      where: { requestId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return tx.projectProposal.create({
      data: {
        requestId,
        version: (latest?.version ?? 0) + 1,
        createdById: authorId,
        status: 'DRAFT',
        ...toData(input),
      },
    });
  });
}

export async function updateProposal(proposalId: string, input: ProposalInput) {
  validate(input);
  const existing = await prisma.projectProposal.findUnique({ where: { id: proposalId } });
  if (!existing) throw new AppError('پیشنهاد پیدا نشد.', 404);
  if (existing.status !== 'DRAFT') {
    throw new AppError(
      'پیشنهاد ارسال‌شده قابل ویرایش نیست. برای تغییر، نسخهٔ جدیدی بسازید.',
      409
    );
  }
  return prisma.projectProposal.update({ where: { id: proposalId }, data: toData(input) });
}

/**
 * Sending is the moment the offer becomes real, so it is also the moment the
 * validity clock starts and the request's own status moves.
 */
export async function sendProposal(proposalId: string) {
  return prisma.$transaction(async (tx) => {
    const proposal = await tx.projectProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new AppError('پیشنهاد پیدا نشد.', 404);
    if (proposal.status !== 'DRAFT') {
      throw new AppError('این پیشنهاد قبلاً ارسال شده است.', 409);
    }

    const now = new Date();
    const validUntil =
      proposal.validUntil ??
      new Date(now.getTime() + DEFAULT_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    // Any earlier offer on the same request stops being live the moment a new
    // one goes out, so the client is never holding two valid prices at once.
    await tx.projectProposal.updateMany({
      where: { requestId: proposal.requestId, status: 'SENT', id: { not: proposal.id } },
      data: { status: 'WITHDRAWN' },
    });

    const sent = await tx.projectProposal.update({
      where: { id: proposalId },
      data: { status: 'SENT', sentAt: now, validUntil },
    });

    await tx.projectRequest.update({
      where: { id: proposal.requestId },
      data: { status: 'PROPOSAL_SENT' },
    });

    return sent;
  });
}

function validate(input: ProposalInput): void {
  if (!input.scopeSummary.trim()) {
    throw new AppError('شرح دامنهٔ کار الزامی است.', 400);
  }
  if (input.deliverables.length === 0) {
    throw new AppError('حداقل یک قلم تحویل‌دادنی لازم است.', 400);
  }
  if (input.exclusions.length === 0) {
    // Deliberately an error rather than a warning. An empty exclusion list is
    // almost never true, and the times it is left empty are exactly the times
    // the argument happens later.
    throw new AppError(
      'فهرست «موارد خارج از دامنه» را خالی نگذارید؛ نبودِ آن رایج‌ترین علت اختلاف در قراردادهای مقطوع است.',
      400
    );
  }
  assertEstimateIsOrdered(input.optimisticHours, input.likelyHours, input.pessimisticHours);
  assertPriceIsOrdered(input.priceMin, input.priceLikely, input.priceMax);

  if (
    input.timelineWeeksMin != null &&
    input.timelineWeeksMax != null &&
    input.timelineWeeksMin > input.timelineWeeksMax
  ) {
    throw new AppError('کمترین مدت زمان نمی‌تواند از بیشترین آن بزرگ‌تر باشد.', 400);
  }
  if (input.engagementModel === 'TIME_AND_MATERIALS' && input.hourlyRate == null) {
    throw new AppError('برای قرارداد زمان و مواد، نرخ ساعتی لازم است.', 400);
  }
  if (input.discoveryRequired && input.discoveryPrice == null) {
    throw new AppError('وقتی فاز شناخت لازم است، هزینهٔ آن باید مشخص شود.', 400);
  }
}

function toData(input: ProposalInput) {
  return {
    scopeSummary: input.scopeSummary.trim(),
    deliverables: input.deliverables,
    assumptions: input.assumptions,
    exclusions: input.exclusions,
    milestones: input.milestones,
    engagementModel: input.engagementModel,
    optimisticHours: input.optimisticHours ?? null,
    likelyHours: input.likelyHours ?? null,
    pessimisticHours: input.pessimisticHours ?? null,
    // Derived, never accepted from the caller: a stored figure that disagrees
    // with the range it came from is worse than no figure.
    pertHours: pertHours(input.optimisticHours, input.likelyHours, input.pessimisticHours),
    priceMin: input.priceMin ?? null,
    priceLikely: input.priceLikely ?? null,
    priceMax: input.priceMax ?? null,
    currency: input.currency ?? 'IRT',
    hourlyRate: input.hourlyRate ?? null,
    discoveryRequired: input.discoveryRequired ?? false,
    discoveryPrice: input.discoveryPrice ?? null,
    discoveryDays: input.discoveryDays ?? null,
    timelineWeeksMin: input.timelineWeeksMin ?? null,
    timelineWeeksMax: input.timelineWeeksMax ?? null,
    message: input.message ?? null,
    internalNotes: input.internalNotes ?? null,
    validUntil: input.validUntil ?? null,
  };
}
