import type { ModerationStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

/**
 * The rules every moderated thing obeys.
 *
 * Job posts, applications, freelance projects and bids all take the same
 * journey — written, submitted, looked at by a person, and then either passed
 * on or sent back. Writing that four times would mean four vocabularies for
 * one idea and four places for the transitions to disagree.
 *
 * The decisions live here as pure functions over a status, so they can be
 * tested without a database and cannot drift between the four callers.
 */

/** What a reviewer may do, as opposed to what the author may do. */
export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

/**
 * Which statuses accept a new review.
 *
 * Re-reviewing something already approved is not a mistake to prevent — a
 * listing can be pulled after publication — but reviewing a DRAFT is: the
 * author has not finished writing it and has not asked anybody to look.
 */
const REVIEWABLE: ModerationStatus[] = ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'];

/** Which statuses the author may still edit. */
const AUTHOR_EDITABLE: ModerationStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];

export function assertReviewable(status: ModerationStatus): void {
  if (!REVIEWABLE.includes(status)) {
    throw new AppError('این مورد هنوز برای بررسی ارسال نشده است.', 409);
  }
}

export function assertAuthorEditable(status: ModerationStatus): void {
  if (!AUTHOR_EDITABLE.includes(status)) {
    // Once it is in a queue or published, an edit would change what a reviewer
    // approved without anybody seeing the change. Withdrawing and resubmitting
    // is the honest route.
    throw new AppError('پس از ارسال برای بررسی، امکان ویرایش نیست.', 409);
  }
}

export function assertSubmittable(status: ModerationStatus): void {
  if (!AUTHOR_EDITABLE.includes(status)) {
    throw new AppError('این مورد پیش‌تر ارسال شده است.', 409);
  }
}

/**
 * A reviewer's verdict has to be actionable when it is not a yes.
 *
 * "Rejected" with no reason is the single most common way a moderation queue
 * becomes a source of complaints rather than of quality: the author cannot
 * tell whether the post broke a rule or simply needed a clearer title.
 */
export function assertDecisionHasReason(decision: ReviewDecision, note: string | undefined): void {
  if (decision !== 'APPROVED' && !note?.trim()) {
    throw new AppError('برای رد کردن یا درخواست اصلاح، باید توضیح بنویسید.', 400);
  }
}

export interface ReviewPatch {
  moderationStatus: ModerationStatus;
  reviewedAt: Date;
  reviewedById: string;
  reviewNote: string | null;
  internalNote?: string;
  publishedAt?: Date;
}

/**
 * The database patch a decision implies.
 *
 * `publishedAt` is stamped only on the first approval, so re-approving
 * something after an edit does not quietly move it to the top of a list
 * ordered by publication date.
 */
export function reviewPatch(
  decision: ReviewDecision,
  reviewer: { userId: string },
  notes: { reviewNote?: string; internalNote?: string },
  alreadyPublishedAt: Date | null,
): ReviewPatch {
  assertDecisionHasReason(decision, notes.reviewNote);

  return {
    moderationStatus: decision,
    reviewedAt: new Date(),
    reviewedById: reviewer.userId,
    // Cleared on approval: a note asking for a change should not survive the
    // change being made.
    reviewNote: decision === 'APPROVED' ? null : (notes.reviewNote?.trim() ?? null),
    internalNote: notes.internalNote,
    ...(decision === 'APPROVED' && !alreadyPublishedAt ? { publishedAt: new Date() } : {}),
  };
}

/**
 * Whether the public may see it.
 *
 * One predicate, used by every public query, so "visible" cannot come to mean
 * something slightly different on the jobs board than on the project board.
 */
export const PUBLIC_LISTING_WHERE = {
  moderationStatus: 'APPROVED',
  state: 'OPEN',
} as const;
