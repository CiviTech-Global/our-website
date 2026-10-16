/**
 * The shape of the help system: which guide covers which address, and what a
 * guide says.
 *
 * The two halves are kept apart on purpose. Where a guide applies (its routes,
 * who it is for, what it relates to) is one fact for every language and lives
 * in manifest.json, which the build scripts read too. What it says is per
 * language and lives under text/, one chunk per language, so a visitor
 * downloads the guides in the language they read and nothing else.
 */

/** Who a guide is written for, which also decides who can see it. */
export type HelpAudience = 'public' | 'member' | 'staff';

export type HelpCollectionId =
  | 'company'
  | 'insurance'
  | 'consult'
  | 'jobs'
  | 'freelance'
  | 'books'
  | 'marketplace'
  | 'account'
  | 'member'
  | 'staff';

/** A feature switch from src/lib/features.ts that hides a guide when it is off. */
export type HelpFeature = 'tradeMaster' | 'jobsV2' | 'projectsV2' | 'booksV2';

export interface HelpEntry {
  id: string;
  collection: HelpCollectionId;
  audience: HelpAudience;
  /** Router patterns without the language prefix, e.g. "/jobs/:code". */
  routes: string[];
  /** Other guides this module works with, in the order worth reading them. */
  related: string[];
  feature?: HelpFeature;
}

/** A title and its body; the pair every list in a guide is made of. */
export type HelpPair = [title: string, body: string];

export interface HelpArticleText {
  /** The module's name as a reader would say it. */
  title: string;
  /** One sentence: what this page is. Shown under the title and in search. */
  summary: string;
  /** The in-page heading, when the page wants something warmer than the title. */
  heading?: string;
  /** What the module does and why it exists, in a paragraph or two. */
  intro: string;
  /** How to use it, in order. */
  steps?: HelpPair[];
  /** What a reader gets or can do here. */
  points?: HelpPair[];
  /** Short, practical advice. Shown one at a time on dashboard screens. */
  tips?: HelpPair[];
  faqTitle?: string;
  faqs: HelpPair[];
  /** Why each related guide matters from here, keyed by its id. */
  related?: Record<string, string>;
}

export interface HelpCollectionText {
  title: string;
  description: string;
}

/** Everything one language says. Partial languages fall back to English per guide. */
export interface HelpLibraryText {
  collections: Partial<Record<HelpCollectionId, HelpCollectionText>>;
  articles: Record<string, HelpArticleText>;
}
