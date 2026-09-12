import { describe, expect, it } from 'vitest';
import {
  assertAuthorEditable,
  assertDecisionHasReason,
  assertReviewable,
  assertSubmittable,
  reviewPatch,
} from './moderation.js';

/**
 * The transitions, as pure decisions.
 *
 * Four models share these rules, so a mistake here is a mistake in four
 * places at once — which is exactly why they are one function rather than
 * four copies, and why they are worth pinning.
 */

const REVIEWER = { userId: 'staff-1' };

describe('what a reviewer may look at', () => {
  it('accepts anything that has been submitted', () => {
    for (const status of ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'] as const) {
      expect(() => assertReviewable(status)).not.toThrow();
    }
  });

  it('refuses a draft', () => {
    // The author has not finished writing it and has not asked anybody to look.
    expect(() => assertReviewable('DRAFT')).toThrow();
  });

  it('allows re-reviewing something already approved', () => {
    // A listing can be pulled after publication; that is a review, not a bug.
    expect(() => assertReviewable('APPROVED')).not.toThrow();
  });
});

describe('what an author may edit', () => {
  it('allows a draft and anything sent back', () => {
    expect(() => assertAuthorEditable('DRAFT')).not.toThrow();
    expect(() => assertAuthorEditable('CHANGES_REQUESTED')).not.toThrow();
  });

  it('refuses editing while it sits in a queue', () => {
    // Otherwise the thing a reviewer approves is not the thing they read.
    expect(() => assertAuthorEditable('PENDING_REVIEW')).toThrow();
  });

  it('refuses editing something already published', () => {
    expect(() => assertAuthorEditable('APPROVED')).toThrow();
  });

  it('refuses submitting the same thing twice', () => {
    expect(() => assertSubmittable('PENDING_REVIEW')).toThrow();
    expect(() => assertSubmittable('DRAFT')).not.toThrow();
  });
});

describe('a verdict that is not a yes needs a reason', () => {
  it('requires a note to reject', () => {
    expect(() => assertDecisionHasReason('REJECTED', undefined)).toThrow();
    expect(() => assertDecisionHasReason('REJECTED', '   ')).toThrow();
    expect(() => assertDecisionHasReason('REJECTED', 'عنوان آگهی گمراه‌کننده است.')).not.toThrow();
  });

  it('requires a note to ask for changes', () => {
    expect(() => assertDecisionHasReason('CHANGES_REQUESTED', undefined)).toThrow();
  });

  it('does not require one to approve', () => {
    expect(() => assertDecisionHasReason('APPROVED', undefined)).not.toThrow();
  });
});

describe('reviewPatch', () => {
  it('publishes on first approval', () => {
    const patch = reviewPatch('APPROVED', REVIEWER, {}, null);

    expect(patch.moderationStatus).toBe('APPROVED');
    expect(patch.publishedAt).toBeInstanceOf(Date);
    expect(patch.reviewedById).toBe('staff-1');
  });

  it('does not move the publication date on a later approval', () => {
    // Re-approving after an edit would otherwise jump the listing back to the
    // top of anything ordered by publishedAt — a free bump for editing.
    const first = new Date('2026-01-01');
    const patch = reviewPatch('APPROVED', REVIEWER, {}, first);

    expect(patch.publishedAt).toBeUndefined();
  });

  it('clears the note on approval', () => {
    // A note asking for a change should not outlive the change being made.
    const patch = reviewPatch('APPROVED', REVIEWER, { reviewNote: 'قیمت را روشن کنید' }, null);

    expect(patch.reviewNote).toBeNull();
  });

  it('keeps the note when sending something back', () => {
    const patch = reviewPatch(
      'CHANGES_REQUESTED',
      REVIEWER,
      { reviewNote: '  مبلغ پیشنهادی با شرح کار نمی‌خواند  ' },
      null,
    );

    expect(patch.moderationStatus).toBe('CHANGES_REQUESTED');
    expect(patch.reviewNote).toBe('مبلغ پیشنهادی با شرح کار نمی‌خواند');
    expect(patch.publishedAt).toBeUndefined();
  });

  it('carries the internal note separately from the one the author sees', () => {
    const patch = reviewPatch(
      'REJECTED',
      REVIEWER,
      { reviewNote: 'به قوانین نمی‌خورد', internalNote: 'سومین بار از همین حساب' },
      null,
    );

    expect(patch.reviewNote).toBe('به قوانین نمی‌خورد');
    expect(patch.internalNote).toBe('سومین بار از همین حساب');
  });

  it('refuses to build a patch for a reasonless rejection', () => {
    expect(() => reviewPatch('REJECTED', REVIEWER, {}, null)).toThrow();
  });
});
