/**
 * What an admin can be given access to.
 *
 * One entry per module a staff member can be granted or denied. The strings are
 * stored on user rows and inside AdminRole bundles, so they are an interface,
 * not an implementation detail — renaming one is a data migration.
 *
 * The three tiers this serves:
 *
 *   SUPER_ADMIN  Everything, always. Bypasses these checks entirely, and is the
 *                only role that may create staff or change what they can reach.
 *   ADMIN        Exactly the modules a super admin has granted, and nothing
 *                else. An admin with no permissions can sign in and see an
 *                empty admin area, which is the correct starting point.
 *   USER         A customer. Holds no permissions and never reaches /admin.
 */

export const PERMISSIONS = {
  /** Software project briefs, proposals and their attachments. */
  projects: 'projects',
  /** The CV pile, and the files people attach to it. */
  resumes: 'resumes',
  /** Insurance enquiries and callbacks. */
  insurance: 'insurance',
  /** The contact inbox. */
  messages: 'messages',
  /** Staff accounts and what they can reach. SUPER_ADMIN only in practice. */
  users: 'users',
  /** The admin dashboard's counts. */
  analytics: 'analytics',

  // --- Marketplace ---------------------------------------------------------
  //
  // Three keys rather than one, because these are three different jobs a super
  // admin may well want on three different desks: deciding whether somebody is
  // who they claim to be is not the same work as reading a job advert, and
  // neither is judging whether a price is fair for the scope described.

  /** Approving or refusing identity and company verification. */
  verification: 'verification',
  /** Moderating job posts and the applications to them. */
  jobs: 'jobs',
  /** Moderating freelance projects and the bids on them. */
  freelance: 'freelance',

  /**
   * Moderating the book market: the listings members put up, and the
   * company's own. Separate from jobs and freelance because judging whether a
   * book advert is honest is clerical work — a photograph, a price and a
   * condition — and suits a different desk from reading a job description.
   */
  books: 'books',

  /**
   * The club of experts: who is listed, what their profile says, and the
   * order they appear in. Editorial work, like the showcase.
   */
  experts: 'experts',

  /**
   * The consultation queue: reading what somebody asked for, ringing them,
   * and recording what was agreed. Separate from `experts` because whoever
   * keeps the directory current is not necessarily who takes the calls.
   */
  consultations: 'consultations',

  /**
   * Marketplace operations outside the review flow: featuring listings,
   * extending deadlines, pausing accounts, resolving disputes, reading the
   * audit log. Deliberately separate from the three moderation keys —
   * "is this advert worth publishing" and "should this account be paused"
   * are different judgements and usually different desks.
   */
  marketplaceOps: 'marketplace-ops',

  /**
   * The company's showcase: the customers club, the partners page and the
   * projects page. Grantable, unlike the team page — keeping a logo list and a
   * portfolio current is ordinary editorial work that a super admin may well
   * hand to marketing, whereas who represents the company as its people is not.
   */
  showcase: 'showcase',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/** Rejects anything not in the catalogue, so a typo cannot grant nothing silently. */
export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}
