import type { LeadStatus, Prisma, Role } from '@prisma/client';
import { toPage } from '../utils/page.js';
import { searchWhere } from './list-search.js';
import { AppError } from '../middleware/errorHandler.js';
import { insuranceRequestRepository } from '../database/prisma/repositories/insurance-request.repository.js';
import { userRepository } from '../database/prisma/repositories/user.repository.js';
import { getProduct } from '../insurance/catalog/index.js';
import { describeAnswers, type DescribedAnswer } from '../insurance/catalog/schema.js';
import { CATALOG_VERSION } from '../insurance/catalog/index.js';
import type { RequestListQuery } from '../validators/request.schema.js';

export interface RequestingPrincipal {
  userId: string;
  role: Role;
}

/**
 * Row-level scoping for requests: SUPER_ADMIN sees/acts on everything.
 * Every other principal (e.g. ADMIN) only sees/acts on requests assigned to
 * them or sitting in the unassigned pool (assignedToId is null).
 */
function scopeWhere(
  where: Prisma.InsuranceRequestWhereInput,
  principal: RequestingPrincipal,
): Prisma.InsuranceRequestWhereInput {
  if (principal.role === 'SUPER_ADMIN') return where;
  return { ...where, OR: [{ assignedToId: principal.userId }, { assignedToId: null }] };
}

export async function getAllRequests(query: RequestListQuery, principal: RequestingPrincipal) {
  const page = Math.max(1, query.page);
  const limit = Math.min(50, Math.max(1, query.limit));
  const skip = (page - 1) * limit;

  const where: Prisma.InsuranceRequestWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.source) where.source = query.source;
  if (query.productSlug) where.product = { slug: query.productSlug };

  // Under AND rather than beside the scope: scopeWhere narrows a non-super
  // admin with an OR of its own, and two ORs at the same level would merge
  // into "assigned to me OR matching the search", which is an admin reading
  // rows that are not theirs. The two conditions have to both hold.
  //
  // The name and the phone number are plaintext columns today (see the
  // schema note on User.emailHash). If they are ever encrypted at rest, a
  // substring match over them stops working and this drops to the tracking
  // code — which is the field somebody is usually holding anyway.
  const searched = searchWhere(query.search, ['trackingCode', 'fullName', 'phoneNumber']);
  const scopedWhere: Prisma.InsuranceRequestWhereInput =
    'OR' in searched ? { AND: [scopeWhere(where, principal), searched] } : scopeWhere(where, principal);

  const [requests, total] = await Promise.all([
    insuranceRequestRepository.findManyWithRelations({ where: scopedWhere, skip, take: limit }),
    insuranceRequestRepository.count({ where: scopedWhere }),
  ]);

  return toPage(requests, total, page, limit);
}

export interface RequestDetail {
  request: Awaited<ReturnType<typeof insuranceRequestRepository.findFirstWithRelations>>;
  /** The stored answers, paired with the labels of the questions that produced
   *  them. Empty for bot-sourced and pre-refactor rows, which have no answers. */
  answers: DescribedAnswer[];
  /** True when the form has changed since this request was filled, so a label
   *  shown next to an answer may no longer be the question that was asked. */
  formChangedSinceSubmission: boolean;
}

export async function getRequestById(
  id: string,
  principal: RequestingPrincipal,
): Promise<RequestDetail> {
  const request = await insuranceRequestRepository.findFirstWithRelations(scopeWhere({ id }, principal));
  if (!request) throw new AppError('Request not found', 404);

  let answers: DescribedAnswer[] = [];
  let formChangedSinceSubmission = false;

  if (request.product && request.answers && typeof request.answers === 'object') {
    // The catalog in code, not the row's stored formSchema, is what holds the
    // labels — the row's schema is a seeded copy of the same thing, and reading
    // one source keeps the two from disagreeing about what a field is called.
    const product = getProduct(request.product.slug);
    if (product) {
      answers = describeAnswers(product, request.answers as Record<string, unknown>);
      formChangedSinceSubmission = (request.catalogVersion ?? CATALOG_VERSION) !== CATALOG_VERSION;
    }
  }

  return { request, answers, formChangedSinceSubmission };
}

export async function updateRequestStatus(id: string, status: LeadStatus, principal: RequestingPrincipal) {
  const request = await insuranceRequestRepository.findFirstWithRelations(scopeWhere({ id }, principal));
  if (!request) throw new AppError('Request not found', 404);
  return insuranceRequestRepository.updateStatus(id, status);
}

export async function assignRequest(
  id: string,
  assignedToId: string | null,
  principal: RequestingPrincipal,
) {
  const request = await insuranceRequestRepository.findFirstWithRelations(scopeWhere({ id }, principal));
  if (!request) throw new AppError('Request not found', 404);

  if (assignedToId !== null) {
    // Prevent assigning a request to a nonexistent or deactivated account,
    // which would silently orphan it into a scope only SUPER_ADMIN can see.
    const target = await userRepository.findUnique({ where: { id: assignedToId } });
    if (!target || target.deletedAt) throw new AppError('Assignee not found', 404);
  }

  return insuranceRequestRepository.assign(id, assignedToId);
}

export async function scheduleCallback(
  id: string,
  scheduledAt: Date | null,
  principal: RequestingPrincipal,
) {
  const request = await insuranceRequestRepository.findFirstWithRelations(scopeWhere({ id }, principal));
  if (!request) throw new AppError('Request not found', 404);
  return insuranceRequestRepository.scheduleCallback(id, scheduledAt);
}

export async function getRequestStats(principal: RequestingPrincipal) {
  const base = scopeWhere({}, principal);
  const [total, newRequests, contacted, inProgress, completed, cancelled] = await Promise.all([
    insuranceRequestRepository.count({ where: base }),
    insuranceRequestRepository.count({ where: scopeWhere({ status: 'NEW' }, principal) }),
    insuranceRequestRepository.count({ where: scopeWhere({ status: 'CONTACTED' }, principal) }),
    insuranceRequestRepository.count({ where: scopeWhere({ status: 'IN_PROGRESS' }, principal) }),
    insuranceRequestRepository.count({ where: scopeWhere({ status: 'COMPLETED' }, principal) }),
    insuranceRequestRepository.count({ where: scopeWhere({ status: 'CANCELLED' }, principal) }),
  ]);

  return { total, newLeads: newRequests, contacted, inProgress, completed, cancelled };
}
