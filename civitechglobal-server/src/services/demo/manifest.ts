import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { removeFile } from '../attachment.service.js';

/**
 * Recording what a demo seed created, so removing it is exact.
 *
 * Every other way of identifying demo data is a guess. A code prefix, a
 * reserved email domain, a name beginning with "Demo" — each works until a real
 * customer picks the same shape, and then the teardown deletes their data. A
 * manifest cannot make that mistake: it removes the rows it wrote, by id, and
 * nothing else.
 *
 * THIS FILE REFUSES TO RUN IN PRODUCTION. Not as a convenience — the whole
 * point of the tool is to create and destroy rows in bulk, and pointing it at a
 * live database is the single worst thing that could happen with it. The guard
 * is here, at the bottom, rather than only in the route or the script, because
 * those are two places to forget and this is one place that cannot be bypassed.
 */

/**
 * Deleting is dispatched by model name.
 *
 * A map rather than a dynamic `prisma[model]` lookup: a string from the
 * database used to index the Prisma client is an arbitrary-model delete waiting
 * for a bad row, and a map also fails loudly when a model is renamed instead of
 * silently skipping it.
 */
type Deleter = (id: string) => Promise<void>;

const DELETERS: Record<string, Deleter> = {
  /**
   * An uploaded file, not a row.
   *
   * The seeder writes a placeholder PNG per shop and product. Without this the
   * rows go and the files stay, so every seed-and-clear cycle leaks about a
   * megabyte into storage that nothing references and nothing will ever
   * collect. `recordId` is the stored name rather than a row id — the manifest
   * does not care which, since it only ever hands it back to the deleter.
   */
  storedFile: async (storedName) => {
    await removeFile(storedName);
  },

  demoUser: async (id) => void (await prisma.user.deleteMany({ where: { id } })),
  userVerification: async (id) =>
    void (await prisma.userVerification.deleteMany({ where: { id } })),
  business: async (id) => void (await prisma.business.deleteMany({ where: { id } })),
  productCategory: async (id) =>
    void (await prisma.productCategory.deleteMany({ where: { id } })),
  product: async (id) => void (await prisma.product.deleteMany({ where: { id } })),
  productImage: async (id) => void (await prisma.productImage.deleteMany({ where: { id } })),
  productVariant: async (id) => void (await prisma.productVariant.deleteMany({ where: { id } })),
  insuranceRequest: async (id) =>
    void (await prisma.insuranceRequest.deleteMany({ where: { id } })),
  projectRequest: async (id) => void (await prisma.projectRequest.deleteMany({ where: { id } })),
  resumeSubmission: async (id) =>
    void (await prisma.resumeSubmission.deleteMany({ where: { id } })),
  contactMessage: async (id) => void (await prisma.contactMessage.deleteMany({ where: { id } })),
  teamSection: async (id) => void (await prisma.teamSection.deleteMany({ where: { id } })),
  teamMember: async (id) => void (await prisma.teamMember.deleteMany({ where: { id } })),
  showcaseOrganization: async (id) =>
    void (await prisma.showcaseOrganization.deleteMany({ where: { id } })),
  showcaseProject: async (id) => void (await prisma.showcaseProject.deleteMany({ where: { id } })),
  expert: async (id) => void (await prisma.expert.deleteMany({ where: { id } })),
  consultationRequest: async (id) =>
    void (await prisma.consultationRequest.deleteMany({ where: { id } })),
  bookListing: async (id) => void (await prisma.bookListing.deleteMany({ where: { id } })),
  jobPost: async (id) => void (await prisma.jobPost.deleteMany({ where: { id } })),
  jobApplication: async (id) => void (await prisma.jobApplication.deleteMany({ where: { id } })),
  freelanceProject: async (id) =>
    void (await prisma.freelanceProject.deleteMany({ where: { id } })),
  projectBid: async (id) => void (await prisma.projectBid.deleteMany({ where: { id } })),
  company: async (id) => void (await prisma.company.deleteMany({ where: { id } })),
  savedJob: async (id) => void (await prisma.savedJob.deleteMany({ where: { id } })),
  jobAlert: async (id) => void (await prisma.jobAlert.deleteMany({ where: { id } })),
  marketplaceAward: async (id) =>
    void (await prisma.marketplaceAward.deleteMany({ where: { id } })),
  notification: async (id) => void (await prisma.notification.deleteMany({ where: { id } })),
};

/** The models a seed may record. Anything else is a programming mistake. */
export type DemoModel = keyof typeof DELETERS;

/**
 * The one guard that matters.
 *
 * `deleteMany` in a loop over a manifest is exactly the tool you do not want
 * aimed at a live database, so this throws rather than warns, and every entry
 * point goes through it.
 */
export function assertNotProduction(): void {
  if (env.NODE_ENV === 'production') {
    throw new AppError('Demo data cannot be used in production.', 403);
  }
}

export class DemoManifest {
  readonly batch: string;
  private sequence = 0;

  constructor(batch = `demo-${randomUUID().slice(0, 8)}`) {
    assertNotProduction();
    this.batch = batch;
  }

  /**
   * Record a row, in creation order.
   *
   * Returns the id so a caller can write `const shopId = await m.record(...)`
   * and keep the happy path readable.
   */
  async record(model: DemoModel, recordId: string): Promise<string> {
    this.sequence += 1;
    await prisma.demoRecord.create({
      data: { batch: this.batch, model, recordId, sequence: this.sequence },
    });
    return recordId;
  }

  /** Record several rows of one model at once, preserving their order. */
  async recordMany(model: DemoModel, ids: string[]): Promise<string[]> {
    for (const id of ids) await this.record(model, id);
    return ids;
  }
}

export interface TeardownResult {
  batches: number;
  deleted: number;
  /** Rows the manifest named that were already gone. Not an error. */
  missing: number;
}

/**
 * Remove demo data.
 *
 * Walks the manifest backwards so children go before parents. Cascades cover
 * most of it — a Product goes with its Business — but not all: a
 * ProductCategory referenced by a Product does not cascade, and deleting it
 * first fails on a foreign key rather than explaining itself.
 *
 * A row that has already gone is counted, not raised. Somebody deleting a demo
 * shop through the UI and then running teardown is doing nothing wrong.
 */
export async function teardownDemoData(batch?: string): Promise<TeardownResult> {
  assertNotProduction();

  const where: Prisma.DemoRecordWhereInput = batch ? { batch } : {};

  const records = await prisma.demoRecord.findMany({
    where,
    orderBy: [{ batch: 'desc' }, { sequence: 'desc' }],
    select: { id: true, batch: true, model: true, recordId: true },
  });

  let deleted = 0;
  let missing = 0;
  const batches = new Set<string>();

  for (const record of records) {
    batches.add(record.batch);

    const deleter = DELETERS[record.model];
    if (!deleter) {
      // A model recorded by an older version of the seeder and since renamed.
      // Logged rather than thrown: refusing to tear anything down because one
      // row is unrecognised is the wrong trade.
      logger.warn({ model: record.model }, 'demo teardown: no deleter for model, skipping');
      continue;
    }

    const before = await countExisting(record.model, record.recordId);
    await deleter(record.recordId);
    if (before) deleted += 1;
    else missing += 1;

    await prisma.demoRecord.delete({ where: { id: record.id } });
  }

  return { batches: batches.size, deleted, missing };
}

/**
 * Whether the row is still there, so the report can distinguish "removed" from
 * "was already gone".
 *
 * A count rather than a findUnique so an unknown model cannot throw here; the
 * caller has already checked the deleter exists.
 */
async function countExisting(model: string, id: string): Promise<boolean> {
  const counters: Record<string, () => Promise<number>> = {
    // A file has no row to count. Reported as removed, because removeFile is
    // safe to call for something that is not there.
    storedFile: () => Promise.resolve(1),
    demoUser: () => prisma.user.count({ where: { id } }),
    userVerification: () => prisma.userVerification.count({ where: { id } }),
    business: () => prisma.business.count({ where: { id } }),
    productCategory: () => prisma.productCategory.count({ where: { id } }),
    product: () => prisma.product.count({ where: { id } }),
    productImage: () => prisma.productImage.count({ where: { id } }),
    productVariant: () => prisma.productVariant.count({ where: { id } }),
    insuranceRequest: () => prisma.insuranceRequest.count({ where: { id } }),
    projectRequest: () => prisma.projectRequest.count({ where: { id } }),
    resumeSubmission: () => prisma.resumeSubmission.count({ where: { id } }),
    contactMessage: () => prisma.contactMessage.count({ where: { id } }),
    teamSection: () => prisma.teamSection.count({ where: { id } }),
    teamMember: () => prisma.teamMember.count({ where: { id } }),
    showcaseOrganization: () => prisma.showcaseOrganization.count({ where: { id } }),
    showcaseProject: () => prisma.showcaseProject.count({ where: { id } }),
    expert: () => prisma.expert.count({ where: { id } }),
    consultationRequest: () => prisma.consultationRequest.count({ where: { id } }),
    bookListing: () => prisma.bookListing.count({ where: { id } }),
    jobPost: () => prisma.jobPost.count({ where: { id } }),
    jobApplication: () => prisma.jobApplication.count({ where: { id } }),
    freelanceProject: () => prisma.freelanceProject.count({ where: { id } }),
    projectBid: () => prisma.projectBid.count({ where: { id } }),
    company: () => prisma.company.count({ where: { id } }),
    savedJob: () => prisma.savedJob.count({ where: { id } }),
    jobAlert: () => prisma.jobAlert.count({ where: { id } }),
    marketplaceAward: () => prisma.marketplaceAward.count({ where: { id } }),
    notification: () => prisma.notification.count({ where: { id } }),
  };

  const counter = counters[model];
  return counter ? (await counter()) > 0 : false;
}

/** What is currently seeded, for a status report. */
export async function demoSummary() {
  assertNotProduction();

  const grouped = await prisma.demoRecord.groupBy({
    by: ['batch', 'model'],
    _count: { _all: true },
  });

  const batches = new Map<string, Record<string, number>>();
  for (const row of grouped) {
    const entry = batches.get(row.batch) ?? {};
    entry[row.model] = row._count._all;
    batches.set(row.batch, entry);
  }

  return [...batches.entries()].map(([batch, models]) => ({
    batch,
    models,
    total: Object.values(models).reduce((sum, n) => sum + n, 0),
  }));
}
