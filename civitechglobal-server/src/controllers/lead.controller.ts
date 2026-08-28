import type { Request, Response, NextFunction } from 'express';
import * as leadService from '../services/lead.service.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';
import type { LeadListQuery } from '../validators/lead.schema.js';

function principalFrom(req: Request): leadService.RequestingPrincipal {
  return { userId: req.user!.userId, role: req.user!.role };
}

export async function getAllLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await leadService.getAllLeads(req.query as unknown as LeadListQuery, principalFrom(req));
    paginatedResponse(res, result.leads, result.total, result.page, result.limit);
  } catch (error) {
    next(error);
  }
}

export async function getLead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lead = await leadService.getLeadById(req.params.id as string, principalFrom(req));
    successResponse(res, lead);
  } catch (error) {
    next(error);
  }
}

export async function updateLeadStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lead = await leadService.updateLeadStatus(req.params.id as string, req.body.status, principalFrom(req));
    successResponse(res, lead, 'Lead status updated');
  } catch (error) {
    next(error);
  }
}

export async function assignLead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lead = await leadService.assignLead(
      req.params.id as string,
      req.body.assignedToId,
      principalFrom(req),
    );
    successResponse(res, lead, 'Lead assignment updated');
  } catch (error) {
    next(error);
  }
}

export async function getLeadStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await leadService.getLeadStats(principalFrom(req));
    successResponse(res, stats);
  } catch (error) {
    next(error);
  }
}
