import type { LeadStatus, Prisma, Role } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { leadRepository } from '../database/prisma/repositories/lead.repository.js';
import { userRepository } from '../database/prisma/repositories/user.repository.js';
import type { LeadListQuery } from '../validators/lead.schema.js';

export interface RequestingPrincipal {
  userId: string;
  role: Role;
}

/**
 * Row-level scoping for leads: SUPER_ADMIN sees/acts on everything.
 * Every other principal (e.g. ADMIN) only sees/acts on leads assigned to
 * them or sitting in the unassigned pool (assignedToId is null).
 */
function scopeWhere(where: Prisma.LeadWhereInput, principal: RequestingPrincipal): Prisma.LeadWhereInput {
  if (principal.role === 'SUPER_ADMIN') return where;
  return { ...where, OR: [{ assignedToId: principal.userId }, { assignedToId: null }] };
}

export async function getAllLeads(query: LeadListQuery, principal: RequestingPrincipal) {
  const page = Math.max(1, query.page);
  const limit = Math.min(50, Math.max(1, query.limit));
  const skip = (page - 1) * limit;

  const where: Prisma.LeadWhereInput = {};
  if (query.status) where.status = query.status;
  const scopedWhere = scopeWhere(where, principal);

  const [leads, total] = await Promise.all([
    leadRepository.findManyWithRelations({ where: scopedWhere, skip, take: limit }),
    leadRepository.count({ where: scopedWhere }),
  ]);

  return { leads, total, page, limit };
}

export async function getLeadById(id: string, principal: RequestingPrincipal) {
  const lead = await leadRepository.findFirstWithRelations(scopeWhere({ id }, principal));
  if (!lead) throw new AppError('Lead not found', 404);
  return lead;
}

export async function updateLeadStatus(id: string, status: LeadStatus, principal: RequestingPrincipal) {
  const lead = await leadRepository.findFirstWithRelations(scopeWhere({ id }, principal));
  if (!lead) throw new AppError('Lead not found', 404);
  return leadRepository.updateStatus(id, status);
}

export async function assignLead(id: string, assignedToId: string | null, principal: RequestingPrincipal) {
  const lead = await leadRepository.findFirstWithRelations(scopeWhere({ id }, principal));
  if (!lead) throw new AppError('Lead not found', 404);

  if (assignedToId !== null) {
    // Prevent assigning a lead to a nonexistent or deactivated account,
    // which would silently orphan it into a scope only SUPER_ADMIN can see.
    const target = await userRepository.findUnique({ where: { id: assignedToId } });
    if (!target || target.deletedAt) throw new AppError('Assignee not found', 404);
  }

  return leadRepository.assign(id, assignedToId);
}

export async function getLeadStats(principal: RequestingPrincipal) {
  const base = scopeWhere({}, principal);
  const [total, newLeads, contacted, inProgress, completed, cancelled] = await Promise.all([
    leadRepository.count({ where: base }),
    leadRepository.count({ where: scopeWhere({ status: 'NEW' }, principal) }),
    leadRepository.count({ where: scopeWhere({ status: 'CONTACTED' }, principal) }),
    leadRepository.count({ where: scopeWhere({ status: 'IN_PROGRESS' }, principal) }),
    leadRepository.count({ where: scopeWhere({ status: 'COMPLETED' }, principal) }),
    leadRepository.count({ where: scopeWhere({ status: 'CANCELLED' }, principal) }),
  ]);

  return { total, newLeads, contacted, inProgress, completed, cancelled };
}
