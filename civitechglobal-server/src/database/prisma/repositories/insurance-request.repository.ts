import { prisma } from '../../../config/database.js';
import type { Prisma, LeadStatus, RequestSource } from '@prisma/client';

const requestDelegate = prisma.insuranceRequest;

/**
 * Relations every list row and detail view needs.
 *
 * `product` is null on pre-refactor rows and `category`/`subcategory` are null
 * on website rows, so both are included: between them every request can name
 * what it is about, whichever era it came from.
 */
const requestListInclude = {
  product: {
    select: {
      id: true,
      slug: true,
      title: true,
      titleEn: true,
      icon: true,
      intakeMode: true,
      audience: true,
      category: { select: { id: true, slug: true, title: true, titleEn: true, emoji: true } },
    },
  },
  category: { select: { id: true, title: true, emoji: true } },
  subcategory: { select: { id: true, title: true } },
} satisfies Prisma.InsuranceRequestInclude;

export interface CreateWebRequestInput {
  trackingCode: string;
  productId: string;
  answers: Prisma.InputJsonValue;
  catalogVersion: number;
  fullName: string;
  phoneNumber: string;
  phoneNumberHash: string;
  phoneVerified: boolean;
  email?: string | null;
  organizationName?: string | null;
  province?: string | null;
  city: string;
  preferredContactTime: string;
  notes?: string | null;
}

export interface CreateBotRequestInput {
  trackingCode: string;
  telegramUserId: string;
  telegramUsername?: string | null;
  telegramFirstName?: string | null;
  productId: string;
  fullName: string;
  phoneNumber: string;
  phoneNumberHash?: string | null;
  city: string;
  preferredContactTime: string;
  notes?: string | null;
}

export const insuranceRequestRepository = {
  findMany: (args?: Prisma.InsuranceRequestFindManyArgs) => requestDelegate.findMany(args),
  count: (args?: Prisma.InsuranceRequestCountArgs) => requestDelegate.count(args),
  findUnique: (args: Prisma.InsuranceRequestFindUniqueArgs) => requestDelegate.findUnique(args),
  update: (args: Prisma.InsuranceRequestUpdateArgs) => requestDelegate.update(args),
  updateMany: (args: Prisma.InsuranceRequestUpdateManyArgs) => requestDelegate.updateMany(args),

  /** A submission from the website, against a product's form. */
  createFromWeb: (data: CreateWebRequestInput) => {
    return requestDelegate.create({
      data: {
        trackingCode: data.trackingCode,
        source: 'WEB' satisfies RequestSource,
        productId: data.productId,
        answers: data.answers,
        catalogVersion: data.catalogVersion,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        phoneNumberHash: data.phoneNumberHash,
        phoneVerified: data.phoneVerified,
        email: data.email ?? null,
        organizationName: data.organizationName ?? null,
        province: data.province ?? null,
        city: data.city,
        preferredContactTime: data.preferredContactTime,
        notes: data.notes ?? null,
      },
      include: requestListInclude,
    });
  },

  /**
   * A submission from the Telegram bot.
   *
   * The bot collects the contact block only, never the per-product questions:
   * walking someone through fourteen fields as a chat interrogation is a worse
   * experience than a web form and a phone call. So `answers` stays null and
   * `phoneVerified` false — the number arrived unproven.
   */
  createFromBot: (data: CreateBotRequestInput) => {
    return requestDelegate.create({
      data: {
        trackingCode: data.trackingCode,
        source: 'TELEGRAM' satisfies RequestSource,
        telegramUserId: data.telegramUserId,
        telegramUsername: data.telegramUsername ?? null,
        telegramFirstName: data.telegramFirstName ?? null,
        productId: data.productId,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        phoneNumberHash: data.phoneNumberHash ?? null,
        city: data.city,
        preferredContactTime: data.preferredContactTime,
        notes: data.notes ?? null,
      },
      include: requestListInclude,
    });
  },

  findByIdWithRelations: (id: string) => {
    return requestDelegate.findUnique({ where: { id }, include: requestListInclude });
  },

  /** Same as findByIdWithRelations but accepts an additional ownership/scope
   * filter (e.g. assignedToId) so non-SUPER_ADMIN callers only ever see rows
   * they're allowed to. */
  findFirstWithRelations: (where: Prisma.InsuranceRequestWhereInput) => {
    return requestDelegate.findFirst({ where, include: requestListInclude });
  },

  /** Status-only lookup for the public tracking page. Selects no personal data. */
  findStatusByTrackingCode: (trackingCode: string) => {
    return requestDelegate.findUnique({
      where: { trackingCode },
      select: {
        trackingCode: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        callbackScheduledAt: true,
        product: { select: { slug: true, title: true, titleEn: true } },
      },
    });
  },

  assign: (id: string, assignedToId: string | null) => {
    return requestDelegate.update({ where: { id }, data: { assignedToId }, include: requestListInclude });
  },

  findManyWithRelations: (args: { where?: Prisma.InsuranceRequestWhereInput; skip?: number; take?: number }) => {
    return requestDelegate.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take,
      orderBy: { createdAt: 'desc' },
      include: requestListInclude,
    });
  },

  updateStatus: (id: string, status: LeadStatus) => {
    return requestDelegate.update({ where: { id }, data: { status }, include: requestListInclude });
  },

  scheduleCallback: (id: string, callbackScheduledAt: Date | null) => {
    return requestDelegate.update({
      where: { id },
      data: { callbackScheduledAt },
      include: requestListInclude,
    });
  },
};
