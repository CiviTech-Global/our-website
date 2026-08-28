import { prisma } from '../../../config/database.js';
import type { Prisma, LeadStatus } from '@prisma/client';

const leadDelegate = prisma.lead;

const leadListInclude = {
  category: { select: { id: true, title: true, emoji: true } },
  subcategory: { select: { id: true, title: true } },
} satisfies Prisma.LeadInclude;

export interface CreateLeadInput {
  telegramUserId: string;
  telegramUsername?: string | null;
  telegramFirstName?: string | null;
  categoryId: string;
  subcategoryId: string;
  fullName: string;
  phoneNumber: string;
  phoneNumberHash?: string | null;
  city: string;
  preferredContactTime: string;
  notes?: string | null;
}

export const leadRepository = {
  findMany: (args?: Prisma.LeadFindManyArgs) => leadDelegate.findMany(args),
  count: (args?: Prisma.LeadCountArgs) => leadDelegate.count(args),
  findUnique: (args: Prisma.LeadFindUniqueArgs) => leadDelegate.findUnique(args),
  update: (args: Prisma.LeadUpdateArgs) => leadDelegate.update(args),
  updateMany: (args: Prisma.LeadUpdateManyArgs) => leadDelegate.updateMany(args),

  createFromBot: (data: CreateLeadInput) => {
    return leadDelegate.create({
      data: {
        telegramUserId: data.telegramUserId,
        telegramUsername: data.telegramUsername ?? null,
        telegramFirstName: data.telegramFirstName ?? null,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        phoneNumberHash: data.phoneNumberHash ?? null,
        city: data.city,
        preferredContactTime: data.preferredContactTime,
        notes: data.notes ?? null,
      },
      include: leadListInclude,
    });
  },

  findByIdWithRelations: (id: string) => {
    return leadDelegate.findUnique({ where: { id }, include: leadListInclude });
  },

  /** Same as findByIdWithRelations but accepts an additional ownership/scope
   * filter (e.g. assignedToId) so non-SUPER_ADMIN callers only ever see rows
   * they're allowed to. */
  findFirstWithRelations: (where: Prisma.LeadWhereInput) => {
    return leadDelegate.findFirst({ where, include: leadListInclude });
  },

  assign: (id: string, assignedToId: string | null) => {
    return leadDelegate.update({ where: { id }, data: { assignedToId }, include: leadListInclude });
  },

  findManyWithRelations: (args: { where?: Prisma.LeadWhereInput; skip?: number; take?: number }) => {
    return leadDelegate.findMany({
      where: args.where,
      skip: args.skip,
      take: args.take,
      orderBy: { createdAt: 'desc' },
      include: leadListInclude,
    });
  },

  updateStatus: (id: string, status: LeadStatus) => {
    return leadDelegate.update({ where: { id }, data: { status }, include: leadListInclude });
  },
};
